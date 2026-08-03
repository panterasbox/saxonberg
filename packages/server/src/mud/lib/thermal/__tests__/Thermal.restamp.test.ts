/**
 * Step 1.6 — the re-stamp triggers. Under the cached-ambient model a
 * Thermal object only learns its surroundings changed at a discrete
 * re-stamp event, so these are load-bearing, not optimizations:
 *   1. Containment move (the `onMoved` witness) — moving a hot object
 *      into a cold room re-resolves ambient and cools it faster.
 *   2. In-place ambient drop (`AtmosphericMixin.setTemperature` fan-out)
 *      — re-stamps the room's Thermal contents toward the new ambient.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Thing from "../../stuff/Thing";
import Location from "../../stuff/Location";
import Material from "../../material/Material";
import { ThermalMixin } from "../Thermal";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { ContainmentApi } from "../../../api/containment";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = "ThermalThingRestamp";
}
class TestRoom extends Location {}

const SCALE = 12;
let real = 0;
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

let matCounter = 0;
function thing(stampedK: number): ThermalThing {
  matCounter += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`rmat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(4186, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.6, "W/(m·K)"));
    return m;
  }, `/obj/material/_restamp/m-${matCounter}`) as unknown as Material;
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(0.3, "kg"));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(stampedK); // start in equilibrium with itself
    return t;
  });
}

function room(temperatureK: number): TestRoom {
  return makeStuff(() => {
    const r = new TestRoom();
    r.setTemperature(Quantity.of(temperatureK, "K"));
    return r;
  });
}

describe("ThermalMixin — re-stamp triggers", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("a move into a cold room re-stamps the cached ambient", async () => {
    const warm = room(320);
    const cold = room(280);
    const t = thing(350);

    await ContainmentApi.move(t, warm);
    await t.restamp(); // placement seeds the cache
    expect(t.lastAmbientK).toBeCloseTo(320, 0);

    await ContainmentApi.move(t, cold);
    // onMoved fired restamp() (fire-and-forget); await a tick for it.
    await Promise.resolve();
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(280, 0);
  });

  it("a moved hot object then drifts toward the new (cold) ambient", async () => {
    const cold = room(280);
    const t = thing(350);
    await ContainmentApi.move(t, cold);
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(280, 0);

    const before = t.getTemperature().rawValue();
    tick(600);
    const after = t.getTemperature().rawValue();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(280);
  });

  it("an in-place ambient drop re-stamps the room's contents", async () => {
    const r = room(320);
    const t = thing(350);
    await ContainmentApi.move(t, r);
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(320, 0);

    // The setter fans out restamp() over Thermal contents (fire-and-forget).
    r.setTemperature(Quantity.of(275, "K"));
    await Promise.resolve();
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(275, 0);
  });
});
