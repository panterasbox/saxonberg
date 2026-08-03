/**
 * Step 1.9 — the surface-vs-contents sensory gate. `getSurfaceTemperature`
 * blends core↔ambient by the medium exposure, so a sealed, well-
 * insulated vessel's exterior reads ~ambient even though its contents
 * scald (insulation observable as the absence of exterior heat). Opening
 * it collapses the barrier and the surface reveals the heat. This is the
 * fact of touch behind "measuring requires unsealing" — and the band the
 * `feel` burn hook gates on.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Thing from "../../stuff/Thing";
import Material from "../../material/Material";
import { ThermalMixin } from "../Thermal";
import { SealableMixin } from "../../spatial/Sealable";
import { Touch } from "../../perception/Touch";
import { Quantity } from "../../quantity";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class SealedThermalThing extends ThermalMixin(SealableMixin(Thing)) {
  static _mixinName = "SealedThermalThing";
}
class BareThermalThing extends ThermalMixin(Thing) {
  static _mixinName = "BareThermalThing";
}

let matCounter = 0;
function glassMaterial(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`glass-${matCounter}`);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1.0, "W/(m·K)"));
    return m;
  }, `/obj/material/_senses/glass-${matCounter}`) as unknown as Material;
}

describe("ThermalMixin — surface-vs-contents (the sensory gate)", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    StuffApi.clearAll();
    matCounter = 0;
  });

  it("a sealed vessel's surface reads ~ambient though its contents scald", () => {
    const flask = makeStuff(() => {
      const f = new SealedThermalThing();
      f.setMass(Quantity.of(0.5, "kg"));
      f.setMaterial(glassMaterial());
      f.setStampedTemperatureK(360); // scalding contents
      f.setLastAmbientK(295); // room
      return f;
    });
    // Sealable defaults closed → vacuum barrier → surface ≈ ambient.
    expect(flask.isOpen()).toBe(false);
    const surface = flask.getSurfaceTemperature().rawValue();
    expect(surface).toBeLessThan(300); // not scalding to the touch
    expect(Touch.bandFor(surface)).not.toBe("scalding");
    // The contents themselves are still scalding.
    expect(Touch.bandFor(flask.getContentsTemperature().rawValue())).toBe(
      "scalding",
    );
  });

  it("opening the vessel reveals the heat at the surface", () => {
    const flask = makeStuff(() => {
      const f = new SealedThermalThing();
      f.setMass(Quantity.of(0.5, "kg"));
      f.setMaterial(glassMaterial());
      f.setStampedTemperatureK(360);
      f.setLastAmbientK(295);
      return f;
    });
    flask.setOpen(true); // barrier collapses to the air term
    const surface = flask.getSurfaceTemperature().rawValue();
    expect(surface).toBeGreaterThan(330); // now reads hot/scalding
  });

  it("a bare hot object's surface reads close to its own core", () => {
    const mug = makeStuff(() => {
      const m = new BareThermalThing();
      m.setMass(Quantity.of(0.3, "kg"));
      m.setMaterial(glassMaterial());
      m.setStampedTemperatureK(330); // hot mug
      m.setLastAmbientK(295);
      return m;
    });
    const surface = mug.getSurfaceTemperature().rawValue();
    expect(surface).toBeGreaterThan(315); // bare → exterior ~ core
    expect(["warm", "hot"]).toContain(Touch.bandFor(surface));
  });
});
