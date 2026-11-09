/**
 * ⭐ A caustic burns on the way down — and is never a meal (material
 * decomposition, requirements drive step 7). Lye is a `Lye`: it composes
 * Acidity (a corrosion list) and no Edibility, so swallowing it reaches the
 * corrosion seam and feeds nothing.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from "vitest";
import { Creature } from "../../creature/Creature";
import Lye from "../../../platform/idea/material/Lye";
import Food from "../../../platform/idea/material/Food";
import { Quantity } from "../../quantity";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

function lye(): Lye {
  return makeStuff(() => {
    const m = new Lye();
    m.setName("lye");
    m.setCorrosiveTo(["protein", "tissue"]);
    return m;
  }) as unknown as Lye;
}

describe("swallowing lye", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("is not food: its kind composes no Edibility, so it feeds no pool", () => {
    const c = makeStuff(() => new Creature());
    const l = lye();
    expect(MixinApi.hasEdibility(l)).toBe(false);
    c.ingest(l, Quantity.of(0.1, "L"), "liquid");
    expect(Object.values(c.digestionPools).every((v) => !(v > 0))).toBe(true);
  });

  it("⭐ burns on the way down: the corrosion seam names it and fires", () => {
    const c = makeStuff(() => new Creature());
    const l = lye();
    expect(c.corrosivesIn(l, null)).toEqual([l]);
    const burn = vi.spyOn(l, "corrodeOnContact");
    c.ingest(l, Quantity.of(0.1, "L"), "liquid");
    expect(burn).toHaveBeenCalledTimes(1);
  });

  it("food that eats nothing is not a caustic", () => {
    const c = makeStuff(() => new Creature());
    const bread = makeStuff(() => new Food());
    expect(c.corrosivesIn(bread, null)).toEqual([]);
  });
});
