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
import { ExecutionContextApi } from '../../api/execution-context';
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
import type { VitalEffect, ProgressionLaw } from '../../platform/idea/Condition';
import type Condition from '../../platform/idea/Condition';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ConditionApi } from '../../api/condition';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Energized } from '../electricity/Energized';
import { TemplatePaths, TemplatePathPrefixes } from '../paths';
import { Contamination } from '../material/Contaminable';
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

/**
 * The in-host infection dials. Playtest-tuned rates, greppable in one
 * place (the `HARM_DEFAULTS` precedent). The per-ORGANISM half — how fast
 * it grows in you, and how long before you feel it — is authored on the
 * `Condition` row, never here: these are the body's side of the fight.
 */
const VITALS_DEFAULTS = {
  SECONDS_PER_HOUR: 3600,
  /** The baseline rate a body clears an infection at, per game-hour. */
  INFECTION_CLEARANCE_PER_HOUR: 0.22,
  /** Below this load the body has won and the record is relieved. */
  INFECTION_CLEARED_LOAD: 0.01,
  /** Load per severity stage — three stages over the full range. */
  INFECTION_STAGE_LOAD: 0.34,
  /** `%` hydration a severe infection costs per game-hour, per stage over 1. */
  INFECTION_HYDRATION_PCT_PER_HOUR: 3,
} as const;

/**
 * ⭐ **D12 — resistance is thin.** How well a body fights an infection off
 * is one read of how well the body is doing at all: a healthy one clears
 * faster, a critical one barely clears at all. No immune memory, no
 * exposure history, no per-pathogen resistance — those belong to the
 * disease build, and inventing them here would be the richest possible way
 * to make the wrong thing true.
 */
function infectionResistance(band: ConditionBand): number {
  switch (band) {
    case 'healthy':
      return 1;
    case 'hurt':
      return 0.8;
    case 'serious':
      return 0.55;
    case 'critical':
      return 0.3;
    default:
      return 0.2;
  }
}

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
  isSlotImpairedByCondition(slot: string): boolean;
  /** Whether this body carries the named vital sign at all (D22). */
  hasVitalSign(sign: VitalSign): boolean;
  /** Bands of expressed competence this body currently suppresses. */
  expressionSuppression(): number;

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

/**
 * ⭐ **A condition's own severity axis, in one number.** A stage for a
 * dwelling or banded condition, a load for an infection — whichever the
 * record carries. `applyEffects` scales a signature by it, so one row's
 * declared effect gets worse as that particular condition gets worse and
 * the arm that advanced it never has to know.
 */
/** The law a record's own row declares, or null when a driver owns it. */
function lawOf(record: AfflictionRecord): ProgressionLaw | null {
  const row = StuffApi.findByTemplatePath<Condition>(record.templatePath);
  return row?.getProgression()?.law ?? null;
}

function intensityOf(record: AfflictionRecord): number {
  if (record.pathogenLoad !== undefined) {
    // A load is [0,1]; a stage-0 infection is incubating and does nothing.
    return record.stage > 0 ? record.pathogenLoad : 0;
  }
  return Math.max(0, record.stage);
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
    /**
     * ⭐⭐ **Does this body HAVE this sign at all?** — D22, and it is a
     * deliberate no-op rather than a missing branch.
     *
     * The `constructa`, `plantae` and `fungi` clades exist. A construct
     * that takes an edge blow has a wound, and no bleed, and **that is
     * the honest answer** — not a throw, and not a zero-filled sign it
     * never had. A species says so by authoring the band's `baseline` at
     * zero, which is the shape `VitalProfile` already has (every sign is
     * required, so "absent" cannot mean "missing from the profile").
     *
     * ⚠ It has a test *because* the failure mode is the silent-and-closed
     * one this whole build exists to end: an effect that does nothing
     * because nobody wrote the branch reads exactly like an effect that
     * does nothing because the author said so.
     */
    public hasVitalSign(sign: VitalSign): boolean {
      try {
        return this.getVitalBand(sign).baseline > 0;
      } catch {
        return false; // no species resolved — nothing to perturb
      }
    }

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

    /**
     * ⭐⭐ **The effect channel — one interpreter every arm routes
     * through.**
     *
     * A condition's `signature` (a `Condition` row's, or a
     * `TraumaBehavior`'s) says what carrying it does to the body; this
     * applies it. `intensity` is the condition's own severity axis —
     * a stage, a wound severity, a pathogen load — so one row's effect
     * scales with how bad that particular condition has got, and the arm
     * that advanced it does not need to know what the effect was.
     *
     * ⚠ **Rates, integrated over elapsed game-time.** Nothing here fires
     * "once per tick": there is no tick. The whole condition machinery is
     * reconcile-on-read, so an effect that is not a rate has no
     * well-defined meaning across an absence — which is exactly why the
     * shipped `{sign, delta}` shape was never wired to anything.
     *
     * The two read-only kinds (`capability`, `expression`) are no-ops
     * here: they are consulted at the surface that cares, not integrated.
     */
    private applyEffects(
      effects: readonly VitalEffect[] | undefined,
      intensity: number,
      elapsedSec: number,
    ): void {
      if (!effects || effects.length === 0) return;
      const hours = elapsedSec / VITALS_DEFAULTS.SECONDS_PER_HOUR;
      if (!(hours > 0) || !(intensity > 0)) return;
      const self = this as unknown as Stuff;
      for (const e of effects) {
        switch (e.kind) {
          case 'vital': {
            // ⚠⚠ **A sign this species does not have is a NO-OP, and a
            // deliberate one** (D22). A construct that takes an edge blow
            // has a wound and no bleed, and that is the honest answer —
            // not a throw, and not a zero-filled sign it never had.
            if (!this.hasVitalSign(e.sign as VitalSign)) break;
            const cur = this.getVitalSign(e.sign as VitalSign);
            this.setVitalSign(
              e.sign as VitalSign,
              Quantity.of(
                Math.max(0, cur.rawValue() + e.perHour * intensity * hours),
                cur.unit,
              ),
            );
            break;
          }
          case 'reserve': {
            if (!MixinApi.isReserved(self)) break;
            if (!self.hasReserve(e.reserve)) break;
            self.adjustReserve(
              e.reserve,
              Quantity.of(e.pctPerHour * intensity * hours, '%'),
            );
            break;
          }
          // `capability` and `expression` are DERIVED READS — consulted
          // by `isSlotImpairedByCondition` and `expressionSuppression`,
          // never integrated. Listed so the switch stays total.
          case 'capability':
          case 'expression':
            break;
        }
      }
    }

    /**
     * ⭐⭐ **How many bands of expressed competence this body is currently
     * costing its owner.**
     *
     * Derived on read from the `expression` effects of the active
     * conditions, each scaled by its own taper — a condition at stage 6
     * of 12 costs half what it did at stage 0. Zero for a body carrying
     * nothing that suppresses.
     *
     * ⚠⚠ **It never touches the Transcript.** Being diminished is a fact
     * about the body right now, not a rewriting of what you have done;
     * the record stays byte-identical and `chronicle` shows no new row.
     * That is the whole difference between *punishment* and *a lie about
     * your history*.
     */
    public expressionSuppression(): number {
      let bands = 0;
      for (const c of this.getConditions()) {
        if (c.kind !== 'affliction') continue;
        const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
        const sig = row?.getSignature();
        if (!sig) continue;
        for (const e of sig) {
          if (e.kind !== 'expression') continue;
          // The taper: a `by: rest, atStage: N` condition fades toward
          // clear, and what it costs fades with it.
          const atStage = row?.getResolution()?.atStage;
          const frac =
            atStage && atStage > 0
              ? Math.max(0, 1 - c.stage / atStage)
              : 1;
          bands = Math.max(bands, Math.ceil(e.bands * frac));
        }
      }
      return bands;
    }

    public isSlotImpairedByCondition(slot: string): boolean {
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
      return this.conditions.some((c) => {
        if (c.kind !== 'trauma' || c.site !== part) return false;
        // ⭐ The generalized rule: a trauma type whose behaviour DECLARES
        // a `capability` effect takes the affordances of the part it sits
        // on, above its declared severity. The fracture rule, made
        // available to every wound type instead of hard-coded for one.
        for (const e of TRAUMA_BEHAVIOR[c.type]?.signature ?? []) {
          if (e.kind !== 'capability') continue;
          if (e.disables !== 'slots-at-site') continue;
          if (c.severity >= e.aboveSeverity) return true;
        }
        // The shipped fracture rule, until W10 moves it onto the table.
        return (
          c.type === 'fracture' &&
          c.severity >= HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY
        );
      });
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
     * ⭐⭐ **Advance ONE affliction under the law its own row declares,
     * then apply what that row says it does.**
     *
     * This is the collapse. Three arms — `decayingMagic`, `infections`,
     * `progressing` — each discriminated by *which optional field happens
     * to be set on the record* (`magicOrigin`, `pathogenLoad`, neither),
     * become one, dispatching on `progression.law`. The discriminator
     * moves from the shape of the record to **what the author said**,
     * which is what lets a fourth law be a row rather than a fourth arm.
     *
     * ⚠ The laws are the mechanisms the census already named, not new
     * ones: `stage` is the dwell counter, `decay` is the magic fade,
     * `logistic` is the in-host population, `burden` reads a toxin's live
     * amount. Nothing changed about any of them except who chooses.
     *
     * Every law is followed by `applyEffects` over the row's `signature`,
     * so **what a condition does is independent of how it progresses** —
     * the rule the whole ratchet exists to enforce.
     */
    private progressAffliction(
      record: AfflictionRecord,
      elapsedSec: number,
      nowS: number,
    ): void {
      const row = StuffApi.findByTemplatePath<Condition>(record.templatePath);
      if (!row) return;
      const spec = row.getProgression();
      switch (spec?.law) {
        case 'stage': {
          // Dwell time moves the stage. Before this arm existed, a body
          // three days into starvation staged identically to one that had
          // missed lunch.
          if (!(spec.intervalMs && spec.intervalMs > 0)) break;
          record.elapsed += elapsedSec * 1000;
          record.stage = Math.floor(record.elapsed / spec.intervalMs);
          break;
        }
        case 'decay': {
          // A landed impulse fades. The row may set its own rate; the
          // magic dial is the fallback the shipped rows still use.
          const rate =
            spec.decayPerSec ??
            magicDial(AppSettingKeys.magicDreadDecayPerSec, 0.005);
          record.stage -= rate * elapsedSec;
          if (record.stage <= 0) {
            this.relieve(record);
            return;
          }
          break;
        }
        case 'logistic': {
          this.progressInfection(record, elapsedSec, nowS);
          // `progressInfection` may have relieved the record outright.
          if (!this.conditions.includes(record)) return;
          break;
        }
        case 'burden':
          // Handled in the arm's pre-pass: a live read needs no elapsed
          // time, and must not sit behind the presence-freeze guards.
          break;
        default:
          break; // `null` — a driver outside the collection owns the clock
      }
      // ⭐ …and then, whatever the law, what the row SAYS it does.
      this.applyEffects(
        row.getSignature(),
        intensityOf(record),
        elapsedSec,
      );
      // A self-resolving condition clears itself at its declared stage.
      const res = row.getResolution();
      if (
        res?.by === 'rest' &&
        res.atStage !== undefined &&
        record.stage >= res.atStage
      ) {
        this.relieve(record);
      }
    }

    /**
     * Derive the stage of every `law: burden` affliction from the live
     * burden the metabolism carries. Clock-free by construction; called
     * before any of the time-integrating arms.
     */
    private reconcileBurdenStages(): void {
      for (const c of this.conditions) {
        if (c.kind !== 'affliction') continue;
        if (lawOf(c) !== 'burden') continue;
        this.progressBurden(c);
      }
    }

    /**
     * ⭐ **The burden law** — a toxin's stage is a live read of how much
     * of it the body is carrying, banded by the row's own
     * `toxinBehavior.bands`.
     *
     * ⚠ This is the arm that retires the eighth mechanism.
     * `Metabolic.reconcileToxinConditions` kept the state OUTSIDE the
     * condition collection and mirrored a band into `stage` from there —
     * two owners of one field, which is why `progressAffliction` used to
     * carry an explicit "skip anything with a `toxinBehavior`". Reading
     * the burden from here makes the condition's own arm the only writer.
     */
    private progressBurden(record: AfflictionRecord): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isMetabolic(self)) return;
      const type = record.templatePath.startsWith(
        TemplatePathPrefixes.metabolismCondition,
      )
        ? record.templatePath.slice(
            TemplatePathPrefixes.metabolismCondition.length,
          )
        : '';
      if (!type) return;
      const bands = self.toxinBandsFor(type);
      if (!bands || bands.length === 0) return;
      const level = self.toxinLevelFor(type);
      // The same reduce the parallel store used — one owner now.
      record.stage = bands.reduce(
        (acc, b) => (level >= b.threshold ? Math.max(acc, b.severity) : acc),
        0,
      );
    }

    /**
     * ⭐⭐ **Grow (or clear) one infection over `elapsedSec`, and derive
     * what it is doing to the body.**
     *
     * The load moves at a NET rate: the organism's authored in-host growth
     * against the body's own clearance. Both terms are per game-hour and
     * the integration is closed-form logistic, so the same arithmetic
     * serves a moment and an overnight absence.
     *
     * ⭐ **D12 — resistance is thin, and deliberately.** There is no immune
     * memory, no exposure history and no per-pathogen resistance. How well
     * a body fights this off is one read of how well the body is doing at
     * all: a healthy one clears faster than a critical one, and that is
     * the whole model. Anything richer belongs to the disease build.
     *
     * ⭐ **Nothing new kills anyone (criterion 16).** A severe infection
     * drains the body's HYDRATION, which is what dysentery actually does —
     * and dehydration already has a lethal cascade with a rescuable dying
     * window at the end of it. The illness does not need a death path of
     * its own and does not get one.
     */
    private progressInfection(
      record: AfflictionRecord,
      elapsedSec: number,
      nowS: number,
    ): void {
      const key = record.templatePath.startsWith(
        TemplatePathPrefixes.pathogenCondition,
      )
        ? record.templatePath.slice(
            TemplatePathPrefixes.pathogenCondition.length,
          )
        : '';
      const behavior = key ? Contamination.behaviorOf(key) : null;
      if (!behavior) return; // an unwarmed row leaves the load alone

      const hours = elapsedSec / VITALS_DEFAULTS.SECONDS_PER_HOUR;
      const growth = behavior.inHostPerHour ?? 0;
      const clearance =
        VITALS_DEFAULTS.INFECTION_CLEARANCE_PER_HOUR *
        // ⚠ Safe from inside the reconcile: `_reconcilingConditions` is
        // set, so `getConditionBand`'s own `reconcileConditions()` call
        // returns immediately. That guard is what makes the vital-sign
        // reads in this whole method non-reentrant.
        infectionResistance(this.getConditionBand());
      const net = growth - clearance;
      const l0 = Math.max(0, Math.min(1, record.pathogenLoad ?? 0));

      let load: number;
      if (net === 0 || l0 <= 0) {
        load = l0;
      } else if (net > 0) {
        const g = Math.exp(net * hours);
        load = Number.isFinite(g)
          ? Math.min(1, (l0 * g) / (1 - l0 + l0 * g))
          : 1;
      } else {
        load = l0 * Math.exp(net * hours);
      }
      record.pathogenLoad = load;

      // ⭐ Cleared. The body won; the record goes, and it goes quietly.
      if (load <= VITALS_DEFAULTS.INFECTION_CLEARED_LOAD) {
        this.relieve(record);
        return;
      }

      // ⭐ The incubation: no stage, no signs, nothing to assess, until
      // the organism has had its hours. This is why illness arrives well
      // after the meal — you have to reason backwards to what you DID.
      if (record.symptomsAt !== undefined && nowS < record.symptomsAt) {
        record.stage = 0;
        return;
      }
      record.elapsed += elapsedSec * 1000;
      record.stage = Math.min(
        3,
        Math.max(1, Math.ceil(load / VITALS_DEFAULTS.INFECTION_STAGE_LOAD)),
      );

      // The consequence, and it is the SHIPPED one: fluid loss. A severe
      // infection dehydrates you, and dehydration already ends where it
      // ends.
      const self = this as unknown as Stuff;
      if (record.stage >= 2 && MixinApi.isReserved(self)) {
        const drained =
          VITALS_DEFAULTS.INFECTION_HYDRATION_PCT_PER_HOUR *
          (record.stage - 1) *
          hours;
        if (drained > 0) {
          self.adjustReserve('hydration', Quantity.of(-drained, '%'));
        }
      }
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

      // ⭐⭐ **The burden law runs FIRST, above the clock guard, because
      // it needs no clock.**
      //
      // A toxin's stage is a live READ of how much of it the body is
      // carrying right now — not a counter that accumulates over elapsed
      // time. Everything below this line is about integrating game-time,
      // and none of it applies: a body that just drank is drunk whether
      // or not a world clock is running, and putting the derive behind
      // the clock guard (or behind the presence-freeze guards further
      // down) would make it read sober until enough time passed. That is
      // both wrong and a regression against the parallel store this
      // replaced — `reconcileToxinConditions` derived synchronously.
      //
      // ⚠ It is still the condition's OWN arm doing it, which is the
      // whole point of W8b: one owner for `stage`, not two.
      this.reconcileBurdenStages();

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
      // ⭐⭐ **ONE arm for every affliction**, whatever law it advances
      // under. This was three — `decayingMagic` (has a `magicOrigin`),
      // `infections` (has a `pathogenLoad`), `progressing` (has neither)
      // — each discriminated by *which optional field happened to be set
      // on the record*, so the shape of the record decided the law and a
      // row could not choose one. The law is now declared on the row and
      // `progressAffliction` dispatches on it; a fourth law is a row,
      // never a fourth arm.
      const afflictions = this.conditions.filter(
        (c): c is AfflictionRecord => c.kind === 'affliction',
      );
      const dyings = this.conditions.filter(
        (c): c is DyingRecord => c.kind === 'dying',
      );
      if (
        traumas.length === 0 &&
        shocks.length === 0 &&
        sustained.length === 0 &&
        afflictions.length === 0 &&
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
          // ⭐ …and what CARRYING the wound does, over and above its own
          // tick. The Kind-B half of the effect channel, through the same
          // interpreter a Kind-A row's `signature` goes through — so a
          // burn's plasma weep and a bruise's stiffness are declared
          // beside the decay law rather than hard-coded somewhere else.
          this.applyEffects(
            TRAUMA_BEHAVIOR[t.type].signature,
            t.severity,
            elapsed,
          );
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
          // A live circuit (a flooded cell, a downed line) re-probes as
          // current-carrying and self-sustains; a discrete contact (a
          // baton tap) breaks its circuit at once and holds the body rigid
          // only for the after-grip window `tetanyUntil`.
          const live = this.shockCircuitLive(s);
          const windowHeld =
            s.tetanyUntil !== undefined && nowS < s.tetanyUntil;
          if (!live && !windowHeld) {
            // Circuit physically open and any after-grip elapsed — relieve
            // (this also clears the `tetany` flag the volition gate reads).
            this.relieve(s);
            continue;
          }
          if (!live) {
            // Pulse window only: the body is still rigid but NO current
            // flows, so no burn accrues and the heart is not driven — the
            // honest less-lethal after-grip, less-lethal never non-lethal.
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

        // ── the afflictions, each under its own declared law ────────
        //
        // ⚠ Full presence-freeze parity with trauma — the linkdead
        // re-stamp and the far-past guard both apply. Being away must
        // never cost a player anything, and this arm is not the dying
        // clock. (Snapshot the list: a law may relieve its own record —
        // a dread that fades to nothing, an infection the body cleared,
        // a `by: rest` condition reaching its `atStage`.)
        for (const a of [...afflictions]) {
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
          this.progressAffliction(a, elapsed, nowS);
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

    /** Whether a genuinely LIVE circuit is still carrying current through
     * this body (an energized source in reach, current > 0). Does NOT
     * short-circuit on the `tetany` flag — tetany self-sustaining the
     * circuit was the permanent-tetany trap (a single baton tap could
     * never release). Tetany now holds via the live circuit here OR the
     * bounded `tetanyUntil` window, checked by the reconcile caller. */
    private shockCircuitLive(s: SustainedShock): boolean {
      if (!s.source) return false;
      const source = StuffApi.findByTemplatePath(s.source);
      if (!source || !MixinApi.isEnergized(source)) return false;
      const self = this as unknown as Stuff;
      return (
        (source as Stuff & Energized).currentThrough(self).rawValue() > 0
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
      // Reconcile-on-read (the getConditions idiom): an elapsed after-grip
      // window is relieved here, so the flag read below is authoritative —
      // the volition gate never over-refuses a body whose tetany has worn
      // off but whose record the reconcile has not yet swept.
      this.reconcileConditions();
      return this.conditions.some(
        (c) => c.kind === 'shock' && c.tetany === true,
      );
    }

    /** Is a being-shocked circuit currently active on this body? */
    public isBeingShocked(): boolean {
      this.reconcileConditions();
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
      // ⭐⭐ **Stamp who did this, at the door every driver already uses.**
      //
      // A wound has always recorded its inflicter; an affliction never
      // did — so the one kind of harm that is deliberate, premeditated
      // and quiet (a poisoning) was the one kind the world could not
      // attribute. Stamping it HERE rather than behind a new gated Api
      // static is what makes it total: metabolism, thermal, respiration,
      // magic, the passage and combat's hook rider all land through this
      // one method, so every one of them is covered with no call-site
      // changes and no driver left to forget.
      //
      // ⚠ From execution context, never from a parameter — the
      // un-spoofable rule `ConditionApi.inflict` already follows — and
      // never overwriting a stamp a producer set deliberately.
      if (condition.kind === 'affliction' && condition.inflictedBy === undefined) {
        const author = ExecutionContextApi.getActingAuthor();
        const path = author ? (author as Stuff).getTemplatePath?.() : null;
        if (path) condition.inflictedBy = path;
      }
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
