/**
 * VitalsMixin — the body's biological state: vital signs as real-units
 * Quantities, the derived health readouts, and (added in later phases)
 * the active-condition collection and anatomy deltas.
 *
 * Composes onto a living biological body — every `Creature` (and so
 * every `Character` / `Avatar`). The load-bearing decision: **there is
 * no stored health scalar.** "How hurt am I" is *derived* on every call
 * from the substrate (blood volume + vital signs, later + trauma +
 * reserves); the accessible band is a rendered view, never the source
 * of truth.
 *
 * What this is NOT for:
 * - NOT agent-state. Agency (commands, perception, movement) is gated
 *   separately on `Character`. A corpse / unconscious / anesthetized
 *   body has full vitals and reduced agency — no special-casing.
 * - NOT a stored hitpoint scalar. The readouts compute every call and
 *   are never persisted/cached (the `getSpecies` HMR discipline).
 * - NOT a condition-content catalog. Afflictions are authored Idea
 *   templates; trauma behavior is a static table.
 * - NOT the death driver. This build ships only the death *seams*
 *   (the cause-of-death field, the derived consciousness); nothing
 *   watches a vital and flips `lifecycleState`.
 *
 * Composition constraint: requires `OrganismMixin` (reads
 * `getSpecies()` for the per-species band profile, and
 * `getLifecycleState()` for the dead readout). VitalsMixin composes
 * OUTER of Organism on `Creature`. The constraint is a **runtime
 * guard** (below), not a comment.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { MixinApi } from '../../api/mixin';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import type { VitalBand, VitalProfile } from '../../platform/idea/species/Species';
import type { BodyPart } from '../../platform/idea/species/BodyPlan';
import type {
  ActiveCondition,
  Trauma,
  SustainedShock,
  SustainedEffect,
  AfflictionRecord,
  DyingRecord,
} from '../../platform/idea/Condition';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../../platform/idea/Condition';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ElectricityApi } from '../../api/electricity';
import { ConditionApi } from '../../api/condition';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Energized } from '../electricity/Energized';
import { TemplatePaths } from '../paths';
import type { VetoResult } from '../errors';
import { Suppressions } from '../magic/Suppression';
import { MagicGrid } from '../magic/Grid';

/** Alias for readability at the magic arm's call sites. */
function magicDial(key: string, fallback: number): number {
  return elecDial(key, fallback);
}

/** Numeric AppSetting read, falling back to the seeded literal (the harm /
 * electricity dial idiom). */
function elecDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The engine's vital-sign vocabulary — the canonical key list, used by
 * the band profile (`Species.VitalProfile`), the per-sign storage, and
 * anatomy's `governsVital` coupling. Re-exported as the single source
 * of truth so `BodyPlan` can validate against it value-only.
 */
export const VITAL_SIGNS = [
  'coreTemperature',
  'heartRate',
  'respiratoryRate',
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'spo2',
  'bloodVolume',
] as const;

export type VitalSign = (typeof VITAL_SIGNS)[number];

/**
 * The **material** fork-slice family — the body-state a corpse inherits:
 * the vital signs as they stood, the wound map, the cause stamp, and the
 * anatomy deltas. Together they are what makes a dead body a forensic
 * record rather than a prop.
 *
 * **These slices are fork-only, and that is a load-bearing asymmetry.**
 * `ForkableMixin.applyForkedState` applies a slice by calling
 * `mergeSlice_<Name>` ON THE TARGET — so if material state travelled that
 * way, every `VitalsMixin` host would need a `mergeSlice_Vitals`, corpse
 * and living body alike, and that method would be exactly the "trusted
 * mixin escape" the design forbids: one call and a corpse walks again.
 *
 * Instead the apply side is {@link Vitals.adoptMaterialState}, gated to the
 * death choreography and deliberately NOT named `mergeSlice_`. The
 * consequence is the guarantee: `forkRuntimeState(corpse, newBody)` is a
 * structural no-op, because there is no applier for it to find. A corpse
 * is un-reanimatable **by protocol, not by policy** — nobody has to
 * remember the rule.
 *
 * Adding a `mergeSlice_` for any name in this list is the single edit that
 * silently undoes it. See `docs/antipatterns.md`.
 */
export const MATERIAL_FORK_SLICES = [
  'Vitals',
  'Trauma',
  'CauseOfDeath',
  'Anatomy',
] as const;

/** The accessible "HP bar" replacement — a derived band, never stored. */
export type ConditionBand =
  | 'healthy'
  | 'hurt'
  | 'serious'
  | 'critical'
  /**
   * Past the point the body recovers from on its own, but not gone — the
   * rescuable interval. Sits between `critical` and `dead` because that is
   * exactly where it lives: a floored vital used to read `dead` straight
   * off the substrate, and now reads `dying` until the clock runs out.
   */
  | 'dying'
  | 'dead';

/** A second derived state below death; recoverable. */
export type Consciousness = 'conscious' | 'unconscious' | 'dead';

/**
 * Per-part instance delta — only what differs from the shared BodyPlan
 * structure. Kept minimal: trauma/condition state lives in the
 * condition collection, not here.
 */
export interface BodyPartDelta {
  /** Severed / absent → disables the part's coupled slots. */
  missing?: boolean;
}

/** A BodyPlan part merged with this body's instance delta. */
export interface ResolvedBodyPart extends BodyPart {
  missing: boolean;
}

/** Canonical unit per vital sign. */
const VITAL_UNITS: Record<VitalSign, Unit> = {
  coreTemperature: 'K',
  heartRate: 'bpm',
  respiratoryRate: 'bpm',
  bloodPressureSystolic: 'mmHg',
  bloodPressureDiastolic: 'mmHg',
  spo2: '%',
  bloodVolume: 'L',
};

/**
 * Only the death choreography may pour material state into a body. The
 * gate is what stops `adoptMaterialState` from becoming the reanimation
 * hatch that a `mergeSlice_` would have been — see
 * {@link MATERIAL_FORK_SLICES}.
 */
const ByConditionLogic = SecurityPolicies.FromTemplate('/platform/idea/api/condition');

/** Backing-field name per vital sign (first-class persistent fields). */
const VITAL_FIELD: Record<VitalSign, string> = {
  coreTemperature: '_coreTemperature',
  heartRate: '_heartRate',
  respiratoryRate: '_respiratoryRate',
  bloodPressureSystolic: '_bloodPressureSystolic',
  bloodPressureDiastolic: '_bloodPressureDiastolic',
  spo2: '_spo2',
  bloodVolume: '_bloodVolume',
};

/**
 * Universe-default biological vital profile — Homo-sapiens-shaped
 * baselines + survivable bands. Backstops any animate species that
 * hasn't authored a `vitalProfile` (mirrors the sessile-bodyplan
 * backstop). Engine code, not a seeded "default species".
 */
export const UNIVERSE_DEFAULT_VITAL_PROFILE: VitalProfile = {
  coreTemperature: { baseline: 310, survivableMin: 301, survivableMax: 315 },
  heartRate: { baseline: 70, survivableMin: 30, survivableMax: 220 },
  respiratoryRate: { baseline: 16, survivableMin: 6, survivableMax: 40 },
  bloodPressureSystolic: { baseline: 120, survivableMin: 70, survivableMax: 200 },
  bloodPressureDiastolic: { baseline: 80, survivableMin: 40, survivableMax: 130 },
  spo2: { baseline: 98, survivableMin: 70, survivableMax: 100 },
  bloodVolume: { baseline: 5, survivableMin: 3.2, survivableMax: 5 },
};

const SEVERITY_BANDS: readonly ConditionBand[] = [
  'healthy',
  'hurt',
  'serious',
  'critical',
];

function assertVitalQuantity(value: unknown, sign: VitalSign): void {
  const expected = VITAL_UNITS[sign];
  if (!(value instanceof Quantity) || value.unit !== expected) {
    const actual =
      value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value;
    throw new TypeError(
      `VitalsMixin.setVitalSign('${sign}'): expected Quantity<'${expected}'>, ` +
        `got ${actual}`,
    );
  }
  if (value.rawValue() < 0) {
    throw new RangeError(
      `VitalsMixin.setVitalSign('${sign}'): value must be >= 0`,
    );
  }
}

export interface Vitals {
  // ---------- vital signs ----------
  getVitalSign(sign: VitalSign): Quantity<Unit>;
  setVitalSign(sign: VitalSign, value: Quantity<Unit>): void;
  /** The survivable band for a sign, from species profile or default. */
  getVitalBand(sign: VitalSign): VitalBand;

  // ---------- derived readouts (computed every call) ----------
  getConditionBand(): ConditionBand;
  getConsciousness(): Consciousness;

  // ---------- locomotion coupling (the limp) ----------
  /**
   * Traversal endurance drain from locomotor wounds — the limp. A
   * severity-gated `endurance` drain summed over active laceration /
   * avulsion traumas at a locomotor site (`body.leg.*`, incl. `.foot`),
   * composed in at the `LocomotionApi` traverse seam (mirroring
   * `LoadBearing.drainForTraversal`). Derived from live conditions, so it
   * eases as the wound dresses / heals. No-op without a `Reserved`
   * `endurance` reserve. Distinct from fracture's slot-disable.
   */
  drainForLimp(): void;

  // ---------- death seam (cause-of-death field + postmortem seam) ----------
  getCauseOfDeath(): string | null;
  setCauseOfDeath(value: string | null): void;

  // ---------- the dying clock ----------
  /**
   * Enter the dying state: the body has crossed a lethal threshold and the
   * `windowSec` clock now decides, not the threshold.
   *
   * **Idempotent.** A body already dying keeps its first record and its
   * first window — a second driver piling on does not shorten the story.
   * The one thing a later call may still do is attach `blame` if none was
   * recorded yet, so combat can stamp attribution onto a bleed-out that
   * began before the fight resolved.
   *
   * Called by drivers directly on the body (an object-owned mutation, the
   * shipped harm rule), never through an Api.
   */
  beginDying(cause: string, windowSec?: number, blame?: unknown): void;
  /** Is this body in the rescuable interval before death? */
  isDying(): boolean;
  /** Game-seconds left before the window expires, or `null` if not dying. */
  getDyingRemainingSec(): number | null;
  /**
   * Pull the body back from the edge: drop the dying record. Returns
   * whether there was one.
   *
   * **Rescued, not healed** — deliberately. Whatever drove the body under
   * (the wound, the cold, the toxin) is untouched, so if the threshold is
   * still crossed the next reconcile re-arms `dying`. Stabilizing someone
   * in a snowdrift buys them time, not a life.
   */
  stabilize(): boolean;

  // ---------- the material fork family (see MATERIAL_FORK_SLICES) ----------
  forkSlice_Vitals(): unknown;
  forkSlice_Trauma(): unknown;
  forkSlice_CauseOfDeath(): unknown;
  forkSlice_Anatomy(): unknown;
  /**
   * Adopt a forked material record onto this body — the corpse side of the
   * death fork.
   *
   * **Not a `mergeSlice_`, on purpose.** See {@link MATERIAL_FORK_SLICES}:
   * naming it that would put material state back on the Forkable protocol
   * and make a corpse reanimatable by one ordinary-looking call. Gated to
   * the death choreography.
   */
  adoptMaterialState(slices: Record<string, unknown>): void;

  /**
   * Write every vital sign back to its species baseline.
   *
   * Lives here rather than on `Creature` because the sign→unit and
   * sign→field maps are module-private to this file. Two consumers: the
   * snapshot-healing backstop (a body that came back from storage marked
   * dead) and the death choreography (the body is drained before it is
   * destructed, so nothing dead ever reaches `holder_snapshots`).
   */
  resetVitalsToSpeciesBaseline(): void;
  /**
   * Postmortem-progression seam. Death is living-stop + postmortem-start:
   * living processes freeze and postmortem changes (algor / rigor / livor
   * / decomposition) would begin here. v1 ships ZERO — returns `[]`; the
   * seam exists for a future forensics wave.
   */
  getPostmortemProgressions(): readonly string[];

  // ---------- anatomy — resolves instance-delta → BodyPlan ----------
  getParts(): ResolvedBodyPart[];
  getPart(key: string): ResolvedBodyPart | null;
  getInjuredParts(): ResolvedBodyPart[];
  /** Coarse part→slot coupling: a missing part disables its slots. */
  isSlotDisabledByAnatomy(slot: string): boolean;
  /**
   * Trauma part→slot coupling: an active fracture above the impair
   * threshold at the slot's `bodyPart` greys the slot's affordances. A
   * derived read (heals as the fracture heals), sibling of
   * `isSlotDisabledByAnatomy`.
   */
  isSlotImpairedByTrauma(slot: string): boolean;

  // ---------- conditions — both kinds, one collection ----------
  getConditions(): readonly ActiveCondition[];
  /**
   * The Hydrator's Phase-1 entry for the persisted `conditions`
   * collection — the seam that normalizes each record's magical
   * provenance tag on the way in. See the implementation note.
   */
  setConditions(conditions: readonly ActiveCondition[]): void;
  hasCondition(pred: (c: ActiveCondition) => boolean): boolean;
  /**
   * **The application veto** — may this condition land on this body at
   * all? Default `{ok: true}`; compose via `super` to refuse.
   *
   * The `canEvict` shape, deliberately: same doctrine (the engine asks,
   * the object decides), same default bias (permission), same doc tier.
   * It is what makes immunity and resistance *expressible* — an
   * amulet-conferred immunity refuses the condition rather than the
   * engine having to keep a registry of who is immune to what.
   */
  canAfflict(condition: ActiveCondition): VetoResult;
  /**
   * Add a condition (a Trauma value or an AfflictionRecord). Returns
   * whether it actually landed — {@link canAfflict} may refuse it.
   * Callers that do not care may ignore the result; callers that report
   * an outcome (`ConditionApi.inflict`) must not.
   */
  afflict(condition: ActiveCondition): boolean;
  /** Remove a condition by reference; true if it was present. */
  relieve(condition: ActiveCondition): boolean;
  /** Release a sustained magical effect: un-realize, destruct any bound
   * emitter, drop the condition. Expiry and tag-keyed dispel both land here. */
  releaseSustained(s: SustainedEffect): void;
  /** Is the body held fast by a shock's tetany ("can't let go")? The volition
   * gate release / drop / move verbs consult. */
  isTetanized(): boolean;
  /** Is a being-shocked circuit currently closed on this body? */
  isBeingShocked(): boolean;

  // ---------- storage (public for the Hydrator) ----------
  _coreTemperature: Quantity<'K'>;
  _heartRate: Quantity<'bpm'>;
  _respiratoryRate: Quantity<'bpm'>;
  _bloodPressureSystolic: Quantity<'mmHg'>;
  _bloodPressureDiastolic: Quantity<'mmHg'>;
  _spo2: Quantity<'%'>;
  _bloodVolume: Quantity<'L'>;
  causeOfDeath: string | null;
  bodyPartDeltas: Record<string, BodyPartDelta>;
  conditions: ActiveCondition[];
}

export function VitalsMixin<TBase extends MixinConstructor>(Base: TBase) {
  // A class DECLARATION, not an expression: legacy decorators are only
  // valid on declarations, and `adoptMaterialState` carries a security
  // gate. Same shape as the shipped `ChattelMixin`.
  class VitalsMixin extends Base implements Vitals {
    static _mixinName = 'VitalsMixin';

    static fieldMeta: FieldMeta = {
      _coreTemperature: { persistent: true, marshaller: QuantityMarshaller.pathFor('K'), runtimeState: true },
      _heartRate: { persistent: true, marshaller: QuantityMarshaller.pathFor('bpm'), runtimeState: true },
      _respiratoryRate: { persistent: true, marshaller: QuantityMarshaller.pathFor('bpm'), runtimeState: true },
      _bloodPressureSystolic: { persistent: true, marshaller: QuantityMarshaller.pathFor('mmHg'), runtimeState: true },
      _bloodPressureDiastolic: { persistent: true, marshaller: QuantityMarshaller.pathFor('mmHg'), runtimeState: true },
      _spo2: { persistent: true, marshaller: QuantityMarshaller.pathFor('%'), runtimeState: true },
      _bloodVolume: { persistent: true, marshaller: QuantityMarshaller.pathFor('L'), runtimeState: true },
      causeOfDeath: { persistent: true, runtimeState: true },
      bodyPartDeltas: { persistent: true, runtimeState: true },
      conditions: { persistent: true, runtimeState: true },
    };

    // ---------- storage; defaults are the universe-default baselines ----------
    public _coreTemperature: Quantity<'K'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.coreTemperature.baseline,
      'K',
    );
    public _heartRate: Quantity<'bpm'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.heartRate.baseline,
      'bpm',
    );
    public _respiratoryRate: Quantity<'bpm'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.respiratoryRate.baseline,
      'bpm',
    );
    public _bloodPressureSystolic: Quantity<'mmHg'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodPressureSystolic.baseline,
      'mmHg',
    );
    public _bloodPressureDiastolic: Quantity<'mmHg'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodPressureDiastolic.baseline,
      'mmHg',
    );
    public _spo2: Quantity<'%'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.spo2.baseline,
      '%',
    );
    public _bloodVolume: Quantity<'L'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodVolume.baseline,
      'L',
    );

    public causeOfDeath: string | null = null;
    public bodyPartDeltas: Record<string, BodyPartDelta> = {};
    public conditions: ActiveCondition[] = [];

    /**
     * Reconcile-on-read reentrancy guard — a plain transient flag, never
     * persisted. Case (1): it protects the wound reconcile from
     * re-triggering itself through the vital-sign reads it performs
     * (`this.getVitalSign('bloodVolume')` inside `reconcileConditions`).
     */
    private _reconcilingConditions = false;

    // ---------- vital signs ----------

    public getVitalSign(sign: VitalSign): Quantity<Unit> {
      // A blood-volume read must reflect any in-flight bleed; a heart-rate
      // read must reflect a fibrillating shock (the electrocution death seam
      // — the previously-undriven heartRate is armed here).
      if (sign === 'bloodVolume' || sign === 'heartRate') {
        this.reconcileConditions();
      }
      return (this as unknown as Record<string, Quantity<Unit>>)[
        VITAL_FIELD[sign]
      ]!;
    }

    public setVitalSign(sign: VitalSign, value: Quantity<Unit>): void {
      assertVitalQuantity(value, sign);
      (this as unknown as Record<string, Quantity<Unit>>)[VITAL_FIELD[sign]] =
        value;
    }

    // ---------- the dying clock ----------

    /**
     * The raw record, read straight off storage. Deliberately does NOT
     * reconcile: the band and consciousness readouts call it from *inside*
     * `reconcileConditions`' reentrancy guard, and going back through
     * `getConditions()` there would recurse.
     */
    private hasDyingRecord(): boolean {
      return this.conditions.some((c) => c.kind === 'dying');
    }

    private dyingRecord(): DyingRecord | null {
      for (const c of this.conditions) if (c.kind === 'dying') return c;
      return null;
    }

    public beginDying(
      cause: string,
      windowSec?: number,
      blame?: unknown,
    ): void {
      const existing = this.dyingRecord();
      if (existing) {
        // Already dying: keep the first cause and the first window — a
        // second driver piling on does not shorten the story. Attribution
        // may still land, so combat can stamp a bleed-out it caused.
        if (blame && !existing.accountability) existing.accountability = blame;
        return;
      }
      const record: DyingRecord = {
        kind: 'dying',
        cause,
        windowSec: windowSec ?? HARM_DEFAULTS.DYING_WINDOW_SEC_DEFAULT,
        elapsed: 0,
      };
      if (blame) record.accountability = blame;
      this.afflict(record);
    }

    public isDying(): boolean {
      this.reconcileConditions();
      return this.hasDyingRecord();
    }

    public getDyingRemainingSec(): number | null {
      this.reconcileConditions();
      const record = this.dyingRecord();
      if (!record) return null;
      return Math.max(0, record.windowSec - record.elapsed);
    }

    public stabilize(): boolean {
      const record = this.dyingRecord();
      if (!record) return false;
      this.relieve(record);
      return true;
    }

    /**
     * The window ran out — route through the single death transition,
     * which stamps the cause, flips the lifecycle synchronously, and
     * writes the chronicle deed + the accountability row.
     *
     * Fire-and-forget from this sync reconcile: everything a reader can
     * observe happens inside `die`'s synchronous prefix, and only the
     * ledger I/O is deferred. The record's attribution (stamped by
     * whoever put the body in the window) rides along inside `die`.
     */
    private expireDying(record: DyingRecord): void {
      void ConditionApi.die(this as unknown as Stuff, record.cause);
    }

    // ---------- the material fork family ----------

    public forkSlice_Vitals(): unknown {
      const out: Record<string, number> = {};
      for (const sign of VITAL_SIGNS) {
        out[sign] = (
          this as unknown as Record<string, Quantity<Unit>>
        )[VITAL_FIELD[sign]]!.rawValue();
      }
      return out;
    }

    public forkSlice_Trauma(): unknown {
      // The wound map as it stood, minus the dying record — the clock is
      // resolved by the transition, and a corpse is not still dying.
      return structuredClone(
        this.conditions.filter((c) => c.kind !== 'dying'),
      );
    }

    public forkSlice_CauseOfDeath(): unknown {
      return { causeOfDeath: this.causeOfDeath };
    }

    public forkSlice_Anatomy(): unknown {
      return structuredClone(this.bodyPartDeltas);
    }

    @CallSecurity(ByConditionLogic)
    @Final
    @Unshadowable
    public adoptMaterialState(slices: Record<string, unknown>): void {
      const vitals = slices.Vitals as Record<string, number> | undefined;
      if (vitals) {
        for (const sign of VITAL_SIGNS) {
          const raw = vitals[sign];
          if (typeof raw === 'number') {
            this.setVitalSign(sign, Quantity.of(raw, VITAL_UNITS[sign]));
          }
        }
      }
      const trauma = slices.Trauma as ActiveCondition[] | undefined;
      if (Array.isArray(trauma)) this.conditions = structuredClone(trauma);
      const cod = slices.CauseOfDeath as
        | { causeOfDeath: string | null }
        | undefined;
      if (cod) this.causeOfDeath = cod.causeOfDeath;
      const anatomy = slices.Anatomy as
        | Record<string, BodyPartDelta>
        | undefined;
      if (anatomy) this.bodyPartDeltas = structuredClone(anatomy);
    }

    /**
     * Every sign back to its species baseline. Degrades to the universe
     * default profile when no species resolves (a fresh dev DB, a fixture),
     * because the callers — snapshot healing and the death drain — must not
     * throw on a body whose species is missing.
     */
    public resetVitalsToSpeciesBaseline(): void {
      for (const sign of VITAL_SIGNS) {
        const baseline = this.getVitalBand(sign).baseline;
        this.setVitalSign(sign, Quantity.of(baseline, VITAL_UNITS[sign]));
      }
    }

    /**
     * The survivable band for a sign — from the host's species
     * `vitalProfile`, or the universe default. Requires `OrganismMixin`
     * (runtime-guarded). The "always composed with Organism" rule lives
     * here, not in a comment.
     */
    public getVitalBand(sign: VitalSign): VitalBand {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) {
        throw new Error(
          'VitalsMixin requires OrganismMixin (species band profile)',
        );
      }
      const profile =
        self.getSpecies()?.getVitalProfile() ?? UNIVERSE_DEFAULT_VITAL_PROFILE;
      return profile[sign];
    }

    // ---------- derived readouts (computed every call, never stored) ----------

    /**
     * The accessible band over blood-volume fraction + vitals-out-of-
     * band. Reserves and trauma fold additional
     * load in at the marked seam. A corpse (`lifecycleState: 'dead'`)
     * reads `dead`; a body inside the rescuable window reads `dying`;
     * otherwise the band reflects the *substrate*.
     */
    public getConditionBand(): ConditionBand {
      this.reconcileConditions();
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) {
        throw new Error('VitalsMixin requires OrganismMixin (lifecycle state)');
      }
      if (self.getLifecycleState() === 'dead') return 'dead';
      if (this.hasDyingRecord()) return 'dying';

      const bvBand = this.getVitalBand('bloodVolume');
      const bv = this._bloodVolume.rawValue();
      // Blood volume at/below its survivable floor reads `dying`, not
      // `dead`: the clock kills, never the threshold. (This returned
      // `dead` before the driver existed — a rescued body would otherwise
      // still read as a corpse.)
      if (bv <= bvBand.survivableMin) return 'dying';

      let severity = 0;
      const bvFraction = bvBand.baseline > 0 ? bv / bvBand.baseline : 1;
      if (bvFraction < 0.95) severity += 1;
      if (bvFraction < 0.8) severity += 1;
      if (bvFraction < 0.65) severity += 1;

      for (const sign of VITAL_SIGNS) {
        if (sign === 'bloodVolume') continue;
        const band = this.getVitalBand(sign);
        const v = this.getVitalSign(sign).rawValue();
        if (v < band.survivableMin || v > band.survivableMax) severity += 1;
      }

      // A floored biological reserve (exhaustion / starvation /
      // dehydration) degrades the body. `isReserved` narrows the host so
      // the reserve surface is type-checked (no duck-typing cast).
      if (MixinApi.isReserved(self)) {
        for (const r of self.getReserves().values()) {
          if (r.theme === 'biological' && r.current.rawValue() <= 0) {
            severity += 1;
          }
        }
      }
      // Active trauma adds load (coarse: each non-trivial wound).
      for (const c of this.conditions) {
        if (c.kind === 'trauma' && c.severity >= 0.5) severity += 1;
      }

      const idx = Math.min(severity, SEVERITY_BANDS.length - 1);
      return SEVERITY_BANDS[idx]!;
    }

    /**
     * Consciousness below death — derived from blood volume + SpO₂.
     * Gates animate verbs like death but is recoverable. A corpse reads
     * `dead`. Head trauma is folded in below.
     */
    public getConsciousness(): Consciousness {
      this.reconcileConditions();
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) {
        throw new Error('VitalsMixin requires OrganismMixin (lifecycle state)');
      }
      if (self.getLifecycleState() === 'dead') return 'dead';
      // Dying IS incapacitation. Without this, six of the nine drivers
      // leave a dying body walking and talking: this readout only knows
      // about blood volume, SpO₂ and head trauma, so a body dying of cold,
      // heat, hunger, thirst, toxin or electrocution reads `conscious`
      // right up to the moment it dies. Placed before those reads so the
      // cause makes no difference to the answer.
      if (this.hasDyingRecord()) return 'unconscious';

      const bvBand = this.getVitalBand('bloodVolume');
      const bvFraction =
        bvBand.baseline > 0 ? this._bloodVolume.rawValue() / bvBand.baseline : 1;
      const spo2Band = this.getVitalBand('spo2');
      const spo2 = this._spo2.rawValue();

      // Significant head trauma forces unconscious.
      const headTrauma = this.conditions.some(
        (c) =>
          c.kind === 'trauma' &&
          c.site.startsWith('body.head') &&
          c.severity >= 0.5,
      );
      if (
        bvFraction < 0.7 ||
        spo2 <= spo2Band.survivableMin ||
        headTrauma
      ) {
        return 'unconscious';
      }
      return 'conscious';
    }

    // ---------- locomotion coupling (the limp) ----------

    public drainForLimp(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isReserved(self) || !self.hasReserve('endurance')) return;
      let severity = 0;
      for (const c of this.conditions) {
        if (c.kind !== 'trauma') continue;
        if (c.type !== 'laceration' && c.type !== 'avulsion') continue;
        // Locomotor sites only — a leg / foot wound hobbles; a hand cut
        // does not. Foot keys (`body.leg.left.foot`) sit under `body.leg`.
        if (!c.site.startsWith('body.leg')) continue;
        severity += Math.max(0, c.severity);
      }
      if (severity <= 0) return;
      const cost = HARM_DEFAULTS.LIMP_DRAIN_PER_SEVERITY * severity;
      self.adjustReserve('endurance', Quantity.of(-cost, '%'));
    }

    // ---------- death seam ----------

    public getCauseOfDeath(): string | null {
      return this.causeOfDeath;
    }
    public setCauseOfDeath(value: string | null): void {
      this.causeOfDeath = value;
    }

    public getPostmortemProgressions(): readonly string[] {
      // v1 ships zero postmortem conditions — the seam, not the content.
      return [];
    }

    // ---------- anatomy resolver (instance-delta → BodyPlan) ----------

    /**
     * The body's parts, each merged with its instance delta. Walks the
     * shared `BodyPlan.bodyParts` and overlays `bodyPartDeltas`. Returns
     * `[]` for a body with no species/bodyplan (no anatomy without a
     * species) — graceful, not an error.
     */
    public getParts(): ResolvedBodyPart[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return [];
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return [];
      return plan.getBodyParts().map((part) => ({
        ...part,
        missing: this.bodyPartDeltas[part.key]?.missing ?? false,
      }));
    }

    public getPart(key: string): ResolvedBodyPart | null {
      return this.getParts().find((p) => p.key === key) ?? null;
    }

    public getInjuredParts(): ResolvedBodyPart[] {
      return this.getParts().filter((p) => p.missing);
    }

    public isSlotDisabledByAnatomy(slot: string): boolean {
      // The slot→part relation lives on the slot (`SlotSpec.bodyPart`):
      // resolve the slot's anatomical part, then check whether it's gone.
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const spec = self
        .getSpecies()
        ?.getBodyPlan()
        ?.getSlots()
        .find((s) => s.name === slot);
      if (!spec?.bodyPart) return false;
      return this.getPart(spec.bodyPart)?.missing ?? false;
    }

    public isSlotImpairedByTrauma(slot: string): boolean {
      // Same slot→part resolve as the anatomy gate, but the disqualifier
      // is an active fracture (above the impair threshold) sitting at the
      // slot's `bodyPart`. A derived read — no stored "impaired" flag; the
      // affordance returns the moment the fracture heals/clears.
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const spec = self
        .getSpecies()
        ?.getBodyPlan()
        ?.getSlots()
        .find((s) => s.name === slot);
      const part = spec?.bodyPart;
      if (!part) return false;
      return this.conditions.some(
        (c) =>
          c.kind === 'trauma' &&
          c.type === 'fracture' &&
          c.site === part &&
          c.severity >= HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY,
      );
    }

    // ---------- conditions (both kinds, one collection) ----------

    public getConditions(): readonly ActiveCondition[] {
      this.reconcileConditions();
      return this.conditions;
    }

    /**
     * Phase-1 hydrate entry for `conditions` (the Hydrator prefers a
     * `set<Field>` method over the bracket-assign fallback).
     *
     * The one invariant it enforces: **magical provenance is normalized
     * on the way in.** The tag split specified-by from fired-by
     * (requirements D2), and rows written before that split carry a
     * single `caster` field. A legacy row reads as both — which is the
     * honest reading, since before items existed the specifier and the
     * firer were the same object. A malformed tag is dropped rather than
     * carried, so a dispel scan never keys off a corrupt mark.
     */
    public setConditions(conditions: readonly ActiveCondition[]): void {
      if (!Array.isArray(conditions)) return;
      this.conditions = conditions.map((c) => {
        if (c == null || typeof c !== 'object') return c;
        if (!('magicOrigin' in c) || c.magicOrigin === undefined) return c;
        const normalized = MagicGrid.normalizeProvenance(c.magicOrigin);
        // A sustained effect IS magic — a tag that will not normalize
        // makes the record meaningless, so drop the tag and let the
        // sustained arm release it on the next reconcile.
        return { ...c, magicOrigin: normalized } as ActiveCondition;
      });
    }

    /**
     * Reconcile-on-read wound progression — the harm driver, reconcile
     * style (the metabolism / thermal / respiration precedent, NOT a
     * recurring push tick). For each active trauma, integrate the in-session
     * game-time elapsed since its `tickedAt` stamp through the trauma's
     * `tick`, relieve any wound healed to (near) zero, then check the
     * bleed→death floor. Called at the top of the reads that must reflect
     * the current bleed (`getVitalSign('bloodVolume')`, `getConditionBand`,
     * `getConsciousness`, `getConditions`).
     *
     * **Presence-freeze parity** with `Metabolic.reconcileMetabolism`:
     * first-touch stamp, linkdead re-stamp, `elapsed <= 0` guard, and the
     * far-past guard (a logout/relog gap integrates nothing). Cheap no-op
     * when no world clock runs (unit tests stay idle) or no trauma is
     * active. The `_reconcilingConditions` guard makes the vital-sign reads
     * this method performs non-reentrant.
     */
    private reconcileConditions(): void {
      if (this._reconcilingConditions) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return;
      // A corpse doesn't bleed — nothing left to progress.
      if (self.getLifecycleState() === 'dead') return;

      // In-session game-time; `null` when no world clock is running
      // (pre-boot / a unit test that hasn't bootstrapped one) → idle.
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();

      const traumas = this.conditions.filter(
        (c): c is Trauma => c.kind === 'trauma',
      );
      const shocks = this.conditions.filter(
        (c): c is SustainedShock => c.kind === 'shock',
      );
      const sustained = this.conditions.filter(
        (c): c is SustainedEffect => c.kind === 'sustained',
      );
      const decayingMagic = this.conditions.filter(
        (c): c is AfflictionRecord =>
          c.kind === 'affliction' && c.magicOrigin !== undefined,
      );
      const dyings = this.conditions.filter(
        (c): c is DyingRecord => c.kind === 'dying',
      );
      if (
        traumas.length === 0 &&
        shocks.length === 0 &&
        sustained.length === 0 &&
        decayingMagic.length === 0 &&
        dyings.length === 0
      ) {
        return;
      }

      // Linkdead freeze: the body lingers in-world but its clock is paused —
      // re-stamp so the away-gap never accumulates.
      const linkdead =
        MixinApi.isHasInteractive(self) && self.isLinkdead();

      this._reconcilingConditions = true;
      try {
        for (const t of traumas) {
          // First touch: seed the stamp so a fresh wound doesn't integrate
          // a giant gap from epoch.
          if (t.tickedAt === undefined) {
            t.tickedAt = nowS;
            continue;
          }
          if (linkdead) {
            t.tickedAt = nowS;
            continue;
          }
          const elapsed = nowS - t.tickedAt;
          if (elapsed <= 0) {
            t.tickedAt = nowS;
            continue;
          }
          // Far-past guard: a gap this long means absence — integrate
          // nothing (real-life absence never bleeds you).
          if (elapsed > HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
            t.tickedAt = nowS;
            continue;
          }
          t.tickedAt = nowS;
          TRAUMA_BEHAVIOR[t.type].tick(this, t, elapsed);
        }

        // Sustained shock — the being-shocked circuit. Same presence-freeze
        // machinery as trauma: integrate current × elapsed as contact burn,
        // drive heartRate at the fibrillation band, and relieve the moment the
        // circuit breaks (unless tetany holds it closed). Reuses the trauma
        // stamp idiom verbatim.
        for (const s of shocks) {
          if (s.tickedAt === undefined) {
            s.tickedAt = nowS;
            continue;
          }
          if (linkdead) {
            s.tickedAt = nowS;
            continue;
          }
          const elapsed = nowS - s.tickedAt;
          if (elapsed <= 0) {
            s.tickedAt = nowS;
            continue;
          }
          if (elapsed > HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
            s.tickedAt = nowS;
            continue;
          }
          s.tickedAt = nowS;
          // Re-verify the circuit is still closed (tetany holds it shut).
          if (!this.shockCircuitClosed(s)) {
            this.relieve(s);
            continue;
          }
          this.accrueShockBurn(s, elapsed);
          // Fibrillation drives the heart toward arrest (the electrocution
          // death seam — see docs/subsystems/electricity.md).
          const fib = elecDial(AppSettingKeys.electricityFibrillationAmps, 0.1);
          if (s.current >= fib) {
            const drive =
              elecDial(AppSettingKeys.electricityArrestDrivePerSec, 40) *
              elapsed;
            const hr = this.getVitalSign('heartRate').rawValue();
            this.setVitalSign(
              'heartRate',
              Quantity.of(Math.max(0, hr - drive), 'bpm'),
            );
          }
        }

        // Sustained magical effects — the modifier half of magic's
        // impulse/modifier split, realized BY PULL: active → the bound
        // realization holds; dormant (a suppression field set the flag) →
        // un-realized but not released; expired → released (bound emitter
        // destructed). Same presence-freeze stamp idiom.
        for (const s of sustained) {
          if (s.tickedAt === undefined) {
            s.tickedAt = nowS;
            this.reconcileSuppression(s);
            this.applySustainedRealization(s);
            continue;
          }
          if (linkdead) {
            s.tickedAt = nowS;
            continue;
          }
          s.tickedAt = nowS;
          if (
            s.expiresAt !== undefined &&
            nowS >= s.expiresAt &&
            !this.renewSustained(s, nowS)
          ) {
            this.releaseSustained(s);
            continue;
          }
          this.reconcileSuppression(s);
          this.applySustainedRealization(s);
        }

        // Magic-tagged afflictions decay on their authored timescale (the
        // v1 dread evolution — a landed impulse fades; suppression never
        // touches it, dispel relieves it early).
        const decayPerSec = magicDial(AppSettingKeys.magicDreadDecayPerSec, 0.005);
        for (const a of decayingMagic) {
          if (a.tickedAt === undefined) {
            a.tickedAt = nowS;
            continue;
          }
          if (linkdead) {
            a.tickedAt = nowS;
            continue;
          }
          const elapsed = nowS - a.tickedAt;
          a.tickedAt = nowS;
          if (elapsed <= 0 || elapsed > HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
            continue;
          }
          a.stage -= decayPerSec * elapsed;
          if (a.stage <= 0) this.relieve(a);
        }

        // Relieve any wound healed to (near) zero severity.
        for (const t of traumas) {
          if (t.severity <= HARM_DEFAULTS.CLEARED_SEVERITY) this.relieve(t);
        }

        // ── the dying clock ────────────────────────────────────────────
        // DELIBERATELY UNLIKE EVERY ARM ABOVE. This one does NOT re-stamp
        // on `linkdead` and does NOT bail on the far-past guard. Both of
        // those exist so that being away never costs you anything — which
        // is right for hunger and wounds, and catastrophic here: a body
        // that has crossed a lethal threshold would stop dying the moment
        // its player disconnected, making Alt-F4 a cure for death.
        //
        // If you are "fixing" this by copying the `if (linkdead)` block
        // from above, stop: that IS the bug. A body dies on schedule
        // whether or not anyone is watching; the answer to "I crashed
        // while bleeding out" is a medic, not a network stack.
        //
        // The far-past guard is skipped for the same reason. Elsewhere a
        // huge elapsed gap produces an absurd result, so it is dropped;
        // here a huge gap produces the CORRECT result — you were dying,
        // nobody came, and the reading resolves that when someone finally
        // looks.
        for (const d of dyings) {
          if (d.tickedAt === undefined) {
            d.tickedAt = nowS;
            continue;
          }
          const dyingElapsed = nowS - d.tickedAt;
          d.tickedAt = nowS;
          if (dyingElapsed <= 0) continue; // clock ran backwards only
          d.elapsed += dyingElapsed;
          if (d.elapsed >= d.windowSec) this.expireDying(d);
        }

        // Bleed → death floor. `getConsciousness()` already reads a low
        // blood volume as `unconscious`, so the conscious → unconscious
        // waypoint falls out for free — harm writes only the death sign.
        const floor = this.getVitalBand('bloodVolume').survivableMin;
        if (this._bloodVolume.rawValue() <= floor) {
          if (MixinApi.isOrganism(self) && !self.isDead()) {
            // Enter the window, don't end it — the clock kills from here,
            // which is what makes a medic able to matter.
            this.beginDying(
              'exsanguination',
              HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC,
            );
          }
        }

        // Electrocution → death floor. A fibrillating current drove heartRate
        // to/below its survivable floor → arrest. Death ≠ destruction — the
        // vitals seam stamps it, never `StuffApi.destruct`. `getConsciousness`
        // already reads the failing heart as unconscious, so the waypoint is
        // free.
        if (shocks.length > 0) {
          const hrFloor = this.getVitalBand('heartRate').survivableMin;
          if (
            this._heartRate.rawValue() <= hrFloor &&
            MixinApi.isOrganism(self) &&
            !self.isDead()
          ) {
            this.beginDying(
              'electrocution',
              HARM_DEFAULTS.ELECTROCUTION_DYING_WINDOW_SEC,
            );
          }
        }
      } finally {
        this._reconcilingConditions = false;
      }
    }

    /**
     * Is the being-shocked circuit still closed? Tetany holds it shut
     * regardless of volition ("can't let go"); otherwise re-probe the source
     * — the body may have stepped out of the pool or the source may have died.
     * Cheap: the whole graph is re-walked only when a shock is active (rare).
     */
    /**
     * The dormancy read (SYNC — this runs inside the conditions
     * reconcile): a sustained effect inside a `suppresses-magic` field
     * matching its grid address goes dormant (un-realized, not
     * released); stepping out re-realizes it on the next pull. The
     * suppressible line IS the impulse/modifier line — nothing else in
     * this reconcile consults the field.
     */
    /**
     * **Host-held vs term-bought** (magic-items D12), at the moment the
     * distinction actually bites: expiry.
     *
     * A binding must be paid for continuously. A **charged host** can
     * pay — its standby draw meters the cost against its own reserve —
     * so it renews its own effect for another term and the hold
     * survives. A **consumable** paid once and is gone: there is
     * nothing left to renew with, so the term simply runs out.
     *
     * That is what makes the old guideline a *derivation* rather than a
     * rule. Nothing forbids a shadow sourced from a potion; it just
     * cannot outlive the term it bought — which is exactly why
     * long-lived sustained effects are forged as rings and not bottled.
     *
     * Returns whether the effect was renewed.
     */
    private renewSustained(s: SustainedEffect, nowS: number): boolean {
      // Term-bought: nothing to ask. It ran out.
      if (!s.sustainedBy) return false;
      const host = StuffApi.findByTemplatePath(s.sustainedBy);
      if (!host || !MixinApi.isCharged(host)) return false;
      // A flat host cannot hold anything up either — the ring goes out
      // rather than running on nothing.
      if (host.isDepleted()) return false;
      const term = s.sustainedFor && s.sustainedFor > 0 ? s.sustainedFor : 0;
      if (term <= 0) return false;
      s.expiresAt = nowS + term;
      return true;
    }

    private reconcileSuppression(s: SustainedEffect): void {
      const self = this as unknown as Stuff;
      const place = MixinApi.isContainable(self)
        ? (self.getContainer() ?? null)
        : null;
      const field = Suppressions.fieldAt(place);
      s.dormant = Suppressions.suppresses(
        field,
        s.magicOrigin.verb,
        s.magicOrigin.noun,
      );
    }

    /**
     * Realize (or, dormant, un-realize) a sustained magical effect BY
     * PULL — the modifier's whole runtime is this idempotent apply:
     * `emit-light` drives the bound orb's flux (0 while dormant),
     * `cloak` drives the imposed disguise. A bound emitter that no
     * longer exists releases the effect (someone destructed the orb).
     */
    private applySustainedRealization(s: SustainedEffect): void {
      const self = this as unknown as Stuff;
      if (s.realizes === 'emit-light') {
        const orb = s.boundStuffId
          ? StuffApi.findById(s.boundStuffId)
          : undefined;
        if (!orb || !MixinApi.isLightSource(orb)) {
          this.relieve(s);
          return;
        }
        const lumens = s.dormant
          ? 0
          : magicDial(AppSettingKeys.magicGlowlightLumens, 500);
        if (orb.getEmittedFlux().rawValue() !== lumens) {
          orb.setEmittedFlux(Quantity.of(lumens, 'lumen'));
        }
        return;
      }
      if (s.realizes === 'cloak' && MixinApi.isDisguisable(self)) {
        if (s.dormant) {
          self.setDisguise(null);
        } else if (s.disguise) {
          self.setDisguise({
            appearsAs: s.disguise,
            covers: ['face'],
            masksIdentity: true,
          });
        }
      }
    }

    /**
     * Release a sustained magical effect — expiry and dispel both land
     * here: un-realize, destruct any bound emitter, drop the condition.
     * Public: `MagicLogic`'s tag-keyed dispel is the second caller.
     */
    public releaseSustained(s: SustainedEffect): void {
      const self = this as unknown as Stuff;
      if (s.realizes === 'cloak' && MixinApi.isDisguisable(self)) {
        self.setDisguise(null);
      }
      if (s.boundStuffId) {
        const bound = StuffApi.findById(s.boundStuffId);
        if (bound) StuffApi.destruct(bound);
      }
      this.relieve(s);
    }

    private shockCircuitClosed(s: SustainedShock): boolean {
      if (s.tetany) return true;
      if (!s.source) return false;
      const source = StuffApi.findByTemplatePath(s.source);
      if (!source || !MixinApi.isEnergized(source)) return false;
      const self = this as unknown as Stuff;
      return (
        ElectricityApi.currentThrough(
          source as Stuff & Energized,
          self,
        ).rawValue() > 0
      );
    }

    /** Accrue contact-burn severity from current × elapsed at the shock's
     * sites (find-or-create one shock burn per site). */
    private accrueShockBurn(s: SustainedShock, elapsedSec: number): void {
      const perAmpSec = elecDial(
        AppSettingKeys.electricitySustainBurnPerAmpSec,
        2,
      );
      const add = Math.max(0, s.current) * perAmpSec * elapsedSec;
      if (add <= 0) return;
      const site = s.sites[0] ?? 'body.torso';
      let burn = this.conditions.find(
        (c): c is Trauma =>
          c.kind === 'trauma' &&
          c.type === 'burn' &&
          c.site === site &&
          c.mechanism === 'shock',
      );
      if (!burn) {
        burn = {
          kind: 'trauma',
          type: 'burn',
          site,
          severity: 0,
          mechanism: 'shock',
        };
        this.conditions.push(burn);
      }
      burn.severity += add;
    }

    /** Is the body held fast by a shock's tetany ("can't let go")? The
     * volition gate release / drop / move verbs consult. */
    public isTetanized(): boolean {
      return this.conditions.some(
        (c) => c.kind === 'shock' && c.tetany === true,
      );
    }

    /** Is a being-shocked circuit currently closed on this body? */
    public isBeingShocked(): boolean {
      return this.conditions.some((c) => c.kind === 'shock');
    }

    public hasCondition(pred: (c: ActiveCondition) => boolean): boolean {
      return this.conditions.some(pred);
    }

    /**
     * The application veto's terminal — permission by default.
     *
     * @hook Override and `super`-chain to refuse a condition. Exactly
     * the `canEvict` contract: the engine asks, the object decides, and
     * an object that says nothing lets it through. That default is what
     * keeps this inert for the seven shipped `inflict` callers (harm,
     * hazard, fire, electricity, metabolism, combat, magic) while making
     * immunity expressible without a registry.
     *
     * ⚠ **Where it runs matters.** `ConditionApi.inflict` consults it
     * AFTER the covering-stack fold and BEFORE the write — so armor
     * still attenuates, and a vetoed condition simply never lands.
     * Moving it earlier would stop armor attenuating; later, and the
     * body would already be hurt.
     */
    public canAfflict(_condition: ActiveCondition): VetoResult {
      return { ok: true };
    }

    public afflict(condition: ActiveCondition): boolean {
      // The veto layer (magic-items D14). A composed mixin — a worn
      // amulet's conferred immunity — may refuse outright. Routed
      // through the proxy `this` so a shadow can veto too.
      const verdict = (this as unknown as Vitals).canAfflict(condition);
      if (!verdict.ok) return false;
      // Pure add this build — no onset()/tick() invocation, nothing ticks.
      this.conditions.push(condition);
      return true;
    }

    public relieve(condition: ActiveCondition): boolean {
      const i = this.conditions.indexOf(condition);
      if (i === -1) return false;
      this.conditions.splice(i, 1);
      return true;
    }
  }
  return VitalsMixin;
}
