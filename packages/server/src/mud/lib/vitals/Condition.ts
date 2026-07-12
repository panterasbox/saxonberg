/**
 * Conditions — the two-kind condition type system and the Kind-A
 * `Condition` Idea template. A condition is a discrete affliction
 * overlaid on a body; the two kinds differ only in where their
 * *behavior* lives, not in storage. Both present behind one
 * `ActiveCondition` collection on `VitalsMixin`.
 *
 * - **Kind A — afflictions** (diseases, poisons): identity-bearing
 *   authored content. The instance record holds a `templatePath` +
 *   runtime state; behavior lives on the `Condition` Idea (below),
 *   resolved by `findByTemplatePath` like Materials / Species.
 * - **Kind B — trauma** (laceration, fracture, …): a parameterized
 *   value with NO identity — a small *closed* engine vocabulary with
 *   uniform behavior located by `site`; behavior lives in the static
 *   `TRAUMA_BEHAVIOR` table (below).
 *
 * This build ships the **shapes only** — the type system, the table
 * skeleton with a no-op exemplar, the `Condition` class, and ZERO
 * authored content for afflictions. Trauma progression is driven
 * **reconcile-on-read** by `VitalsMixin.reconcileConditions` (the
 * metabolism / thermal / respiration precedent), NOT a recurring push
 * tick: each active trauma carries a persisted game-time `tickedAt`
 * stamp, and the read methods integrate the elapsed game-time.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import { Quantity } from '../quantity';
import type { Vitals } from './Vitals';
import type { ToxinBehavior } from '../metabolism/Metabolic';

// ---------- the active-condition vocabulary ----------

/** Kind A — affliction instance record; behavior resolves from a template. */
export interface AfflictionRecord {
  kind: 'affliction';
  /** `findByTemplatePath` → the `Condition` Idea. */
  templatePath: string;
  /** Current progression stage. */
  stage: number;
  /** Elapsed time in this affliction (ms). */
  elapsed: number;
}

/** The closed engine trauma vocabulary. Grow additively. */
export type TraumaType =
  | 'laceration'
  | 'puncture'
  | 'fracture'
  | 'contusion'
  | 'avulsion'
  | 'burn';

/**
 * The physical mechanism of an insult — the harm producer records it on
 * the trauma so the deferred **materials-response** severity function can
 * read it later. v1 stores it but it has **NO severity interaction yet**
 * (magnitude-only severity — "damage type is explicitly not the model").
 * The closed vocabulary maps bijectively onto {@link TraumaType} in
 * `ConditionLogic.inflict`. Grow additively.
 */
export type Mechanism =
  | 'sharp'
  | 'blunt'
  | 'crushing'
  | 'thermal'
  | 'tearing';

export const MECHANISMS: readonly Mechanism[] = [
  'sharp',
  'blunt',
  'crushing',
  'thermal',
  'tearing',
];

/** Kind B — trauma value; behavior resolves from `TRAUMA_BEHAVIOR`. */
export interface Trauma {
  kind: 'trauma';
  type: TraumaType;
  /** A `body.*` part key (anatomy). */
  site: string;
  /** Current damage; mutates as it worsens / heals. */
  severity: number;
  /** A laceration not yet dressed (runtime process flag). */
  bleeding?: boolean;
  /** Pressure / bandage applied → bleed arrested (runtime process flag). */
  dressed?: boolean;
  /**
   * The physical mechanism that caused it — recorded by the harm producer,
   * **not yet scored** (the deferred materials-response function reads it).
   */
  mechanism?: Mechanism;
  /**
   * The inflicter's durable `templatePath`, for combat's future blame
   * ledger — harm records attribution without owning blame. Undefined for
   * an environmental / far-cause / unattributable insult.
   */
  inflictedBy?: string;
  /**
   * The game-time (seconds) this trauma was last integrated — the
   * reconcile-on-read anchor. Stamped at `inflict` and advanced on every
   * `VitalsMixin.reconcileConditions`. Persisted (rides the `conditions`
   * collection), so a body coming live simply resumes from its last
   * stamp — no re-arm seam. Undefined until the first read stamps it.
   */
  tickedAt?: number;
}

/**
 * Engine dials for the harm driver — playtest-tuned rates, greppable and
 * retunable in one place (the `UNIVERSE_DEFAULT_VITAL_PROFILE` / metabolism
 * `*_DEFAULTS` precedent — a capability's dials live in its own module).
 * Read by the {@link TRAUMA_BEHAVIOR} strategies and
 * `VitalsMixin.reconcileConditions`. NOT plan decisions or engine
 * invariants.
 */
export const HARM_DEFAULTS = {
  /** energy → severity (magnitude-only; mechanism is NOT scored in v1). */
  SEVERITY_PER_ENERGY: 1,
  /**
   * Nominal wound integration step (real-ms). Progression is
   * reconcile-on-read (no live cadence), but tests advance the manual
   * clock by this step; the DRAIN is computed in game-time.
   */
  TICK_INTERVAL_MS: 5_000,
  /** Presence far-past guard (game-seconds) — mirrors the metabolism guard. */
  MAX_REASONABLE_GAP_SEC: 4 * 60 * 60,
  /** Laceration bleed: blood litres lost per game-second per unit severity. */
  BLEED_PER_SEC: 0.002,
  /** Severity decay per game-second while a laceration is dressed. */
  DRESSED_HEAL_PER_SEC: 0.02,
  /** Below this severity a laceration has clotted (safe to undress). */
  CLOT_SEVERITY: 0.5,
  /** Natural (undressed) severity decay per game-second, per trauma family. */
  LACERATION_HEAL_PER_SEC: 0.003,
  CONTUSION_HEAL_PER_SEC: 0.02,
  FRACTURE_HEAL_PER_SEC: 0.0015,
  BURN_HEAL_PER_SEC: 0.006,
  /** Fracture at/above this severity disables its coupled slot. */
  FRACTURE_IMPAIR_SEVERITY: 0.5,
  /** Avulsion severity floor — "a severe laceration". */
  AVULSION_SEVERITY_FLOOR: 2,
  /** Below this severity a wound has healed and is cleared from the body. */
  CLEARED_SEVERITY: 0.01,
  /** Limp: endurance %-drained per traverse per unit locomotor-wound severity. */
  LIMP_DRAIN_PER_SEVERITY: 4,
} as const;

/** Both kinds behind one collection element. */
export type ActiveCondition = AfflictionRecord | Trauma;

/** How a condition perturbs a vital sign (shape only — no consumer v1). */
export interface VitalEffect {
  /** A `VitalSign` key (see Vitals.ts). */
  sign: string;
  /** Perturbation in the sign's canonical unit. */
  delta: number;
}

/** Stages + cadence for a progressing condition. */
export interface ProgressionSpec {
  /** Targets `ScheduleApi.recurring(intervalMs, fn, opts?)`. */
  intervalMs: number;
  // Stages/cadence detail is content; no live scheduler is built here.
}

/**
 * Per-trauma-type behavior — onset / tick / resolve / reopen / describe,
 * the strategy table co-located with the value. `tick(host, t, elapsedSec)`
 * is driven by `VitalsMixin.reconcileConditions` (reconcile-on-read), which
 * owns the game-time elapsed since the trauma's `tickedAt` stamp (the drain
 * is computed in game-time so it freezes on absence). `resolve` is the
 * *dress* action (arrest the bleed / begin the
 * clot); `reopen` is the *undress* action (remove the dressing — re-arm the
 * bleed iff still above the clot threshold). The consuming verbs
 * (`TreatController` / `UndressController`) call `.resolve` / `.reopen`
 * uniformly across every type, so both are on the interface (not
 * laceration-specific).
 */
export interface TraumaBehavior {
  onset(host: Vitals, t: Trauma): void;
  tick(host: Vitals, t: Trauma, elapsedSec: number): void;
  resolve(host: Vitals, t: Trauma): void;
  /** The undress action — remove a dressing; reopen the bleed if un-clotted. */
  reopen(host: Vitals, t: Trauma): void;
  describe(t: Trauma): string;
}

const noop = (): void => {};

/** The identity exemplar — no live behavior; describe emits plain prose. */
export const NOOP_BEHAVIOR: TraumaBehavior = {
  onset: noop,
  tick: noop,
  resolve: noop,
  reopen: noop,
  describe: (t: Trauma): string => `${t.type} of ${t.site}`,
};

/** Read the host's current blood volume in litres. */
function bloodLitres(host: Vitals): number {
  return host.getVitalSign('bloodVolume').rawValue();
}

/** Set the host's blood volume, floored at 0 (a lethal read handles death). */
function setBloodLitres(host: Vitals, litres: number): void {
  host.setVitalSign('bloodVolume', Quantity.of(Math.max(0, litres), 'L'));
}

/**
 * The flagship — **laceration → bleed**, with the clot gate.
 *
 * - `onset` opens the bleed (`bleeding = true`).
 * - `tick` while bleeding-and-undressed drains `bloodVolume`
 *   (`BLEED_PER_SEC · severity · elapsedSec`; an open bleed does NOT
 *   self-clot — you must dress it); once dressed OR clotted-open it instead
 *   decays severity (fast while `dressed`, slow otherwise) toward clear.
 * - `resolve` (dress) sets `dressed`, arrests the bleed, begins the clot.
 * - `reopen` (undress) clears `dressed` and re-arms `bleeding` iff severity
 *   is still above `CLOT_SEVERITY`; below it the wound has clotted and is
 *   safe to remove (heals to clear).
 */
export const LACERATION_BEHAVIOR: TraumaBehavior = {
  onset(_host: Vitals, t: Trauma): void {
    t.bleeding = true;
  },
  tick(host: Vitals, t: Trauma, elapsedSec: number): void {
    const D = HARM_DEFAULTS;
    if (t.bleeding && !t.dressed) {
      const lost = D.BLEED_PER_SEC * Math.max(0, t.severity) * elapsedSec;
      setBloodLitres(host, bloodLitres(host) - lost);
      return; // an open bleed holds its severity until dressed
    }
    // Dressed (fast clot/heal) or clotted-open (slow heal to clear).
    const rate = t.dressed
      ? D.DRESSED_HEAL_PER_SEC
      : D.LACERATION_HEAL_PER_SEC;
    t.severity = Math.max(0, t.severity - rate * elapsedSec);
  },
  resolve(_host: Vitals, t: Trauma): void {
    t.dressed = true;
    t.bleeding = false;
  },
  reopen(_host: Vitals, t: Trauma): void {
    t.dressed = false;
    if (t.severity > HARM_DEFAULTS.CLOT_SEVERITY) t.bleeding = true;
  },
  describe(t: Trauma): string {
    if (t.dressed) {
      return `a dressed laceration on ${t.site} (bleeding controlled)`;
    }
    if (t.bleeding) return `a bleeding laceration on ${t.site}`;
    return `a clotted laceration on ${t.site}`;
  },
};

/**
 * A wound that carries no systemic bleed — it just decays its severity
 * toward zero over game-time at its own rate (the driver relieves it at
 * clear). `resolve`/`reopen` are inert (the dressing branch is the bleed's
 * clot gate; splint/suture instruments for the mechanical types are a
 * deferred first-aid branch — see harm.md). Shared by contusion / burn,
 * and the base of fracture.
 */
function decayingBehavior(
  ratePerSec: number,
  phrase: (t: Trauma) => string
): TraumaBehavior {
  return {
    onset: noop,
    tick(_host: Vitals, t: Trauma, elapsedSec: number): void {
      t.severity = Math.max(0, t.severity - ratePerSec * elapsedSec);
    },
    resolve: noop,
    reopen: noop,
    describe: phrase,
  };
}

/** contusion — mild, self-resolving over time; no bleed. */
export const CONTUSION_BEHAVIOR: TraumaBehavior = decayingBehavior(
  HARM_DEFAULTS.CONTUSION_HEAL_PER_SEC,
  (t) => `a bruise on ${t.site}`
);

/**
 * fracture — a slow natural heal. The **impairment is a derived read** of
 * this trauma through the `canOccupy` / slot machinery
 * (`Vitals.isSlotImpairedByTrauma`), NOT a tick effect — so clearing /
 * healing the fracture restores the affordance with no separate un-impair
 * step. Setting the bone (a splint instrument) is a deferred first-aid
 * branch; v1 only heals it over time.
 */
export const FRACTURE_BEHAVIOR: TraumaBehavior = decayingBehavior(
  HARM_DEFAULTS.FRACTURE_HEAL_PER_SEC,
  (t) => `a fracture of ${t.site}`
);

/** burn — real behavior: severity + a slow heal at its own rate. */
export const BURN_BEHAVIOR: TraumaBehavior = decayingBehavior(
  HARM_DEFAULTS.BURN_HEAL_PER_SEC,
  (t) => `a burn on ${t.site}`
);

/**
 * avulsion — behaves as a **severe laceration** (floors severity, bleeds,
 * shares the clot gate). The deferred **limb-sever / part-promotion**
 * (mark the `BodyPart` missing, cascade slot-disable + presentation) lands
 * HERE — at `onset` — when the sever build arrives; v1 stops at the severe
 * bleed. See harm.md § deferred seams.
 */
export const AVULSION_BEHAVIOR: TraumaBehavior = {
  onset(host: Vitals, t: Trauma): void {
    t.severity = Math.max(t.severity, HARM_DEFAULTS.AVULSION_SEVERITY_FLOOR);
    LACERATION_BEHAVIOR.onset(host, t);
  },
  tick: LACERATION_BEHAVIOR.tick,
  resolve: LACERATION_BEHAVIOR.resolve,
  reopen: LACERATION_BEHAVIOR.reopen,
  describe(t: Trauma): string {
    if (t.dressed) return `a dressed avulsion of ${t.site} (bleeding controlled)`;
    if (t.bleeding) return `a gaping avulsion of ${t.site}`;
    return `a clotted avulsion of ${t.site}`;
  },
};

/**
 * puncture — a deep, narrow wound (the `point` channel through / past
 * armor). Behaves as a **laceration** (bleeds, shares the clot gate) — a
 * puncture is a narrow bleed you dress the same way — with its own prose.
 * The materials-response point channel mints these; `resolveTrauma` maps
 * point → puncture.
 */
export const PUNCTURE_BEHAVIOR: TraumaBehavior = {
  onset: LACERATION_BEHAVIOR.onset,
  tick: LACERATION_BEHAVIOR.tick,
  resolve: LACERATION_BEHAVIOR.resolve,
  reopen: LACERATION_BEHAVIOR.reopen,
  describe(t: Trauma): string {
    if (t.dressed) {
      return `a dressed puncture wound of ${t.site} (bleeding controlled)`;
    }
    if (t.bleeding) return `a bleeding puncture wound of ${t.site}`;
    return `a clotted puncture wound of ${t.site}`;
  },
};

/**
 * The closed trauma behavior table — every `TraumaType` carries live
 * behavior (the NOOP exemplar remains the fallback shape). `avulsion` and
 * `puncture` delegate to the laceration bleed family.
 */
export const TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior> = {
  laceration: LACERATION_BEHAVIOR,
  puncture: PUNCTURE_BEHAVIOR,
  fracture: FRACTURE_BEHAVIOR,
  contusion: CONTUSION_BEHAVIOR,
  avulsion: AVULSION_BEHAVIOR,
  burn: BURN_BEHAVIOR,
};

// ---------- Kind-A: the Condition Idea template ----------

/** What relieves a condition — the treatment seam (shape only v1). */
export interface ResolutionSpec {
  /** A resolution-mechanism token (e.g. `'antitoxin'`, `'rest'`). */
  by: string;
}

/** Disease-spread descriptor — RESERVED, no consumer in this build. */
export interface ContagionSpec {
  vector: string;
}

/** The authored shape of an affliction (mirrors the class fields). */
export interface ConditionTemplate {
  name: string;
  signature: VitalEffect[];
  progression: ProgressionSpec;
  resolution: ResolutionSpec;
  observableSigns: string[];
  contagion?: ContagionSpec;
}

/**
 * The Kind-A affliction template (disease / poison / toxin / infection).
 * An identity-bearing authored Idea resolved by `findByTemplatePath`
 * like Materials / Species. ZERO content ships — the class + field shape
 * only; the catalog is a later wave.
 */
export default class Condition extends SingletonMixin(
  PropertiedMixin(Idea),
) {
  /** Affliction name (e.g. `'influenza'`). */
  protected name: string = '';
  /** How it perturbs vital signs. */
  protected signature: VitalEffect[] = [];
  /** Stages + cadence. */
  protected progression: ProgressionSpec | null = null;
  /** What relieves it (the treatment seam). */
  protected resolution: ResolutionSpec | null = null;
  /** Observable signs for assessment prose (`'flushed'`, `'feverish'`). */
  protected observableSigns: string[] = [];
  /** Optional contagion — reserved, no consumer v1. */
  protected contagion: ContagionSpec | null = null;

  /**
   * Optional toxin behavior — the per-body rate params for a toxin-driven
   * condition (absorption / clearance / potency / severity bands).
   * Authored only on the toxin conditions metabolism drives (alcohol,
   * ptomaine, venom, lead); `null` for every other condition. This is
   * where a toxin's RATES live (the food carries only the dose amount).
   */
  protected toxinBehavior: ToxinBehavior | null = null;

  static persistentFields = [
    'name',
    'signature',
    'progression',
    'resolution',
    'observableSigns',
    'contagion',
    'toxinBehavior',
  ];

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getSignature(): readonly VitalEffect[] {
    return this.signature;
  }
  public setSignature(value: VitalEffect[]): void {
    this.signature = value;
  }

  public getProgression(): ProgressionSpec | null {
    return this.progression;
  }
  public setProgression(value: ProgressionSpec | null): void {
    this.progression = value;
  }

  public getResolution(): ResolutionSpec | null {
    return this.resolution;
  }
  public setResolution(value: ResolutionSpec | null): void {
    this.resolution = value;
  }

  public getObservableSigns(): readonly string[] {
    return this.observableSigns;
  }
  public setObservableSigns(value: string[]): void {
    this.observableSigns = value;
  }

  public getContagion(): ContagionSpec | null {
    return this.contagion;
  }
  public setContagion(value: ContagionSpec | null): void {
    this.contagion = value;
  }

  /** The toxin behavior block (null for non-toxin conditions). */
  public getToxinBehavior(): ToxinBehavior | null {
    return this.toxinBehavior;
  }
  public setToxinBehavior(value: ToxinBehavior | null): void {
    this.toxinBehavior = value;
  }
}
