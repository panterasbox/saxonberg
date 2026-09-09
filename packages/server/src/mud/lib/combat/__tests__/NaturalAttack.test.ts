/**
 * NaturalAttack — the species combat vocabulary's derivation (pure).
 *
 * The load-bearing claims: authored hints ride the SAME WeaponProfile
 * curves as a wielded weapon (zero new curve settings); the hint-less
 * derivation is EXACTLY the neutral quadruple `(1, 1, 1, 0)` below
 * `largeBodyMassKg` (the byte-parity band — the Phase-7a unarmed gym pin
 * is the engine-level tripwire) and shifts to one reach rank + heavy
 * balance at/above it, via the effective-limb mass
 * `balanceRefMass × (bodyMass / largeBodyMassKg)` (continuous at the
 * threshold).
 */

import { describe, it, expect } from "vitest";
import {
  NaturalAttack,
  DEFAULT_NATURAL_PROFILE_CONFIG,
  NEUTRAL_NATURAL_PROFILE,
  type NaturalAttackSpec,
} from "../NaturalAttack";
import { DIFFICULTIES } from "../../advancement/ActSignature";
import {
  WeaponProfile,
  DEFAULT_WEAPON_PROFILE_CONFIG,
} from "../WeaponProfile";

const body = (kg: number) => ({ getBaseMass: () => kg });

describe("NaturalAttack.deriveProfile — authored hints ride the weapon curves", () => {
  it("a massKg hint derives the same balance factors as a weapon of that mass", () => {
    const spec: NaturalAttackSpec = {
      key: "slam",
      channel: "blunt",
      massKg: 3.2,
    };
    const p = NaturalAttack.deriveProfile(spec, body(40));
    const w = WeaponProfile.derive(
      { deliveryForm: null, massKg: 3.2, lengthM: 0, handSlots: 1 },
      DEFAULT_WEAPON_PROFILE_CONFIG,
    );
    expect(p.tempoFactor).toBe(w.tempoFactor());
    expect(p.poiseDamageFactor).toBe(w.poiseDamageFactor());
    expect(p.overextendFactor).toBe(w.overextendFactor());
    // A heavy hint is a guard-breaker: slower, harder, dearer.
    expect(p.tempoFactor).toBeLessThan(1);
    expect(p.poiseDamageFactor).toBeGreaterThan(1);
    expect(p.overextendFactor).toBeGreaterThan(1);
    // No length/reach hint → the shortest rank (a fist, not a form).
    expect(p.reachRank).toBe(0);
  });

  it("a lengthM hint derives the reach band via the weapon thresholds", () => {
    const long = NaturalAttack.deriveProfile(
      { key: "tail", channel: "blunt", lengthM: 2.0 },
      body(40),
    );
    expect(long.reachRank).toBe(2); // above reachLongAbove (1.5 m)
    const medium = NaturalAttack.deriveProfile(
      { key: "tail", channel: "blunt", lengthM: 1.0 },
      body(40),
    );
    expect(medium.reachRank).toBe(1);
    // Mass unauthored → the neutral reference (the bare-shape rule).
    expect(medium.tempoFactor).toBe(1);
    expect(medium.poiseDamageFactor).toBe(1);
    expect(medium.overextendFactor).toBe(1);
  });

  it("an explicit reach hint wins over any derived length", () => {
    const p = NaturalAttack.deriveProfile(
      { key: "lash", channel: "edge", reach: "long", lengthM: 0.3 },
      body(40),
    );
    expect(p.reachRank).toBe(2);
  });
});

describe("NaturalAttack.deriveProfile — the hint-less body-scale band", () => {
  it("is EXACTLY neutral (1, 1, 1, 0) for a 40 kg wolf body", () => {
    const p = NaturalAttack.deriveProfile(
      { key: "bite", channel: "point" },
      body(40),
    );
    expect(p).toEqual({
      tempoFactor: 1,
      poiseDamageFactor: 1,
      overextendFactor: 1,
      reachRank: 0,
    });
  });

  it("is EXACTLY neutral for a 90 kg biped body", () => {
    const p = NaturalAttack.deriveProfile(
      { key: "fist", channel: "blunt" },
      body(90),
    );
    expect(p).toEqual({ ...NEUTRAL_NATURAL_PROFILE });
  });

  it("is neutral with no body at all (null / zero-mass plans)", () => {
    expect(
      NaturalAttack.deriveProfile({ key: "fist", channel: "blunt" }, null),
    ).toEqual({ ...NEUTRAL_NATURAL_PROFILE });
    expect(
      NaturalAttack.deriveProfile({ key: "fist", channel: "blunt" }, body(0)),
    ).toEqual({ ...NEUTRAL_NATURAL_PROFILE });
  });

  it("shifts at 400 kg: one reach rank + heavy balance (an ogre punches at ogre reach)", () => {
    const p = NaturalAttack.deriveProfile(
      { key: "fist", channel: "blunt" },
      body(400),
    );
    expect(p.reachRank).toBe(1); // one rank — never `long`
    expect(p.tempoFactor).toBeLessThan(1);
    expect(p.poiseDamageFactor).toBeGreaterThan(1);
    expect(p.overextendFactor).toBeGreaterThan(1);
  });

  it("is continuous at the threshold: factors exactly 1, only the reach rank steps", () => {
    const at = NaturalAttack.deriveProfile(
      { key: "fist", channel: "blunt" },
      body(DEFAULT_NATURAL_PROFILE_CONFIG.largeBodyMassKg),
    );
    // The effective limb at the threshold IS the reference mass —
    // (ref/ref)^exp = 1 exactly on every curve.
    expect(at.tempoFactor).toBe(1);
    expect(at.poiseDamageFactor).toBe(1);
    expect(at.overextendFactor).toBe(1);
    expect(at.reachRank).toBe(1);
  });

  it("grows monotonically above the threshold (heavier body, heavier limb)", () => {
    const mid = NaturalAttack.deriveProfile(
      { key: "fist", channel: "blunt" },
      body(200),
    );
    const big = NaturalAttack.deriveProfile(
      { key: "fist", channel: "blunt" },
      body(400),
    );
    expect(big.poiseDamageFactor).toBeGreaterThan(mid.poiseDamageFactor);
    expect(big.tempoFactor).toBeLessThan(mid.tempoFactor);
  });
});

describe("NaturalAttack.validateSpecs — the Species setter invariant", () => {
  it("passes and cleans a valid list", () => {
    const out = NaturalAttack.validateSpecs([
      { key: " bite ", channel: "point" },
      { key: "tail", channel: "blunt", reach: "medium", massKg: 4 },
    ]);
    expect(out).toEqual([
      { key: "bite", channel: "point" },
      { key: "tail", channel: "blunt", reach: "medium", massKg: 4 },
    ]);
  });

  it("throws on a non-array, a bad channel, a bad reach, a bad hint, an empty key", () => {
    expect(() => NaturalAttack.validateSpecs("bite" as never)).toThrow(
      TypeError,
    );
    expect(() =>
      NaturalAttack.validateSpecs([{ key: "bite", channel: "sonic" }]),
    ).toThrow(/channel/);
    expect(() =>
      NaturalAttack.validateSpecs([
        { key: "bite", channel: "point", reach: "galactic" as never },
      ]),
    ).toThrow(/reach/);
    expect(() =>
      NaturalAttack.validateSpecs([
        { key: "bite", channel: "point", massKg: -1 },
      ]),
    ).toThrow(/massKg/);
    expect(() =>
      NaturalAttack.validateSpecs([{ key: "", channel: "point" }]),
    ).toThrow(/key/);
  });
});

/* ─────────── W3: a beast's danger is its BODY, not a transcript ─────────── */

describe("NaturalAttack.difficultyFor — the beast's contest band", () => {
  const plan = (kg: number): { getBaseMass(): number } => ({
    getBaseMass: () => kg,
  });

  it("⭐ a large-bodied beast is a HARD fight; a rat is an EASY one", () => {
    // The correctness problem this exists to fix: wolves are `Extra`s
    // sharing one identity, so a transcript read makes EVERY beast
    // `untrained` and every beast fight `easy` — and an `easy` failure is
    // the estimator's maximal-sting case, so being mauled by a wolf would
    // cost more competence than being beaten by a master swordsman.
    const bear = NaturalAttack.difficultyFor(
      NaturalAttack.deriveProfile({ key: "maul", channel: "edge" }, plan(400)),
    );
    const rat = NaturalAttack.difficultyFor(
      NaturalAttack.deriveProfile({ key: "bite", channel: "point" }, plan(0.4)),
    );
    expect(DIFFICULTIES.indexOf(bear)).toBeGreaterThan(
      DIFFICULTIES.indexOf(rat),
    );
    expect(rat).toBe("easy");
    expect(DIFFICULTIES.indexOf(bear)).toBeGreaterThanOrEqual(
      DIFFICULTIES.indexOf("hard"),
    );
  });

  it("⭐ authored reach and mass move it — no new authoring surface", () => {
    // The whole argument for deriving rather than declaring: an author
    // who writes a longer-reached, heavier animal gets a harder fight in
    // the SAME numbers that already govern how it hits, with nothing to
    // keep in sync.
    const shortArmed = NaturalAttack.difficultyFor(
      NaturalAttack.deriveProfile(
        { key: "claw", channel: "edge", massKg: 2, lengthM: 0.2 },
        null,
      ),
    );
    const longArmed = NaturalAttack.difficultyFor(
      NaturalAttack.deriveProfile(
        { key: "gore", channel: "point", massKg: 12, lengthM: 1.6 },
        null,
      ),
    );
    expect(DIFFICULTIES.indexOf(longArmed)).toBeGreaterThan(
      DIFFICULTIES.indexOf(shortArmed),
    );
  });

  it("a neutral body floors at easy and never below", () => {
    expect(NaturalAttack.difficultyFor(NEUTRAL_NATURAL_PROFILE)).toBe("easy");
  });
});
