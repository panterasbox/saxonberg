/**
 * Step 1.7 — the thermos (Flask) acceptance battery. A Flask is
 * Sealable + Bulkable + Thermal: its heat capacity is its contents
 * (more coffee → slower cooling), sealing switches the barrier to
 * vacuum (τ in hours), opening collapses it (τ in minutes). The bulk
 * couplings ride the `BulkableApi.transfer` primitive's thermal tier:
 * refill adopts the incoming temperature (a vessel with no body to speak
 * of), a partial pour cools the remainder faster, and mixing blends by
 * heat capacity — the vessel's own body counted (`mixPour`).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Flask from "../thing/Flask";
import Receptacle from "../thing/Receptacle";
import Material from "../../lib/material/Material";
import { Quantity } from "../../lib/quantity";
import { WorldClockApi } from "../../api/worldclock";
import "../idea/WorldClockRegistry";
import { BulkableApi } from "../../api/bulk";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

// Globally-unique path so the coffee singleton doesn't collide across
// tests (the harness never clears StuffApi, to keep the world clock
// alive — see the ThermalMixin test for the same constraint).
let coffee: Material;
let coffeeCounter = 0;
function makeCoffee(): Material {
  coffeeCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("coffee");
    m.setKeywords(["coffee"]);
    m.setDensity(Quantity.of(1000, "kg/m³"));
    m.setSpecificHeat(Quantity.of(4186, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.6, "W/(m·K)"));
    return m;
  }, `/stuff/idea/material/_flask/coffee-${coffeeCounter}`) as unknown as Material;
}

function flask(litres: number, tempK: number, sealed = true): Flask {
  return makeStuff(() => {
    const f = new Flask();
    f.interiorBulk = true;
    f.setBulkMaterial("interior", coffee);
    f.setBulkAmount("interior", Quantity.of(litres, "L"));
    f.setOpen(!sealed);
    f.setLastAmbientK(295);
    f.setContentsTemperature(tempK);
    return f;
  });
}

function mug(litres: number, tempK: number): Receptacle {
  return makeStuff(() => {
    const m = new Receptacle();
    m.interiorBulk = true;
    if (litres > 0) {
      m.setBulkMaterial("interior", coffee);
      m.setBulkAmount("interior", Quantity.of(litres, "L"));
    }
    m.setLastAmbientK(295);
    m.setContentsTemperature(tempK);
    return m;
  });
}

const tempOf = (v: { getContentsTemperature(): Quantity<"K"> }): number =>
  v.getContentsTemperature().rawValue();

describe("Flask — thermos acceptance battery", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    coffee = makeCoffee();
  });
  afterEach(() => {
    // Reset the clock but keep the registry instance alive — a clearAll
    // here would idle the next test's reconcile (no world clock found).
    WorldClockApi._resetForTesting();
  });

  it("a sealed thermos holds coffee hot for hours", () => {
    const t = flask(0.4, 360, true);
    tick(3 * 3600); // 3 game-hours, under the far-past guard
    expect(tempOf(t)).toBeGreaterThan(345); // still scalding-hot
  });

  it("an unsealed thermos cools in minutes", () => {
    const t = flask(0.4, 360, false);
    tick(900); // 15 game-min
    const after = tempOf(t);
    expect(after).toBeLessThan(335); // visibly cooled
    expect(after).toBeGreaterThan(295);
  });

  it("opening then closing resumes drift at the now-cooler temperature", () => {
    const t = flask(0.4, 360, true);
    t.open();
    tick(900); // cools fast while open
    const opened = tempOf(t);
    expect(opened).toBeLessThan(345);
    t.close(); // re-seals at the cooler temperature — no heat recovered
    tick(3600);
    const resealed = tempOf(t);
    // Cooling all but stops once sealed; stays near the open-cooled temp.
    expect(resealed).toBeLessThan(opened);
    expect(resealed).toBeGreaterThan(opened - 10);
  });

  it("refilling an empty mug adopts the incoming temperature", () => {
    const t = flask(0.4, 360, true);
    const m = mug(0, 295); // empty, cold
    BulkableApi.transfer(t.getBulk("interior"), m.getBulk("interior"), {
      kind: "measure",
      litres: 0.2,
      mode: "lenient",
    });
    expect(tempOf(m)).toBeCloseTo(360, 0); // took the thermos's heat
  });

  it("a partial pour cools the remainder faster (reduced capacity)", () => {
    const full = flask(0.4, 360, false);
    const half = flask(0.4, 360, false);
    // Pour half of `half` away into a mug so its capacity drops.
    const sink = mug(0, 295);
    BulkableApi.transfer(half.getBulk("interior"), sink.getBulk("interior"), {
      kind: "measure",
      litres: 0.3,
      mode: "lenient",
    });
    tick(600);
    // Same elapsed time: the emptier thermos (smaller C) cooled more.
    expect(tempOf(half)).toBeLessThan(tempOf(full));
  });

  it("same-material mixing blends mass-weighted", () => {
    const hot = flask(0.1, 360, false); // little hot coffee
    const cold = flask(0.3, 300, false); // more cold coffee
    BulkableApi.transfer(cold.getBulk("interior"), hot.getBulk("interior"), {
      kind: "measure",
      litres: 0.3,
      mode: "lenient",
    });
    // 0.1 L @ 360 + 0.3 L @ 300 → (0.1*360 + 0.3*300)/0.4 = 315 K.
    expect(tempOf(hot)).toBeCloseTo(315, 0);
  });

  // ⭐⭐ The calorimetric pour counts the vessel's own body (matter-model-
  // overlaps drive, step 2): a drip used to set an empty pot to the drip's
  // temperature outright, and a glazed pot cracked on every drip.
  function clay(): Material {
    coffeeCounter += 1;
    return makeStuffAtPath(() => {
      const m = new Material();
      m.setName("fired clay");
      m.setDensity(Quantity.of(2000, "kg/m³"));
      m.setSpecificHeat(Quantity.of(880, "J/(kg·K)"));
      return m;
    }, `/stuff/idea/material/_flask/clay-${coffeeCounter}`) as unknown as Material;
  }

  function pot(kg: number, tempK: number, litres = 0): Receptacle {
    const body = clay();
    const p = mug(litres, tempK);
    p.setMaterial(body);
    p.setMass(Quantity.of(kg, "kg"));
    return p;
  }

  it("⭐ a drip into an empty heavy pot barely moves it: the pot's own clay counts", () => {
    const hot = flask(0.4, 330, false);
    const p = pot(4, 295); // 4 kg of clay: 3520 J/K
    BulkableApi.transfer(hot.getBulk("interior"), p.getBulk("interior"), {
      kind: "measure",
      litres: 0.005, // 5 g of coffee: ~21 J/K
      mode: "lenient",
    });
    // (21·330 + 3520·295) / 3541 ≈ 295.2 K — a drip, not a 35 K step.
    expect(tempOf(p)).toBeGreaterThan(295);
    expect(tempOf(p)).toBeLessThan(296);
  });

  it("⭐ a full pour into a cold pot settles at the energy-weighted temperature", () => {
    const hot = flask(1, 360, false);
    const p = pot(4, 295);
    BulkableApi.transfer(hot.getBulk("interior"), p.getBulk("interior"), {
      kind: "measure",
      litres: 1, // 4186 J/K
      mode: "lenient",
    });
    // (4186·360 + 3520·295) / 7706 ≈ 330.3 K: the cold pot chilled the pour.
    expect(tempOf(p)).toBeCloseTo((4186 * 360 + 3520 * 295) / (4186 + 3520), 0);
  });

  it("⭐ a pour into a pot already holding some mixes with the contents AND the clay", () => {
    const hot = flask(0.5, 360, false);
    const p = pot(2, 300, 0.5); // 0.5 L @ 300 (2093 J/K) + 2 kg clay (1760 J/K)
    BulkableApi.transfer(hot.getBulk("interior"), p.getBulk("interior"), {
      kind: "measure",
      litres: 0.5, // 2093 J/K @ 360
      mode: "lenient",
    });
    const expected = (2093 * 360 + (2093 + 1760) * 300) / (2093 + 2093 + 1760);
    expect(tempOf(p)).toBeCloseTo(expected, 0);
  });

  it("⭐⭐ a pot holding a drip is still a pot: its heat capacity counts its own clay (found by the drive)", () => {
    // A curing pot holding the first drip of molasses had the heat capacity
    // of the drip — a τ of a fraction of a second — and its first reconcile
    // read as thousands of kelvin a second: a crack in a pot that had not
    // moved a degree.
    const p = pot(4, 295, 0.005); // 5 mL of coffee (~21 J/K) in 4 kg of clay (3520 J/K)
    expect(p.thermalCapacityJPerK()).toBeCloseTo(0.005 * 4186 + 4 * 880, 0);
    const empty = pot(4, 295);
    expect(empty.thermalCapacityJPerK()).toBeCloseTo(4 * 880, 0);
  });
});
