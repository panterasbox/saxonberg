/**
 * LandUse — the closed land-use vocabulary and its capability+ceiling
 * table. Pure value-object tests: no persistence, no registry.
 *
 * The load-bearing one is `wild admits nothing`. See the module doc — the
 * inheritance walk answers `wild` for every parcel row that is not ground
 * (`/studio`, `/lib/lounge`, the `/obj/…` roots), so a `wild` that admitted
 * a bed would open cultivation everywhere nobody thought to close it.
 */

import { describe, it, expect } from "vitest";
import {
  LandUses,
  LAND_USES,
  CULTIVATION_SCALES,
  type LandUse,
} from "../LandUse";
import { Quantity } from "../../quantity";

describe("LandUses — the vocabulary is closed", () => {
  it("holds exactly the six uses stewardship specified", () => {
    expect([...LAND_USES]).toEqual([
      "residential",
      "agricultural",
      "commercial",
      "industrial",
      "civic",
      "wild",
    ]);
  });

  it("narrows a known use and rejects an unknown one", () => {
    expect(LandUses.isLandUse("residential")).toBe(true);
    expect(LandUses.isLandUse("industrial")).toBe(true);
    expect(LandUses.isLandUse("recreational")).toBe(false);
    expect(LandUses.isLandUse("")).toBe(false);
  });

  it("refuses an unknown use NAMING the offending value", () => {
    expect(() => LandUses.parse("recreational")).toThrow(/recreational/);
    // …and the vocabulary, so the author knows what was expected.
    expect(() => LandUses.parse("recreational")).toThrow(/agricultural/);
  });

  it("passes a known use straight through", () => {
    expect(LandUses.parse("civic")).toBe("civic");
  });
});

describe("LandUses.admitsCultivation — farming's one question", () => {
  it("answers within stewardship's answer space for every use", () => {
    for (const use of LAND_USES) {
      expect(CULTIVATION_SCALES).toContain(LandUses.admitsCultivation(use));
    }
  });

  it("maps the six per stewardship's table", () => {
    expect(LandUses.admitsCultivation("residential")).toBe("bed");
    expect(LandUses.admitsCultivation("agricultural")).toBe("field");
    expect(LandUses.admitsCultivation("commercial")).toBe("none");
    expect(LandUses.admitsCultivation("industrial")).toBe("none");
    expect(LandUses.admitsCultivation("civic")).toBe("none");
  });

  it("⭐ wild admits NOTHING — the fail-closed default", () => {
    // Every parcel row that is not ground answers `wild` through the
    // inheritance walk. If this flips to 'bed', cultivation silently
    // becomes legal on /studio, /lib/lounge and every unzoned branch.
    expect(LandUses.admitsCultivation("wild")).toBe("none");
    expect(LandUses.permitsAnyCultivation("wild")).toBe(false);
  });

  it("permits cultivation on exactly the two uses that grant it", () => {
    const permitting = LAND_USES.filter((u) =>
      LandUses.permitsAnyCultivation(u),
    );
    expect([...permitting]).toEqual(["residential", "agricultural"]);
  });
});

describe("LandUses — the ceiling half", () => {
  it("gives every use a permissible area band", () => {
    for (const use of LAND_USES) {
      const band = LandUses.areaBandOf(use);
      expect(band.max).toBeGreaterThan(band.min);
    }
  });

  it("admits a lot inside the band and refuses one outside", () => {
    // A quarter-acre suburban lot is residential; a 40-hectare one is not.
    expect(LandUses.admitsArea("residential", 1_000)).toBe(true);
    expect(LandUses.admitsArea("residential", 400_000)).toBe(false);
    // A 3 m² farm is the mis-authoring the band exists to catch.
    expect(LandUses.admitsArea("agricultural", 3)).toBe(false);
    expect(LandUses.admitsArea("agricultural", 50_000)).toBe(true);
  });

  it("treats the band as inclusive at both ends", () => {
    const band = LandUses.areaBandOf("residential");
    expect(LandUses.admitsArea("residential", band.min)).toBe(true);
    expect(LandUses.admitsArea("residential", band.max)).toBe(true);
    expect(LandUses.admitsArea("residential", band.min - 1)).toBe(false);
  });

  it("admits an UNDECLARED area — area is optional, not defaulted", () => {
    // Path-branch rows (/studio, /lib/lounge) declare no area, and an
    // undeclared lot is not a mis-authored one.
    for (const use of LAND_USES) {
      expect(LandUses.admitsArea(use, null)).toBe(true);
      // 0 is the storage default for "never declared" — same answer.
      expect(LandUses.admitsArea(use, 0)).toBe(true);
    }
  });

  it("gives every use a player-facing summary a refusal can name", () => {
    for (const use of LAND_USES) {
      expect(LandUses.summaryOf(use).length).toBeGreaterThan(0);
    }
    expect(LandUses.summaryOf("residential")).toMatch(/cultivation/);
  });

  it("hands back a copy of the band, not the table's own row", () => {
    const band = LandUses.areaBandOf("civic");
    band.min = -999;
    expect(LandUses.areaBandOf("civic").min).not.toBe(-999);
  });
});

describe("m² — the area unit", () => {
  it("round-trips through the Quantity JSON shape", () => {
    const q = Quantity.of(1_012, "m²");
    expect(q.unit).toBe("m²");
    expect(Quantity.fromJSON(q.toJSON()).value).toBe(1_012);
  });

  it("supports arithmetic (lots add; the ops map has an entry)", () => {
    const total = Quantity.of(600, "m²").add(Quantity.of(400, "m²"));
    expect(total.value).toBe(1_000);
  });

  it("bands for display rather than showing a raw figure", () => {
    // The lux-band mechanism: a player hears a size, not a number.
    expect(Quantity.of(1_012, "m²").tag("lot")).toBe("a quarter-acre lot");
    expect(Quantity.of(60, "m²").tag("lot")).toBe("a patch");
    expect(Quantity.of(50_000, "m²").tag("lot")).toBe("a smallholding");
  });
});

describe("the vocabulary as a type", () => {
  it("every LAND_USES member satisfies LandUse", () => {
    const uses: LandUse[] = [...LAND_USES];
    expect(uses).toHaveLength(6);
  });
});
