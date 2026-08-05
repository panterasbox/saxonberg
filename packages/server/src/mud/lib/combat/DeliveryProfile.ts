/**
 * DeliveryProfile — what actually arrives, from what was actually thrown
 * (value-object, pure/unit-tested; the `WeaponProfile` precedent).
 *
 * Every ranged act is one shape: **a launcher imparts energy to a
 * projectile that crosses a band gap and applies a payload on arrival.**
 * The family fields are causes — a flask's mass and fragility, an arrow's
 * spine and head, a cartridge's charge and bullet form — and combat
 * consumes **one derived tuple**, computed per (projectile × launcher ×
 * band) and never stored.
 *
 * | Field | What it is |
 * |---|---|
 * | `energyJ` | joules arriving at this band |
 * | `channel` | the shipped mechanism vocabulary |
 * | `stability` | flight quality; steps the placement ladder |
 * | `integrity` | what the projectile does on arrival |
 * | `payload` | an effect envelope, if any |
 *
 * **The point is what combat CANNOT see.** Placement, the wound model and
 * the response grid read this tuple and nothing else, so they cannot tell
 * an arrow from a bullet from a thrown rock at equal profiles. That is
 * the same move `WeaponProfile` makes for melee and `materials-response`
 * makes for armor: many honest inputs, one consumer contract.
 *
 * **Nothing here stores "damage."** Energy is derived from real mass and
 * speed (½mv²); what that energy *does* is the response grid's business,
 * not this module's.
 *
 * ⚠ `penetration` is deliberately absent in Wave 1. It is a
 * sectional-behaviour axis that only earns its keep against armor, and
 * armor is a later wave — adding it now would mean authoring a number
 * with no consumer to keep it honest.
 */

import type { Channel } from "../material/Channel";
import { RangeBand, type RangeState } from "./RangeBand";
import { EnergySource, type EnergySourceKind } from "./EnergySource";

/** Flight quality, ascending. Steps the placement ladder when poor. */
export const STABILITIES = ["poor", "fair", "true"] as const;

/** One of {@link STABILITIES}. */
export type Stability = (typeof STABILITIES)[number];

/**
 * What the projectile does on arrival.
 *
 * `shatter` is the flask: the vessel breaks, its contents go onto real
 * surfaces, and the payload fires. `recover` is the arrow you can pick
 * back up. `deform` is the bullet that is not worth recovering.
 */
export const INTEGRITIES = ["shatter", "deform", "recover"] as const;

/** One of {@link INTEGRITIES}. */
export type Integrity = (typeof INTEGRITIES)[number];

/** The authored causes a profile derives from. */
export interface DeliveryInputs {
  /** How the launcher stored its energy — thrown carriers are `muscle`. */
  energySource: EnergySourceKind;
  /** Projectile mass (kg). */
  massKg: number;
  /** Launch speed (m/s). */
  speedMs: number;
  /** The mechanism channel delivered on impact. */
  channel: Channel;
  /** The band this shot is crossing. */
  band: RangeState;
  /** The carrier's effective band. */
  envelope: RangeState;
  /** Projectile material toughness (MJ/m³) — low shatters. */
  toughness?: number;
  /** Projectile material hardness (MPa) — low deforms. */
  hardness?: number;
  /** True when the projectile is purpose-made to fly (a thrown blade,
   * fletched arrow) rather than merely thrown (a flask, a chair leg). */
  balancedForFlight?: boolean;
  /** An opaque effect-envelope handle, if this carrier has one. */
  payload?: unknown;
}

export interface DeliveryProfileConfig {
  /** Toughness (MJ/m³) below which a projectile shatters on arrival. */
  shatterToughness: number;
  /** Hardness (MPa) below which a surviving projectile deforms. */
  deformHardness: number;
  /** Energy (J) below which arrival is too weak to wound at all. */
  inertEnergyJ: number;
}

export const DEFAULT_DELIVERY_PROFILE_CONFIG: DeliveryProfileConfig = {
  shatterToughness: 1.0,
  deformHardness: 80,
  inertEnergyJ: 1.0,
};

export class DeliveryProfile {
  private constructor(
    readonly energyJ: number,
    readonly channel: Channel,
    readonly stability: Stability,
    readonly integrity: Integrity,
    readonly payload: unknown,
    readonly beyondEnvelope: boolean,
  ) {}

  /**
   * Derive the profile. Pure: the same inputs always give the same tuple,
   * with no clock, no RNG and no world reads.
   */
  static derive(
    inputs: DeliveryInputs,
    config: DeliveryProfileConfig = DEFAULT_DELIVERY_PROFILE_CONFIG,
  ): DeliveryProfile {
    const beyond = RangeBand.beyond(inputs.band, inputs.envelope);

    // ½mv². Real mass, real speed — the one place a number becomes a
    // magnitude, and it is textbook rather than tuned.
    const energyJ = 0.5 * inputs.massKg * inputs.speedMs * inputs.speedMs;

    return new DeliveryProfile(
      energyJ,
      inputs.channel,
      DeliveryProfile.deriveStability(inputs),
      DeliveryProfile.deriveIntegrity(inputs, config),
      inputs.payload ?? null,
      beyond,
    );
  }

  /**
   * Flight quality. A purpose-made flyer is `true`; anything else is
   * `fair` at best and `poor` once it is being asked to cross more than
   * its envelope. A flask is an honest example of the bad case: heavy,
   * payload-dominant, and not shaped to fly.
   */
  private static deriveStability(inputs: DeliveryInputs): Stability {
    if (RangeBand.beyond(inputs.band, inputs.envelope)) return "poor";
    if (inputs.balancedForFlight) return "true";
    // A muscle-launched unbalanced object tumbles; a mechanically
    // launched one at least leaves straight.
    return EnergySource.readinessIsInstantaneous(inputs.energySource)
      ? "fair"
      : "true";
  }

  /**
   * What survives arrival. Brittle things shatter — which is what makes a
   * flask a carrier rather than a rock — soft things deform, and the rest
   * can be picked back up.
   */
  private static deriveIntegrity(
    inputs: DeliveryInputs,
    config: DeliveryProfileConfig,
  ): Integrity {
    const toughness = inputs.toughness ?? Number.POSITIVE_INFINITY;
    if (toughness < config.shatterToughness) return "shatter";
    const hardness = inputs.hardness ?? Number.POSITIVE_INFINITY;
    if (hardness < config.deformHardness) return "deform";
    return "recover";
  }

  /** Does this arrival carry an effect envelope? */
  hasPayload(): boolean {
    return this.payload !== null && this.payload !== undefined;
  }

  /** Did the vessel break — i.e. should its contents go onto the room? */
  breaksOnArrival(): boolean {
    return this.integrity === "shatter";
  }

  /** Is the arrival too weak to wound at all? */
  isInert(
    config: DeliveryProfileConfig = DEFAULT_DELIVERY_PROFILE_CONFIG,
  ): boolean {
    return this.energyJ < config.inertEnergyJ;
  }

  /** The placement modifier this profile contributes. */
  stabilityIsPoor(): boolean {
    return this.stability === "poor";
  }
}
