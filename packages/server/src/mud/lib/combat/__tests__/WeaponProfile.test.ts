/**
 * WeaponProfile — the derived-playstyle value-object.
 *
 * Pure derivation: three authored shapes (a dagger, a spear, a war-hammer)
 * yield three distinct playstyles with no per-weapon tuning, the guardless
 * flail can't parry, and a formless weapon is inert (the lint's smell).
 */

import { describe, it, expect } from "vitest";
import { WeaponProfile } from "../WeaponProfile";
import type { WeaponProfileInputs } from "../WeaponProfile";

/** The seeded dagger's shape. */
const DAGGER: WeaponProfileInputs = {
  deliveryForm: "bladed",
  massKg: 0.3,
  lengthM: 0.25,
  handSlots: 1,
};
/** The seeded spear's shape. */
const SPEAR: WeaponProfileInputs = {
  deliveryForm: "pointed",
  massKg: 1.8,
  lengthM: 2.4,
  handSlots: 2,
};
/** The seeded war-hammer's shape. */
const WARHAMMER: WeaponProfileInputs = {
  deliveryForm: "hafted",
  massKg: 3.2,
  lengthM: 1.1,
  handSlots: 2,
};
/** The seeded flail's shape (the guardless archetype). */
const FLAIL: WeaponProfileInputs = {
  deliveryForm: "flail",
  massKg: 1.4,
  lengthM: 0.9,
  handSlots: 1,
};
/** The seeded arming sword's shape (the balanced generalist). */
const SWORD: WeaponProfileInputs = {
  deliveryForm: "bladed",
  massKg: 1.0,
  lengthM: 0.9,
  handSlots: 1,
};
/** The seeded whip's shape (the long, guardless reach extreme). */
const WHIP: WeaponProfileInputs = {
  deliveryForm: "whip",
  massKg: 0.6,
  lengthM: 2.5,
  handSlots: 1,
};

describe("WeaponProfile — reach derives from length", () => {
  it("short / medium / long track the authored length", () => {
    expect(WeaponProfile.derive(DAGGER).reach()).toBe("short");
    expect(WeaponProfile.derive(SWORD).reach()).toBe("medium");
    expect(WeaponProfile.derive(SPEAR).reach()).toBe("long");
  });

  it("reachRank orders short < medium < long", () => {
    expect(WeaponProfile.derive(DAGGER).reachRank()).toBeLessThan(
      WeaponProfile.derive(SPEAR).reachRank(),
    );
  });

  it("defaults length from form × mass when unauthored", () => {
    const p = WeaponProfile.derive({
      deliveryForm: "pointed",
      massKg: 1.5,
      lengthM: 0,
      handSlots: 2,
    });
    // A pointed weapon with no authored length still reaches (defaulted long).
    expect(p.reach()).toBe("long");
  });
});

describe("WeaponProfile — balance derives from mass (guard-breaker ↔ exploiter)", () => {
  it("a light weapon is a fast exploiter; a heavy one a slow guard-breaker", () => {
    const dagger = WeaponProfile.derive(DAGGER);
    const hammer = WeaponProfile.derive(WARHAMMER);
    expect(dagger.balance()).toBe("light");
    expect(hammer.balance()).toBe("heavy");
    // Tempo: light fast (>1), heavy slow (<1).
    expect(dagger.tempoFactor()).toBeGreaterThan(1);
    expect(hammer.tempoFactor()).toBeLessThan(1);
    // Poise damage + overextend: heavy hits harder and commits harder.
    expect(hammer.poiseDamageFactor()).toBeGreaterThan(
      dagger.poiseDamageFactor(),
    );
    expect(hammer.overextendFactor()).toBeGreaterThan(
      dagger.overextendFactor(),
    );
  });

  it("the exploiter cashes cheaply, the guard-breaker commits dearly", () => {
    const dagger = WeaponProfile.derive(DAGGER);
    const hammer = WeaponProfile.derive(WARHAMMER);
    expect(dagger.overextendFactor()).toBeLessThan(1);
    expect(hammer.overextendFactor()).toBeGreaterThan(1);
  });

  it("a near-reference-mass weapon is neutral", () => {
    expect(WeaponProfile.derive(SWORD).balance()).toBe("neutral");
  });
});

describe("WeaponProfile — guard derives from form", () => {
  it("a crossguard blade guards well; a flail can't self-guard", () => {
    const sword = WeaponProfile.derive(SWORD);
    const flail = WeaponProfile.derive(FLAIL);
    expect(sword.guard()).toBe("good");
    expect(sword.canParry()).toBe(true);
    expect(flail.guard()).toBe("none");
    expect(flail.canParry()).toBe(false);
    expect(flail.guardFactor()).toBe(0);
  });

  it("an off-hand/shield guard bonus lifts the guard factor", () => {
    const base = WeaponProfile.derive(SWORD);
    const boosted = WeaponProfile.derive({ ...SWORD, guardBonus: 0.6 });
    expect(boosted.guardFactor()).toBeGreaterThan(base.guardFactor());
  });

  it("even a guardless weapon with an off-hand bonus can parry", () => {
    const flailWithOffhand = WeaponProfile.derive({ ...FLAIL, guardBonus: 0.6 });
    // The flail's own guard is still 'none', but the assist gives it a
    // non-zero factor (a dual-wield off-hand covers the guardless main).
    expect(flailWithOffhand.guardFactor()).toBeGreaterThan(0);
  });
});

describe("WeaponProfile — the whip (long, guardless reach extreme)", () => {
  it("is long-reach and cannot self-guard", () => {
    const whip = WeaponProfile.derive(WHIP);
    expect(whip.reach()).toBe("long");
    expect(whip.guard()).toBe("none");
    expect(whip.canParry()).toBe(false);
    expect(whip.delivery()).toBe("whip");
    expect(whip.isInert()).toBe(false);
  });

  it("defaults to long reach even unauthored (the reach extreme)", () => {
    const bare = WeaponProfile.derive({
      deliveryForm: "whip",
      massKg: 0.5,
      lengthM: 0,
      handSlots: 1,
    });
    expect(bare.reach()).toBe("long");
  });
});

describe("WeaponProfile — handedness derives from slot claims", () => {
  it("one grip → one-handed, two grips → two-handed", () => {
    expect(WeaponProfile.derive(DAGGER).handedness()).toBe("one-handed");
    expect(WeaponProfile.derive(SPEAR).handedness()).toBe("two-handed");
  });
});

describe("WeaponProfile — three shapes, three distinct playstyles", () => {
  it("dagger, spear, and war-hammer differ on every axis that matters", () => {
    const d = WeaponProfile.derive(DAGGER);
    const s = WeaponProfile.derive(SPEAR);
    const h = WeaponProfile.derive(WARHAMMER);
    // Reach: short / long / medium.
    expect(new Set([d.reach(), s.reach(), h.reach()]).size).toBe(3);
    // Balance: light / (spear heavy-ish) / heavy — dagger vs hammer differ.
    expect(d.balance()).not.toBe(h.balance());
    // Handedness: dagger 1H vs spear/hammer 2H.
    expect(d.handedness()).not.toBe(s.handedness());
  });
});

describe("WeaponProfile — inertness (the lint smell)", () => {
  it("a formless weapon is inert; a real one is not", () => {
    const inert = WeaponProfile.derive({
      deliveryForm: null,
      massKg: 1,
      lengthM: 1,
      handSlots: 1,
    });
    expect(inert.isInert()).toBe(true);
    expect(WeaponProfile.derive(DAGGER).isInert()).toBe(false);
  });
});

describe("WeaponProfile — determinism", () => {
  it("derive is a pure function of its inputs", () => {
    const a = WeaponProfile.derive(SPEAR);
    const b = WeaponProfile.derive(SPEAR);
    expect(a.reach()).toBe(b.reach());
    expect(a.tempoFactor()).toBe(b.tempoFactor());
    expect(a.guardFactor()).toBe(b.guardFactor());
  });
});
