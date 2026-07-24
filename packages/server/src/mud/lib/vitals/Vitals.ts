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

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';
import { MixinApi } from '../../api/mixin';
import type { VitalBand, VitalProfile } from '../species/Species';
import type { BodyPart } from '../species/BodyPlan';
import type {
  ActiveCondition,
  Trauma,
  SustainedShock,
  SustainedEffect,
  AfflictionRecord,
} from './Condition';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from './Condition';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ElectricityApi } from '../../api/electricity';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Energized } from '../electricity/Energized';
import { TemplatePaths } from '../paths';

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

/** The accessible "HP bar" replacement — a derived band, never stored. */
export type ConditionBand =
  | 'healthy'
  | 'hurt'
  | 'serious'
  | 'critical'
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
  hasCondition(pred: (c: ActiveCondition) => boolean): boolean;
  /** Add a condition (a Trauma value or an AfflictionRecord). */
  afflict(condition: ActiveCondition): void;
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
  return class VitalsMixin extends Base implements Vitals {
    static _mixinName = 'VitalsMixin';

    static persistentFields = [
      '_coreTemperature',
      '_heartRate',
      '_respiratoryRate',
      '_bloodPressureSystolic',
      '_bloodPressureDiastolic',
      '_spo2',
      '_bloodVolume',
      'causeOfDeath',
      'bodyPartDeltas',
      'conditions',
    ];

    static fieldMarshallers = {
      _coreTemperature: QuantityMarshaller.pathFor('K'),
      _heartRate: QuantityMarshaller.pathFor('bpm'),
      _respiratoryRate: QuantityMarshaller.pathFor('bpm'),
      _bloodPressureSystolic: QuantityMarshaller.pathFor('mmHg'),
      _bloodPressureDiastolic: QuantityMarshaller.pathFor('mmHg'),
      _spo2: QuantityMarshaller.pathFor('%'),
      _bloodVolume: QuantityMarshaller.pathFor('L'),
    };

    // ---------- storage; defaults are the universe-default baselines ----------
    /** @runtimeState */
    public _coreTemperature: Quantity<'K'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.coreTemperature.baseline,
      'K',
    );
    /** @runtimeState */
    public _heartRate: Quantity<'bpm'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.heartRate.baseline,
      'bpm',
    );
    /** @runtimeState */
    public _respiratoryRate: Quantity<'bpm'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.respiratoryRate.baseline,
      'bpm',
    );
    /** @runtimeState */
    public _bloodPressureSystolic: Quantity<'mmHg'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodPressureSystolic.baseline,
      'mmHg',
    );
    /** @runtimeState */
    public _bloodPressureDiastolic: Quantity<'mmHg'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodPressureDiastolic.baseline,
      'mmHg',
    );
    /** @runtimeState */
    public _spo2: Quantity<'%'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.spo2.baseline,
      '%',
    );
    /** @runtimeState */
    public _bloodVolume: Quantity<'L'> = Quantity.of(
      UNIVERSE_DEFAULT_VITAL_PROFILE.bloodVolume.baseline,
      'L',
    );

    /** @runtimeState */
    public causeOfDeath: string | null = null;
    /** @runtimeState */
    public bodyPartDeltas: Record<string, BodyPartDelta> = {};
    /** @runtimeState */
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
     * reads `dead`; otherwise the band reflects the *substrate* — it
     * can read `critical` from a floored vital with NO lifecycle
     * transition (the deferred driver owns transitions).
     */
    public getConditionBand(): ConditionBand {
      this.reconcileConditions();
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) {
        throw new Error('VitalsMixin requires OrganismMixin (lifecycle state)');
      }
      if (self.getLifecycleState() === 'dead') return 'dead';

      const bvBand = this.getVitalBand('bloodVolume');
      const bv = this._bloodVolume.rawValue();
      // Blood volume at/below its survivable floor is a lethal
      // substrate state — the reading shows it (no transition here).
      if (bv <= bvBand.survivableMin) return 'dead';

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
      if (
        traumas.length === 0 &&
        shocks.length === 0 &&
        sustained.length === 0 &&
        decayingMagic.length === 0
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
            this.applySustainedRealization(s);
            continue;
          }
          if (linkdead) {
            s.tickedAt = nowS;
            continue;
          }
          s.tickedAt = nowS;
          if (s.expiresAt !== undefined && nowS >= s.expiresAt) {
            this.releaseSustained(s);
            continue;
          }
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

        // Bleed → death floor. `getConsciousness()` already reads a low
        // blood volume as `unconscious`, so the conscious → unconscious
        // waypoint falls out for free — harm writes only the death sign.
        const floor = this.getVitalBand('bloodVolume').survivableMin;
        if (this._bloodVolume.rawValue() <= floor) {
          if (
            MixinApi.isOrganism(self) &&
            self.getLifecycleState() !== 'dead'
          ) {
            this.setCauseOfDeath('exsanguination');
            self.setLifecycleState('dead');
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
            self.getLifecycleState() !== 'dead'
          ) {
            this.setCauseOfDeath('electrocution');
            self.setLifecycleState('dead');
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

    public afflict(condition: ActiveCondition): void {
      // Pure add this build — no onset()/tick() invocation, nothing ticks.
      this.conditions.push(condition);
    }

    public relieve(condition: ActiveCondition): boolean {
      const i = this.conditions.indexOf(condition);
      if (i === -1) return false;
      this.conditions.splice(i, 1);
      return true;
    }
  };
}
