/**
 * EnergySource — where a launcher's shot energy is stored, and therefore
 * whether readiness can be held for free (value-object, pure/unit-tested;
 * the `RangeBand`/`WeaponProfile` category).
 *
 * This is the load-bearing field of the whole launcher model, because it
 * answers two questions at once. Everything else about how the four
 * families *feel to play* derives from it rather than being authored per
 * weapon:
 *
 * | Family | `energySource` | Readiness stored in | Holds free? | Aim |
 * |---|---|---|---|---|
 * | Thrown | `muscle` | nothing — cocking is instantaneous | n/a | aim *is* the throw |
 * | Bow | `stored-elastic`, muscle-held | **the archer's body** | **no** — poise every beat | draw **is** aim |
 * | Crossbow | `stored-elastic`, mechanically held | the spanned mechanism | **yes**, indefinitely | decoupled |
 * | Gun | `chemical` | the cartridge | **yes**, indefinitely | decoupled |
 *
 * **For a gun and a crossbow, aiming and readiness are separate acts. For
 * a bow they are the same act** — you cannot hold a bow at full draw
 * without aiming, or aim without being at full draw, and the draw burns
 * you down the whole time. That asymmetry is the honest experiential
 * difference between the families.
 *
 * Two things fall out that would otherwise need inventing:
 *
 *  - **The crossbow's whole tactical point** — held on a doorway for
 *    minutes, paid for with a miserable rate of fire — is a consequence
 *    of where the energy sits, not a special case.
 *  - **The gun's real advantage is that it does not tire you.**
 *    Historically why firearms won, and the cleanest balance lever in the
 *    design: no invented drawback required.
 *
 * ⚠ Wave 1 exercises only the `muscle` branch (thrown carriers). The
 * vocabulary and its projections ship whole and are tested across all
 * three members, because retrofitting an axis across an established
 * launcher model later is exactly the expensive move this avoids.
 * `electrical` is parked on the electricity substrate.
 */

/** Where the shot's energy is stored. Closed vocabulary. */
export const ENERGY_SOURCES = ["muscle", "stored-elastic", "chemical"] as const;

/** One of {@link ENERGY_SOURCES}. */
export type EnergySourceKind = (typeof ENERGY_SOURCES)[number];

/**
 * How a launcher holds its readiness. `mechanical` covers both the
 * spanned crossbow and the chambered gun — different mechanisms, the same
 * fact about who is paying to stay ready.
 */
export const READINESS_HOLDS = ["instant", "muscle", "mechanical"] as const;

/** One of {@link READINESS_HOLDS}. */
export type ReadinessHold = (typeof READINESS_HOLDS)[number];

/** Poise-per-beat dials for holding readiness. */
export interface EnergySourceConfig {
  /** Poise per beat spent holding a muscle-held launcher at readiness. */
  holdPoisePerBeat: number;
}

export const DEFAULT_ENERGY_SOURCE_CONFIG: EnergySourceConfig = {
  holdPoisePerBeat: 0.06,
};

export class EnergySource {
  /**
   * How this launcher holds readiness.
   *
   * `stored-elastic` is the branch that needs the extra bit: a bow and a
   * crossbow share the energy source and differ entirely on *who holds
   * the draw*, which is the model's sharpest test and the reason the
   * crossbow is not optional content.
   */
  static holdOf(
    kind: EnergySourceKind,
    mechanicallyHeld = false,
  ): ReadinessHold {
    if (kind === "muscle") return "instant";
    if (kind === "chemical") return "mechanical";
    return mechanicallyHeld ? "mechanical" : "muscle";
  }

  /** Can readiness be held indefinitely at no cost? */
  static holdsFree(kind: EnergySourceKind, mechanicallyHeld = false): boolean {
    return EnergySource.holdOf(kind, mechanicallyHeld) !== "muscle";
  }

  /**
   * Is getting ready instantaneous — folded into the shot rather than a
   * separate committed action?
   *
   * True only for `muscle`: nocking an arrow is part of loosing it, so a
   * bow has no separate readiness beat, which is what makes a longbowman
   * outshoot a crossbowman several times over. Spanning and loading are
   * mechanical and stay separate committed actions. Rate of fire is a
   * consequence of this, never a stored field.
   */
  static readinessIsInstantaneous(kind: EnergySourceKind): boolean {
    return kind === "muscle";
  }

  /**
   * Poise per beat spent holding readiness. Non-zero only for a
   * muscle-held draw — holding a bow at full draw is genuinely
   * exhausting, which is why real archers loose quickly, and firing a gun
   * costs essentially nothing physically.
   */
  static holdPoisePerBeat(
    kind: EnergySourceKind,
    mechanicallyHeld = false,
    config: EnergySourceConfig = DEFAULT_ENERGY_SOURCE_CONFIG,
  ): number {
    return EnergySource.holdOf(kind, mechanicallyHeld) === "muscle"
      ? config.holdPoisePerBeat
      : 0;
  }

  /**
   * Does aiming collapse into readiness? True for a muscle-held launcher,
   * where drawing IS aiming — the one act. The aim ladder reads this to
   * decide whether a hold window applies.
   */
  static aimIsReadiness(
    kind: EnergySourceKind,
    mechanicallyHeld = false,
  ): boolean {
    return EnergySource.holdOf(kind, mechanicallyHeld) === "muscle";
  }
}
