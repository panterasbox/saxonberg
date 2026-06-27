/**
 * TraitBand — the form→define→entrench lifecycle band over evidence mass.
 */

import { describe, it, expect } from "vitest";
import { TraitBand, TRAIT_BANDS } from "../TraitBand";

const CUTS = { definedThreshold: 20, entrenchedThreshold: 60 };

describe("TraitBand.forMass", () => {
  it("maps mass to the lifecycle band", () => {
    expect(TraitBand.forMass(0, CUTS)).toBe("unformed");
    expect(TraitBand.forMass(19, CUTS)).toBe("unformed");
    expect(TraitBand.forMass(20, CUTS)).toBe("defined");
    expect(TraitBand.forMass(59, CUTS)).toBe("defined");
    expect(TraitBand.forMass(60, CUTS)).toBe("entrenched");
    expect(TraitBand.forMass(500, CUTS)).toBe("entrenched");
  });

  it("uses the default cutoffs when none are supplied", () => {
    expect(TraitBand.forMass(0)).toBe("unformed");
    expect(TraitBand.forMass(1000)).toBe("entrenched");
  });
});

describe("TraitBand ordering", () => {
  it("FLOOR is unformed and ranks ascend", () => {
    expect(TraitBand.FLOOR).toBe("unformed");
    expect(TraitBand.rank("unformed")).toBe(0);
    expect(TraitBand.rank("defined")).toBe(1);
    expect(TraitBand.rank("entrenched")).toBe(2);
  });

  it("atOrAbove compares rank", () => {
    expect(TraitBand.atOrAbove("entrenched", "defined")).toBe(true);
    expect(TraitBand.atOrAbove("defined", "defined")).toBe(true);
    expect(TraitBand.atOrAbove("unformed", "defined")).toBe(false);
  });

  it("isBand recognizes only the band names", () => {
    for (const b of TRAIT_BANDS) expect(TraitBand.isBand(b)).toBe(true);
    expect(TraitBand.isBand("legendary")).toBe(false);
    expect(TraitBand.isBand(3)).toBe(false);
  });
});
