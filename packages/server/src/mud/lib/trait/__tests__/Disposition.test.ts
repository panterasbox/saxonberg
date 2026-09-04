/**
 * Disposition — the opposed-pair axis vocabulary. Asserts the roster is
 * well-formed (both poles per axis, unique keys), the validation array
 * tracks it, and the lookups (axisFor / isAxis / poleLabel) behave.
 */

import { describe, it, expect } from "vitest";
import {
  Disposition,
  DISPOSITION_AXES,
  DISPOSITION_KEYS,
} from "../Disposition";

describe("Disposition roster", () => {
  it("ships all 19 axes, each with two distinct pole labels", () => {
    expect(DISPOSITION_AXES).toHaveLength(19);
    for (const axis of DISPOSITION_AXES) {
      expect(axis.key.length).toBeGreaterThan(0);
      expect(axis.positive.length).toBeGreaterThan(0);
      expect(axis.negative.length).toBeGreaterThan(0);
      expect(axis.positive).not.toBe(axis.negative);
    }
  });

  it("has no duplicate axis keys", () => {
    const keys = DISPOSITION_AXES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("DISPOSITION_KEYS is the validation array of every axis key", () => {
    expect([...DISPOSITION_KEYS]).toEqual(DISPOSITION_AXES.map((a) => a.key));
  });

  it("includes the reframed + native axes", () => {
    for (const k of ["boldness", "fairness", "worldview", "curiosity"]) {
      expect(DISPOSITION_KEYS).toContain(k);
    }
  });
});

describe("Disposition lookups", () => {
  it("axisFor resolves a known key and null otherwise", () => {
    expect(Disposition.axisFor("generosity")?.positive).toBe("Generous");
    expect(Disposition.axisFor("nonsense")).toBeNull();
  });

  it("isAxis accepts every roster key and rejects unknowns / non-strings", () => {
    for (const k of DISPOSITION_KEYS) expect(Disposition.isAxis(k)).toBe(true);
    expect(Disposition.isAxis("nope")).toBe(false);
    expect(Disposition.isAxis(42)).toBe(false);
    expect(Disposition.isAxis(undefined)).toBe(false);
  });

  it("poleLabel picks the pole by valence sign", () => {
    expect(Disposition.poleLabel("sociability", 50)).toBe("Gregarious");
    expect(Disposition.poleLabel("sociability", -50)).toBe("Shy");
    // zero counts as the positive pole (sign >= 0).
    expect(Disposition.poleLabel("sociability", 0)).toBe("Gregarious");
    // unknown axis degrades to the bare key.
    expect(Disposition.poleLabel("nonsense", 1)).toBe("nonsense");
  });

  it("all() returns the full roster", () => {
    expect(Disposition.all()).toHaveLength(19);
  });
});
