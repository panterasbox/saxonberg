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
import type { ActiveCondition } from './Condition';
import { HARM_DEFAULTS } from './Condition';

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

    // ---------- vital signs ----------

    public getVitalSign(sign: VitalSign): Quantity<Unit> {
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
      return this.conditions;
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
