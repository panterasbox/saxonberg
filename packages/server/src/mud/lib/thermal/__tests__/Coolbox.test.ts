/**
 * CoolboxMixin and the two `Thermal` seams — ⭐ **a holder whose
 * interior is as cold as the coldest thing in it.**
 *
 * The cold twin of the furnace couple, and it is built on the same
 * rule: *what HOLDS this body outranks the biome chain.* A shut icebox
 * holds its contents exactly as a lit oven does, and the chain cannot
 * answer for either — a `Coolbox` is not `Atmospheric`, deliberately,
 * because a cold box must not cool the kitchen.
 *
 * ⚠⚠ Three things here are the whole reason the seams were hard, and
 * each one is asserted rather than reasoned about:
 *
 * 1. The ice must **not** read itself as its own ambient. It is the
 *    thing making the interior cold; hand it its own temperature and it
 *    is in equilibrium with itself, never melts, and the box keeps its
 *    cold forever.
 * 2. It must warm against the ROOM **through the box's walls** — its
 *    `tau` inside a shut box is larger than outside by
 *    `insulationR × C`, which is what turns a leak into hours.
 * 3. Open the lid and neither seam applies.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Thing from "../../stuff/Thing";
import Location from "../../stuff/Location";
import Material from "../../material/Material";
import Icebox from "../../../platform/thing/Icebox";
import { ThermalMixin } from "../Thermal";
import { MeltableMixin } from "../Meltable";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

/** The `Casting` composition, trimmed to what the melt needs. */
class TestBlock extends MeltableMixin(ThermalMixin(Thing)) {
  static _mixinName = "TestIceBlock";
}
class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = "CoolboxThermalThing";
}
class TestRoom extends Location {}

const SCALE = 12;
let real = 0;

let matCounter = 0;
function iceMaterial(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`coolbox-ice-${matCounter}`);
    m.setSpecificHeat(Quantity.of(2100, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(2.2, "W/(m·K)"));
    m.setDensity(Quantity.of(917, "kg/m³"));
    m.setMeltingPoint(Quantity.of(273, "K"));
    m.setLatentHeatOfFusion(Quantity.of(334000, "J/kg"));
    return m;
  }, `/stuff/idea/material/_coolbox/ice-${matCounter}`) as unknown as Material;
}

function foodMaterial(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`coolbox-food-${matCounter}`);
    m.setSpecificHeat(Quantity.of(3500, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.5, "W/(m·K)"));
    return m;
  }, `/stuff/idea/material/_coolbox/food-${matCounter}`) as unknown as Material;
}

let boxCounter = 0;
function icebox(roomK: number): Icebox {
  boxCounter += 1;
  const box = makeStuffAtPath(
    () => new Icebox(),
    `/test/coolbox/icebox-${boxCounter}`,
  );
  box.setStampedTemperatureK(roomK);
  box.setLastAmbientK(roomK);
  box.setOpen(false);
  return box;
}

function block(k = 273): TestBlock {
  const mat = iceMaterial();
  return makeStuff(() => {
    const b = new TestBlock();
    b.setMass(Quantity.of(4, "kg"));
    b.setMaterial(mat);
    b.setStampedTemperatureK(k);
    b.setLastAmbientK(k);
    return b;
  });
}

function food(k = 293): ThermalThing {
  const mat = foodMaterial();
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(0.3, "kg"));
    t.setMaterial(mat);
    t.setStampedTemperatureK(k);
    t.setLastAmbientK(k);
    return t;
  });
}

/**
 * `C` (J/K) for a Thermal body. `thermalCapacity()` is host-internal —
 * the contract is `tau = R × C`, and `mass × specificHeat` is the same
 * number by definition, so the test computes it the way the row does.
 */
function capacityOf(body: TestBlock): number {
  return (
    body.getMass().rawValue() *
    body.getMaterial()!.getSpecificHeat().rawValue()
  );
}

function room(temperatureK: number): TestRoom {
  return makeStuff(() => {
    const r = new TestRoom();
    r.setTemperature(Quantity.of(temperatureK, "K"));
    return r;
  });
}

describe("CoolboxMixin — the interior follows the coldest thing in it", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("an EMPTY shut box reads the room — insulation is not cold", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    await box.restamp();
    expect(box.coldestMass()).toBeNull();
    expect(box.getContentsTemperature().rawValue()).toBeCloseTo(293, 0);
  });

  it("⭐ with a block of ice in it, the shut interior reads the ICE", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    await box.restamp();
    expect(box.coldestMass()).toBe(ice);
    expect(box.getContentsTemperature().rawValue()).toBeLessThanOrEqual(274);
  });

  it("⭐ food in the shut box takes the interior as its ambient, not the room", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    await box.restamp();

    const ham = food(293);
    await ContainmentApi.move(ham, box);
    await ham.restamp();
    expect(ham.lastAmbientK).toBeLessThanOrEqual(274);

    // …and taken out, it goes back to reading the room.
    await ContainmentApi.move(ham, r);
    await ham.restamp();
    expect(ham.lastAmbientK).toBeCloseTo(293, 0);
  });

  it("⚠ OPEN the lid and neither seam applies — the interior is the room", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    const ham = food(293);
    await ContainmentApi.move(ham, box);

    box.setOpen(true);
    await box.restamp();
    await ham.restamp();
    expect(ham.lastAmbientK).toBeCloseTo(293, 0);
  });

  it("⚠⚠ the ice must NOT read itself — it reads the ROOM, or it never melts", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    await ice.restamp();
    // If seam 1 handed the coldest mass the interior it is making, this
    // would be 273 and the block would sit in equilibrium forever.
    expect(ice.lastAmbientK).toBeCloseTo(293, 0);
  });

  it("⭐ the ice borrows the box's walls — its tau inside is larger by insulationR × C", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);

    const loose = block(273);
    await ContainmentApi.move(loose, r);
    await loose.restamp();
    const outsideTau = loose.getTau().rawValue();

    const inside = block(273);
    await ContainmentApi.move(inside, box);
    await inside.restamp();
    const insideTau = inside.getTau().rawValue();

    expect(insideTau).toBeGreaterThan(outsideTau);
    // `thermalCapacity` is host-internal; the observation seam is
    // `tau = R × C`, so C comes back out of a tau we already have.
    const capacity = capacityOf(inside);
    expect(insideTau - outsideTau).toBeCloseTo(
      box.getInsulationR() * capacity,
      -1,
    );
  });

  it("a NON-coldest body does not borrow the walls — only the thing making the cold does", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    const ham = food(293);
    await ContainmentApi.move(ham, box);
    await ham.restamp();

    const loose = food(293);
    await ContainmentApi.move(loose, r);
    await loose.restamp();
    // The ham is insulated only by its own material and medium, exactly
    // as the loose one is; what differs is the AMBIENT it drifts toward.
    expect(ham.getTau().rawValue()).toBeCloseTo(loose.getTau().rawValue(), 0);
  });

  it("⭐⭐ the melt budget — the block is gone on the sim's own arithmetic", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    await ice.restamp();

    // ⭐ The budget is COMPUTED from the sim, never asserted as a magic
    // number: the latent heat to spend, divided by the leak through the
    // block's own R plus the walls it borrows. The plateau clamps the
    // block at 273 K the whole way, so the leak is constant and the
    // elapsed time should land ON the budget rather than near it.
    const latentJ = 4 * 334000;
    const rTotal = ice.getTau().rawValue() / capacityOf(ice);
    const leakW = (293 - 273) / rTotal;
    const budgetS = latentJ / leakW;

    // Hours, not minutes — the thing the slate asked for.
    expect(budgetS).toBeGreaterThan(3600);

    // Step the clock the way the world does — the melt advances one
    // reconcile at a time, absorbing that step's overshoot into latent
    // heat and clamping back to the melting point.
    const stepS = budgetS / 200;
    let elapsedS = 0;
    const capS = budgetS * 3;
    while (elapsedS < capS && !ice.isDestroyed()) {
      real += (stepS / SCALE) * 1000;
      elapsedS += stepS;
      ice.reconcileThermal();
    }

    expect(ice.isDestroyed()).toBe(true);
    // Within a step or two of the computed budget.
    expect(elapsedS).toBeGreaterThan(budgetS * 0.9);
    expect(elapsedS).toBeLessThan(budgetS * 1.1);

    // …and with nothing cold left, the box reads the room again. The
    // cold was a thing somebody had to maintain.
    await box.restamp();
    expect(box.getContentsTemperature().rawValue()).toBeGreaterThan(285);
  });

  it("⭐ while the ice lasts, the food is held at the plateau", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(273);
    await ContainmentApi.move(ice, box);
    const ham = food(293);
    await ContainmentApi.move(ham, box);
    await ham.restamp();

    // An hour of game time with the lid shut.
    for (let i = 0; i < 60; i++) {
      real += (60 / SCALE) * 1000;
      ice.reconcileThermal();
      await ham.restamp();
    }
    expect(ice.isDestroyed()).toBe(false);
    // The ham has come down toward the plateau, not stayed at the room.
    expect(ham.getTemperature().rawValue()).toBeLessThan(285);
  });

  /**
   * ⭐⭐ **The two halves, joined** — the real `Icebox` class holding a
   * real `Casting` of ice, read by the real `coldStorage` satisfier.
   *
   * ⚠ Each half was already proven and the JOIN was not, which is
   * exactly where the live drive found it broken: `Coolbox.test` proved
   * the interior follows a cold body, `ArchetypeSatisfaction` proved a
   * cold holder satisfies — and a kitchen with ice shut in an icebox
   * still reported *wants cold*.
   */
  it("⭐⭐ an Icebox holding an authored-cold Casting reads COLD to the satisfier", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);

    // The row authors 268 K — a body's own starting temperature, which
    // nothing could state until this build.
    const ice = block(268);
    await ContainmentApi.move(ice, box);
    await ice.restamp();
    await box.restamp();

    expect(ice.getTemperature().rawValue()).toBeLessThan(274);
    expect(box.coldestMass()).toBe(ice);
    expect(box.isHoldingCold()).toBe(true);
    // The read the archetype makes, verbatim.
    expect(box.getContentsTemperature().rawValue()).toBeLessThanOrEqual(283);
  });

  it("⚠ …and an OPEN box with the same ice does not", async () => {
    const r = room(293);
    const box = icebox(293);
    await ContainmentApi.move(box, r);
    const ice = block(268);
    await ContainmentApi.move(ice, box);
    box.setOpen(true);
    await box.restamp();
    expect(box.getContentsTemperature().rawValue()).toBeGreaterThan(283);
  });
});