/**
 * RangeBand — the four-tier ladder, its melee split, the step primitive,
 * the arena cap, and the envelope test. Pure value-object: no Stuff, no
 * session, no settings boot (AC 1, AC 3).
 */

import { describe, it, expect } from "vitest";
import {
  RangeBand,
  RANGE_BANDS,
  DEFAULT_RANGE_BAND_CONFIG,
  type RangeState,
} from "../RangeBand";
import { REACH_CLASSES } from "../WeaponProfile";

describe("RangeBand — the ladder", () => {
  it("is exactly four bands, ascending", () => {
    expect(RANGE_BANDS).toEqual(["close", "reach", "near", "far"]);
  });

  it("rank is the index; at() is its inverse", () => {
    RANGE_BANDS.forEach((band, i) => {
      expect(RangeBand.rank(band)).toBe(i);
      expect(RangeBand.at(i)).toBe(band);
    });
  });

  it("at() clamps rather than throwing off either end", () => {
    expect(RangeBand.at(-5)).toBe("close");
    expect(RangeBand.at(99)).toBe("far");
  });

  /**
   * The naming discipline that keeps the widening honest: `ReachClass` is
   * a projection of a weapon's authored LENGTH, not a band. If a future
   * edit ever names a band `short`, the two vocabularies become
   * confusable and one could be indexed with the other's rank.
   */
  it("shares no member with ReachClass — `short` is not a band", () => {
    for (const rc of REACH_CLASSES) {
      expect(RANGE_BANDS).not.toContain(rc as unknown as RangeState);
    }
    expect(RANGE_BANDS).not.toContain("short" as unknown as RangeState);
  });
});

describe("RangeBand — the melee split", () => {
  it("close and reach are melee; near and far are not", () => {
    expect(RangeBand.isMelee("close")).toBe(true);
    expect(RangeBand.isMelee("reach")).toBe(true);
    expect(RangeBand.isMelee("near")).toBe(false);
    expect(RangeBand.isMelee("far")).toBe(false);
  });
});

describe("RangeBand.step — the advance/withdraw primitive", () => {
  it("negative closes distance, positive opens it", () => {
    expect(RangeBand.step("far", -1)).toBe("near");
    expect(RangeBand.step("near", -1)).toBe("reach");
    expect(RangeBand.step("reach", -1)).toBe("close");
    expect(RangeBand.step("close", 1)).toBe("reach");
    expect(RangeBand.step("reach", 1)).toBe("near");
    expect(RangeBand.step("near", 1)).toBe("far");
  });

  it("clamps at both ends — you cannot advance past the clinch", () => {
    expect(RangeBand.step("close", -1)).toBe("close");
    expect(RangeBand.step("close", -9)).toBe("close");
    expect(RangeBand.step("far", 1)).toBe("far");
    expect(RangeBand.step("far", 9)).toBe("far");
  });

  it("a zero step is identity", () => {
    for (const b of RANGE_BANDS) expect(RangeBand.step(b, 0)).toBe(b);
  });
});

describe("RangeBand.maxForExtent — the arena caps the ladder", () => {
  it("a 3 m cell affords only the melee bands — bar fights stay knife fights", () => {
    expect(RangeBand.maxForExtent(3)).toBe("reach");
  });

  it("a 6 m hall arms `near`", () => {
    expect(RangeBand.maxForExtent(6)).toBe("near");
  });

  it("a 20 m outdoor cell arms `far`", () => {
    expect(RangeBand.maxForExtent(20)).toBe("far");
    expect(RangeBand.maxForExtent(45)).toBe("far");
  });

  it("reads its thresholds from config, not from literals", () => {
    const tight = { nearMetres: 10, farMetres: 40 };
    expect(RangeBand.maxForExtent(6, tight)).toBe("reach");
    expect(RangeBand.maxForExtent(12, tight)).toBe("near");
    expect(RangeBand.maxForExtent(41, tight)).toBe("far");
  });

  it("an unmeasured room falls back to the melee cap, not to `far`", () => {
    // Conservative on purpose: a room that cannot report its size cannot
    // promise the distance a bow needs.
    expect(RangeBand.maxForExtent(null)).toBe("reach");
    expect(RangeBand.maxForExtent(Number.NaN)).toBe("reach");
    expect(RangeBand.maxForExtent(Number.POSITIVE_INFINITY)).toBe("reach");
  });

  it("the seeded defaults are the documented 6 / 20", () => {
    expect(DEFAULT_RANGE_BAND_CONFIG).toEqual({ nearMetres: 6, farMetres: 20 });
  });
});

describe("RangeBand.beyond — the carrier envelope test", () => {
  it("is false at or inside the envelope, true past it", () => {
    expect(RangeBand.beyond("near", "near")).toBe(false);
    expect(RangeBand.beyond("close", "near")).toBe(false);
    expect(RangeBand.beyond("far", "near")).toBe(true);
  });

  it("a `far` envelope reaches everything — the shipped-spell default", () => {
    for (const b of RANGE_BANDS) expect(RangeBand.beyond(b, "far")).toBe(false);
  });

  it("a melee envelope refuses both ranged bands", () => {
    expect(RangeBand.beyond("near", "reach")).toBe(true);
    expect(RangeBand.beyond("far", "reach")).toBe(true);
  });
});

describe("RangeBand — determinism", () => {
  it("is a pure value-object: no Math.random on any path", () => {
    // The whole ranged design rides on "risk never comes from dice".
    const src = RangeBand.toString();
    expect(src).not.toContain("Math.random");
    for (const b of RANGE_BANDS) {
      expect(RangeBand.maxForExtent(12)).toBe(RangeBand.maxForExtent(12));
      expect(RangeBand.step(b, 1)).toBe(RangeBand.step(b, 1));
    }
  });
});
