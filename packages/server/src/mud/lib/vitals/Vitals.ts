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
import type { CommandContributions } from '../../api/command';
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
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR, BLEED_FAMILY, WOUND_SEPSIS_KEY, SCARRING_TYPES } from '../../platform/idea/Condition';
import type { ScarRecord } from '../../platform/idea/Condition';
import type { VitalEffect, ProgressionLaw } from '../../platform/idea/Condition';
import type Condition from '../../platform/idea/Condition';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ConditionApi } from '../../api/condition';
import { ContainmentApi } from '../../api/containment';
import { FUNCTION_BANDS, BODY_CAPACITIES } from './BodyCapacity';
import type { BodyCapacity, FunctionBand } from './BodyCapacity';
import { BloodType } from './BloodType';
import type { AboPhenotype, BloodTypeLabel } from './BloodType';
import { BLOOD_DEFAULTS } from './Blood';
import type { BloodUnit } from './Blood';
import { Seeded } from '../Seeded';
import { METABOLIC_DEFAULTS } from '../metabolism/Metabolic';
import type { MarkupAugmenter } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Energized } from '../electricity/Energized';
import { TemplatePaths, TemplatePathPrefixes } from '../paths';
import type { VetoResult } from '../errors';
import { Suppressions } from '../magic/Suppression';
import { MagicGrid } from '../magic/Grid';
import { MaterialApi } from '../../api/material';
import { MagicApi } from '../../api/magic';
import { CombatApi } from '../../api/combat';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { POSTURE_REST_BASE } from '../character/Posed';

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
 * anatomy's `governs` coupling. Re-exported as the single source
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
/**
 * ⭐⭐ The capacities whose GOVERNING organ, once missing, is fatal — the
 * anatomy death floor (`hasMissingVitalGovernor`). Losing the brain,
 * the heart or the lungs stops life; losing a hand (`manipulation`) or a
 * leg (`locomotion`) does not. A body-capacity string set, deliberately
 * not the `serves` capacities: you die without a heart, not without a
 * grip.
 */
const VITAL_GOVERNED_CAPACITIES: ReadonlySet<string> = new Set([
  'consciousness',
  'circulation',
  'respiration',
]);

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
  /**
   * ⚠ **Retired**, kept only so a row that wants the old rate can cite
   * it. The drain moved onto every pathogen row's `signature` — it used
   * to be hard-coded in `progressInfection`, the one effect any
   * affliction had on a body anywhere in the engine.
   */
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

/** Inputs to {@link Vitals.applyTreatment} (D5). */
export interface TreatmentOpts {
  /** The resolution token being applied (`dressing` · `setting` · `cooling`
   * · `warmth` · `surgery` · …) — matches the wound's `resolution`. */
  by: string;
  /** How well it was done, `[0, 1]` — the treater's skill × the supply.
   * Stamped onto `Trauma.careQuality`; `mend` scales the treated rate by
   * `0.5 + 0.5 × careQuality`. */
  efficacy: number;
  /** The body doing the treating (for the infection seed's cleanliness read
   * and deed attribution) — absent for an environmental / self path. */
  treater?: Stuff;
}

/** Outcome of {@link Vitals.applyTreatment}. */
export interface TreatmentResult {
  /** Whether the treatment was applied (the wound's `resolve` ran). */
  treated: boolean;
  /** The resolution token applied. */
  by: string;
  /** Whether a wound-infection seed landed (D11 — dirty care on a bleed). */
  seededInfection: boolean;
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
   * ⭐⭐ Restore the anatomy to the species baseline — every part present,
   * no severed limbs. The corpse/revival counterpart of
   * {@link resetVitalsToSpeciesBaseline}: a body that comes back from the
   * passage comes back WHOLE, exactly as it comes back with full blood and
   * no conditions. ⚠ Without this a decapitated player would reembody
   * headless and the anatomy death floor would re-kill them on arrival —
   * the bricking failure `mortality.md` forbids. NOT a living recovery
   * mechanic (that is the content-facing restore path, slated); this is
   * what resurrection already means.
   */
  resetAnatomyToSpeciesBaseline(): void;
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
  /**
   * The parts this body no longer has. (Was `getInjuredParts`, which named
   * the wrong thing — it never returned wounded parts, only absent ones.)
   */
  getMissingParts(): ResolvedBodyPart[];
  /**
   * ⭐⭐ **Take a part off**, permanently — the sever. Marks the part and
   * **every descendant** missing (sever the arm and the hand goes with it),
   * then releases whatever was held or worn on the slots that part carried.
   */
  severPart(key: string): void;
  /** Is this severable part past saving (function lost, or advanced
   * wound-sepsis) — the amputation trigger (D7). */
  isPartUnsalvageable(key: string): boolean;
  /**
   * ⭐⭐ **How well one part still works** — the axis a wound costs you.
   *
   * `min` along the supply path: a part is only as good as its own tissue,
   * the limb it hangs off, the nerve that reaches it and the vessel that
   * feeds it. A crushed arm takes the hand with it; a cut spine takes both.
   */
  functionAt(key: string): FunctionBand;
  /**
   * ⭐⭐ **How well the body still does a THING** — the surface read.
   *
   * `governs` combines by **min** (one brain: lose it, lose the capacity);
   * `serves` combines by **mean** (two legs: lose one and you hobble). A
   * capacity nothing governs or serves reads `full` — a body that never had
   * hands has no `manipulation` to lose, and that is data, not a guard.
   */
  capacity(key: BodyCapacity): FunctionBand;
  /** The worst capacity scalar `[0,1]` across the body — 1 whole, 0 gone.
   * The labour-indexed tariff prices the shortfall `1 − this` (D13). */
  minCapacityScalar(): number;
  /** Can the part behind this slot still close on something? */
  canGrip(slot: string): boolean;
  /** Can this body still stand on itself? */
  canBearWeight(): boolean;
  /**
   * Why this slot is refused, in prose a player can act on — or `null` if
   * it is not. *"your left hand cannot grip — a fracture of
   * body.arm.left.hand"* rather than "you can't do that."
   */
  slotRefusalReason(slot: string): string | null;
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

  // ---------- blood (blood build D2/D3/D11) ----------
  /** The ABO phenotype of this body's blood, or `null` for a bloodless
   * clade. Derived from the genotype (pinned or seeded on identity). */
  bloodType(): string | null;
  /** Has this body's blood been tested (its label known)? */
  isBloodTyped(): boolean;
  /** Record that this body's blood has been tested. */
  markBloodTyped(): void;
  /** Draw a unit of blood: spend volume + marrow reserve; return the
   * stored unit's payload (true type + whether labelled + donor). */
  drawBlood(litres: number): BloodUnit;
  /** Receive blood or a saline expander. Compatible closes the gap to
   * baseline; saline caps at the plasma ceiling; incompatible delivers
   * plasma only and inflicts the graded transfusion reaction. */
  receiveBlood(spec: {
    litres: number;
    blood: { speciesPath: string; type: string } | null;
    expander?: boolean;
  }): { accepted: number; reaction: 0 | 1 | 2 };
  /** Is the body under anaesthesia (an active `sedation` effect)? (D10) */
  isSedated(): boolean;
  /** Active pain relief `[0,1]` from analgesia (D10). */
  analgesiaRelief(): number;

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
  /**
   * ⭐⭐ **The one treatment primitive** (D5) — apply a treatment to a
   * wound: run the wound's own `resolve` (dress / set / cool / rewarm /
   * operate), stamp its `careQuality` from `efficacy` (which `mend` reads
   * to scale the treated rate), and seed wound infection when the care was
   * dirty (D11, W-A5). Every consumer — `TreatController`,
   * `OrderController.treatWorst`, the nurse's brain — calls THIS; the deed
   * credit and the prose stay caller-side, and verbs stay on the body.
   */
  applyTreatment(wound: Trauma, opts: TreatmentOpts): TreatmentResult;
  /** The healed-over scars this body keeps (D14) — never a penalty. */
  getScars(): readonly ScarRecord[];
  /** ⭐ D15 — re-break every half-knit fracture under mechanical work
   * `powerW`; returns the wounds it re-broke. Called by `Exerting.exert`. */
  stressStructures(powerW: number): Trauma[];
  /** ⭐⭐ The per-body convalescence factor `k` (D1/D2) — one number a bed,
   * a carer and a spell pay into; `0` when the body is not safe (D3a). */
  convalescenceFactor(): number;
  /** The carer currently tending this body, or null (D8). */
  getCarer(): Stuff | null;
  /** Link/unlink the tending carer + their medicine band (a live fact;
   * `TendingEngagement` owns this — not persisted). */
  _setCarer(carer: Stuff | null, band?: string): void;
  /** ⭐ The next game-time this body silently changes (D19) — the soonest
   * pending transition, or null. A PURE read; the notify alarm is booked
   * from it. */
  nextInterestingAt(): number | null;
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

/**
 * A body part key rendered as prose — `body.arm.left.hand` → *"left hand"*.
 *
 * The noun is the last segment; a `left`/`right` segment anywhere in the
 * path is the side. Keys are authored, stable and lowercase, so this is a
 * rendering rule and not a lookup table — a body plan that adds a part gets
 * readable prose without touching the engine.
 */
function partPhrase(key: string): string {
  const segments = key.split('.').filter((seg) => seg !== 'body');
  const noun = segments[segments.length - 1] ?? key;
  const side = segments.find((seg) => seg === 'left' || seg === 'right');
  // `body.arm.left` — the side IS the last segment; the noun is what it
  // qualifies.
  if (noun === side) {
    const stem = segments[segments.length - 2] ?? noun;
    return `${side} ${stem}`;
  }
  return side !== undefined ? `${side} ${noun}` : noun;
}

/**
 * ⭐⭐ **A body that has lost something says so when you look at it.**
 *
 * Appends *"Missing the left hand."* to a body's long description, listing
 * only the parts whose loss is not already implied by a larger one: a
 * severed arm marks its hand missing too, and *"missing the left arm and
 * the left hand"* reads as two injuries instead of one. The topmost missing
 * part in each severed subtree is the honest unit.
 *
 * ⚠ Perception-neutral by construction — this is the LONG description,
 * which a viewer only reaches by looking at the body. Whether that body is
 * recognizable, disguised or in the dark is the presentation layer's
 * question, and this does not second-guess it.
 */
function missingPartsAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!MixinApi.isVitals(host)) return text;
  const missing = host.getMissingParts();
  if (missing.length === 0) return text;
  const topmost = missing.filter(
    (p) =>
      p.parent === null || !missing.some((other) => other.key === p.parent),
  );
  if (topmost.length === 0) return text;
  const phrases = topmost.map((p) => `the ${partPhrase(p.key)}`);
  const list =
    phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
  const line = `Missing ${list}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** ⭐ D14 — one sentence about a body's most prominent scar, appended to
 * `look`. Never a penalty; the body wears what it survived. */
function scarsAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isVitals(host)) return text;
  const scars = host.getScars();
  if (scars.length === 0) return text;
  const worst = [...scars].sort((a, b) => b.peak - a.peak)[0]!;
  const line = `A pale scar marks the ${partPhrase(worst.site)}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function VitalsMixin<TBase extends MixinConstructor>(Base: TBase) {
  // A class DECLARATION, not an expression: legacy decorators are only
  // valid on declarations, and `adoptMaterialState` carries a security
  // gate. Same shape as the shipped `ChattelMixin`.
  class VitalsMixin extends Base implements Vitals {
    static _mixinName = 'VitalsMixin';

    /** A lost part is visible on the body; so is a scar (D14). */
    static markupAugmenters: MarkupAugmenter[] = [
      missingPartsAugmenter,
      scarsAugmenter,
    ];

    /**
     * ⭐⭐ **The body affords its own first aid.** `treat` and `undress`
     * shipped with NO affordance at all — the views and controllers
     * existed, but nothing anywhere contributed the verbs, so no player
     * could type `treat` at any body in any room (a grep of every
     * `commandContributions` named `medical/rinse.yaml` once and `treat`
     * / `undress` never). The `MetabolicMixin.eat` precedent exactly: a
     * body with a wound is what can dress it, so the affordance lives on
     * the body. Grown by later recovery waves (`tend` · `dose`).
     *
     * ⚠ `self`-scoped — a verb you invoke targeting any reachable body
     * (yourself by default). Inert without a `CommandGiver`, exactly as
     * `eat` is on an animal: a frog composes VitalsMixin and never types.
     */
    static commandContributions: CommandContributions = {
      self: [
        'platform/cmd/medical/treat.yaml',
        'platform/cmd/medical/undress.yaml',
        'platform/cmd/medical/dose.yaml',
        'platform/cmd/medical/tend.yaml',
      ],
    };

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
      scars: { persistent: true, runtimeState: true },
      // ⭐ Blood build D2. The genotype PIN — authored on an NPC whose
      // story turns on their type (`bloodGenotype: "AO"`); `null` = derive
      // deterministically from identity, so an unrolled body and a rolled
      // one agree and nothing need persist for the ordinary case.
      bloodGenotype: { persistent: true, authorable: true, runtimeState: true },
      // Somebody has tested this body's blood (the label is known).
      bloodTyped: { persistent: true, runtimeState: true },
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
    /** ⭐ Healed-over scars the body keeps (D14) — never a penalty, read by
     * `assess` and `look`. Written at the clear sweep from a wound's `peak`. */
    public scars: ScarRecord[] = [];

    /** ⭐ Blood build D2 — the genotype pin (`"AO"` …), or `null` to derive
     * deterministically from identity. Authorable on an NPC row. */
    public bloodGenotype: string | null = null;
    /** Somebody has tested this body's blood (its label is known). */
    public bloodTyped: boolean = false;

    /**
     * Reconcile-on-read reentrancy guard — a plain transient flag, never
     * persisted. Case (1): it protects the wound reconcile from
     * re-triggering itself through the vital-sign reads it performs
     * (`this.getVitalSign('bloodVolume')` inside `reconcileConditions`).
     */
    private _reconcilingConditions = false;

    /**
     * ⭐ **D3a — the last game-time (seconds) this body took acute harm**
     * (a trauma or a shock landed). Transient, never persisted: safety is
     * a live fact, and a body reloaded after an hours-long absence is safe
     * by definition. Read by `convalescenceFactor` to gate mending on
     * *being safe*, identically online, linkdead or logged off — the
     * intent-agnostic answer to combat-logging. Undefined until first harm.
     */
    private _lastHarmedAt: number | undefined = undefined;

    /**
     * ⭐ **The carer currently tending this body** (D8), and their medicine
     * band captured at tend-time. Transient — a carer is a LIVE fact, never
     * persisted; a `TendingEngagement` sets and clears it. Read by
     * `convalescenceFactor`, gated on the carer still being present,
     * conscious and holding the engagement.
     */
    private _carer: Stuff | null = null;
    private _carerBand = 'untrained';

    /**
     * ⭐ **The notify alarm's handle** (D19) — a ONE-SHOT booked at the next
     * interesting transition (a wound-sepsis becoming symptomatic), so the
     * body can tell you it changed instead of the change sitting invisible
     * until you next `look`. Transient; canceled and rebooked on state
     * change. `null` when nothing is pending — a healthy body holds no
     * handle. ⚠ NEVER a recurring timer / cadence / sweep.
     */
    private _notifyHandle: ScheduleHandle | null = null;

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
      // ⭐ The window starts NOW, not at the first read: `tickedAt` used
      // to be stamped by the first reconcile, so a body nobody looked at
      // never moved toward death — a fish drowning in a hand stayed
      // "dying" indefinitely, and `release` put it back as a live count
      // (the fishing drive, run 23). The clock that does not freeze on
      // linkdead must not freeze on being unobserved either.
      const record: DyingRecord = {
        kind: 'dying',
        cause,
        windowSec: windowSec ?? HARM_DEFAULTS.DYING_WINDOW_SEC_DEFAULT,
        elapsed: 0,
        tickedAt: WorldClockApi.getNow().rawValue(),
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

    // ---------- blood (blood build D2/D3/D11) ----------

    /** The resolved genotype string (`"AO"` …): the pin, else a
     * deterministic roll from the species allele table seeded on identity
     * — never `Math.random`, so an unrolled body and a rolled one agree. */
    private resolvedBloodGenotype(): string {
      if (this.bloodGenotype) return this.bloodGenotype;
      const self = this as unknown as Stuff;
      const species = MixinApi.isOrganism(self) ? self.getSpecies() : null;
      const alleles = species?.getBloodGroups()?.alleles ?? { O: 1 };
      const seed = this.seedFromString(self.getIdentityPath() ?? '');
      const a = this.drawAllele(alleles, Seeded.unit(seed, 0));
      const b = this.drawAllele(alleles, Seeded.unit(seed, 1));
      return a + b;
    }

    /** FNV-1a fold of an identity path to a 32-bit seed. */
    private seedFromString(s: string): number {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return h >>> 0;
    }

    /** One allele drawn from a cumulative frequency table by a unit draw. */
    private drawAllele(alleles: Record<string, number>, u: number): string {
      const entries = Object.entries(alleles);
      const total = entries.reduce((s, [, f]) => s + f, 0) || 1;
      let acc = 0;
      for (const [allele, freq] of entries) {
        acc += freq / total;
        if (u < acc) return allele;
      }
      return entries[entries.length - 1]?.[0] ?? 'O';
    }

    /** Genotype → ABO phenotype (A/B codominant, O recessive). */
    private aboPhenotype(genotype: string): AboPhenotype {
      const hasA = genotype.includes('A');
      const hasB = genotype.includes('B');
      if (hasA && hasB) return 'AB';
      if (hasA) return 'A';
      if (hasB) return 'B';
      return 'O';
    }

    public bloodType(): string | null {
      if (!this.hasVitalSign('bloodVolume')) return null;
      return this.aboPhenotype(this.resolvedBloodGenotype());
    }

    public isBloodTyped(): boolean {
      return this.bloodTyped;
    }

    public markBloodTyped(): void {
      this.bloodTyped = true;
    }

    private speciesPathOf(): string {
      const self = this as unknown as Stuff;
      return MixinApi.isOrganism(self)
        ? (self.getSpecies()?.getTemplatePath() ?? '')
        : '';
    }

    public drawBlood(litres: number): BloodUnit {
      const self = this as unknown as Stuff;
      const bv = this._bloodVolume.rawValue();
      this.setVitalSign('bloodVolume', Quantity.of(Math.max(0, bv - litres), 'L'));
      if (MixinApi.isReserved(self) && self.hasReserve('marrow')) {
        self.adjustReserve(
          'marrow',
          Quantity.of(-BLOOD_DEFAULTS.MARROW_COST_PCT_PER_L * litres, '%'),
        );
      }
      return {
        speciesPath: this.speciesPathOf(),
        type: (this.bloodType() ?? 'O') as BloodTypeLabel,
        labelled: this.isBloodTyped(),
        donorIdentityPath:
          self.getIdentityPath() ?? self.getTemplatePath() ?? '',
      };
    }

    public receiveBlood(spec: {
      litres: number;
      blood: { speciesPath: string; type: string } | null;
      expander?: boolean;
    }): { accepted: number; reaction: 0 | 1 | 2 } {
      if (!this.hasVitalSign('bloodVolume')) return { accepted: 0, reaction: 0 };
      const baseline = this.getVitalBand('bloodVolume').baseline;
      const cur = this._bloodVolume.rawValue();
      const ceiling = baseline * METABOLIC_DEFAULTS.PLASMA_RESTORE_CEILING_FRAC;

      // Saline / a plasma expander: raises volume with no cells, capped at
      // the same plasma ceiling drinking obeys — never the last 15 %.
      if (spec.expander) {
        const next = Math.min(ceiling, cur + spec.litres);
        this.setVitalSign('bloodVolume', Quantity.of(next, 'L'));
        return { accepted: next - cur, reaction: 0 };
      }

      const blood = spec.blood;
      if (!blood) return { accepted: 0, reaction: 0 };

      const donor = new BloodType(blood.speciesPath, blood.type as BloodTypeLabel);
      const me = new BloodType(
        this.speciesPathOf(),
        (this.bloodType() ?? 'O') as BloodTypeLabel,
      );
      const mismatch = donor.mismatchFor(me);

      if (mismatch === 0) {
        // Compatible cells: this is how the last 15 % comes back.
        const next = Math.min(baseline, cur + spec.litres);
        this.setVitalSign('bloodVolume', Quantity.of(next, 'L'));
        return { accepted: next - cur, reaction: 0 };
      }

      // Incompatible: only the plasma fraction lands (capped at the
      // expander ceiling), and the graded reaction fires.
      const plasma = spec.litres * BLOOD_DEFAULTS.PLASMA_FRACTION;
      const next = Math.min(ceiling, cur + plasma);
      this.setVitalSign('bloodVolume', Quantity.of(next, 'L'));
      const add = Math.ceil(
        spec.litres *
          BLOOD_DEFAULTS.REACTION_STAGE_PER_L *
          (mismatch === 2 ? BLOOD_DEFAULTS.SPECIES_MISMATCH_SCALE : 1),
      );
      const existing = this.findAfflictionAt(
        TemplatePaths.circulationTransfusionReaction,
      );
      if (existing) {
        existing.stage += add;
      } else {
        this.afflict({
          kind: 'affliction',
          templatePath: TemplatePaths.circulationTransfusionReaction,
          stage: add,
          elapsed: 0,
        });
      }
      return { accepted: next - cur, reaction: mismatch };
    }

    // ---------- anaesthesia / analgesia reads (D10) ----------

    /** ⭐ Is the body under anaesthesia? True iff an active affliction
     * declares `sedation` at/above its current stage. */
    public isSedated(): boolean {
      for (const c of this.conditions) {
        if (c.kind !== 'affliction') continue;
        const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
        for (const e of row?.getSignature() ?? []) {
          if (e.kind === 'sedation' && c.stage >= e.atStage) return true;
        }
      }
      return false;
    }

    /** ⭐ The antibiotic multiplier on infection clearance (D10) — the
     * product of `clearance` `factor` over active afflictions (default 1).
     * Folded into `progressInfection`'s clearance term; NOT an arm. */
    private clearanceBoost(): number {
      let factor = 1;
      for (const c of this.conditions) {
        if (c.kind !== 'affliction') continue;
        const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
        for (const e of row?.getSignature() ?? []) {
          if (e.kind === 'clearance') factor *= e.factor;
        }
      }
      return factor;
    }

    /** ⭐ Pain relief from active analgesia (D10) — the max `relief` over
     * active afflictions, `[0, 1]`. Read by `OperationEngagement` (the
     * conscious penalties scale by `1 − relief`) and by `look`/`assess`. */
    public analgesiaRelief(): number {
      let relief = 0;
      for (const c of this.conditions) {
        if (c.kind !== 'affliction') continue;
        const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
        for (const e of row?.getSignature() ?? []) {
          if (e.kind === 'analgesia') relief = Math.max(relief, e.relief);
        }
      }
      return relief;
    }

    // ---------- the material fork family ----------

    public forkSlice_Vitals(): unknown {
      const out: Record<string, unknown> = {};
      for (const sign of VITAL_SIGNS) {
        out[sign] = (
          this as unknown as Record<string, Quantity<Unit>>
        )[VITAL_FIELD[sign]]!.rawValue();
      }
      // ⭐ A corpse carries its blood type: fork the RESOLVED genotype
      // (concrete, so identity re-rolls can never disagree) + the label.
      out.bloodGenotype = this.resolvedBloodGenotype();
      out.bloodTyped = this.bloodTyped;
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
      const vitals = slices.Vitals as Record<string, unknown> | undefined;
      if (vitals) {
        for (const sign of VITAL_SIGNS) {
          const raw = vitals[sign];
          if (typeof raw === 'number') {
            this.setVitalSign(sign, Quantity.of(raw, VITAL_UNITS[sign]));
          }
        }
        // ⭐ A corpse carries its blood type across the fork (D2).
        if (typeof vitals.bloodGenotype === 'string')
          this.bloodGenotype = vitals.bloodGenotype;
        if (typeof vitals.bloodTyped === 'boolean')
          this.bloodTyped = vitals.bloodTyped;
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

    public resetAnatomyToSpeciesBaseline(): void {
      this.bodyPartDeltas = {};
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
      //
      // ⚠ Only a reserve that HAS a floor effect has a floor. `wind` and
      // `alcohol-tolerance` are seeded empty — an untrained body is the
      // honest baseline, not a degraded one — and `lean` at 0 is gaunt
      // in the mirror, not sick. A reserve whose `floorEffect` is null
      // declares that hitting zero means nothing acute.
      if (MixinApi.isReserved(self)) {
        for (const r of self.getReserves().values()) {
          if (
            r.theme === 'biological' &&
            r.floorEffect !== null &&
            r.current.rawValue() <= 0
          ) {
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
      // ⭐ Anaesthesia (D10): an active affliction declaring `sedation` at
      // or above its stage takes the body under. After dying (which
      // dominates), before the blood read — a sedated patient reads
      // `unconscious`, so `operate` can proceed and `say` is refused.
      if (this.isSedated()) return 'unconscious';

      const bvBand = this.getVitalBand('bloodVolume');
      const bvFraction =
        bvBand.baseline > 0 ? this._bloodVolume.rawValue() / bvBand.baseline : 1;
      const spo2Band = this.getVitalBand('spo2');
      const spo2 = this._spo2.rawValue();

      // ⭐ **The brain, when there is one.** A plan that authors a part
      // governing `consciousness` gets the honest read — the capacity
      // itself, which a wound to the brain, to the head around it, or to
      // anything its supply runs through all lower. A plan that does not
      // keeps the shipped site rule. ⚠ That fork is a DATA fact, not a
      // guard: nothing asks "is this a biped", it asks "does this body
      // have something that runs consciousness".
      const braindead = this.hasGovernorFor('consciousness')
        ? FUNCTION_BANDS.indexOf(this.capacity('consciousness')) >=
          FUNCTION_BANDS.indexOf('failing')
        : this.conditions.some(
            (c) =>
              c.kind === 'trauma' &&
              c.site.startsWith('body.head') &&
              c.severity >= 0.5,
          );
      if (
        bvFraction < 0.7 ||
        spo2 <= spo2Band.survivableMin ||
        braindead
      ) {
        return 'unconscious';
      }
      return 'conscious';
    }


    // ---------- ⭐⭐ the function axis (D6) ----------

    /**
     * A part's OWN function — what its own tissue can still do, before
     * anything upstream is consulted. `1 − Σ(severity × lossPerSeverity)`
     * over the wounds sitting on it; `0` if the part is gone.
     */
    /**
     * ⭐⭐ **The per-body convalescence factor `k`** — the one number a
     * bed, a carer and a spell all pay into. Read once per reconcile and
     * multiplied into every wound's `mend` (the healing half of the split
     * — see `Condition.ts` D1). Time is the free heal; care buys RATE.
     *
     *   `k = postureBase × surface.restQuality × surface.convalescence
     *        × (1 + carerBonus) × Π conditionFactors`, floored at
     *   `CONVALESCENCE_FLOOR` — standing on bare ground still knits, slowly.
     *
     * ⭐ **D3a — but only when SAFE.** A body in a live fight, or one
     * harmed within `CONVALESCENCE_SAFE_DELAY`, reads `0` (overriding the
     * floor): it mends nothing. Intent is undetectable — an escaper who
     * force-quits reads exactly like a bad connection — so we never
     * adjudicate intent; we gate on the *situation*, identically whether
     * the player is present, linkdead, or logged off. The gate only
     * delays the START of mending, invisible across an hours-long logout.
     *
     * The carer term is `1` until W-A6 wires the tending engagement; the
     * condition-factor term is `1` until W-B1 adds the `convalescence`
     * effect kind (the mend spell).
     */
    public convalescenceFactor(): number {
      const self = this as unknown as Stuff;
      // D3a — convalescence requires safety. Same rule online / away.
      if (!this.isConvalescenceSafe()) return 0;

      const D = HARM_DEFAULTS;
      // Posture: lying recovers best, standing least.
      const posture = MixinApi.isPosed(self) ? self.getPosture() : 'stand';
      const postureBase =
        POSTURE_REST_BASE[posture] ?? POSTURE_REST_BASE.stand!;

      // The rest surface — its restQuality (also read by stamina recovery)
      // AND its separate `convalescence` (read only here). Same three reads
      // `Metabolic.currentRestQuality` makes, so the two drivers agree on
      // which surface a body is on, without Vitals importing metabolism.
      let restQuality = 1.0;
      let clinical = 1.0;
      const restingOnNothing =
        MixinApi.isPosed(self) && !self.getRestingOnPath();
      if (MixinApi.isSlottable(self) && !restingOnNothing) {
        const host = self.getOccupiedHost();
        if (host && MixinApi.isPostured(host)) {
          restQuality = host.getRestQuality();
          clinical = host.getConvalescence();
        }
      }

      // The carer term (D8) — a live tending engagement adds `1 + bonus`;
      // the conditions term (D12) — the product of every active affliction's
      // `convalescence` effect (the mend spell authors `3`; a fever could
      // author `0.5`).
      const carer = 1 + this.carerBonus();
      const conditions = this.conditionConvalescenceFactor();

      const k = postureBase * restQuality * clinical * carer * conditions;
      return Math.max(D.CONVALESCENCE_FLOOR, k);
    }

    /**
     * D8 — the bonus a live carer adds to `k`, by their medicine band.
     * Zero unless the carer is present (same container), conscious, and
     * still holds the `medical-tending` engagement — so the read stays
     * honest even between the abort firing and the engagement clearing.
     */
    private carerBonus(): number {
      const carer = this._carer;
      if (!carer) return 0;
      const self = this as unknown as Stuff;
      // Present: the same container.
      if (
        !MixinApi.isContainable(carer) ||
        !MixinApi.isContainable(self) ||
        carer.getContainer() !== self.getContainer()
      ) {
        return 0;
      }
      // Not dead (a corpse tends nobody).
      const lifecycle = (
        carer as unknown as { getLifecycleState?: () => string }
      ).getLifecycleState?.();
      if (lifecycle === 'dead') return 0;
      // Still holding the tending engagement.
      if (
        !MixinApi.isEngaged(carer) ||
        carer.getEngagementByType('medical-tending') === undefined
      ) {
        return 0;
      }
      return HARM_DEFAULTS.CARER_BONUS_BY_BAND[this._carerBand] ?? 0;
    }

    /**
     * D12 — the product of every active affliction's `convalescence` effect.
     * `1` when none declare one. A read-time modifier (the effect is never
     * integrated), so the `mend` spell speeds healing by afflicting a
     * `mending` condition whose signature carries `{kind: convalescence,
     * factor: 3}` — no new Effect kind.
     */
    private conditionConvalescenceFactor(): number {
      return this.conditions
        .filter((c): c is AfflictionRecord => c.kind === 'affliction')
        .flatMap((c) => {
          const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
          return row ? [...row.getSignature()] : [];
        })
        .filter((e) => e.kind === 'convalescence')
        .reduce((prod, e) => prod * (e as { factor: number }).factor, 1);
    }

    public getCarer(): Stuff | null {
      return this._carer;
    }

    public _setCarer(carer: Stuff | null, band = 'untrained'): void {
      this._carer = carer;
      this._carerBand = carer ? band : 'untrained';
    }

    /**
     * D3a — is this body safe enough to mend? Not in a live combat
     * session, and not harmed within `CONVALESCENCE_SAFE_DELAY`. A pure
     * read; the harm stamp is set in `afflict`.
     */
    private isConvalescenceSafe(): boolean {
      const self = this as unknown as Stuff;
      if (CombatApi.sessionFor(self) !== undefined) return false;
      if (this._lastHarmedAt !== undefined) {
        const sinceHarm = WorldClockApi.getNow().rawValue() - this._lastHarmedAt;
        if (sinceHarm < HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY) return false;
      }
      return true;
    }

    private ownFunction(key: string): number {
      if (this.bodyPartDeltas[key]?.missing === true) return 0;
      let lost = 0;
      for (const c of this.conditions) {
        if (c.kind !== 'trauma' || c.site !== key) continue;
        for (const e of TRAUMA_BEHAVIOR[c.type]?.signature ?? []) {
          if (e.kind !== 'function') continue;
          lost += Math.max(0, c.severity) * e.lossPerSeverity;
        }
      }
      return Math.max(0, Math.min(1, 1 - lost));
    }

    /**
     * What a part upstream still PASSES THROUGH — a conduit's contribution
     * to whatever depends on it. Not the same as its own function: a
     * scratched spine works fine as a spine and also carries the arm's
     * nerve fine, and only a real wound starts cutting the signal.
     *
     * Gone → 0. Otherwise it degrades from `CONDUIT_TOLERANCE` to zero over
     * `CONDUIT_RANGE` of worst-wound severity.
     */
    private conduitFunction(key: string): number {
      if (this.bodyPartDeltas[key]?.missing === true) return 0;
      let worst = 0;
      for (const c of this.conditions) {
        if (c.kind !== 'trauma' || c.site !== key) continue;
        worst = Math.max(worst, c.severity);
      }
      const D = HARM_DEFAULTS;
      const over = (worst - D.CONDUIT_TOLERANCE) / D.CONDUIT_RANGE;
      return Math.max(0, Math.min(1, 1 - Math.max(0, over)));
    }

    /**
     * ⭐⭐ **What still reaches `key` from upstream** — the `min` over every
     * path into it: the limb it hangs off, the nerve that carries it, the
     * vessel that feeds it, and recursively whatever reaches THOSE.
     *
     * ⚠⚠ **The recursion is the whole point, and it is why this is not a
     * flat loop.** The arm is what names the spine in `innervatedBy`; the
     * hand names nothing. A one-level walk therefore asks the arm whether
     * the arm is hurt (it is not) and never asks what reaches the arm — so
     * a severed spine would leave the hand gripping happily, which is the
     * exact case this axis exists to model. A conduit's conduits are your
     * conduits.
     *
     * It also means `innervatedBy` is authored **once, where the supply
     * path diverges from the tree** (at the arm), rather than repeated on
     * every descendant — which is D8's rule, and only true if the walk
     * carries it down.
     *
     * ⚠ **The root is excluded** on purpose: a chest wound is terrible for
     * a hundred reasons and "your hands are weaker" is not one of them.
     * `visited` guards an authored cycle rather than trusting the data.
     */
    private upstreamFunction(
      key: string,
      parts: readonly BodyPart[],
      visited: Set<string>,
    ): number {
      if (visited.has(key)) return 1;
      visited.add(key);
      const part = parts.find((p) => p.key === key);
      if (!part) return 1;
      // The root is a waypoint, never a constraint.
      let f = part.parent === null ? 1 : this.conduitFunction(key);
      for (const next of [
        ...(part.parent !== null ? [part.parent] : []),
        ...(part.innervatedBy ?? []),
        ...(part.suppliedBy ?? []),
      ]) {
        f = Math.min(f, this.upstreamFunction(next, parts, visited));
      }
      return f;
    }

    /**
     * The continuous scalar behind {@link functionAt} — the part's own
     * tissue, capped by everything that reaches it.
     */
    private functionScalar(key: string): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return 1;
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return 1;
      const parts = plan.getBodyParts();
      const part = parts.find((p) => p.key === key);
      if (!part) return 1;

      const visited = new Set<string>([key]);
      let f = this.ownFunction(key);
      for (const next of [
        ...(part.parent !== null ? [part.parent] : []),
        ...(part.innervatedBy ?? []),
        ...(part.suppliedBy ?? []),
      ]) {
        f = Math.min(f, this.upstreamFunction(next, parts, visited));
      }
      return f;
    }

    /**
     * The scalar, banded. `FUNCTION_BANDS` is ordered worst-last.
     *
     * ⚠ **The epsilon is load-bearing, not defensive.** Weights and
     * thresholds are authored as round decimals that are not round in
     * binary: `1 − 3 × 0.2` is `0.3999999999999999`, which lands a hair
     * under the `impaired` edge and reads `failing`. A wound would then
     * band differently depending on whether its severity arrived as one
     * number or as a sum — which is exactly the sort of thing a player
     * would notice and could never explain.
     */
    private bandOf(f: number): FunctionBand {
      const EPS = 1e-9;
      if (f <= 0) return 'lost';
      if (f >= HARM_DEFAULTS.FUNCTION_BAND_FULL - EPS) return 'full';
      if (f >= HARM_DEFAULTS.FUNCTION_BAND_IMPAIRED - EPS) return 'impaired';
      return 'failing';
    }

    public functionAt(key: string): FunctionBand {
      this.reconcileConditions();
      return this.bandOf(this.functionScalar(key));
    }

    /**
     * The continuous capacity read — `min` over governors × `mean` over
     * servers. Exposed only as a band (see {@link capacity}); the limp
     * needs the scalar, which is why it is separate.
     */
    private capacityScalar(key: BodyCapacity): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return 1;
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return 1;
      let governed = 1;
      let servedSum = 0;
      let servedCount = 0;
      for (const part of plan.getBodyParts()) {
        if (part.governs?.includes(key)) {
          // ⭐ MIN — one brain. Lose it and the capacity is gone; a second
          // organ governing the same thing is a redundancy an author can
          // write, and it correctly does NOT help.
          governed = Math.min(governed, this.functionScalar(part.key));
        }
        if (part.serves?.includes(key)) {
          // ⭐ MEAN — two legs. One gone is a hobble, not a halt.
          servedSum += this.functionScalar(part.key);
          servedCount += 1;
        }
      }
      const served = servedCount > 0 ? servedSum / servedCount : 1;
      return governed * served;
    }

    public capacity(key: BodyCapacity): FunctionBand {
      this.reconcileConditions();
      return this.bandOf(this.capacityScalar(key));
    }

    /**
     * ⭐ The worst capacity scalar `[0, 1]` across every {@link
     * BODY_CAPACITIES} — how impaired the MOST impaired thing this body
     * does is (1 = whole, 0 = gone). Read by the labour-indexed tariff
     * (D13): the shortfall `1 − this` is how much the harm is costing the
     * body, which the clinic prices against.
     */
    public minCapacityScalar(): number {
      this.reconcileConditions();
      return Math.min(...BODY_CAPACITIES.map((c) => this.capacityScalar(c)));
    }

    /**
     * Whether the part behind `slot` can still close on something. The
     * anatomy gate and the trauma gate, folded: a missing part scores 0 and
     * a wounded one scores its function, so one read answers both.
     */
    public canGrip(slot: string): boolean {
      const part = this.partForSlot(slot);
      if (part === null) return true; // a slot with no anatomy behind it
      return (
        FUNCTION_BANDS.indexOf(this.functionAt(part)) <
        FUNCTION_BANDS.indexOf('failing')
      );
    }

    public canBearWeight(): boolean {
      return (
        FUNCTION_BANDS.indexOf(this.capacity('locomotion')) <
        FUNCTION_BANDS.indexOf('lost')
      );
    }

    public slotRefusalReason(slot: string): string | null {
      const part = this.partForSlot(slot);
      if (part === null) return null;
      if (this.canGrip(slot)) return null;
      if (this.bodyPartDeltas[part]?.missing === true) {
        return `you no longer have that — ${part} is gone`;
      }
      // Name the worst wound in the way, wherever on the path it sits.
      let worst: ActiveCondition | null = null;
      for (const c of this.conditions) {
        if (c.kind !== 'trauma') continue;
        if (c.site !== part && !part.startsWith(`${c.site}.`)) continue;
        if (worst === null || c.severity > worst.severity) worst = c;
      }
      const cause =
        worst !== null
          ? TRAUMA_BEHAVIOR[worst.type].describe(worst)
          : 'the injury';
      return `${part} cannot grip — ${cause}`;
    }

    /**
     * Whether this body plan authors any part that GOVERNS `key`. The
     * honest test for "does this body have one of those" — a plan with no
     * brain is a data fact about that species, never a guard.
     */
    /**
     * ⭐⭐ Does this body have a MISSING part that governs a life-critical
     * capacity? A severed head takes the brain (`consciousness`); a future
     * mangle could take the chest (`circulation` / `respiration`). The
     * anatomy death floor. ⚠ `missing`, not `functionAt === lost`: a
     * badly WOUNDED brain is the consciousness surface's job (it reads
     * `unconscious`), and making a wound lethal here would double-count
     * it. Losing the organ outright is the thing this catches.
     */
    private hasMissingVitalGovernor(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return false;
      for (const part of plan.getBodyParts()) {
        if (this.bodyPartDeltas[part.key]?.missing !== true) continue;
        for (const cap of part.governs ?? []) {
          if (VITAL_GOVERNED_CAPACITIES.has(cap)) return true;
        }
      }
      return false;
    }

    private hasGovernorFor(key: BodyCapacity): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return false;
      return plan.getBodyParts().some((p) => p.governs?.includes(key));
    }

    /** The `SlotSpec.bodyPart` behind a slot name, or `null`. */
    private partForSlot(slot: string): string | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return null;
      const spec = self
        .getSpecies()
        ?.getBodyPlan()
        ?.getSlots()
        .find((sp) => sp.name === slot);
      return spec?.bodyPart ?? null;
    }

    // ---------- ⭐⭐ circulation (D11) ----------

    /**
     * ⭐⭐ **Blood pressure, derived from blood volume** — and the shape of
     * the curve is the teaching.
     *
     * **Systolic holds, then falls.** Nothing moves until
     * `SHOCK_COMPENSATED_LOSS` (15 %) is gone; past that it falls on
     * `SHOCK_BP_SLOPE`. That plateau is ATLS class II, and it is the single
     * most important fact about haemorrhage: *a patient can be seriously
     * bled with a normal blood pressure right up until they are not.* A
     * model that slid the pressure down smoothly would teach the opposite,
     * and the opposite is what gets people killed.
     *
     * **Diastolic rises first, then falls with it.** Through the
     * compensated phase vasoconstriction pushes the diastolic UP while the
     * systolic holds, so the gap between them closes — a **narrowing pulse
     * pressure**, which is the earliest sign there is and the first thing a
     * clinician actually reads. Past the plateau both fall on the same
     * slope. Dropping them together from the start would have been one
     * line shorter and would have taught a simpler, false thing.
     *
     * **Shock spawns at 30 % and relieves at 25 %** (a hysteresis band, the
     * thermal cascade's shape). The dying window opens at 36 %, so shock
     * always precedes death by a real interval — about 75 seconds at an
     * open bleed — which is what makes a medic able to matter.
     *
     * ⚠ Bloodless clades (no `bloodVolume` sign) fall through untouched.
     */
    private deriveCirculation(): void {
      if (!this.hasVitalSign('bloodVolume')) return;
      const D = HARM_DEFAULTS;
      const bvBand = this.getVitalBand('bloodVolume');
      if (!(bvBand.baseline > 0)) return;
      const loss = Math.max(
        0,
        1 - this._bloodVolume.rawValue() / bvBand.baseline,
      );
      const past = Math.max(0, loss - D.SHOCK_COMPENSATED_LOSS);
      const decompensation = D.SHOCK_BP_SLOPE * past;
      // The compensated rise saturates at the plateau's edge and then
      // stops climbing — vasoconstriction is already maximal.
      const compensation =
        D.SHOCK_DIASTOLIC_RISE *
        (Math.min(loss, D.SHOCK_COMPENSATED_LOSS) / D.SHOCK_COMPENSATED_LOSS);

      if (this.hasVitalSign('bloodPressureSystolic')) {
        const base = this.getVitalBand('bloodPressureSystolic').baseline;
        this.setVitalSign(
          'bloodPressureSystolic',
          Quantity.of(Math.max(0, base * (1 - decompensation)), 'mmHg'),
        );
      }
      if (this.hasVitalSign('bloodPressureDiastolic')) {
        const base = this.getVitalBand('bloodPressureDiastolic').baseline;
        this.setVitalSign(
          'bloodPressureDiastolic',
          Quantity.of(
            Math.max(0, base * (1 + compensation - decompensation)),
            'mmHg',
          ),
        );
      }

      const shock = this.findAfflictionAt(
        TemplatePaths.circulationHypovolemicShock,
      );
      if (loss >= D.SHOCK_LOSS_FRACTION) {
        if (!shock) {
          this.afflict({
            kind: 'affliction',
            templatePath: TemplatePaths.circulationHypovolemicShock,
            stage: 0,
            elapsed: 0,
          });
        }
      } else if (shock && loss < D.SHOCK_RELIEF_FRACTION) {
        this.relieve(shock);
      }
    }

    /** The active affliction record at `path`, or `null`. */
    private findAfflictionAt(path: string): AfflictionRecord | null {
      for (const c of this.conditions) {
        if (c.kind === 'affliction' && c.templatePath === path) return c;
      }
      return null;
    }

    // ---------- locomotion coupling (the limp) ----------

    public drainForLimp(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isReserved(self) || !self.hasReserve('endurance')) return;
      // ⭐⭐ **The limp is now the locomotion capacity, not a wound sum.**
      //
      // It used to add up laceration + avulsion severity at `body.leg.*`,
      // which had three separate holes: a FRACTURED leg cost nothing (the
      // wrong wound types), a MISSING leg cost nothing (a severed part
      // carries no wound — the avulsion that took it heals and clears),
      // and a wound to the spine that paralysed the leg cost nothing
      // (the site was not `body.leg.*`). One read over the capacity
      // closes all three, because every one of them lowers it.
      const shortfall = 1 - this.capacityScalar('locomotion');
      if (shortfall <= 0) return;
      const cost =
        HARM_DEFAULTS.LIMP_DRAIN_PER_SEVERITY *
        HARM_DEFAULTS.LIMP_SHORTFALL_SCALE *
        shortfall;
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

    public getMissingParts(): ResolvedBodyPart[] {
      return this.getParts().filter((p) => p.missing);
    }

    /**
     * ⭐ **Is this part past saving** (D7) — the amputation trigger. A
     * severable part carrying an active wound, whose own function is
     * `lost`, OR on which the wound-sepsis load has reached the advanced
     * band (≥ 0.8) — the limb the infection has taken. Read by the
     * `amputation` operation; a body never loses a part it can keep.
     */
    public isPartUnsalvageable(key: string): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const spec = self
        .getSpecies()
        ?.getBodyPlan()
        ?.getBodyParts()
        .find((p) => p.key === key);
      if (!spec?.severable) return false;
      const woundHere = this.conditions.some(
        (c) => c.kind === 'trauma' && c.site === key && c.severity > 0,
      );
      if (!woundHere) return false;
      if (this.functionAt(key) === 'lost') return true;
      const sepsis = this.conditions.find(
        (c): c is AfflictionRecord =>
          c.kind === 'affliction' &&
          c.templatePath.endsWith('/' + WOUND_SEPSIS_KEY),
      );
      return (sepsis?.pathogenLoad ?? 0) >= 0.8;
    }

    /**
     * ⭐⭐ **The sever** — the one writer of `BodyPartDelta.missing`, which
     * shipped as a persisted field nothing ever set.
     *
     * Three things happen, in order:
     *
     * 1. **The subtree goes, not the part.** Severing `body.arm.left` marks
     *    `body.arm.left.hand` missing too — anatomy is a tree and a hand
     *    with no arm is not a thing a body can have. The walk is transitive
     *    over `BodyPart.parent`.
     * 2. **What the part held falls.** Every slot whose `SlotSpec.bodyPart`
     *    lies in the severed subtree is vacated and its occupants moved to
     *    wherever the body is — a severed hand drops its sword, it does not
     *    keep gripping it. `Slotted.canOccupy` already refuses *new*
     *    occupancy of a missing part's slots; nothing until now evicted the
     *    occupancy that was already there.
     * 3. **It persists for free.** `bodyPartDeltas` is already
     *    `{persistent, runtimeState}`, so the loss rides
     *    `PersistableApi.capture` through a logout and into a corpse with
     *    no new storage and no migration.
     *
     * Idempotent: severing an already-missing part is a no-op. Unknown keys
     * are ignored — a body plan that does not have the part cannot lose it.
     */
    public severPart(key: string): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return;
      const plan = self.getSpecies()?.getBodyPlan();
      if (!plan) return;
      const parts = plan.getBodyParts();
      if (!parts.some((p) => p.key === key)) return;

      // (1) the part and every descendant — a fixpoint over `parent`, so
      // depth is irrelevant and the authored order does not matter.
      const severed = new Set<string>([key]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of parts) {
          if (severed.has(p.key)) continue;
          if (p.parent !== null && severed.has(p.parent)) {
            severed.add(p.key);
            grew = true;
          }
        }
      }
      for (const k of severed) {
        const delta = this.bodyPartDeltas[k] ?? {};
        delta.missing = true;
        this.bodyPartDeltas[k] = delta;
      }

      // (2) release what the lost slots were carrying.
      if (!MixinApi.isSlotted(self)) return;
      const destination = MixinApi.isContainable(self)
        ? self.getContainer()
        : null;
      for (const spec of plan.getSlots()) {
        if (spec.bodyPart === undefined) continue;
        if (!severed.has(spec.bodyPart)) continue;
        for (const occupant of [...self.getOccupants(spec.name)]) {
          self.vacate(spec.name, occupant);
          // A body with nowhere to be (mid-construction, a test fixture)
          // simply drops the reference — the slot is still released.
          if (destination !== null && MixinApi.isContainable(occupant)) {
            ContainmentApi.move(occupant, destination);
          }
        }
      }
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
          // `function`, `expression` and `convalescence` are DERIVED READS
          // — consulted by `functionAt` / `capacity`, `expressionSuppression`
          // and `convalescenceFactor` respectively, never integrated. Listed
          // so the switch stays total.
          case 'function':
          case 'expression':
          case 'convalescence':
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
      // ⭐⭐ One read, and no rule of its own: the slot is impaired exactly
      // when the part behind it cannot grip.
      //
      // This was a boolean cliff — a wound either declared a `capability`
      // effect and crossed its threshold, or the slot was perfectly fine.
      // Two wounds that each sat just under the line were free, and a
      // wound on the ARM never touched the hand's slot at all. The
      // function axis fixes both for nothing: it composes along the path
      // and it composes across wounds. A missing part folds in too (it
      // scores 0), so this and `isSlotDisabledByAnatomy` now answer from
      // the same place.
      return !this.canGrip(slot);
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
      const behavior = key ? MaterialApi.pathogenBehaviorOf(key) : null;
      if (!behavior) return; // an unwarmed row leaves the load alone

      const hours = elapsedSec / VITALS_DEFAULTS.SECONDS_PER_HOUR;
      const growth = behavior.inHostPerHour ?? 0;
      const clearance =
        VITALS_DEFAULTS.INFECTION_CLEARANCE_PER_HOUR *
        // ⚠ Safe from inside the reconcile: `_reconcilingConditions` is
        // set, so `getConditionBand`'s own `reconcileConditions()` call
        // returns immediately. That guard is what makes the vital-sign
        // reads in this whole method non-reentrant.
        infectionResistance(this.getConditionBand()) *
        // ⭐ The antibiotic (D10): an active `clearance` effect multiplies
        // how fast the body clears the population — the sepsis counterplay.
        this.clearanceBoost();
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

      // ⭐⭐ **The fluid loss is the ROW's now.** It used to be
      // hard-coded here — the ONE effect any affliction had on a body
      // anywhere in the engine, for pathogens only, that no row asked
      // for and no row could ask for. Every pathogen row authors it as a
      // `reserve` effect on its `signature`, and the affliction arm
      // applies it through `applyEffects` like any other. Nothing about
      // the outcome changed; what changed is who gets to say so.
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

      // ⭐⭐ **Circulation runs here too, and for the SAME reason** —
      // above the clock guard, because it needs no clock.
      //
      // Blood pressure is a live READ of how much blood is in the body
      // right now, not a counter integrating over elapsed time. The plan
      // put this in the bleed-floor tail; the tail sits behind the clock
      // guard AND the all-empty guard, so a body that had just been bled
      // would have read a textbook 120/80 until enough game-time passed —
      // the exact trap the burden-law comment above was written about.
      //
      // ⚠ It is a derived WRITE, not a new arm: nothing is stored that
      // could fall out of sync, and there is nothing to re-arm after an
      // absence. `check-condition-arms` still reads 5.
      //
      // ⚠⚠ **The reentrancy guard is armed by hand here, and it has to
      // be.** `_reconcilingConditions` is not set until well below this
      // point, so everything above it runs unguarded — and this derive
      // WRITES (two vital signs, and an affliction at the threshold),
      // where the burden law beside it only reads. Each of those writes
      // re-entered `reconcileConditions`, and the inner pass advanced
      // every `tickedAt` stamp to now; the outer pass then found zero
      // elapsed everywhere and integrated nothing. Symptom: 22 game-hours
      // of a watered body restoring 6 ml of plasma and a shock row
      // draining no endurance at all — every time-integrating arm in the
      // body silently doing nothing, with no error.
      this._reconcilingConditions = true;
      try {
        this.deriveCirculation();
      } finally {
        this._reconcilingConditions = false;
      }

      // In-session game-time; `null` when no world clock is running
      // (pre-boot / a unit test that hasn't bootstrapped one) → idle.
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();

      // ⭐⭐ **Anatomy → death floor**, and it sits ABOVE the all-empty
      // guard on purpose. A severed part writes no vital sign and its
      // wound may have clotted to nothing, so a body whose only problem is
      // a missing head would otherwise reach the guard, find no active
      // condition, and return whole-signed and immortal — the exact
      // W-A4 trap (the bleed floor was unreachable the same way).
      //
      // A part that GOVERNS a life-critical capacity (consciousness /
      // circulation / respiration) and is now MISSING ends the body: brain
      // gone means no breathing drive and no airway, not merely
      // unconscious. `beginDying`, not instant death, so the two-stage
      // discipline holds — a bystander's stroke can still be stayed.
      //
      // ⚠ Gated on having ANY delta first, so an untouched body (which is
      // almost every body, almost every read) pays a single map-size
      // check and skips the plan walk entirely.
      if (
        Object.keys(this.bodyPartDeltas).length > 0 &&
        MixinApi.isOrganism(self) &&
        !self.isDead() &&
        this.hasMissingVitalGovernor()
      ) {
        this._reconcilingConditions = true;
        try {
          this.beginDying(
            'decerebration',
            HARM_DEFAULTS.VITAL_ORGAN_LOSS_DYING_WINDOW_SEC,
          );
        } finally {
          this._reconcilingConditions = false;
        }
      }

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
        // ⭐⭐ The convalescence factor, computed ONCE per reconcile (D2) —
        // a bed, a carer and a spell all pay into this one number, and
        // every wound's `mend` reads it. `0` when the body is not safe
        // (D3a): recently harmed or in a live fight → nothing knits.
        const k = this.convalescenceFactor();
        for (const t of traumas) {
          // ── The HARM arm (`tickedAt`) ── freezes on linkdead and drops
          // a far-past gap: real-life absence never bleeds you.
          if (t.tickedAt === undefined) {
            // First touch: seed the stamp so a fresh wound doesn't
            // integrate a giant gap from epoch.
            t.tickedAt = nowS;
          } else if (linkdead) {
            t.tickedAt = nowS;
          } else {
            const elapsed = nowS - t.tickedAt;
            t.tickedAt = nowS;
            // Integrate only a real, bounded interval; a far-past gap means
            // absence, and absence never bleeds you.
            if (elapsed > 0 && elapsed <= HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
              // ⚠ The intensity is the severity the wound had **during**
              // the interval, not after the tick healed it — read post-mend
              // (below), a wound that cleared in the same slice would
              // contribute nothing, silently losing every effect on a
              // fast-healing type.
              const carried = t.severity;
              // ⭐ D14 — the body remembers the worst it got.
              t.peak = Math.max(t.peak ?? carried, carried);
              TRAUMA_BEHAVIOR[t.type].tick(this, t, elapsed);
              // ⭐ …and what CARRYING the wound does, over and above its
              // own tick — the Kind-B half of the effect channel, through
              // the same interpreter a Kind-A row's `signature` uses.
              this.applyEffects(
                TRAUMA_BEHAVIOR[t.type].signature,
                carried,
                elapsed,
              );
              // ⭐ D11 — a bleed-family wound left open above the clot
              // threshold goes bad on its own after SEPSIS_OPEN_ONSET_SEC.
              // Part of the HARM arm (being away does not fester you).
              if (
                BLEED_FAMILY.has(t.type) &&
                t.dressed !== true &&
                t.severity > HARM_DEFAULTS.CLOT_SEVERITY
              ) {
                if (t.openSince === undefined) {
                  t.openSince = nowS;
                } else if (
                  t.septicSeeded !== true &&
                  nowS - t.openSince > HARM_DEFAULTS.SEPSIS_OPEN_ONSET_SEC
                ) {
                  this.seedSepsis(HARM_DEFAULTS.SEPSIS_INOCULUM);
                  t.septicSeeded = true;
                }
              } else if (
                // ⭐ D8 — stitches left in past readiness OVERSTAY and go
                // septic. A sutured wound that has knitted to the clot line
                // is READY; from that moment the shipped open-wound clock
                // runs until the stitches come out (undress/unstitch).
                t.sutured === true &&
                t.severity <= HARM_DEFAULTS.CLOT_SEVERITY
              ) {
                if (t.sutureReadyAt === undefined) {
                  t.sutureReadyAt = nowS;
                  t.openSince = nowS;
                } else if (
                  t.septicSeeded !== true &&
                  nowS - t.sutureReadyAt > HARM_DEFAULTS.SEPSIS_OPEN_ONSET_SEC
                ) {
                  this.seedSepsis(HARM_DEFAULTS.SEPSIS_INOCULUM);
                  t.septicSeeded = true;
                }
              } else {
                // Dressed or clotted below the threshold → reset the clock.
                t.openSince = undefined;
                t.septicSeeded = false;
              }
            }
          }

          // ── The MEND arm (`mendedAt`) ── D3: a SECOND stamp, with NO
          // linkdead freeze and NO far-past drop — the dying arm's
          // discipline, for the opposite reason. Being away must never
          // COST you, and mending is never a cost, so a body knits across
          // a logout at whatever `k` it reads on return (`k = 0` when it
          // is not safe — D3a — is what stops a body dropped mid-fight
          // from knitting). Kept inside this one loop so `lint:condition-
          // arms` still counts a single arm.
          if (t.mendedAt === undefined) {
            t.mendedAt = nowS;
          } else if (linkdead) {
            // ⭐ Freeze on linkdead, like every other arm — the broad
            // "a linkdead body integrates nothing" invariant (electricity,
            // the dying-disconnect discipline). Offline mend is delivered by
            // the LOGGED-OFF path instead: an evicted body is not reconciled
            // while away, so on RECONNECT (no longer linkdead) `mendedAt`
            // still sits at logout and the big gap integrates in one read —
            // with NO far-past drop (below), which is the piece that makes
            // "log off on the cot, come back mended" true.
            t.mendedAt = nowS;
          } else {
            const mendElapsed = nowS - t.mendedAt;
            t.mendedAt = nowS;
            if (mendElapsed > 0) {
              TRAUMA_BEHAVIOR[t.type].mend(this, t, mendElapsed, k);
            }
          }
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

        // Relieve any wound healed to (near) zero severity — leaving a scar
        // if it ever got grave enough (D14). Not a game-time arm (no cursor),
        // so `lint:condition-arms` does not count it.
        for (const t of traumas) {
          if (t.severity <= HARM_DEFAULTS.CLEARED_SEVERITY) {
            this.maybeScar(t, nowS);
            this.relieve(t);
          }
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
      const field = MagicApi.suppressionAt(place);
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
      // ⭐ **D3a — acute harm resets the safety clock.** A trauma or a
      // shock landing marks the body unsafe for `CONVALESCENCE_SAFE_DELAY`,
      // so it mends nothing while a fight is (or just was) happening —
      // identically whether the player is present, linkdead or logged off.
      // Not afflictions: a poison is slow harm, and the mend spell is an
      // affliction that must not reset its own patient's clock.
      if (condition.kind === 'trauma' || condition.kind === 'shock') {
        this._lastHarmedAt = WorldClockApi.getNow().rawValue();
      }
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
      // D19 — a new condition may move the notify horizon (e.g. a sepsis
      // seed with a symptomsAt). Rebook the one-shot alarm.
      this.rescheduleNotify();
      return true;
    }

    public relieve(condition: ActiveCondition): boolean {
      const i = this.conditions.indexOf(condition);
      if (i === -1) return false;
      this.conditions.splice(i, 1);
      // D19 — clearing a condition may remove the pending transition.
      this.rescheduleNotify();
      return true;
    }

    /**
     * ⭐⭐ **The one treatment primitive** (D5). Runs the wound's own
     * `resolve` (the type decides what "treated" means — a dressing, a
     * splint, a cooling, a rewarming, surgery), stamps `careQuality` so
     * `mend` heals it at the graded treated rate, and returns what
     * happened. The infection seed (D11) lands in W-A5; the seam is here.
     */
    public applyTreatment(
      wound: Trauma,
      opts: TreatmentOpts,
    ): TreatmentResult {
      TRAUMA_BEHAVIOR[wound.type].resolve(this, wound);
      wound.careQuality = Math.max(0, Math.min(1, opts.efficacy));
      // Dressing a wound resets its open-wound sepsis clock (D11).
      wound.openSince = undefined;
      wound.septicSeeded = false;

      // ⭐ D11 — a DIRTY treatment of a bleed-family wound inoculates it.
      let seededInfection = false;
      if (BLEED_FAMILY.has(wound.type)) {
        const treater = opts.treater;
        const hands =
          treater && MixinApi.isHygiene(treater)
            ? treater.handsCleanliness()
            : 1;
        const dirty =
          hands < HARM_DEFAULTS.SEPSIS_DIRTY_THRESHOLD ||
          opts.efficacy < HARM_DEFAULTS.SEPSIS_DIRTY_THRESHOLD;
        if (dirty) {
          seededInfection = this.seedSepsis(
            HARM_DEFAULTS.SEPSIS_INOCULUM * (1 - hands),
          );
        }
        // Handling a bleeding wound soils the treater's hands.
        if (treater && MixinApi.isHygiene(treater)) treater.soil();
      }
      return { treated: true, by: opts.by, seededInfection };
    }

    public getScars(): readonly ScarRecord[] {
      return this.scars;
    }

    /**
     * ⭐ D14 — a wound clearing leaves a scar if it ever got grave enough
     * and is a scarring type. Never a penalty (scars are description); the
     * deed is fired fire-and-forget for a persona (the `expireDying → die`
     * precedent). Called from the clear sweep.
     */
    private maybeScar(t: Trauma, nowS: number): void {
      const peak = t.peak ?? t.severity;
      if (peak < HARM_DEFAULTS.SCAR_SEVERITY || !SCARRING_TYPES.has(t.type)) {
        return;
      }
      this.scars.push({ site: t.site, type: t.type, peak, at: nowS });
      const self = this as unknown as Stuff;
      if (MixinApi.isPersona(self)) {
        void self.recordDeed({
          text: `carries a scar — a healed ${t.type} of ${t.site}`,
          tags: ['scar', t.site],
        });
      }
    }

    /**
     * ⭐⭐ D15 — real work re-breaks a half-knit bone. Every fracture whose
     * FUNCTION has come back (severity below the impair threshold) but whose
     * STRUCTURE has not (severity still above zero) is re-broken when the
     * work is hard enough (`powerW ≥ REBREAK_POWER_W`): floored to
     * `REBREAK_SEVERITY`, un-set, its care forgotten, its peak raised.
     * Deterministic; no roll. Returns the wounds it re-broke (for narration).
     * Called by `Exerting.exert`.
     */
    public stressStructures(powerW: number): Trauma[] {
      if (powerW < HARM_DEFAULTS.REBREAK_POWER_W) return [];
      const rebroken: Trauma[] = [];
      for (const c of this.conditions) {
        if (c.kind !== 'trauma' || c.type !== 'fracture') continue;
        if (
          c.severity <= 0 ||
          c.severity >= HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY
        ) {
          continue;
        }
        c.severity = Math.max(c.severity, HARM_DEFAULTS.REBREAK_SEVERITY);
        c.dressed = false;
        c.careQuality = undefined;
        c.peak = Math.max(c.peak ?? c.severity, c.severity);
        rebroken.push(c);
      }
      return rebroken;
    }

    /**
     * ⭐ D11 — inoculate this body with wound sepsis, or add to an existing
     * infection. Mirrors `Metabolic.ingest`'s seed exactly (the affliction
     * record + incubation from the pathogen row); the shipped logistic
     * in-host arm grows it from there. Returns whether a load landed.
     */
    private seedSepsis(load: number): boolean {
      if (load <= 0) return false;
      const behavior = MaterialApi.pathogenBehaviorOf(WOUND_SEPSIS_KEY);
      const path = TemplatePathPrefixes.pathogenCondition + WOUND_SEPSIS_KEY;
      const nowS = WorldClockApi.getNow().rawValue();
      const existing = this.conditions.find(
        (c): c is AfflictionRecord =>
          c.kind === 'affliction' && c.templatePath === path,
      );
      if (existing) {
        existing.pathogenLoad = Math.min(
          1,
          (existing.pathogenLoad ?? 0) + load,
        );
        return true;
      }
      this.afflict({
        kind: 'affliction',
        templatePath: path,
        stage: 0,
        elapsed: 0,
        pathogenLoad: Math.min(1, load),
        symptomsAt:
          nowS +
          (behavior?.incubationSec ??
            HARM_DEFAULTS.SEPSIS_INCUBATION_FALLBACK_SEC),
      });
      return true;
    }

    /**
     * ⭐⭐ **The next interesting transition** (D19) — a PURE read returning
     * the soonest future game-time at which this body silently changes, or
     * `null` when nothing is pending. Today: a wound-sepsis crossing its
     * `symptomsAt` (the infection deadline becoming visible — C5's whole
     * teaching). Mutates NOTHING; the alarm is booked from it, and death /
     * every other truth is still pure derive-on-read, so this only ever
     * buys TIMELINESS.
     */
    public nextInterestingAt(): number | null {
      const nowS = WorldClockApi.getNow().rawValue();
      // ⚠ Array methods, not a `for…of` — this is a PURE READ, not a
      // progression arm, and `lint:condition-arms` counts a `for…of` over a
      // condition subset with a game-time cursor as an arm. There is no
      // mutation here; the alarm is booked FROM this.
      const times = this.conditions
        .filter(
          (c): c is AfflictionRecord =>
            c.kind === 'affliction' &&
            c.symptomsAt !== undefined &&
            (c.pathogenLoad ?? 0) > 0,
        )
        .map((c) => c.symptomsAt as number)
        .filter((at) => at > nowS);
      return times.length === 0 ? null : Math.min(...times);
    }

    /**
     * D19 — cancel the current alarm and book a fresh one-shot at the next
     * interesting transition. A no-op that clears the handle when nothing is
     * pending (a healthy body holds none). Called on every state change that
     * can move the horizon (`afflict`/`relieve`) and by the alarm itself
     * after it fires (to chase the next transition).
     */
    private rescheduleNotify(): void {
      if (this._notifyHandle) {
        ScheduleApi.cancel(this._notifyHandle);
        this._notifyHandle = null;
      }
      // ⭐ The alarm is a COURTESY to a player watching their own body; a
      // body nobody controls (an NPC, a test creature) needs none — it is
      // read when something reads it, and derive-on-read is already correct.
      // Gating here is also what keeps the suite from leaking real timers.
      if (!MixinApi.isHasInteractive(this as unknown as Stuff)) return;
      const nextAt = this.nextInterestingAt();
      if (nextAt === null) return;
      const nowS = WorldClockApi.getNow().rawValue();
      const scale = WorldClockApi.getScale();
      // Game-seconds until the transition → real milliseconds.
      const delayMs = Math.max(0, ((nextAt - nowS) / scale) * 1000);
      this._notifyHandle = ScheduleApi.schedule(delayMs, () =>
        this.onNotifyFire(),
      );
    }

    /**
     * D19 — the alarm callback. Runs a normal reconcile (computes NOTHING a
     * `look` would not), pushes a line for any transition it now observes,
     * and rebooks the next one. ⚠ Correctness is independent of this firing:
     * dropped or delayed, the next real read reaches the identical state.
     */
    private onNotifyFire(): void {
      this._notifyHandle = null;
      const nowS = WorldClockApi.getNow().rawValue();
      this.reconcileConditions();
      const festering = this.conditions.some(
        (c) =>
          c.kind === 'affliction' &&
          c.templatePath.endsWith(WOUND_SEPSIS_KEY) &&
          (c.pathogenLoad ?? 0) > 0 &&
          nowS >= (c.symptomsAt ?? Infinity),
      );
      if (festering) {
        MessageApi.scene(this as unknown as Stuff)
          .topic('act.deed')
          .toSelf(
            Mml.compose`One of your wounds has turned bad — it is hot and swollen, and it smells.`,
          )
          .send();
      }
      // Chase the next transition.
      this.rescheduleNotify();
    }
  }
  return VitalsMixin;
}
