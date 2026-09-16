/**
 * Sack + the temperature on GradedReceptacle (grain-chain W2, plan D6).
 *
 * ⚠ The blast radius of the second is every `Bottle` in the game. That is
 * the point: a bottled ale's freshness gauge has been reading a default
 * holder temperature, so a bottle in a cellar and a bottle over a fire
 * kept identically. If a suite pinned a bottle's temperature to a
 * default, the pin was the defect.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Sack from "../Sack";
import Bottle from "../Bottle";
import GradedReceptacle from "../GradedReceptacle";
import Material from "../../../lib/material/Material";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { Quantity } from "../../../lib/quantity";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const FLOUR = "/stuff/idea/material/food/sack-flour";

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName("flour");
    m.setDensity(Quantity.of(570, "kg/m³"));
    m.setEdibility(true);
    return m;
  }, FLOUR);
});

describe("Sack — four things and where each comes from", () => {
  it("holds bulk, carries a grade and a mark, has a kind and a temperature", () => {
    const s = makeStuff(() => new Sack());
    expect(MixinApi.isBulkable(s)).toBe(true);
    expect(MixinApi.isCrafted(s)).toBe(true); // grade + maker's mark
    expect(MixinApi.isGraded(s)).toBe(true);
    expect(MixinApi.isThermal(s)).toBe(true);
    expect(s.getCategory()).toBe("sack");
  });

  it("⭐ the GRADE rides the holder, never the payload", () => {
    // The miller's mark and the flour's band are facts about THIS sack —
    // the same convention a bottle of graded gin follows. Bulk matter has
    // no identity to be graded; a quantity of it in a marked sack does.
    const s = makeStuff(() => new Sack());
    s.setGradeBand("fine");
    s.setMaker("/platform/agent/Avatar/miller");
    expect(s.getGradeBand()).toBe("fine");
    expect(s.getMaker()).toBe("/platform/agent/Avatar/miller");
  });

  it("is its own interior, at the authored default capacity", () => {
    const s = makeStuff(() => new Sack());
    expect(s.hasInteriorBulk()).toBe(true);
    expect(s.getInteriorCapacity()!.rawValue()).toBe(25);
  });

  it("an empty sack says it is a sack rather than reciting itself", () => {
    // The `VesselKindMixin` seam — the defect the shipped malt sack still
    // has, and the reason a Sack is not a plain Receptacle.
    const s = makeStuff(() => new Sack());
    expect(s.getCategory()).toBe("sack");
  });
});

describe("⭐ a graded receptacle now has a temperature (D6)", () => {
  it("GradedReceptacle composes Thermal", () => {
    const g = makeStuff(() => new GradedReceptacle());
    expect(MixinApi.isThermal(g)).toBe(true);
  });

  it("⭐⭐ so does every Bottle — a bottle in a cellar is cold", () => {
    // Before this, a bottled ale's spoilage gauge read a default holder
    // temperature: the cellar and the hearth kept identically, which is
    // the whole premise of a cellar being wrong.
    const b = makeStuff(() => new Bottle());
    expect(MixinApi.isThermal(b)).toBe(true);
    expect(b.getTemperature().rawValue()).toBeGreaterThan(0);
  });

  it("a corked bottle picks up the vacuum barrier — the Flask rule", () => {
    const b = makeStuff(() => new Bottle());
    expect(MixinApi.isSealable(b)).toBe(true);
    // ⚠ Fill it first: a Bulkable host derives its heat capacity from its
    // CONTENTS, so an empty bottle has tau 0 and nothing to compare.
    b.setInteriorCapacity(Quantity.of(0.75, "L"));
    b.setBulkMaterial(
      "interior",
      StuffApi.findByTemplatePath<Material>(FLOUR)! as unknown as Material,
    );
    b.setBulkAmount("interior", Quantity.of(0.5, "L"));

    b.setOpen(true);
    const openTau = b.getTau().rawValue();
    b.setOpen(false);
    const sealedTau = b.getTau().rawValue();
    expect(openTau).toBeGreaterThan(0);
    // Sealed means a far longer time constant: hours, not minutes.
    expect(sealedTau).toBeGreaterThan(openTau);
  });

  it("⚠ VesselKind is NOT double-composed — Bottle already wraps it", () => {
    const b = makeStuff(() => new Bottle());
    const g = makeStuff(() => new GradedReceptacle());
    expect(MixinApi.hasMixin(b, "VesselKindMixin")).toBe(true);
    expect(MixinApi.hasMixin(g, "VesselKindMixin")).toBe(false);
  });
});
