import { describe, it, expect } from "vitest";
import { Sharpness, DEFAULT_SHARPNESS_CONFIG } from "../Sharpness";

describe("Sharpness — competence curve (f(competence))", () => {
  it("interpolates min→max across the band ranks", () => {
    expect(Sharpness.resolve({ competenceBand: "untrained" })).toBeCloseTo(
      DEFAULT_SHARPNESS_CONFIG.min,
    );
    expect(Sharpness.resolve({ competenceBand: "expert" })).toBeCloseTo(
      DEFAULT_SHARPNESS_CONFIG.max,
    );
    // A mid band sits strictly between the poles and above the one below it.
    const novice = Sharpness.resolve({ competenceBand: "novice" });
    const competent = Sharpness.resolve({ competenceBand: "competent" });
    expect(novice).toBeGreaterThan(DEFAULT_SHARPNESS_CONFIG.min);
    expect(competent).toBeGreaterThan(novice);
    expect(competent).toBeLessThan(DEFAULT_SHARPNESS_CONFIG.max);
  });

  it("honors an overriding min/max curve", () => {
    const cfg = { min: 0.5, max: 0.9 };
    expect(Sharpness.resolve({ competenceBand: "untrained" }, cfg)).toBeCloseTo(0.5);
    expect(Sharpness.resolve({ competenceBand: "expert" }, cfg)).toBeCloseTo(0.9);
  });
});

describe("Sharpness — composure seam (g(composure), inert today)", () => {
  it("defaults composure to 1 (present but inert)", () => {
    const withNone = Sharpness.resolve({ competenceBand: "competent" });
    const withOne = Sharpness.resolve({ competenceBand: "competent", composure: 1 });
    expect(withOne).toBeCloseTo(withNone);
  });

  it("composes a stubbed composure multiplier (the traits-stress hook)", () => {
    const base = Sharpness.resolve({ competenceBand: "expert" }); // 1.0
    const stressed = Sharpness.resolve({ competenceBand: "expert", composure: 0.5 });
    expect(stressed).toBeCloseTo(base * 0.5);
    // Clamped to [0,1] — an inspired multiplier can't push past full sharpness.
    const inspired = Sharpness.resolve({ competenceBand: "expert", composure: 2 });
    expect(inspired).toBe(1);
  });
});
