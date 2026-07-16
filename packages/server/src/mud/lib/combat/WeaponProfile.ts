/**
 * WeaponProfile — a weapon's derived **playstyle bundle** (value-object,
 * pure/unit-tested; the `Poise`/`Tempo`/`Sharpness` category).
 *
 * A weapon is not a stat block. You author a *shape* — a form
 * (`Construction`), a material, a mass, a length, and how many hands it
 * claims — and the playstyle **computes**: reach, balance, guard,
 * handedness, delivery. Each axis is an **input to a system combat already
 * has** (reach → the threat graph, balance → Poise/Tempo, guard → the
 * reactive parry, handedness → the wield slots, delivery → the inflict
 * channel), so weapons differ by *how they couple in*, never by bolted-on
 * numbers.
 *
 * Every axis is grounded in a real authored dimension × real physics:
 *
 *   - **balance** ← `mass` (× the delivery form). A heavy weapon is a
 *     **guard-breaker** (high poise damage, slow tempo, expensive to
 *     commit — it *creates* openings); a light weapon is an **exploiter**
 *     (fast, cheap, punishes overextend — it *cashes* them). The two are
 *     complementary — the numeric getters (`tempoFactor` /
 *     `poiseDamageFactor` / `overextendFactor`) are what `CombatLogic`
 *     multiplies in at the seam `balanceFactor` occupied.
 *   - **reach** ← `length` (a real magnitude, symmetric with `mass`). The
 *     reach *class* (`short`/`medium`/`long`) is a banded projection of
 *     the length; the combat *range state* stays discrete + geometry-free.
 *   - **guard** ← the delivery form (× a light material term). A crossguard
 *     blade parries well; a flail can't self-guard (`none`).
 *   - **handedness** ← the hand-slot claim count.
 *   - **delivery** ← the `Construction` delivery form (pass-through).
 *
 * Surfaced as **bands** (bands-not-numbers, the `Poise.band()` doctrine)
 * for legibility, with narrow numeric getters the engine multiplies in.
 * Pure + tunable: the caller supplies the `combat.weapon.*` config; sane
 * literal defaults keep the class unit-testable without booting settings
 * (the `Tempo`/`Sharpness` seeded-literal-fallback precedent).
 */

import type { DeliveryForm } from "../material/Construction";

/** The reach class — a banded projection of the real authored length. */
export type ReachClass = "short" | "medium" | "long";
/** Ascending — index is the reach rank (short 0 … long 2). */
export const REACH_CLASSES: readonly ReachClass[] = ["short", "medium", "long"];

/** The balance class — where the weapon sits on the guard-breaker↔exploiter
 * axis (light = exploiter, heavy = guard-breaker). */
export type BalanceClass = "light" | "neutral" | "heavy";

/** The guard class — how well the weapon defends itself (`none` = a flail,
 * which can't parry). Ascending. */
export type GuardClass = "none" | "poor" | "fair" | "good" | "excellent";
export const GUARD_CLASSES: readonly GuardClass[] = [
  "none",
  "poor",
  "fair",
  "good",
  "excellent",
];

/** The handedness class — how many hand slots the weapon claims. */
export type Handedness = "one-handed" | "two-handed";

/** The raw shape a profile derives from (extracted by the caller from the
 * weapon's `Construction` / `Material` / dimensions / slot claims). */
export interface WeaponProfileInputs {
  /** The weapon-delivery form, or null (no construction → an inert weapon). */
  deliveryForm: DeliveryForm | null;
  /** Mass in kg (drives balance → tempo/poise). */
  massKg: number;
  /** Length in metres (drives reach). */
  lengthM: number;
  /** Hand slots the weapon claims on the wielder's body plan (1 or 2). */
  handSlots: number;
  /** Material hardness in MPa, if known — a light guard term (a hard blade
   * binds better). Absent → neutral. */
  materialHardnessMpa?: number;
  /** An explicit off-guard / assist bonus (a shield, a dual-wield off-hand)
   * added to the derived guard factor. Default 0. */
  guardBonus?: number;
}

/** Tunable coefficients (`combat.weapon.*` AppSettings). */
export interface WeaponProfileConfig {
  /** Mass (kg) that maps to a neutral 1.0 balance (an arming sword ≈ 0.9). */
  balanceRefMass: number;
  /** Curve exponent for tempo (higher = steeper light↔heavy tempo spread). */
  tempoExponent: number;
  /** Clamp on the derived tempo factor. */
  tempoMin: number;
  tempoMax: number;
  /** Curve exponent for poise-damage (heavier → more per landed blow). */
  poiseDamageExponent: number;
  poiseDamageMin: number;
  poiseDamageMax: number;
  /** Curve exponent for overextend cost (heavier → more expensive to commit). */
  overextendExponent: number;
  overextendMin: number;
  overextendMax: number;
  /** Balance-class band edges on the tempo factor (below → heavy, above →
   * light; between → neutral). */
  balanceHeavyBelow: number;
  balanceLightAbove: number;
  /** Reach-class length thresholds (m): below → short, above → long. */
  reachShortBelow: number;
  reachLongAbove: number;
  /** Material hardness (MPa) at/above which guard gets a small bump, below
   * which it drops a tier (a soft blade binds poorly). */
  guardHardnessRef: number;
}

export const DEFAULT_WEAPON_PROFILE_CONFIG: WeaponProfileConfig = {
  balanceRefMass: 0.9,
  tempoExponent: 0.35,
  tempoMin: 0.5,
  tempoMax: 1.6,
  poiseDamageExponent: 0.4,
  poiseDamageMin: 0.6,
  poiseDamageMax: 1.5,
  overextendExponent: 0.35,
  overextendMin: 0.6,
  overextendMax: 1.5,
  balanceHeavyBelow: 0.92,
  balanceLightAbove: 1.08,
  reachShortBelow: 0.5,
  reachLongAbove: 1.5,
  guardHardnessRef: 300,
};

/** Base guard class per delivery form (the form's own self-defence). */
const FORM_GUARD: Record<DeliveryForm, GuardClass> = {
  bladed: "good",
  pointed: "fair",
  hafted: "fair",
  flail: "none",
};

/** Numeric guard factor per guard class (the reactive-parry multiplier). */
const GUARD_FACTOR: Record<GuardClass, number> = {
  none: 0,
  poor: 0.4,
  fair: 0.7,
  good: 1.0,
  excellent: 1.4,
};

/** Default length (m) by form when a weapon authors none — coarse; a real
 * seed overrides. Pointed reaches, bladed/hafted middling, plus a small
 * mass nudge (a heavier weapon of a form runs a touch longer). */
function defaultLengthFor(form: DeliveryForm | null, massKg: number): number {
  const base =
    form === "pointed"
      ? 1.6
      : form === "hafted" || form === "flail"
        ? 0.9
        : form === "bladed"
          ? 0.55
          : 0.4;
  return base + Math.min(3, Math.max(0, massKg)) * 0.12;
}

export class WeaponProfile {
  private constructor(
    private readonly _reach: ReachClass,
    private readonly _balance: BalanceClass,
    private readonly _guard: GuardClass,
    private readonly _handedness: Handedness,
    private readonly _delivery: DeliveryForm | null,
    private readonly _tempoFactor: number,
    private readonly _poiseDamageFactor: number,
    private readonly _overextendFactor: number,
    private readonly _guardFactor: number,
  ) {}

  /**
   * Derive the full playstyle bundle from a weapon's shape. Pure; every
   * magnitude flows from `config` (`combat.weapon.*`), so tuning never
   * touches this function.
   */
  static derive(
    inputs: WeaponProfileInputs,
    config: WeaponProfileConfig = DEFAULT_WEAPON_PROFILE_CONFIG,
  ): WeaponProfile {
    const form = inputs.deliveryForm;
    // Unauthored mass (0) → the reference mass, so a bare weapon derives a
    // NEUTRAL balance (tempo/poise/overextend ≈ 1.0), never an extreme (the
    // universe-default "a bare form yields a working weapon" rule).
    const rawMass =
      Number.isFinite(inputs.massKg) && inputs.massKg > 0
        ? inputs.massKg
        : config.balanceRefMass;
    const mass = Math.max(0.001, rawMass);
    const length =
      Number.isFinite(inputs.lengthM) && inputs.lengthM > 0
        ? inputs.lengthM
        : defaultLengthFor(form, mass);

    // Balance: a pure power-of-(refMass/mass) curve. Light → >1 (fast,
    // cheap), heavy → <1 (slow) for tempo; the poise/overextend curves run
    // the other way (heavy → more).
    const ratio = config.balanceRefMass / mass;
    const tempoFactor = clampRange(
      Math.pow(ratio, config.tempoExponent),
      config.tempoMin,
      config.tempoMax,
    );
    const heaviness = config.balanceRefMass > 0 ? mass / config.balanceRefMass : 1;
    const poiseDamageFactor = clampRange(
      Math.pow(heaviness, config.poiseDamageExponent),
      config.poiseDamageMin,
      config.poiseDamageMax,
    );
    const overextendFactor = clampRange(
      Math.pow(heaviness, config.overextendExponent),
      config.overextendMin,
      config.overextendMax,
    );

    const balance: BalanceClass =
      tempoFactor < config.balanceHeavyBelow
        ? "heavy"
        : tempoFactor > config.balanceLightAbove
          ? "light"
          : "neutral";

    const reach: ReachClass =
      length < config.reachShortBelow
        ? "short"
        : length > config.reachLongAbove
          ? "long"
          : "medium";

    // Guard: the form's own defence, nudged by a hard/soft material, plus an
    // explicit assist bonus (shield / off-hand). Kept as a class for
    // legibility and a numeric factor for the parry seam.
    const baseGuard: GuardClass = form ? FORM_GUARD[form] : "none";
    let guardRank = GUARD_CLASSES.indexOf(baseGuard);
    if (guardRank > 0 && inputs.materialHardnessMpa !== undefined) {
      if (inputs.materialHardnessMpa < config.guardHardnessRef * 0.5) {
        guardRank = Math.max(1, guardRank - 1);
      } else if (inputs.materialHardnessMpa > config.guardHardnessRef * 2) {
        guardRank = Math.min(GUARD_CLASSES.length - 1, guardRank + 1);
      }
    }
    const guard = GUARD_CLASSES[guardRank]!;
    const guardFactor = GUARD_FACTOR[guard] + Math.max(0, inputs.guardBonus ?? 0);

    const handedness: Handedness =
      inputs.handSlots >= 2 ? "two-handed" : "one-handed";

    return new WeaponProfile(
      reach,
      balance,
      guard,
      handedness,
      form,
      tempoFactor,
      poiseDamageFactor,
      overextendFactor,
      guardFactor,
    );
  }

  /* ───────────────── bands (bands-not-numbers) ───────────────── */

  reach(): ReachClass {
    return this._reach;
  }
  balance(): BalanceClass {
    return this._balance;
  }
  guard(): GuardClass {
    return this._guard;
  }
  handedness(): Handedness {
    return this._handedness;
  }
  delivery(): DeliveryForm | null {
    return this._delivery;
  }

  /** The reach rank (short 0 … long 2) — the discrete reach comparison the
   * range tier reads. */
  reachRank(): number {
    return REACH_CLASSES.indexOf(this._reach);
  }
  /** The guard rank (none 0 … excellent 4). */
  guardRank(): number {
    return GUARD_CLASSES.indexOf(this._guard);
  }

  /* ───────────────── numeric getters (the engine seams) ───────────────── */

  /** Tempo multiplier — the seam `balanceFactor` occupied (`Tempo.rateFor`). */
  tempoFactor(): number {
    return this._tempoFactor;
  }
  /** Poise-damage multiplier — scales the target's erosion / inflict energy
   * on a landed blow (guard-breaker high). */
  poiseDamageFactor(): number {
    return this._poiseDamageFactor;
  }
  /** Overextend multiplier — scales the actor's commit cost (guard-breaker
   * expensive, exploiter cheap). */
  overextendFactor(): number {
    return this._overextendFactor;
  }
  /** Guard multiplier — how reliably the weapon parries (0 = a flail can't). */
  guardFactor(): number {
    return this._guardFactor;
  }

  /**
   * Whether the weapon can bring its guard to a parry at all. A guardless
   * form (a flail, `guard: none`) can't self-guard — a strike against a
   * steady, "armed" flail-wielder still lands, so a guard-breaker bypasses
   * it (the offense↔defense axis). Rides `guardRank`.
   */
  canParry(): boolean {
    return this.guardRank() > 0;
  }

  /**
   * True iff the weapon does **nothing** — it has no delivery form, so it
   * presents no channel and couldn't wound anyone (the does-nothing smell
   * the inert-weapon lint flags; the `Construction.doesNothing` precedent
   * for the delivery half). A healthy weapon roster returns `false`.
   */
  isInert(): boolean {
    return this._delivery === null;
  }
}

function clampRange(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
