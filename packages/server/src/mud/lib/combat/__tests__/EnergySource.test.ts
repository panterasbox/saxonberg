/**
 * EnergySource — the four launcher families, from one field.
 *
 * Wave 1 only has a `muscle` carrier, but all three branches are pinned
 * here: the whole point of shipping the vocabulary early is that a later
 * wave inherits a tested axis instead of retrofitting one across an
 * established launcher model.
 */

import { describe, it, expect } from "vitest";
import {
  EnergySource,
  ENERGY_SOURCES,
  READINESS_HOLDS,
  DEFAULT_ENERGY_SOURCE_CONFIG,
} from "../EnergySource";

describe("EnergySource — the vocabulary", () => {
  it("is closed and excludes the parked `electrical`", () => {
    expect(ENERGY_SOURCES).toEqual(["muscle", "stored-elastic", "chemical"]);
    expect(ENERGY_SOURCES).not.toContain("electrical" as never);
    expect(READINESS_HOLDS).toEqual(["instant", "muscle", "mechanical"]);
  });
});

describe("EnergySource — who pays to stay ready", () => {
  it("thrown: readiness is instantaneous, nothing to hold", () => {
    expect(EnergySource.holdOf("muscle")).toBe("instant");
    expect(EnergySource.holdsFree("muscle")).toBe(true);
    expect(EnergySource.readinessIsInstantaneous("muscle")).toBe(true);
    expect(EnergySource.holdPoisePerBeat("muscle")).toBe(0);
  });

  it("bow: the ARCHER holds the draw, and pays every beat", () => {
    expect(EnergySource.holdOf("stored-elastic", false)).toBe("muscle");
    expect(EnergySource.holdsFree("stored-elastic", false)).toBe(false);
    expect(EnergySource.holdPoisePerBeat("stored-elastic", false)).toBe(
      DEFAULT_ENERGY_SOURCE_CONFIG.holdPoisePerBeat,
    );
  });

  it("crossbow: the MECHANISM holds the draw, and it is free", () => {
    expect(EnergySource.holdOf("stored-elastic", true)).toBe("mechanical");
    expect(EnergySource.holdsFree("stored-elastic", true)).toBe(true);
    expect(EnergySource.holdPoisePerBeat("stored-elastic", true)).toBe(0);
  });

  it("gun: the CARTRIDGE holds the energy, and it is free", () => {
    expect(EnergySource.holdOf("chemical")).toBe("mechanical");
    expect(EnergySource.holdsFree("chemical")).toBe(true);
    expect(EnergySource.holdPoisePerBeat("chemical")).toBe(0);
  });

  /**
   * The model's sharpest test, and the reason the crossbow is not
   * optional content: bow and crossbow share an energy source and differ
   * entirely on who holds the draw. If this ever collapses, "held
   * readiness is its own axis" was never true and the whole family
   * distinction is really just muscle-vs-machine.
   */
  it("bow and crossbow share `stored-elastic` and differ on the HOLD", () => {
    const bow = EnergySource.holdOf("stored-elastic", false);
    const crossbow = EnergySource.holdOf("stored-elastic", true);
    expect(bow).not.toBe(crossbow);
    expect(EnergySource.holdsFree("stored-elastic", false)).toBe(false);
    expect(EnergySource.holdsFree("stored-elastic", true)).toBe(true);
  });
});

describe("EnergySource — aim collapses into readiness only for a held draw", () => {
  it("a bow's draw IS its aim; a crossbow and gun aim at leisure", () => {
    expect(EnergySource.aimIsReadiness("stored-elastic", false)).toBe(true);
    expect(EnergySource.aimIsReadiness("stored-elastic", true)).toBe(false);
    expect(EnergySource.aimIsReadiness("chemical")).toBe(false);
    // A throw has no aim ladder above the throw itself.
    expect(EnergySource.aimIsReadiness("muscle")).toBe(false);
  });
});

describe("EnergySource — rate of fire is a consequence, never a field", () => {
  it("only a muscle launcher folds readiness into the shot", () => {
    // Nocking is part of loosing, so a longbowman needs no separate
    // readiness beat. Spanning and loading are mechanical and stay
    // separate committed actions — which is the whole rate-of-fire
    // difference, derived rather than authored.
    expect(EnergySource.readinessIsInstantaneous("muscle")).toBe(true);
    expect(EnergySource.readinessIsInstantaneous("stored-elastic")).toBe(false);
    expect(EnergySource.readinessIsInstantaneous("chemical")).toBe(false);
  });
});

describe("EnergySource — determinism", () => {
  it("every projection is total over the vocabulary and pure", () => {
    for (const kind of ENERGY_SOURCES) {
      for (const mech of [true, false]) {
        expect(READINESS_HOLDS).toContain(EnergySource.holdOf(kind, mech));
        expect(EnergySource.holdOf(kind, mech)).toBe(
          EnergySource.holdOf(kind, mech),
        );
        expect(EnergySource.holdPoisePerBeat(kind, mech)).toBeGreaterThanOrEqual(
          0,
        );
      }
    }
  });

  it("the hold cost is config-injected, not a literal", () => {
    expect(
      EnergySource.holdPoisePerBeat("stored-elastic", false, {
        holdPoisePerBeat: 0.5,
      }),
    ).toBe(0.5);
  });
});
