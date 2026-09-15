/**
 * The furnace couple (grain-chain W0, plan D1) — **a furnace heats what it
 * HOLDS and what RESTS on it**.
 *
 * Before this build a lit oven was hot and its contents were not: nothing in
 * the ambient chain read a furnace (`BiomeLogic.resolveTemperatureFor` walks
 * `Atmospheric` ancestors, and a `Furnace` deliberately is not one — a lit
 * forge must not warm the room it stands in). The couple is therefore read on
 * the body being heated, in `ThermalMixin.restamp()`: a heat source that holds
 * you outranks the biome.
 *
 * ⭐ The firebox stays PINNED (`FurnaceMixin.getTemperature`) — what climbs is
 * what is inside it, over its own `tau = R*C`. That is the whole distinction
 * the drive's step 21 observes.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Thing from "../../stuff/Thing";
import Location from "../../stuff/Location";
import Material from "../../material/Material";
import { ThermalMixin } from "../Thermal";
import { ReservedMixin, Reserve } from "../../reserve";
import { LightSourceMixin } from "../../perception/LightSource";
import { ContainerMixin } from "../../spatial/Container";
import { SurfacedMixin } from "../../spatial/Surfaced";
import { FurnaceMixin } from "../../fire/Furnace";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { ContainmentApi } from "../../../api/containment";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

/** The `Oven` composition: Furnace over Thermal over Surfaced + Container. */
class TestOven extends FurnaceMixin(
  LightSourceMixin(
    ReservedMixin(ThermalMixin(SurfacedMixin(ContainerMixin(Thing)))),
  ),
) {
  static _mixinName = "TestOvenCouple";
}

/** The `Campfire` composition, trimmed to what the couple needs. */
class TestCampfire extends FurnaceMixin(
  LightSourceMixin(ReservedMixin(SurfacedMixin(ThermalMixin(Thing)))),
) {
  static _mixinName = "TestCampfireCouple";
}

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = "ThermalThingCouple";
}
class TestRoom extends Location {}

const SCALE = 12;
let real = 0;
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

/** Drain the fan-out's fire-and-forget `restamp()` promises. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let matCounter = 0;
function heatCapableMaterial(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`couple-mat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(4186, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.6, "W/(m·K)"));
    return m;
  }, `/stuff/idea/material/_couple/m-${matCounter}`) as unknown as Material;
}

function loaf(stampedK = 293): ThermalThing {
  const mat = heatCapableMaterial();
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(0.3, "kg"));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(stampedK);
    return t;
  });
}

function fuelled<T extends TestOven | TestCampfire>(f: T, heldK: number): T {
  f.setReserve(
    new Reserve(
      "fuel",
      Quantity.of(100, "%"),
      Quantity.of(100, "%"),
      "combustion",
      null,
    ),
  );
  f.setBurnTemperatureK(heldK);
  f.setStampedTemperatureK(293);
  f.setLastAmbientK(293);
  return f;
}

function oven(heldK = 500): TestOven {
  return fuelled(makeStuff(() => new TestOven()), heldK);
}
function campfire(heldK = 800): TestCampfire {
  return fuelled(makeStuff(() => new TestCampfire()), heldK);
}

function room(temperatureK: number): TestRoom {
  return makeStuff(() => {
    const r = new TestRoom();
    r.setTemperature(Quantity.of(temperatureK, "K"));
    return r;
  });
}

describe("the furnace couple — a furnace heats what it holds", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("a body in a LIT oven takes the oven's held temperature as its ambient", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.ignite();

    const t = loaf(293);
    await ContainmentApi.move(t, o);
    await t.restamp();

    expect(t.lastAmbientK).toBeCloseTo(500, 0);
  });

  it("a body in an UNLIT oven reads the room, not the firebox", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.douse(); // ⚠ `lit` defaults TRUE — a Campfire seed starts lit

    const t = loaf(293);
    await ContainmentApi.move(t, o);
    await t.restamp();

    expect(t.lastAmbientK).toBeCloseTo(293, 0);
  });

  it("the body CLIMBS toward the held temperature over its own tau — the firebox does not", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.ignite();

    const t = loaf(293);
    await ContainmentApi.move(t, o);
    await t.restamp();

    // The firebox is pinned the instant it is lit — there is no warm-up
    // for the oven itself, and this build does not add one.
    expect(o.getTemperature().rawValue()).toBeCloseTo(500, 0);

    const tau = t.getTau().rawValue();
    expect(tau).toBeGreaterThan(0);

    // One time constant closes 63.2% of the gap (1 - e^-1).
    tick(tau);
    const after = t.getTemperature().rawValue();
    const closed = (after - 293) / (500 - 293);
    expect(closed).toBeCloseTo(1 - Math.exp(-1), 2);
    expect(after).toBeLessThan(500); // it is warming, not pinned
  });

  it("dousing the oven re-anchors its contents toward the room", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.ignite();

    const t = loaf(293);
    await ContainmentApi.move(t, o);
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(500, 0);

    tick(600);
    const hot = t.getTemperature().rawValue();
    expect(hot).toBeGreaterThan(293);

    // `douse` -> `_setLit(false)` fans out restamp() over the heat scope.
    o.douse();
    await flush();
    expect(t.lastAmbientK).toBeCloseTo(293, 0);

    tick(600);
    expect(t.getTemperature().rawValue()).toBeLessThan(hot);
  });

  it("lighting the oven re-stamps what it already holds (the eighth trigger)", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.douse();

    const t = loaf(293);
    await ContainmentApi.move(t, o);
    await t.restamp();
    expect(t.lastAmbientK).toBeCloseTo(293, 0);

    // No move, no biome change — only the furnace's state changed.
    o.ignite();
    await flush();
    expect(t.lastAmbientK).toBeCloseTo(500, 0);
  });

  it("a pot RESTING on a lit campfire takes the fire's heat", async () => {
    const r = room(293);
    const f = campfire(800);
    await ContainmentApi.move(f, r);
    f.ignite();

    const pot = loaf(293);
    await ContainmentApi.placeOn(pot, f);
    await pot.restamp();

    expect(pot.getRestingOn()).toBe(f);
    expect(pot.lastAmbientK).toBeCloseTo(800, 0);
  });

  it("a pot on an oven's HOT PLATE takes its heat — the range's prose is honest", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.ignite();

    const pot = loaf(293);
    await ContainmentApi.placeOn(pot, o);
    await pot.restamp();

    expect(pot.getRestingOn()).toBe(o);
    expect(pot.lastAmbientK).toBeCloseTo(500, 0);
  });

  it("a body in the ROOM beside a lit oven is untouched — a forge must not warm the room", async () => {
    const r = room(293);
    const o = oven(500);
    await ContainmentApi.move(o, r);
    o.ignite();

    const bystander = loaf(293);
    await ContainmentApi.move(bystander, r);
    await bystander.restamp();

    expect(bystander.lastAmbientK).toBeCloseTo(293, 0);
  });
});
