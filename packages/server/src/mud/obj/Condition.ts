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

import { Idea } from '../lib/stuff/Idea';
import { SingletonMixin } from '../lib/stuff/Singleton';
import { PropertiedMixin } from '../lib/stuff/Propertied';
import { Quantity } from '../lib/quantity';
import type { Vitals } from '../lib/vitals/Vitals';
import type { ToxinBehavior } from '../lib/metabolism/Metabolic';
import type { Channel } from '../lib/material/Channel';
import type { MagicProvenance } from '../lib/magic/Grid';
import type { ResistBand } from '../lib/magic/Resist';
import type { FieldMeta } from '../lib/mixin';

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
  /**
   * The magical provenance tag ({@link MagicProvenance} — grid address +
   * caster), present iff a magical effect installed this. Read by dispel
   * / detect (tag-keyed, structurally unable to touch a mundane
   * condition) and by the magic reconcile arm's authored decay. Plain
   * scalars — persists free (the `mechanism`/`inflictedBy` precedent).
   */
  magicOrigin?: MagicProvenance;
  /** The game-time (seconds) the magic decay arm last integrated this —
   * only present on a `magicOrigin`-tagged affliction. */
  tickedAt?: number;
}

/** The closed engine trauma vocabulary. Grow additively. */
export type TraumaType =
  | 'laceration'
  | 'puncture'
  | 'fracture'
  | 'contusion'
  | 'avulsion'
  | 'burn';

// The mechanism vocabulary is unified into the materials-response
// **channel** set (edge / point / blunt) — the single interface a weapon's
// delivery, an armor's resistance, and a tissue's failure all transact over.
// Re-exported here so harm consumers keep one import site.
export type { Channel } from '../lib/material/Channel';
export { CHANNELS, Channels } from '../lib/material/Channel';

/**
 * The kind of insult an `inflict` describes. A {@link Channel} value runs the
 * full materials-response resolution (covering stack → tissue → both the
 * trauma *type* and its *severity*) — this now includes `heat` (resolving
 * through the insulation fold into a `burn`), which retired the old
 * magnitude-only `'thermal'` token. The one remaining passthrough token is
 * `'tearing'` (direct → avulsion) — the documented seam that folds into a
 * tearing channel when it lands. See docs/subsystems/materials-response.md.
 */
export type InsultKind = Channel | 'tearing';

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
   * The insult kind that caused it — recorded raw by the harm producer (a
   * {@link Channel} for a response-resolved wound, or a passthrough token).
   * The severity + type were resolved through the materials-response
   * function; this stays the honest record of *how* it was struck.
   */
  mechanism?: InsultKind;
  /**
   * The inflicter's durable `templatePath`, for combat's future blame
   * ledger — harm records attribution without owning blame. Undefined for
   * an environmental / far-cause / unattributable insult.
   */
  inflictedBy?: string;
  /**
   * The magical provenance tag, present iff a magical impulse delivered
   * this wound (a firebolt's burn). The wound itself is REAL — never
   * suppressible, never dispellable (an impulse can't un-happen); the
   * tag serves detect + attribution only.
   */
  magicOrigin?: MagicProvenance;
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

  /* ── dying windows (game-seconds) ────────────────────────────────────
   * How long the body has once a lethal threshold is crossed. Each driver
   * owns the number for its own physics; these two are harm's. The
   * default backstops a driver that has no opinion.
   *
   * They are short on purpose. This is the interval in which a medic can
   * reach you — long enough that rescue is a real possibility, short
   * enough that it is a scramble.
   */
  DYING_WINDOW_SEC_DEFAULT: 180,
  /** Bleeding out: the fastest of them. */
  EXSANGUINATION_DYING_WINDOW_SEC: 120,
  /** Cardiac arrest from a fibrillating current — faster still. */
  ELECTROCUTION_DYING_WINDOW_SEC: 90,
} as const;

/**
 * Kind C — a **sustained shock**: the reconcile-on-read state of a *persisting
 * closed circuit* (standing in a live pool, held fast by tetany). It carries a
 * live `current` (amps) and integrates current × time lazily on read — the
 * harm-bleed idiom applied to electricity: it accrues contact burn, drives
 * `heartRate` at the fibrillation band (the electrocution death seam), and is
 * relieved the moment the circuit breaks (the body steps out / the source
 * dies) — UNLESS `tetany` holds it closed ("can't let go"). The event that
 * mints it is `ElectricityApi.conduct`; the integration lives in
 * `VitalsMixin.reconcileConditions`. Plain-scalar fields → default-Hydrator
 * round-trip (the `Trauma` precedent), no marshaller.
 */
export interface SustainedShock {
  kind: 'shock';
  /** The current through the body on this circuit (amps). */
  current: number;
  /** The source's durable `templatePath` — re-probed to verify the circuit
   * is still closed. Undefined for an unattributable / ambient source. */
  source?: string;
  /** The contact site keys the shock burn accrues at. */
  sites: string[];
  /** Tetany holds the circuit closed regardless of volition ("can't let go")
   * and gates volitional verbs (release / drop / move). */
  tetany?: boolean;
  /** The game-time (seconds) this shock was last integrated — the
   * reconcile-on-read anchor (the `Trauma.tickedAt` precedent). */
  tickedAt?: number;
}

/**
 * Kind D — a **sustained magical effect**: the modifier half of the
 * impulse/modifier split. The magic is *still holding this up* (a bound
 * glowlight, a maintained veil), so the reconcile-on-read arm realizes it
 * by pull — active → the bound realization holds; **dormant (inside a
 * suppression field) → un-realized**; expired / dispelled → released
 * (any bound emitter destructed). This is the ONLY suppressible kind:
 * impulses have no suppression code path at all. The `SustainedShock`
 * shape precedent — plain scalars, no marshaller.
 */
export interface SustainedEffect {
  kind: 'sustained';
  /** The spell that installed it. */
  spellId: string;
  /** Which realization this holds: 'emit-light' | 'cloak' (grows with the modifier roster). */
  realizes: string;
  /** Always tagged — a sustained effect IS magic. */
  magicOrigin: MagicProvenance;
  /**
   * **Who can pay again** — the durable id of the charged host holding
   * this up (requirements D12), or absent when nobody can.
   *
   * A binding must be paid for continuously. A **charged host** can pay:
   * its standby draw meters the cost against its own reserve, so at the
   * end of each term it re-buys another and the hold survives — while
   * it has charge. A **consumable** paid once and is gone, so this is
   * absent and the term simply runs out.
   *
   * Together with {@link sustainedFor} this makes the old guideline a
   * *derivation* rather than a rule. Nothing forbids a shadow sourced
   * from a potion; it just cannot outlive the term it bought — which is
   * exactly why long-lived sustained effects are forged as rings and not
   * bottled. Wands, being spells with a battery, inherit the casting
   * conventions.
   */
  sustainedBy?: string;
  /**
   * **How long one payment buys**, in game-seconds — the term. Set from
   * the spell's authored lifetime at install. A host-held effect renews
   * by this much each time it lapses; a term-bought one gets it once.
   */
  sustainedFor?: number;
  /** The bound emitter's live-instance stuffId (a conjured GlowlightOrb), if any. */
  boundStuffId?: string;
  /** The imposed disguise text (the cloak realization), if any. */
  disguise?: string;
  /** Absolute game-time (seconds) this effect lapses on its own. */
  expiresAt?: number;
  /** Inside a suppression field — un-realized but not released. */
  dormant?: boolean;
  /** The game-time (seconds) last integrated (the `tickedAt` idiom). */
  tickedAt?: number;
}

/** All four kinds behind one collection element. */
/**
 * Kind E — **the dying clock.** The body has crossed a lethal threshold,
 * and from here the WINDOW kills it, not the threshold. That gap is the
 * whole point: it is the only interval in which someone can intervene, and
 * it is what turns nine independent "you are now dead" flips into a state a
 * medic can act on.
 *
 * Two ways this record deliberately diverges from every other condition:
 *
 * - **It is exempt from the linkdead freeze and the far-past gap guard.**
 *   Every other arm of `reconcileConditions` pauses while a player is
 *   disconnected; inheriting either here would make pulling the plug a cure
 *   for dying. See the integration site in `VitalsMixin.reconcileConditions`.
 * - **The window comes from the driver**, not from a table here — the
 *   producer that knows the physics supplies it (the shipped
 *   `RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC` precedent). Bleeding out and
 *   freezing to death are not the same length of story.
 *
 * Plain scalars → default-Hydrator round-trip, no marshaller (the `Trauma`
 * precedent). It persists, so a dying body that is evicted and restored is
 * still dying, with its accrued time intact.
 */
export interface DyingRecord {
  kind: 'dying';
  /** Ground-truth cause, stamped onto the body when the window expires. */
  cause: string;
  /** Game-seconds from onset to death — supplied by the driver. */
  windowSec: number;
  /** Game-seconds accrued so far. */
  elapsed: number;
  /** Game-time anchor; `undefined` until the first touch seeds it. */
  tickedAt?: number;
  /**
   * Caller-supplied attribution, carried to the death row when the window
   * expires. Combat stamps it (it knows the killer, the terms, and whether
   * consent was given); an environmental death leaves it unset. The ledger
   * never infers consent — the producer that knows it supplies it.
   *
   * **Opaque on purpose.** `Condition.ts` is body-state vocabulary; it
   * must not import the accountability ledger's shapes, and the body has
   * no business inspecting attribution it is merely carrying. The death
   * transition types it on the way out.
   */
  accountability?: unknown;
}

export type ActiveCondition =
  | AfflictionRecord
  | Trauma
  | SustainedShock
  | SustainedEffect
  | DyingRecord;

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

  /**
   * Optional mental-resist bands — the ascending `{threshold, stage}`
   * cutoffs the magic mental resolver stages a post-fold residual
   * against, scaled by the target's live Composure factor (the
   * `toxinBehavior.bands` authored-cutoffs precedent). Authored only on
   * mental-axis conditions (dread); `null` for every other condition.
   */
  protected mentalBands: ResistBand[] | null = null;

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    signature: { persistent: true },
    progression: { persistent: true },
    resolution: { persistent: true },
    observableSigns: { persistent: true },
    contagion: { persistent: true },
    toxinBehavior: { persistent: true },
    mentalBands: { persistent: true },
  };

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

  /** The mental-resist bands (null for non-mental conditions). */
  public getMentalBands(): ResistBand[] | null {
    return this.mentalBands;
  }
  public setMentalBands(value: ResistBand[] | null): void {
    this.mentalBands = value;
  }
}
