/**
 * TraitPosition — the derive-on-read estimator. Covers signed
 * accumulation, game-time decay, band progression, the pronounced filter,
 * and the load-bearing acceptance criterion: entrenchment resists drift.
 */

import { describe, it, expect } from "vitest";
import {
  TraitPosition,
  type DispositionEvidence,
  type TraitDials,
} from "../TraitPosition";

const DIALS: TraitDials = {
  halfLifeSeconds: 1000,
  definedThreshold: 20,
  entrenchedThreshold: 60,
  pronouncedThreshold: 25,
};

function ev(valence: number, when = 0, disposition = "honesty"): DispositionEvidence {
  return { disposition, valence, when };
}

describe("TraitPosition.derive", () => {
  it("yields no axes for empty evidence (the floor is implicit)", () => {
    expect(TraitPosition.derive([], 0, DIALS)).toEqual([]);
  });

  it("accumulates signed valence per axis", () => {
    const pos = TraitPosition.deriveAxis(
      "honesty",
      [ev(30), ev(30)],
      0,
      DIALS
    );
    expect(pos.position).toBe(60);
    const neg = TraitPosition.deriveAxis(
      "honesty",
      [ev(-40), ev(-20)],
      0,
      DIALS
    );
    expect(neg.position).toBe(-60);
  });

  it("clamps position to the regard range", () => {
    const pos = TraitPosition.deriveAxis(
      "honesty",
      [ev(80), ev(80)],
      0,
      DIALS
    );
    expect(pos.position).toBe(100);
  });

  it("decays older evidence (game-time)", () => {
    const fresh = TraitPosition.deriveAxis("honesty", [ev(100, 1000)], 1000, DIALS);
    const old = TraitPosition.deriveAxis("honesty", [ev(100, 0)], 1000, DIALS);
    expect(fresh.position).toBe(100);
    // one half-life old → half the weight.
    expect(old.position).toBeCloseTo(50, 5);
    expect(old.position).toBeLessThan(fresh.position);
  });

  it("progresses the band with accumulated mass", () => {
    expect(TraitPosition.deriveAxis("honesty", [ev(10)], 0, DIALS).band).toBe(
      "unformed"
    );
    expect(TraitPosition.deriveAxis("honesty", [ev(30)], 0, DIALS).band).toBe(
      "defined"
    );
    expect(
      TraitPosition.deriveAxis("honesty", [ev(40), ev(40)], 0, DIALS).band
    ).toBe("entrenched");
  });

  it("groups multiple axes, sorted by key", () => {
    const est = TraitPosition.derive(
      [ev(30, 0, "sociability"), ev(30, 0, "honesty")],
      0,
      DIALS
    );
    expect(est.map((e) => e.disposition)).toEqual(["honesty", "sociability"]);
  });

  it("ENTRENCHMENT RESISTS DRIFT: one act moves an entrenched axis less", () => {
    // An entrenched, rail-pinned axis (consistent strong evidence).
    const entrenchedBefore = TraitPosition.deriveAxis(
      "honesty",
      [ev(50), ev(50), ev(50)],
      0,
      DIALS
    ).position;
    const entrenchedAfter = TraitPosition.deriveAxis(
      "honesty",
      [ev(50), ev(50), ev(50), ev(30)],
      0,
      DIALS
    ).position;

    // A near-empty (unformed) axis.
    const unformedBefore = TraitPosition.deriveAxis("honesty", [], 0, DIALS)
      .position;
    const unformedAfter = TraitPosition.deriveAxis(
      "honesty",
      [ev(30)],
      0,
      DIALS
    ).position;

    const entrenchedDrift = Math.abs(entrenchedAfter - entrenchedBefore);
    const unformedDrift = Math.abs(unformedAfter - unformedBefore);
    expect(entrenchedDrift).toBeLessThan(unformedDrift);
  });
});

describe("TraitPosition.pronounced", () => {
  it("keeps defining axes and drops near-neutral ones, most pronounced first", () => {
    const estimates = TraitPosition.derive(
      [
        ev(70, 0, "sociability"),
        ev(5, 0, "honesty"), // below pronounced threshold AND mass < defined
        ev(40, 0, "generosity"),
      ],
      0,
      DIALS
    );
    const pronounced = TraitPosition.pronounced(estimates, DIALS);
    expect(pronounced.map((e) => e.disposition)).toEqual([
      "sociability",
      "generosity",
    ]);
  });
});
