/**
 * NaturalAttack — the species combat vocabulary's per-attack spec + the
 * **body-derived natural profile** (value-object, pure/unit-tested; the
 * `WeaponProfile` sibling).
 *
 * A species authors `Species.naturalAttacks` as a list of
 * {@link NaturalAttackSpec}s (bite / claw / tail…). Multiple attacks
 * **rotate deterministically by session beat** in the engine
 * (`attacks[(beat − 1) % n]` — never a per-state counter, which would
 * drift under tempo variance); presence-only reads (eligibility, guard)
 * use entry 0. A single-entry list — and the legacy
 * `CombatantMixin.naturalAttackChannel` fallback the engine synthesizes
 * as one — reduce to entry 0 on every beat, byte-preserving
 * pre-vocabulary behavior.
 *
 * {@link NaturalAttack.deriveProfile} yields the four numbers the
 * engine's unarmed fallbacks used to hard-code (`tempoFactor` /
 * `poiseDamageFactor` / `overextendFactor` / `reachRank`):
 *
 *   - **Authored hints win** — `massKg`/`lengthM` ride the SAME
 *     {@link WeaponProfile} curves as a wielded weapon (the caller
 *     supplies `combat.weapon.*` config; zero new curve settings), and an
 *     explicit `reach` maps directly to its rank. An unauthored hint is
 *     neutral (mass → the reference mass, no length/reach → rank 0).
 *   - **Hint-less** derivation is a banded body-scale term from
 *     `BodyPlan.baseMass`: **exactly neutral `(1, 1, 1, 0)`** below
 *     `largeBodyMassKg` (`combat.natural.largeBodyMassKg`, seeded 150 —
 *     the byte-parity band every currently-seeded body sits in), and one
 *     reach rank + heavy-balance factors at/above it ("an ogre punches at
 *     ogre reach"). The **effective limb** a large body swings is modeled
 *     as a weapon of mass `balanceRefMass × (bodyMass / largeBodyMassKg)`
 *     — exactly the neutral reference mass at the threshold (so the
 *     balance factors are continuous there; only the reach rank steps),
 *     scaling linearly with body mass above it, fed through the same
 *     balance curves.
 *
 * See docs/subsystems/combat-hooks.md § the species vocabulary.
 */

import type { Channel } from "../material/Channel";
import { CHANNELS } from "../material/Channel";
import {
  WeaponProfile,
  REACH_CLASSES,
  type ReachClass,
  type WeaponProfileConfig,
  DEFAULT_WEAPON_PROFILE_CONFIG,
} from "./WeaponProfile";

/**
 * One authored natural attack. `channel` is the delivery the strike
 * presents to the materials-response funnel (`edge` claws / `point` bite /
 * `blunt` tail — or a non-mechanical innate like `heat`/`shock`, which
 * `commitInflict`'s delivery split routes). The optional profile hints are
 * the two magnitudes the weapon curves already speak plus an explicit
 * reach band; hint-less attacks derive from the body (see module doc).
 */
export interface NaturalAttackSpec {
  /** Stable per-attack key (`'bite'`, `'tail'`) — narration/flavor id. */
  key: string;
  /** The delivery channel this attack presents. */
  channel: Channel;
  /** Explicit reach band (wins over any derived reach). */
  reach?: ReachClass;
  /** Effective striking mass (kg) — rides the weapon balance curves. */
  massKg?: number;
  /** Effective striking length (m) — rides the weapon reach bands. */
  lengthM?: number;
  /**
   * Scale this attack's inflict **energy** by the striker's body mass
   * (`clamp(baseMass / combat.natural.energyRefMassKg, min, max)`) — the
   * fist a heavy body throws hits harder. Read in `commitInflict`'s
   * energy fold, NOT here (this is a delivery-energy concern, orthogonal
   * to the strike *profile* the reach/balance derivation shapes). No
   * shipped beast row carries it, so every existing innate is
   * byte-identical by construction. Default false.
   */
  massScaled?: boolean;
}

/** The four numbers the engine multiplies in at the unarmed seams — the
 * natural twin of the `WeaponProfile` numeric getters. */
export interface NaturalProfile {
  tempoFactor: number;
  poiseDamageFactor: number;
  overextendFactor: number;
  reachRank: number;
}

/** Config for {@link NaturalAttack.deriveProfile}: the weapon curves it
 * reuses (`combat.weapon.*`) + the large-body threshold
 * (`combat.natural.largeBodyMassKg`). */
export interface NaturalProfileConfig {
  weapon: WeaponProfileConfig;
  /** Body mass (kg) at/above which a hint-less attack derives large-body
   * reach + heavy balance; below it the derivation is exactly neutral. */
  largeBodyMassKg: number;
}

export const DEFAULT_NATURAL_PROFILE_CONFIG: NaturalProfileConfig = {
  weapon: DEFAULT_WEAPON_PROFILE_CONFIG,
  largeBodyMassKg: 150,
};

/** The exact neutral quadruple — the pre-vocabulary unarmed literals. */
export const NEUTRAL_NATURAL_PROFILE: NaturalProfile = Object.freeze({
  tempoFactor: 1,
  poiseDamageFactor: 1,
  overextendFactor: 1,
  reachRank: 0,
});

/** The minimal body read the hint-less derivation needs (structural — a
 * `BodyPlan` satisfies it; tests pass a stub). */
export interface NaturalBodyRead {
  getBaseMass(): number;
}

export class NaturalAttack {
  /**
   * Derive the natural strike profile for one attack (pure; see the
   * module doc for the derivation). `bodyPlan` may be null (no body →
   * hint-less derivation is neutral).
   */
  static deriveProfile(
    spec: NaturalAttackSpec,
    bodyPlan: NaturalBodyRead | null,
    config: NaturalProfileConfig = DEFAULT_NATURAL_PROFILE_CONFIG,
  ): NaturalProfile {
    const hinted =
      spec.reach !== undefined ||
      spec.massKg !== undefined ||
      spec.lengthM !== undefined;

    if (hinted) {
      // Authored hints ride the SAME weapon curves (an unauthored mass
      // derives the neutral reference — `WeaponProfile.derive`'s own
      // bare-shape rule). `deliveryForm: null` — the form axis is a
      // Construction concern; a natural attack has none.
      const profile = WeaponProfile.derive(
        {
          deliveryForm: null,
          massKg: spec.massKg ?? 0,
          lengthM: spec.lengthM ?? 0,
          handSlots: 1,
        },
        config.weapon,
      );
      // Explicit reach wins; else an authored length derives the band via
      // the weapon reach thresholds; else rank 0 (never the form-default
      // length — a hint-less reach is the shortest, like a fist).
      const reachRank =
        spec.reach !== undefined
          ? Math.max(0, REACH_CLASSES.indexOf(spec.reach))
          : spec.lengthM !== undefined
            ? profile.reachRank()
            : 0;
      return {
        tempoFactor: profile.tempoFactor(),
        poiseDamageFactor: profile.poiseDamageFactor(),
        overextendFactor: profile.overextendFactor(),
        reachRank,
      };
    }

    // Hint-less: the banded body-scale term. Below the threshold the
    // profile is EXACTLY the neutral quadruple — the byte-parity band
    // (the Phase-7a unarmed gym pin is the tripwire).
    const bodyMass = bodyPlan?.getBaseMass() ?? 0;
    if (!(bodyMass >= config.largeBodyMassKg) || config.largeBodyMassKg <= 0) {
      return { ...NEUTRAL_NATURAL_PROFILE };
    }
    // The effective limb (see module doc): the reference weapon mass
    // scaled by how far the body exceeds the large-body threshold —
    // factors are exactly 1 at the threshold and grow smoothly above it.
    const effectiveLimbMassKg =
      config.weapon.balanceRefMass * (bodyMass / config.largeBodyMassKg);
    const profile = WeaponProfile.derive(
      {
        deliveryForm: null,
        massKg: effectiveLimbMassKg,
        lengthM: 0,
        handSlots: 1,
      },
      config.weapon,
    );
    return {
      tempoFactor: profile.tempoFactor(),
      poiseDamageFactor: profile.poiseDamageFactor(),
      overextendFactor: profile.overextendFactor(),
      reachRank: 1, // one rank — ogre reach, never `long`
    };
  }

  /**
   * Validate an authored `naturalAttacks` value (the `Faculty.
   * validateProfile` precedent — `Species.setNaturalAttacks` calls this
   * as its per-field invariant). Throws `TypeError` on a malformed list;
   * returns a cleaned copy.
   */
  static validateSpecs(value: unknown): NaturalAttackSpec[] {
    if (!Array.isArray(value)) {
      throw new TypeError(
        "NaturalAttack.validateSpecs: must be a NaturalAttackSpec array",
      );
    }
    return value.map((entry, i) => {
      if (entry === null || typeof entry !== "object") {
        throw new TypeError(
          `NaturalAttack.validateSpecs: entry ${i} must be an object`,
        );
      }
      const spec = entry as NaturalAttackSpec;
      if (typeof spec.key !== "string" || spec.key.trim().length === 0) {
        throw new TypeError(
          `NaturalAttack.validateSpecs: entry ${i} needs a non-empty key`,
        );
      }
      if (!(CHANNELS as readonly string[]).includes(spec.channel)) {
        throw new TypeError(
          `NaturalAttack.validateSpecs: entry ${i} ('${spec.key}') channel ` +
            `must be one of ${CHANNELS.join(", ")}, got ` +
            `'${String(spec.channel)}'`,
        );
      }
      if (
        spec.reach !== undefined &&
        !REACH_CLASSES.includes(spec.reach)
      ) {
        throw new TypeError(
          `NaturalAttack.validateSpecs: entry ${i} ('${spec.key}') reach ` +
            `must be one of ${REACH_CLASSES.join(", ")}, got ` +
            `'${String(spec.reach)}'`,
        );
      }
      for (const dim of ["massKg", "lengthM"] as const) {
        const v = spec[dim];
        if (
          v !== undefined &&
          (typeof v !== "number" || !Number.isFinite(v) || v <= 0)
        ) {
          throw new TypeError(
            `NaturalAttack.validateSpecs: entry ${i} ('${spec.key}') ${dim} ` +
              `must be a finite positive number, got ${String(v)}`,
          );
        }
      }
      if (
        spec.massScaled !== undefined &&
        typeof spec.massScaled !== "boolean"
      ) {
        throw new TypeError(
          `NaturalAttack.validateSpecs: entry ${i} ('${spec.key}') ` +
            `massScaled must be a boolean, got ${String(spec.massScaled)}`,
        );
      }
      const cleaned: NaturalAttackSpec = {
        key: spec.key.trim(),
        channel: spec.channel,
      };
      if (spec.reach !== undefined) cleaned.reach = spec.reach;
      if (spec.massKg !== undefined) cleaned.massKg = spec.massKg;
      if (spec.lengthM !== undefined) cleaned.lengthM = spec.lengthM;
      if (spec.massScaled !== undefined) cleaned.massScaled = spec.massScaled;
      return cleaned;
    });
  }
}
