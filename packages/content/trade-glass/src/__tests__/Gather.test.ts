/**
 * Gather — the blob on the pipe that cools, and whose cooling IS the
 * hot-work window. These pin the two facts the window rides on: the gather
 * is workable only while it is hot enough (≥ 0.75 × melting point), and its
 * τ is lengthened by the `gatherRFactor` dial so the window lasts seconds
 * rather than an instant.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Good from "@saxonberg/server/mud/lib/stuff/Good";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import Gather from "../thing/Gather";

/** A plain thermal glob with NO effectiveR override — the comparison. */
class PlainGlob extends AlloyedMixin(ThermalMixin(Good)) {}

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
  }, `/stuff/idea/material/_test/gglass-${seq}`) as unknown as Material;
}

function gather(tempK: number): Gather {
  const g = makeStuff(() => new Gather());
  g.setMaterial(glassMaterial());
  g.setMass(Quantity.of(0.4, "kg"));
  g.setStampedTemperatureK(tempK);
  g.setLastAmbientK(tempK);
  return g;
}

describe("Gather — the hot-work window", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("is workable above the floor (0.75 × 1300 = 975 K), not below", () => {
    expect(gather(1450).isWorkable()).toBe(true);
    expect(gather(1000).isWorkable()).toBe(true);
    expect(gather(900).isWorkable()).toBe(false); // the window has closed
  });

  it("reports the working floor from the material's melting point", () => {
    expect(gather(1450).workingFloorK()).toBeCloseTo(975, 0);
  });

  it("its τ is lengthened by the gatherRFactor (≈ 10×) vs a plain glob", () => {
    const g = gather(1450);
    const plain = makeStuff(() => new PlainGlob());
    plain.setMaterial(glassMaterial());
    plain.setMass(Quantity.of(0.4, "kg"));
    plain.setStampedTemperatureK(1450);
    plain.setLastAmbientK(1450);
    const ratio = g.getTau().rawValue() / plain.getTau().rawValue();
    expect(ratio).toBeCloseTo(10, 0);
  });
});
