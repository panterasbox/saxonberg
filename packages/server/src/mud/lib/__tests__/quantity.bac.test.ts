/**
 * Quantity — the `g/dL` (BAC) and `mg` units added for metabolism's
 * alcohol exemplar + absorbed-dose math: arithmetic, the `mg ↔ g`
 * converter, and the `'bac'` drunk-ladder tag scale.
 */

import { describe, it, expect } from "vitest";
import { Quantity } from "../quantity";

describe("Quantity — g/dL + mg", () => {
  it("g/dL supports arithmetic", () => {
    const a = Quantity.of(0.05, "g/dL");
    const b = Quantity.of(0.03, "g/dL");
    expect(a.add(b).rawValue()).toBeCloseTo(0.08);
    expect(a.scale(2).rawValue()).toBeCloseTo(0.1);
  });

  it("converts mg ↔ g", () => {
    expect(Quantity.of(2500, "mg").to("g").rawValue()).toBeCloseTo(2.5);
    expect(Quantity.of(2, "g").to("mg").rawValue()).toBeCloseTo(2000);
  });

  it("the 'bac' scale names the right rung at sample BACs", () => {
    expect(Quantity.of(0.0, "g/dL").tag("bac")).toBe("sober");
    expect(Quantity.of(0.04, "g/dL").tag("bac")).toBe("tipsy");
    expect(Quantity.of(0.1, "g/dL").tag("bac")).toBe("drunk");
    expect(Quantity.of(0.2, "g/dL").tag("bac")).toBe("very-drunk");
    expect(Quantity.of(0.3, "g/dL").tag("bac")).toBe("incapacitated");
    expect(Quantity.of(0.5, "g/dL").tag("bac")).toBe("life-threatening");
  });

  it("compareTag orders bac rungs", () => {
    expect(Quantity.compareTag("g/dL", "tipsy", "drunk", "bac")).toBeLessThan(0);
    expect(
      Quantity.compareTag("g/dL", "very-drunk", "drunk", "bac"),
    ).toBeGreaterThan(0);
    expect(Quantity.compareTag("g/dL", "drunk", "drunk", "bac")).toBe(0);
  });
});
