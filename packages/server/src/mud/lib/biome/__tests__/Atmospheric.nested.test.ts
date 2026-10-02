/**
 * ⭐⭐ F1 — the nested-envelope outside seam (cold-storage W1).
 *
 * The Thing≡Location mixin promise holds at the body (a loaf reads its
 * enclosure by the same code whether it is in a fridge or a walk-in), but
 * broke one step up: a scope that stood INSIDE another scope's air drifted
 * toward the BIOME default, not toward the room it stood in — the exact
 * decree the room-envelope build removed, reintroduced one level down.
 *
 * `BiomeLogic.outsideKFor` now asks whether an enclosing Atmospheric
 * applies before the chain walk and takes its last-integrated air as the
 * outside. These tests pin:
 *   - an Atmospheric THING inside a room resolves its outside to the ROOM's
 *     air, not the biome default;
 *   - a ROOM (no enclosing scope) still resolves its outside to the biome
 *     / weather, unchanged.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Good from "../../stuff/Good";
import Biome from "../Biome";
import Material from "../../material/Material";
import CartesianLocation from "../../location/CartesianLocation";
import CartesianZone from "../../../platform/idea/location/CartesianZone";
import { AtmosphericMixin } from "../Atmospheric";
import { ContainerMixin } from "../../spatial/Container";
import { Quantity } from "../../quantity";
import { BiomeApi } from "../../../api/biome";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

const BIOME_K = 283;
const INDOOR = "/stuff/idea/biome/_nested/indoor";

/**
 * An Atmospheric THING — a box with its own air (the fridge / coach
 * shape). Container(Good) gives it Containable + contents; it authors a
 * volume and an enclosure so `envelopeApplies()` is true, and it is not
 * sky-exposed (it sits indoors).
 */
class Box extends AtmosphericMixin(ContainerMixin(Good)) {
  static _mixinName = "NestedBox";
  getVolume(): Quantity<"m³"> {
    return Quantity.of(0.2, "m³");
  }
  // A vessel's roof is its declaration — apply the envelope whenever a
  // volume is authored and no temperature is pinned, and never consult the
  // sky walk (the coach override, verbatim in spirit).
  envelopeApplies(): boolean {
    return this.getVolume() !== null;
  }
  openExteriorOpenings(): number {
    return 0;
  }
}

function room(envelopeK: number): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
    material: "/stuff/idea/material/_nested/oak",
    thicknessM: 0.02,
  });
  (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = envelopeK;
  (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = envelopeK;
  return r;
}

describe("F1 — the nested-envelope outside", () => {
  afterEach(() => StuffApi.clearAll());
  beforeEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName("nested-oak");
      m.setThermalConductivity(Quantity.of(0.16, "W/(m·K)"));
      m.setDensity(Quantity.of(700, "kg/m³"));
      m.setSpecificHeat(Quantity.of(1600, "J/(kg·K)"));
      return m;
    }, "/stuff/idea/material/_nested/oak");
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultTemperature(Quantity.of(BIOME_K, "K"));
      b.setDefaultPressure(Quantity.of(101325, "Pa"));
      b.setDefaultHumidity(Quantity.of(50, "%"));
      b.setDefaultGravity(Quantity.of(9.81, "m/s²"));
      b.setDefaultWind(Quantity.of(0, "m/s"));
      b.setDefaultAtmosphere("air");
      return b;
    }, INDOOR);
  });

  it("an Atmospheric Thing inside a room reads the ROOM's air as its outside", async () => {
    const shop = room(275); // a cold store — well below the 283 biome
    const box = makeStuff(() => new Box());
    (box as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
      material: "/stuff/idea/material/_nested/oak",
      thicknessM: 0.02,
    });
    ContainmentApi.move(box, shop);

    const outside = (await BiomeApi.outsideTemperatureFor(box)).rawValue();
    // The seam: the box drifts toward the SHOP (275), not the biome (283).
    expect(outside).toBeCloseTo(275, 0);
    expect(Math.abs(outside - BIOME_K)).toBeGreaterThan(5);
  });

  it("a room with no enclosing scope still reads the biome, unchanged", async () => {
    const field = room(BIOME_K);
    // A Location is not Containable → no enclosing Atmospheric → the chain
    // walk answers, as it always did.
    const outside = (await BiomeApi.outsideTemperatureFor(field)).rawValue();
    expect(outside).toBeCloseTo(BIOME_K, 0);
  });
});
