/**
 * Melt — the pot of molten glass: fluid while hot, a solid pot of glass
 * when it cools, and `takeGather` draws mass off it while conserving the
 * total and handing the gather the melt's own composition.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import Melt from "../thing/Melt";

const IRON = "/stuff/idea/material/element/iron";
let seq = 0;
function glassMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("glass");
    m.setTags(["glass"]);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1.0, "W/(m·K)"));
    m.setMeltingPoint(Quantity.of(1300, "K"));
    return m;
  }, `/stuff/idea/material/_test/glass-${seq}`) as unknown as Material;
}

function melt(tempK: number, kg = 2): Melt {
  const m = makeStuff(() => new Melt());
  m.setMaterial(glassMaterial());
  m.setMass(Quantity.of(kg, "kg"));
  m.setStampedTemperatureK(tempK);
  m.setLastAmbientK(tempK); // equal ambient → holds its temperature
  m.setAlloying([{ materialPath: IRON, fraction: 0.004 }]);
  return m;
}

describe("Melt", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("is fluid at the melt heat (1450 K), not when it has cooled (1100 K)", () => {
    expect(melt(1450).isFluid()).toBe(true);
    // 1100 < 0.9 × 1300 = 1170 — a stiff pot that refuses the pipe.
    expect(melt(1100).isFluid()).toBe(false);
  });

  it("takeGather debits mass and hands over the melt's composition", () => {
    const m = melt(1450, 2);
    const alloying = m.takeGather(0.4);
    expect(m.getMass().rawValue()).toBeCloseTo(1.6, 6);
    expect(alloying.find((e) => e.materialPath === IRON)?.fraction).toBeCloseTo(
      0.004,
      6,
    );
    expect(m.isDestroyed()).toBe(false);
  });

  it("a spent pot destructs itself when under half a gather remains", () => {
    const m = melt(1450, 0.5);
    m.takeGather(0.4); // 0.1 left, under 0.2 (half a 0.4 gather)
    expect(m.isDestroyed()).toBe(true);
  });
});
