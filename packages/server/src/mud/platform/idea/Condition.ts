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

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { Quantity } from '../../lib/quantity';
import type { Vitals } from '../../lib/vitals/Vitals';
import type { ToxinBehavior } from '../../lib/metabolism/Metabolic';
import type { PathogenBehavior } from '../../lib/material/Contaminable';
import type { Channel } from '../../lib/material/Channel';
import type { MagicProvenance } from '../../lib/magic/Grid';
import type { ResistBand } from '../../lib/magic/Resist';
import type { FieldMeta } from '../../lib/mixin';

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
  /** The game-time (seconds) an integrating arm last touched this —
   * the magic decay arm, or the in-host infection arm below. */
  tickedAt?: number;
  /**
   * ⭐⭐ **The in-host population**, `[0, 1]` — present iff this affliction
   * is an INFECTION (a row under `Condition/pathogen/` whose
   * `pathogenBehavior.reach` is `infect`).
   *
   * The distinction from `stage` is the whole of it: `stage` is the
   * banded severity a medic reads, and this is the thing that is actually
   * happening. The load grows against the body's resistance, and the
   * stage is derived from it — so an infection getting worse and a
   * treatment starting to work are the same number moving.
   */
  pathogenLoad?: number;
  /**
   * Game-time (seconds) at which symptoms begin — the incubation.
   *
   * ⭐ **Why illness arrives hours after the meal and not at the table.**
   * Before this, every consequence in the engine was immediate, and food
   * poisoning that announced itself as you swallowed would teach the
   * wrong lesson entirely: the whole point is that you have to reason
   * backwards to *what you did* rather than forwards from what you feel.
   */
  symptomsAt?: number;
  /**
   * ⭐⭐ **Who did this** — the `templatePath` of the acting author at the
   * moment the affliction landed, or absent when nobody did (a fever, a
   * frostbite, the cold).
   *
   * The `Trauma.inflictedBy` twin, and it closes the same gap on the
   * other half of the condition vocabulary. A wound has always known who
   * dealt it; a **poisoning** did not — so the one kind of harm that is
   * deliberate, premeditated and quiet was the one kind the world could
   * not attribute. Stamped at `VitalsMixin.afflict`, from execution
   * context, never from a caller-supplied parameter (the gated-Api
   * actor-from-context rule).
   *
   * ⚠ Recorded, not acted on. This build gives accountability something
   * true to read; it does not make poisoning a crime, which is the
   * accountability ledger's decision and not the body's.
   */
  inflictedBy?: string;
}

/** The closed engine trauma vocabulary. Grow additively. */
export type TraumaType =
  | 'laceration'
  | 'puncture'
  | 'fracture'
  | 'contusion'
  | 'avulsion'
  | 'burn'
  /**
   * ⭐ An **interior** bleed — a torn organ. Bleeds exactly as a
   * laceration does, and cannot be dressed, because the wound is in a
   * cavity you cannot reach. `resolution: 'surgery'`, which nothing in
   * the game offers yet: the honest answer is that you are bleeding into
   * yourself and there is nothing to hand that will stop it.
   */
  | 'rupture'
  /**
   * ⭐ **Frostbite** — the cold channel's wound. Not a burn: it NUMBS the
   * part (a numb hand cannot grip) and what it wants is warmth, not
   * fluid. It heals slowly on its own, which is the honest difference —
   * a burn weeps and gets worse, a freeze is done happening the moment
   * you are warm again.
   */
  | 'frostbite'
  /**
   * ⭐⭐ **Caustic** — the corrosion channel's wound, and the only one in
   * the game that **keeps working after the blow**. The agent is still on
   * you: severity GROWS while it is active, and the only thing that stops
   * it is washing it off. Every other wound in this table is a record of
   * something that already finished happening.
   */
  | 'caustic';

// The mechanism vocabulary is unified into the materials-response
// **channel** set (edge / point / blunt) — the single interface a weapon's
// delivery, an armor's resistance, and a tissue's failure all transact over.
// Re-exported here so harm consumers keep one import site.
export type { Channel } from '../../lib/material/Channel';
export { CHANNELS, Channels } from '../../lib/material/Channel';

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
   * ⭐⭐ **The agent is still on you** — set by `CAUSTIC_BEHAVIOR.onset`
   * and cleared by a rinse. While it is true the wound GROWS instead of
   * healing, which is what makes a caustic different in kind from
   * everything else in this table rather than merely in flavour.
   *
   * ⚠ A runtime process flag on the value, exactly like `bleeding` — not
   * a second condition and not a stored timer. What stops it is an act.
   */
  agentActive?: boolean;
  /**
   * ⭐ Whether this wound may take the part off — copied from the
   * insult's `maim` (undefined → true; combat sets false for a non-lethal
   * fight). Read by `AVULSION_BEHAVIOR.onset`. Absent on the overwhelming
   * majority of wounds, which are not avulsions and never consult it.
   */
  maimAllowed?: boolean;
  /**
   * The game-time (seconds) this trauma was last integrated — the
   * reconcile-on-read anchor. Stamped at `inflict` and advanced on every
   * `VitalsMixin.reconcileConditions`. Persisted (rides the `conditions`
   * collection), so a body coming live simply resumes from its last
   * stamp — no re-arm seam. Undefined until the first read stamps it.
   */
  tickedAt?: number;
  /**
   * ⭐⭐ **The HEALING clock's stamp** (D3) — the game-time (seconds) the
   * wound's `mend` last ran, kept SEPARATE from `tickedAt` because the two
   * halves integrate under opposite absence rules. The harm arm
   * (`tickedAt`) freezes on linkdead and drops a far-past gap — *being
   * away must never bleed you*. The mend arm (`mendedAt`) does NEITHER —
   * *being away must never COST you, and mending is never a cost* — so a
   * body knits across a logout at whatever `k` it reads on return.
   * Stamped at `inflict` beside `tickedAt`; undefined until first read.
   */
  mendedAt?: number;
  /**
   * ⭐ **How well this wound's treatment was done**, `[0, 1]` (D5) —
   * stamped by `Vitals.applyTreatment` from the treater's skill × the
   * supply. `mend` scales the TREATED heal rate by `0.5 + 0.5 ×
   * careQuality`, so a clean bandage in a practised hand knits fast and a
   * filthy rag in an untrained one barely helps. Absent → treated as `1`
   * (a wound dressed by a path that does not grade the care). Read only
   * while `dressed`.
   */
  careQuality?: number;
  /**
   * ⭐ **When a bleed-family wound went (and stayed) open** (game-seconds,
   * D11). A wound above the clot threshold left undressed past
   * `SEPSIS_OPEN_ONSET_SEC` goes bad on its own — this is the clock. Set
   * when the wound is first seen open, cleared when it is dressed.
   */
  openSince?: number;
  /** ⭐ Guard so the open-wound sepsis seed fires at most once per wound
   * (D11). Reset when the wound is dressed. */
  septicSeeded?: boolean;
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
  /**
   * ⭐ **The sparring currency.** A bruise costs endurance while you
   * carry it — you are a little slower the morning after a beating, and
   * that is all. Small on purpose: this is the fee for a fight you walked
   * away from, not an injury.
   */
  CONTUSION_STIFFNESS_PCT_PER_HOUR: 0.4,
  FRACTURE_HEAL_PER_SEC: 0.0015,
  BURN_HEAL_PER_SEC: 0.006,
  /**
   * ⭐⭐ **The plasma weep** — litres per game-hour per unit of burn
   * severity.
   *
   * A serious burn loses fluid through the wound. It is why burn victims
   * are given fluids, why `BURN_BEHAVIOR.resolution` is `fluid` rather
   * than `dressing`, and why a burn left alone slides toward the
   * exsanguination window on a clock the burn itself owns. Before this a
   * burn was a number that counted down and did nothing.
   */
  BURN_WEEP_L_PER_HOUR_PER_SEVERITY: 0.08,
  /** Fracture at/above this severity disables its coupled slot. */
  FRACTURE_IMPAIR_SEVERITY: 0.5,
  /** Avulsion severity floor — "a severe laceration". */
  AVULSION_SEVERITY_FLOOR: 2,
  /**
   * ⭐⭐ **The sever threshold** — an avulsion at or above this severity,
   * on a part the body plan marks `severable`, takes the part off.
   *
   * Deliberately above the `open`-band blow (4.5 × the weapon's delivery
   * scale): losing a hand wants a real blade against a foe who is already
   * finished, not an unlucky exchange. It is the AVULSION severity that is
   * read, so `AVULSION_SEVERITY_FLOOR` is the floor and this is the gate —
   * a wound has to be much worse than "severe" to be terminal for the part.
   */
  SEVER_SEVERITY: 4.0,
  /**
   * ⭐ **What a total loss of locomotion costs a traverse**, in units of
   * `LIMP_DRAIN_PER_SEVERITY`. The limp is now a shortfall in the
   * `locomotion` capacity (`1 − scalar`) rather than a sum of wound
   * severities, and the scalar is bounded by 1 where a severity sum was
   * not — so this restores the magnitude the old sum reached.
   *
   * Two legs and one of them gone is a shortfall of 0.5, which at
   * `4 × 2 × 0.5` costs 4 % endurance a traverse: a real hobble that does
   * not strand you. (Was `LIMP_MISSING_SEVERITY: 2`, the W-A0 interim.)
   */
  LIMP_SHORTFALL_SCALE: 2,
  /** Below this severity a wound has healed and is cleared from the body. */
  CLEARED_SEVERITY: 0.01,
  /** Limp: endurance %-drained per traverse per unit locomotor-wound severity. */
  LIMP_DRAIN_PER_SEVERITY: 4,
  /**
   * ⭐⭐ **What each kind of wound costs the part it sits on**, per unit of
   * severity. `1 − Σ(severity × weight)` is the part's own function.
   *
   * The ordering is the claim, and it is a physiological one: a **fracture**
   * is the worst thing short of losing the part (1.2, so the shipped 0.5
   * impair threshold still lands exactly on `impaired` — byte-parity with
   * the boolean rule it replaced), an **avulsion** takes tissue away (1.0),
   * a **burn** or a freeze or a caustic destroys tissue in place but does
   * not break the structure (0.6), a **rupture** is interior and grave but
   * costs the ORGAN not the limb (0.3), and a cut is mostly a bleed — a
   * **laceration** (0.2) or a **puncture** (0.25) hurts and leaks and does
   * not stop the hand closing. A **contusion** is 0.1: a bruise is a fee,
   * not an injury.
   *
   * ⚠ Keyed by `TraumaType`, declared here rather than authored, because
   * the trauma vocabulary IS closed — a burn is a burn everywhere.
   */
  FUNCTION_LOSS_PER_SEVERITY: {
    fracture: 1.2,
    avulsion: 1.0,
    burn: 0.6,
    rupture: 0.3,
    puncture: 0.25,
    laceration: 0.2,
    contusion: 0.1,
    // A freeze and a chemical burn both destroy tissue in place without
    // breaking the structure — the same claim as a thermal burn, and the
    // same weight.
    frostbite: 0.6,
    caustic: 0.6,
  } as Record<string, number>,
  /**
   * ⭐ **A conduit tolerates a scratch.** How badly a part something else's
   * control or supply runs THROUGH must be hurt before it starts costing
   * that other part anything, and over what range it goes to nothing.
   *
   * A graze on the spine does not paralyse the arm; a severe spine wound
   * does. Without the tolerance every torso scratch would dim every limb,
   * which is both wrong and miserable.
   */
  CONDUIT_TOLERANCE: 1.0,
  CONDUIT_RANGE: 2.0,
  /** Function at or above this reads `full`. */
  FUNCTION_BAND_FULL: 0.75,
  /** Function at or above this (and below full) reads `impaired`. */
  FUNCTION_BAND_IMPAIRED: 0.4,
  /** Frostbite's own decay — slower than a burn; cold damage lingers. */
  FROSTBITE_HEAL_PER_SEC: 0.004,
  /** Caustic severity gained per game-second while the agent is active. */
  CAUSTIC_GROWTH_PER_SEC: 0.01,
  /**
   * …and the ceiling it grows to. ⚠ A cap is what keeps "wash it off" a
   * real decision rather than a formality: unbounded growth would make an
   * unrinsed caustic lethal on a clock nobody can read, which is the
   * punishment-without-information shape this game avoids.
   */
  CAUSTIC_MAX_SEVERITY: 4,

  /* ── convalescence: what CARE buys the healing rate ──────────────────
   * ⭐⭐ **The keystone.** Every wound's `mend` law multiplies its heal by
   * the body's per-reconcile convalescence factor `k` — a bed, a carer and
   * a spell are three payers of that one number. `tick` keeps what HARMS
   * (the bleed, the weep, the caustic's growth); `mend` is the healing
   * half, and the only half `k` scales. See `Vitals.convalescenceFactor`.
   */
  /**
   * ⭐ **Time is the free heal.** Even standing on bare ground a wound
   * knits — slowly. The floor is what a body with no rest surface, no
   * carer and no clinic still gets, so recovery is never *impossible*,
   * only *slow*. (A body that is not SAFE reads 0 — see D3a; that is a
   * different gate, not this floor.)
   */
  CONVALESCENCE_FLOOR: 0.2,
  /**
   * ⭐ **D3a — how long after taking harm a body stays "unsafe"** and mends
   * nothing (game-seconds). Short: long enough that a fight is genuinely
   * over, invisible across an hours-long logout. The intent-agnostic
   * combat-log answer — a body dropped mid-fight heals nothing (recently
   * harmed) exactly as a present one would, and the escaper and the
   * bad-connection player are treated identically because only the
   * SITUATION is read.
   */
  CONVALESCENCE_SAFE_DELAY: 5 * 60,
  /**
   * ⭐ **What a carer's skill is worth**, as a bonus to `k` while a
   * `TendingEngagement` is live (`convalescenceFactor` adds `1 + bonus`).
   * By the carer's MEDICINE competence band — the same vocabulary
   * `assess` and `treat` read. An untrained sitter helps not at all; a
   * practised physician doubles the rate.
   */
  CARER_BONUS_BY_BAND: {
    untrained: 0,
    novice: 0.25,
    competent: 0.5,
    proficient: 0.75,
    expert: 1.0,
  } as Record<string, number>,
  /**
   * ⭐ **The treated heal rates** — what a wound decays at once its
   * treatment is ON it (`Trauma.dressed`, generalized to "its treatment is
   * applied"), faster than its natural rate. `mend` scales the treated
   * rate by care quality (`0.5 + 0.5 × careQuality`). Laceration keeps
   * `DRESSED_HEAL_PER_SEC`; these are the mechanical types made treatable
   * (set fracture, closed rupture, cooled burn, rewarmed frostbite).
   */
  FRACTURE_TREATED_HEAL_PER_SEC: 0.006,
  RUPTURE_TREATED_HEAL_PER_SEC: 0.004,
  BURN_TREATED_HEAL_PER_SEC: 0.012,
  FROSTBITE_TREATED_HEAL_PER_SEC: 0.01,

  /* ── wound infection (D11) ───────────────────────────────────────────
   * The inoculum a treatment (or an open wound) deposits, and the clean-
   * enough thresholds. The infection then grows through the shipped
   * logistic in-host arm — nothing new drives it.
   */
  /** Base pathogen load a dirty treatment / an open wound deposits (≥ the
   * row's `infectiousDose`, so it takes). Scaled by `1 − cleanliness`. */
  SEPSIS_INOCULUM: 0.1,
  /** Below this cleanliness (hands) or care quality, a treatment is dirty
   * enough to inoculate a bleed-family wound. */
  SEPSIS_DIRTY_THRESHOLD: 0.5,
  /** How long (game-seconds) a bleed-family wound above the clot threshold
   * may sit undressed before it goes bad on its own — twelve game-hours. */
  SEPSIS_OPEN_ONSET_SEC: 12 * 60 * 60,
  /** Incubation fallback (game-seconds) if the row's is unreadable. */
  SEPSIS_INCUBATION_FALLBACK_SEC: 6 * 60 * 60,

  /* ── circulation: what losing blood does to the pressure ─────────────
   * ⭐⭐ **The compensated plateau is the single most important fact about
   * haemorrhage, and it is modelled on purpose.** A patient can be
   * seriously bled and still have a normal blood pressure, right up until
   * they are not — ATLS class II holds, class III drops. A model where
   * pressure slides smoothly down with blood lost would teach the
   * opposite, and the opposite is what gets people killed.
   */
  /** Fraction of blood volume lost before systolic pressure moves at all. */
  SHOCK_COMPENSATED_LOSS: 0.15,
  /** Pressure lost per unit of loss PAST the compensated plateau. */
  SHOCK_BP_SLOPE: 1.5,
  /**
   * ⭐ **The narrowing pulse pressure.** Through the compensated phase the
   * diastolic RISES while the systolic holds — vasoconstriction — so the
   * gap between them closes. That narrowing is the EARLIEST sign and the
   * first thing a clinician reads; dropping both on one slope would teach
   * a simpler, false thing.
   */
  SHOCK_DIASTOLIC_RISE: 0.08,
  /** Loss fraction at which hypovolemic shock spawns. */
  SHOCK_LOSS_FRACTION: 0.3,
  /** …and below which it is relieved (the hysteresis margin). */
  SHOCK_RELIEF_FRACTION: 0.25,

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
  /**
   * ⭐⭐ **A vital organ is GONE** — a missing part that governs
   * consciousness, circulation or respiration (a severed head; a future
   * mangle that takes the chest). Fast: there is nothing to compress and
   * no volume to top up, so the window is short — but non-zero, because
   * the whole dying-clock discipline is that death is a clock a bystander
   * can still act against, even when the only act left is a decision.
   */
  VITAL_ORGAN_LOSS_DYING_WINDOW_SEC: 30,
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
  /** Tetany holds the body rigid ("can't let go") and gates volitional
   * verbs (release / drop / move). A LIVE circuit sustains it as long as
   * current flows; a discrete contact (a stun-baton tap) has no standing
   * circuit, so `tetanyUntil` bounds how long the after-grip lasts. */
  tetany?: boolean;
  /** Game-time (seconds) at which a discrete-pulse tetany releases (the
   * after-grip of a one-shot contact). Absent on a live-circuit shock,
   * which self-sustains by re-probing the circuit instead. Once elapsed
   * with no live circuit, the reconcile relieves the record. */
  tetanyUntil?: number;
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
  /** The bound emitter's live-instance stuffId (a conjured emitter such as the arcane library's GlowlightMote), if any. */
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

/**
 * ⭐⭐ **What a condition DOES to a body — the effect channel.**
 *
 * `signature` shipped as `{sign, delta}[]`, persistent, authorable and
 * spoiler-levelled, on an Idea with a public accessor — and **nothing
 * anywhere read it**. All twenty-three shipped rows author `signature: []`
 * because there was nothing else to author. The one effect any affliction
 * had on a body was a hydration drain hard-coded inside
 * `Vitals.progressInfection`, for pathogens only, that no row asked for
 * and no row could ask for.
 *
 * The union is what makes it a channel rather than a field: four kinds,
 * two integrated over time and two read on demand, and a new affliction
 * becomes **a law plus a signature** rather than a new arm in
 * `reconcileConditions`.
 *
 * ⚠ `delta` became `perHour` deliberately. A raw delta has no answer to
 * *"applied how often?"*, so it could only ever have meant "once, on some
 * tick nobody defined" — which is why it was never wired. A **rate**
 * integrates over whatever elapsed, which is the only shape that works
 * with reconcile-on-read and an absent player.
 */
export type VitalEffect =
  | {
      /** Integrate a rate on a vital sign (`bloodVolume`, `spo2`, …). */
      kind: 'vital';
      /** A `VitalSign` key (see Vitals.ts). */
      sign: string;
      /** Signed change per game-hour, in the sign's canonical unit. */
      perHour: number;
    }
  | {
      /** Integrate a rate on a biological reserve (`endurance`, …). */
      kind: 'reserve';
      reserve: string;
      /** Signed percentage points per game-hour. */
      pctPerHour: number;
    }
  | {
      /**
       * ⭐⭐ **What this wound costs the PART it sits on** — READ, never
       * integrated. The number is how much function one unit of severity
       * takes away, so a part's own function is
       * `1 − Σ(severity × lossPerSeverity)` over the wounds on it.
       *
       * ⚠ This **replaced** `{kind:'capability', disables:'slots-at-site',
       * aboveSeverity}`, which was a boolean cliff: below the threshold a
       * fracture cost nothing at all, above it the slot vanished, and
       * there was no third thing a wound could take. Two wounds that each
       * sat just under the line were free. A rate composes — two
       * half-wounds add up, a big wound on a limb reaches past it to
       * whatever the limb carries, and the slot gate falls out of the
       * function read instead of being its own rule.
       *
       * Weights live in `HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY`.
       */
      kind: 'function';
      /** Function lost per unit of severity, at the wound's own site. */
      lossPerSeverity: number;
    }
  | {
      /**
       * Competence suppression — READ, never integrated. How many bands
       * of *expressed* skill this condition costs while it lasts. The
       * Transcript is never touched.
       */
      kind: 'expression';
      bands: number;
    }
  | {
      /**
       * ⭐⭐ **A read-time convalescence modifier** (recovery D12) — how much
       * this condition SPEEDS (or slows) wound mending while it lasts.
       * `Vitals.convalescenceFactor` multiplies `factor` into `k` over
       * every active affliction that declares one; `applyEffects` IGNORES
       * it (it is a read, like `function`, never an integrated rate). A
       * fever could author `factor: 0.5`; the `mend` spell authors `3`.
       * This is what lets magic heal WITHOUT a new Effect kind — the spell
       * afflicts a `mending` condition whose signature carries this.
       */
      kind: 'convalescence';
      factor: number;
    };

/** The laws a condition's stage can advance under. */
export const PROGRESSION_LAWS = [
  'stage',
  'decay',
  'logistic',
  'burden',
] as const;
export type ProgressionLaw = (typeof PROGRESSION_LAWS)[number];

/**
 * ⭐⭐ **How a condition's stage moves — declared by the author, not
 * inferred from which optional field happens to be set.**
 *
 * `reconcileConditions` grew seven arms because each new condition kind
 * arrived with a new discriminator: *has a `magicOrigin`* → decay, *has a
 * `pathogenLoad`* → logistic, *has neither* → dwell. The shape of the
 * record decided the law, so a row could not choose one and every new law
 * meant a new arm.
 *
 * ⚠ The trap sprang once already, with a comment proving it: the arm that
 * filled `ProgressionSpec` recorded that the field *"was authored by
 * three rows, and was read by nothing"* — and added an arm rather than
 * asking why. Naming the law is what lets three arms collapse into one.
 */
export interface ProgressionSpec {
  /** Which law advances this condition's stage. */
  law: ProgressionLaw;
  /** `stage`: game-milliseconds of dwell per stage. */
  intervalMs?: number;
  /** `decay`: stage lost per game-second (else the magic dial). */
  decayPerSec?: number;
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
  /**
   * The HARM half of progression — what carrying the wound *does to you*
   * over the interval and cannot be sped up by care: the bleed drain, the
   * caustic's growth. Frozen on absence like every reconcile arm.
   * ⚠ No longer heals: the severity decay moved to {@link mend}.
   */
  tick(host: Vitals, t: Trauma, elapsedSec: number): void;
  /**
   * ⭐⭐ The HEALING half, split from `tick` — the severity decay, scaled
   * by the body's convalescence factor `k` (`Vitals.convalescenceFactor`).
   * A bed, a carer and a spell all pay into that one number. Runs on the
   * offline `mendedAt` stamp (W-A2), so being away mends you but never
   * costs you. A `k` of 0 (a body that is not safe — D3a) heals nothing.
   */
  mend(host: Vitals, t: Trauma, elapsedSec: number, k: number): void;
  resolve(host: Vitals, t: Trauma): void;
  /** The undress action — remove a dressing; reopen the bleed if un-clotted. */
  reopen(host: Vitals, t: Trauma): void;
  describe(t: Trauma): string;
  /**
   * ⭐ **What carrying this wound does to the body**, over and above its
   * own `tick`. The Kind-B twin of a `Condition` row's `signature`, and
   * the same channel: the trauma arm interprets it through
   * `Vitals.applyEffects` with the wound's severity as the intensity.
   *
   * ⚠ Declared on the closed engine table rather than authored, because
   * the trauma vocabulary IS closed — a burn is a burn everywhere. What
   * an author writes is a Kind-A `Condition` row.
   */
  signature?: readonly VitalEffect[];
  /**
   * ⭐ What TREATS this wound — a `ResolutionSpec.by` token
   * (`dressing`, `fluid`, `rest`). Before this, `treat` applied whatever
   * was to hand to whatever was worst, so a bandage on a burn was as good
   * as water on it.
   */
  resolution?: string;
}

const noop = (): void => {};

/**
 * ⭐ **What care quality buys the treated heal rate** (D5) — a treatment
 * done well (careQuality 1) heals at the full treated rate; a poor one
 * (careQuality 0) at half. Absent care quality reads as a competent `1`.
 */
const careScale = (t: Trauma): number => 0.5 + 0.5 * (t.careQuality ?? 1);

/** The identity exemplar — no live behavior; describe emits plain prose. */
export const NOOP_BEHAVIOR: TraumaBehavior = {
  onset: noop,
  tick: noop,
  mend: noop,
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
    // ⚠ The HARM half only: an open, undressed bleed drains blood. The
    // severity decay is the HEALING half and lives in `mend`, where the
    // convalescence factor scales it — see the split (D1).
    if (t.bleeding && !t.dressed) {
      const lost = D.BLEED_PER_SEC * Math.max(0, t.severity) * elapsedSec;
      setBloodLitres(host, bloodLitres(host) - lost);
    }
  },
  mend(_host: Vitals, t: Trauma, elapsedSec: number, k: number): void {
    // An open, undressed bleed HOLDS its severity — nothing knits while it
    // is still bleeding; you must dress it (or it must clot) first.
    if (t.bleeding && !t.dressed) return;
    const D = HARM_DEFAULTS;
    // Dressed (fast clot/heal, graded by how well it was dressed) or
    // clotted-open (slow heal to clear).
    const rate = t.dressed
      ? D.DRESSED_HEAL_PER_SEC * careScale(t)
      : D.LACERATION_HEAL_PER_SEC;
    t.severity = Math.max(0, t.severity - rate * elapsedSec * k);
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
  // The bleed family: what arrests it is a dressing.
  resolution: 'dressing',
  // ⭐ A cut is mostly a BLEED. It costs the part a little — deep enough
  // and a gashed hand does start to lose its grip — but the thing that
  // kills you is the blood, not the loss of function. Low on purpose.
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.laceration!,
    },
  ],
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
    // No harm of its own — a bruise, a burn or a freeze just heals over
    // time, and that heal is the convalescence-scaled `mend`. (A burn's
    // plasma weep is a `signature` effect the reconcile applies, not here.)
    tick: noop,
    mend(_host: Vitals, t: Trauma, elapsedSec: number, k: number): void {
      t.severity = Math.max(0, t.severity - ratePerSec * elapsedSec * k);
    },
    resolve: noop,
    reopen: noop,
    describe: phrase,
  };
}

/**
 * ⭐ A decaying wound that can be **treated** (D4). Its severity decays at
 * the natural rate, or — once its treatment is applied (`dressed`
 * generalized to "its treatment is on it") — at the faster treated rate,
 * graded by `careQuality`. `resolve` applies the treatment; `reopen`
 * removes it only where removing it is physical (a splint comes off; a
 * cooled burn or a rewarmed freeze cannot be un-done). The harm-free
 * `tick` and any `signature` weep are the base decaying behavior's.
 */
function treatableDecayingBehavior(
  naturalRate: number,
  treatedRate: number,
  phrase: (t: Trauma) => string,
  reopenable: boolean,
): TraumaBehavior {
  return {
    onset: noop,
    tick: noop,
    mend(_host: Vitals, t: Trauma, elapsedSec: number, k: number): void {
      const rate = t.dressed ? treatedRate * careScale(t) : naturalRate;
      t.severity = Math.max(0, t.severity - rate * elapsedSec * k);
    },
    resolve(_host: Vitals, t: Trauma): void {
      t.dressed = true;
    },
    reopen(_host: Vitals, t: Trauma): void {
      if (reopenable) t.dressed = false;
    },
    describe: phrase,
  };
}

/** contusion — mild, self-resolving over time; no bleed. */
export const CONTUSION_BEHAVIOR: TraumaBehavior = {
  ...decayingBehavior(
    HARM_DEFAULTS.CONTUSION_HEAL_PER_SEC,
    (t) => `a bruise on ${t.site}`
  ),
  // Nothing to bandage and nothing to pour on it. A bruise wants time.
  resolution: 'rest',
  // ⭐ The sparring currency: you are a little slower the morning after a
  // beating. Small on purpose — the fee for a fight you walked away from.
  signature: [
    {
      kind: 'reserve',
      reserve: 'endurance',
      pctPerHour: -HARM_DEFAULTS.CONTUSION_STIFFNESS_PCT_PER_HOUR,
    },
    // A bruise is a fee, not an injury — but a badly bruised hand IS a
    // little clumsier, and at 0.1 it takes a severity of 2.5 to reach
    // `impaired`, which is a beating rather than a knock.
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.contusion!,
    },
  ],
};

/**
 * fracture — a slow natural heal. The **impairment is a derived read** of
 * this trauma through the `canOccupy` / slot machinery
 * (`Vitals.isSlotImpairedByCondition`), NOT a tick effect — so clearing /
 * healing the fracture restores the affordance with no separate un-impair
 * step. Setting the bone (a splint instrument) is a deferred first-aid
 * branch; v1 only heals it over time.
 */
export const FRACTURE_BEHAVIOR: TraumaBehavior = {
  ...treatableDecayingBehavior(
    HARM_DEFAULTS.FRACTURE_HEAL_PER_SEC,
    HARM_DEFAULTS.FRACTURE_TREATED_HEAL_PER_SEC,
    (t) =>
      t.dressed ? `a set fracture of ${t.site}` : `a fracture of ${t.site}`,
    true, // a splint comes off (undress un-sets it)
  ),
  // ⭐ `setting` — a splint (the `set` instrument, trade-medicine) sets the
  // bone; `treat` renders the unknown token as *"It wants setting."* until
  // the splint lands, so the game says exactly what a bandage is no use for.
  resolution: 'setting',
  // ⭐⭐ **The impairment, DECLARED — and now a RATE.** A broken hand
  // cannot hold a shield, and `Vitals.isSlotImpairedByCondition` used to
  // know that by naming `fracture` in code, then by a boolean threshold
  // on this table. It is now what the wound costs the part per unit of
  // severity, and the slot gate falls out of the function read.
  //
  // ⚠ 1.2 is chosen so the shipped `FRACTURE_IMPAIR_SEVERITY` (0.5) lands
  // exactly on the `impaired` band edge (1 − 0.5 × 1.2 = 0.4) — the
  // boolean rule this replaced, preserved at its own threshold.
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.fracture!,
    },
  ],
};

/** burn — real behavior: severity + a slow heal at its own rate. */
export const BURN_BEHAVIOR: TraumaBehavior = {
  ...treatableDecayingBehavior(
    HARM_DEFAULTS.BURN_HEAL_PER_SEC,
    HARM_DEFAULTS.BURN_TREATED_HEAL_PER_SEC,
    (t) => (t.dressed ? `a cooled burn on ${t.site}` : `a burn on ${t.site}`),
    false, // you cannot un-cool a burn
  ),
  // ⭐ **Fluid, not a bandage** — the one that makes the difference
  // legible. A serious burn weeps plasma, which is why burn victims are
  // given fluids; wrapping it does nothing for that. Before this, `treat`
  // applied whatever was to hand to whatever was worst, so a bandage on a
  // burn worked exactly as well as water on it.
  resolution: 'fluid',
  // ⭐ **A badly burned hand cannot grip either**, and now the engine can
  // say so — the generalization is the point of the term. Above severity
  // 1 (a real burn, not a scald), the slots at the site are gone until it
  // heals: a derived read, so the affordance returns on its own.
  //
  // ⭐⭐ …and the WEEP. A serious burn loses fluid through the wound,
  // which is the whole reason its treatment is fluid rather than a
  // bandage, and the reason an untreated one is dangerous rather than
  // merely slow: it slides toward the exsanguination window on a clock
  // the burn itself owns. ⚠ A bloodless clade absorbs this silently
  // (D22) — a construct that takes a fire blow has a burn, and no weep.
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.burn!,
    },
    {
      kind: 'vital',
      sign: 'bloodVolume',
      perHour: -HARM_DEFAULTS.BURN_WEEP_L_PER_HOUR_PER_SEVERITY,
    },
  ],
};

/**
 * avulsion — behaves as a **severe laceration** (floors severity, bleeds,
 * shares the clot gate) and, past {@link HARM_DEFAULTS.SEVER_SEVERITY},
 * **takes the part off**.
 *
 * ⭐⭐ The sever is the documented seam finally landed: `onset` is where it
 * belongs because severing is what the insult DID, not something that
 * develops afterwards. Two gates, both honest:
 *
 * - the wound must be at or past `SEVER_SEVERITY` (a floor of 2 makes an
 *   avulsion "severe"; 4 makes it terminal for the part);
 * - the body plan must mark the part `severable` — authored on every limb
 *   and the head, absent on organs. **This is that field's first
 *   production reader.** A torso avulsion is a terrible wound and stays a
 *   wound; you cannot lop off somebody's chest.
 *
 * ⚠ Ordering matters and is load-bearing (D1): `onset` now runs AFTER
 * `Vitals.afflict` has accepted the wound, so a conferred immunity that
 * vetoes the trauma also prevents the sever. A sever that happened to a
 * wound the body refused would be the worst kind of ghost.
 */
export const AVULSION_BEHAVIOR: TraumaBehavior = {
  onset(host: Vitals, t: Trauma): void {
    t.severity = Math.max(t.severity, HARM_DEFAULTS.AVULSION_SEVERITY_FLOOR);
    LACERATION_BEHAVIOR.onset(host, t);
    if (t.severity < HARM_DEFAULTS.SEVER_SEVERITY) return;
    if (!host.getPart(t.site)?.severable) return;
    // ⭐⭐ **A maiming respects the fight's terms.** `maimAllowed` is set
    // false only by combat between sentients under non-lethal or
    // unconsented terms; everything environmental leaves it undefined
    // (→ allowed), because nature does not ask consent. So a wolf's cull
    // and a fall onto spikes still take the part; a sparring bout does
    // not. The severe avulsion stays — grievously wounded, not maimed.
    if (t.maimAllowed === false) return;
    host.severPart(t.site);
  },
  tick: LACERATION_BEHAVIOR.tick,
  mend: LACERATION_BEHAVIOR.mend,
  resolve: LACERATION_BEHAVIOR.resolve,
  reopen: LACERATION_BEHAVIOR.reopen,
  describe(t: Trauma): string {
    if (t.dressed) return `a dressed avulsion of ${t.site} (bleeding controlled)`;
    if (t.bleeding) return `a gaping avulsion of ${t.site}`;
    return `a clotted avulsion of ${t.site}`;
  },
  // The bleed family: what arrests it is a dressing.
  resolution: 'dressing',
  // ⭐ Tissue is GONE, not merely opened — at the sever threshold the
  // part's function is zero twice over (the weight takes it there, and
  // `missing` floors it anyway).
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.avulsion!,
    },
  ],
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
  mend: LACERATION_BEHAVIOR.mend,
  resolve: LACERATION_BEHAVIOR.resolve,
  reopen: LACERATION_BEHAVIOR.reopen,
  describe(t: Trauma): string {
    if (t.dressed) {
      return `a dressed puncture wound of ${t.site} (bleeding controlled)`;
    }
    if (t.bleeding) return `a bleeding puncture wound of ${t.site}`;
    return `a clotted puncture wound of ${t.site}`;
  },
  // The bleed family: what arrests it is a dressing.
  resolution: 'dressing',
  // A narrow deep wound — slightly worse for the part than a cut of the
  // same severity, because it goes further in.
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.puncture!,
    },
  ],
};

/**
 * The closed trauma behavior table — every `TraumaType` carries live
 * behavior (the NOOP exemplar remains the fallback shape). `avulsion` and
 * `puncture` delegate to the laceration bleed family.
 */
/**
 * rupture — a **torn organ**, and the first wound in the game you cannot
 * treat.
 *
 * It is the laceration bleed family, with one thing removed and one thing
 * changed:
 *
 * - `resolve` is a **no-op**. Dressing is pressure on a wound you can
 *   reach, and this one is inside a cavity. `TreatController` refuses it
 *   before it ever gets here, but the behaviour has to be honest on its
 *   own — a no-op `resolve` means nothing can accidentally arrest it.
 * - `resolution: 'surgery'`, a token **nothing offers**. That is
 *   deliberate and it is the charter for the treatment build:
 *   `mismatchLine` already renders an unknown token as *"It wants
 *   surgery."*, so the game says exactly what is wrong and exactly why
 *   your bandage is no use.
 *
 * ⚠ The blood drains from `bloodVolume` like any other bleed. The cavity
 * is the floor you cannot see, not a different accounting.
 */
export const RUPTURE_BEHAVIOR: TraumaBehavior = {
  onset: LACERATION_BEHAVIOR.onset,
  tick: LACERATION_BEHAVIOR.tick,
  // ⭐ An interior bleed does not knit on its own — it is bleeding into a
  // cavity nobody can reach, so `mend` does NOTHING until surgery closes
  // it (D4). Once `dressed` (operated), it heals slowly at the rupture
  // treated rate, graded by how the surgery went.
  mend(_host: Vitals, t: Trauma, elapsedSec: number, k: number): void {
    if (!t.dressed) return;
    const rate = HARM_DEFAULTS.RUPTURE_TREATED_HEAL_PER_SEC * careScale(t);
    t.severity = Math.max(0, t.severity - rate * elapsedSec * k);
  },
  // ⭐ Surgery (the `operate` instrument) closes it: the cavity bleed is
  // arrested and the organ begins to knit. NOT a dressing — you cannot put
  // pressure on a liver, which is why `treat` refuses it and names surgery.
  resolve(_host: Vitals, t: Trauma): void {
    t.dressed = true;
    t.bleeding = false;
  },
  // You cannot un-operate; a closed rupture stays closed.
  reopen: noop,
  describe(t: Trauma): string {
    return t.dressed
      ? `a closed rupture of ${t.site}`
      : `a rupture of ${t.site}`;
  },
  resolution: 'surgery',
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.rupture!,
    },
  ],
};

/**
 * ⭐ **frostbite — the cold channel's wound, and it is NOT a burn.**
 *
 * Three differences, each of them a real fact about cold injury and each
 * of them something a player can act on:
 *
 * - **It numbs.** A frozen hand cannot grip — the same function cost a
 *   burn carries, for a different reason.
 * - **It wants WARMTH, not fluid.** `resolution: 'warmth'` is already in
 *   `mismatchLine`'s word table, so `treat` says *"It wants warmth."* with
 *   no code at all. Pouring water on frostbite is exactly as useless as
 *   bandaging a burn, and the game now says so.
 * - **It does not weep.** A burn loses plasma through the wound and
 *   slides toward the exsanguination window on its own clock; a freeze
 *   does not. It is done happening the moment you are warm again.
 */
export const FROSTBITE_BEHAVIOR: TraumaBehavior = {
  ...treatableDecayingBehavior(
    HARM_DEFAULTS.FROSTBITE_HEAL_PER_SEC,
    HARM_DEFAULTS.FROSTBITE_TREATED_HEAL_PER_SEC,
    (t) =>
      t.dressed ? `rewarmed frostbite of ${t.site}` : `frostbite of ${t.site}`,
    false, // you cannot un-warm a thaw
  ),
  resolution: 'warmth',
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.frostbite!,
    },
  ],
};

/**
 * ⭐⭐ **caustic — the wound that is still happening.**
 *
 * Everything else in this table is a record of something that already
 * finished: a cut was cut, a bone broke, a burn burned. A caustic is the
 * agent sitting on your skin *right now*, and while it is there the wound
 * GROWS — `CAUSTIC_GROWTH_PER_SEC` per game-second, to a cap.
 *
 * ⚠ That makes `resolve` mean something different here than anywhere
 * else. A dressing ARRESTS a bleed; a rinse **removes the cause**, after
 * which the wound decays like any other burn. `resolution: 'wash'` — and
 * the verb that does it is `wash`, which the world already affords from
 * any water source.
 *
 * ⭐ The cap is what keeps the rinse a decision rather than a formality:
 * unbounded growth would make an unrinsed caustic lethal on a clock
 * nobody can read.
 */
export const CAUSTIC_BEHAVIOR: TraumaBehavior = {
  onset(_host: Vitals, t: Trauma): void {
    t.agentActive = true;
  },
  tick(_host: Vitals, t: Trauma, elapsedSec: number): void {
    const D = HARM_DEFAULTS;
    // ⭐ The one wound that HARMS on tick: while the agent is still on you
    // it GROWS. Once rinsed, the heal is `mend`'s (convalescence-scaled).
    if (t.agentActive) {
      t.severity = Math.min(
        D.CAUSTIC_MAX_SEVERITY,
        t.severity + D.CAUSTIC_GROWTH_PER_SEC * elapsedSec,
      );
    }
  },
  mend(_host: Vitals, t: Trauma, elapsedSec: number, k: number): void {
    // Still eating? Nothing knits — that is `tick`'s growth, not a heal.
    if (t.agentActive) return;
    // Rinsed: now an ordinary chemical burn, healing at burn's own rate.
    t.severity = Math.max(
      0,
      t.severity - HARM_DEFAULTS.BURN_HEAL_PER_SEC * elapsedSec * k,
    );
  },
  resolve(_host: Vitals, t: Trauma): void {
    t.agentActive = false;
  },
  reopen: noop,
  describe(t: Trauma): string {
    return t.agentActive
      ? `a caustic burn of ${t.site}, still eating`
      : `a caustic burn of ${t.site}`;
  },
  // ⚠ `rinsing`, not `wash`. The token is rendered raw by `treat`'s
  // mismatch line ("It wants ___"), and *"It wants wash"* is not a
  // sentence. The VERB is `rinse`; this is what the wound asks for.
  resolution: 'rinsing',
  signature: [
    {
      kind: 'function',
      lossPerSeverity: HARM_DEFAULTS.FUNCTION_LOSS_PER_SEVERITY.caustic!,
    },
    // ⭐ A chemical burn weeps like a thermal one — the tissue is
    // destroyed the same way, whatever destroyed it.
    {
      kind: 'vital',
      sign: 'bloodVolume',
      perHour: -HARM_DEFAULTS.BURN_WEEP_L_PER_HOUR_PER_SEVERITY,
    },
  ],
};

export const TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior> = {
  laceration: LACERATION_BEHAVIOR,
  puncture: PUNCTURE_BEHAVIOR,
  fracture: FRACTURE_BEHAVIOR,
  contusion: CONTUSION_BEHAVIOR,
  avulsion: AVULSION_BEHAVIOR,
  burn: BURN_BEHAVIOR,
  rupture: RUPTURE_BEHAVIOR,
  frostbite: FROSTBITE_BEHAVIOR,
  caustic: CAUSTIC_BEHAVIOR,
};

/**
 * ⭐ The **bleed family** — the wound types that break the skin and can be
 * inoculated (D11). A dirty dressing or a wound left open goes septic;
 * a burn or a bruise does not (the skin is the barrier, not the wound).
 */
export const BLEED_FAMILY: ReadonlySet<TraumaType> = new Set<TraumaType>([
  'laceration',
  'puncture',
  'avulsion',
  'rupture',
]);

/** The pathogen key of the wound-sepsis Condition row (D11). */
export const WOUND_SEPSIS_KEY = 'wound-sepsis';

// ---------- Kind-A: the Condition Idea template ----------

/**
 * ⭐ **What relieves a condition.** Shipped with `by` authored on two rows
 * and read by nothing, so every treatment was the same treatment: a
 * bandage on a burn worked exactly as well as water on it.
 */
export interface ResolutionSpec {
  /** A resolution-mechanism token (e.g. `'antitoxin'`, `'rest'`). */
  by: string;
  /**
   * For a self-resolving condition (`by: 'rest'`), the stage at which it
   * clears itself. Absent means it never does on its own.
   */
  atStage?: number;
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
   * ⭐⭐ **Optional pathogen behavior — the per-population constants of a
   * living organism**, as against `toxinBehavior`'s per-body rates for a
   * burden that decays.
   *
   * The distinction is the build's: a toxin is an *amount* you carry and
   * clear, a pathogen is a *population* that grows — in food, and then in
   * you. Both live on this row because both are afflictions with names,
   * signs and a resolution, and a row may honestly carry both (an
   * intoxicating population's toxin is its own row, with its own bands).
   *
   * Authored only on the pathogen roster under
   * `/platform/idea/Condition/pathogen/`; `null` everywhere else.
   */
  protected pathogenBehavior: PathogenBehavior | null = null;

  /**
   * Optional mental-resist bands — the ascending `{threshold, stage}`
   * cutoffs the magic mental resolver stages a post-fold residual
   * against, scaled by the target's live Composure factor (the
   * `toxinBehavior.bands` authored-cutoffs precedent). Authored only on
   * mental-axis conditions (dread); `null` for every other condition.
   */
  protected mentalBands: ResistBand[] | null = null;

  /**
   * ⭐ **The SIGNS are open; the mechanism is level 1.**
   *
   * `observableSigns` is the one field whose whole purpose is to be
   * seen — a sign nobody can read is not a sign — and hiding it would
   * break the diagnosis loop the medic vertical is built on. Naming
   * the condition is likewise public.
   *
   * How it progresses, what resolves it, how it spreads: that is the
   * medicine, and medicine is learned. Level 1 keeps it **one click
   * away rather than gated** — looking up a cure is exactly what a
   * community wiki is for, and a player who would rather work it out
   * from the signs is not spoiled by opening the page.
   */
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    observableSigns: { persistent: true },
    signature: { persistent: true, spoiler: 1, spoilerName: 0 },
    progression: { persistent: true, spoiler: 1, spoilerName: 0 },
    resolution: { persistent: true, spoiler: 1, spoilerName: 0 },
    contagion: { persistent: true, spoiler: 1, spoilerName: 0 },
    toxinBehavior: { persistent: true, spoiler: 1, spoilerName: 0 },
    pathogenBehavior: { persistent: true, spoiler: 1, spoilerName: 0 },
    mentalBands: { persistent: true, spoiler: 1, spoilerName: 0 },
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

  /** The pathogen behavior block (null for everything but the roster). */
  public getPathogenBehavior(): PathogenBehavior | null {
    return this.pathogenBehavior;
  }
  public setPathogenBehavior(value: PathogenBehavior | null): void {
    this.pathogenBehavior = value;
  }

  /** The mental-resist bands (null for non-mental conditions). */
  public getMentalBands(): ResistBand[] | null {
    return this.mentalBands;
  }
  public setMentalBands(value: ResistBand[] | null): void {
    this.mentalBands = value;
  }
}
