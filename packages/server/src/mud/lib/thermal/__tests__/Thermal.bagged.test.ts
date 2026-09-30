/**
 * ⭐⭐ **A thing in a bag changes with the world it is carried through.**
 *
 * It did not. A perishable put in a bag was frozen at whatever ambient
 * it was stamped with when it went in — carry a loaf from a cold street
 * into a warm bakery and it stayed street-cold indefinitely, with
 * nothing in the game saying so.
 *
 * ⚠⚠ **The discriminating fixture is a room with an ENVELOPE**, and
 * getting that wrong is how this test suite was vacuous on its first
 * draft. A room that authors `_temperature` is found by the biome chain
 * anyway — `stepOutward` walks through any container, atmospheric or
 * not — so a bagged loaf in one already read it and the assertions
 * passed with the repair reverted. What a bag actually blocks is the
 * **envelope**: `resolveEnvelopeTemperature` answers only for the scope
 * you hand it, so the warmth a fire put into a room reached nothing
 * inside a bag. These rooms therefore hold an envelope temperature well
 * away from their biome default, and that gap is the whole assertion.
 *
 * The two defect paths, both repaired by `airScopeOf`:
 *
 *  - the PULL side (`refreshAmbientFromEnvelope`) asked the IMMEDIATE
 *    scope for `envelopeTemperatureLast()`. A bag is not `Atmospheric`,
 *    so it returned early and the cached ambient was left alone forever.
 *  - the PUSH side (`restamp`) resolved the bag's own temperature, which
 *    walks the chain for the BIOME value — so a loaf restamped inside a
 *    bag in a warm shop got the outdoor default, not the shop's air.
 *
 * ⚠⚠ **One step outward would repair neither, for the case that
 * matters.** A worn bag's container is the WEARER — a `Creature` is a
 * `Container` — so bag → carrier → room is two hops and the carrier has
 * no air of its own either.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Good from "../../stuff/Good";
import Material from "../../material/Material";
import Biome from "../../biome/Biome";
import Icebox from "../../../platform/thing/Icebox";
import CartesianLocation from "../../location/CartesianLocation";
import CartesianZone from "../../../platform/idea/location/CartesianZone";
import { Vessel } from "../../stuff/Vessel";
import { Creature } from "../../creature/Creature";
import { ThermalMixin } from "../Thermal";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import WorldClockRegistry from "../../../platform/idea/WorldClockRegistry";
import { TemplatePaths } from "../../paths";
import { BiomeApi } from "../../../api/biome";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

/** The biome default every room below sits in — and does NOT read. */
const BIOME_K = 283;
const INDOOR = "/stuff/idea/biome/_bagged/indoor";

class Loaf extends ThermalMixin(Good) {
  static _mixinName = "BaggedLoaf";
}
/** A plain bag — post-narrowing, `Container(Thing)` and no air at all. */
class Bag extends Vessel {}
class Carrier extends Creature {}

let counter = 0;
let realMs = 100_000;

function breadMaterial(): Material {
  counter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`bagged-bread-${counter}`);
    m.setSpecificHeat(Quantity.of(2500, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.3, "W/(m·K)"));
    m.setDensity(Quantity.of(400, "kg/m³"));
    return m;
  }, `/stuff/idea/material/_bagged/bread-${counter}`) as unknown as Material;
}

function loaf(k: number): Loaf {
  const mat = breadMaterial();
  return makeStuff(() => {
    const l = new Loaf();
    l.setMass(Quantity.of(0.8, "kg"));
    l.setMaterial(mat);
    l.setStampedTemperatureK(k);
    l.lastAmbientK = k;
    return l;
  });
}

/**
 * A room holding an ENVELOPE temperature — deliberately far from the
 * biome default, so a reader that fell through to the chain would be
 * caught by the number rather than flattered by it.
 */
function room(envelopeK: number): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
    material: "/stuff/idea/material/_bagged/oak",
    thicknessM: 0.02,
  });
  (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = envelopeK;
  (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK =
    envelopeK;
  return r;
}

/** Reconcile the body against a world in which some time has passed. */
function settle(body: Loaf): void {
  // Seed the stamp, let a little game-time pass, then reconcile for
  // real. ⚠ Both halves matter: `reconcileThermal` returns early on a
  // fresh body (so a new object does not integrate a gap from epoch)
  // AND on `elapsed <= 0`, so a read taken in the same instant as the
  // stamp does nothing at all — which is how a first draft of this file
  // asserted a frozen ambient and called it a pass.
  body.reconcileThermal();
  realMs += 5_000;
  body.reconcileThermal();
}

describe("⭐⭐ a bagged thing reads the nearest air", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // ⚠⚠ The clock is stood up per case, not once. `clearAll()` takes
    // the `WorldClockRegistry` singleton with it, and with no clock
    // `reconcileThermal` returns before it reads anything — so the
    // second case in the file would pass on a body that never
    // reconciled at all. (It did, on the first draft: two of four cases
    // were green for that reason and two were red for the same one.)
    WorldClockApi._resetForTesting();
    realMs = 100_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
    // ⚠⚠ And the REGISTRY singleton, which `clearAll()` takes with it.
    // The provider alone is not a clock: `thermalNowSeconds()` reads
    // through the registry, so after the first case every later body
    // answered `null` and `reconcileThermal` returned before doing
    // anything. That is what made the first draft of this file green in
    // two cases that had never reconciled.
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
    // The root-biome cache also survives `clearAll`.
    BiomeApi.invalidateRootBiomeCache();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName("bagged-oak");
      m.setThermalConductivity(Quantity.of(0.16, "W/(m·K)"));
      m.setDensity(Quantity.of(700, "kg/m³"));
      m.setSpecificHeat(Quantity.of(1600, "J/(kg·K)"));
      return m;
    }, "/stuff/idea/material/_bagged/oak");
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
  afterEach(() => {
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
    BiomeApi.invalidateRootBiomeCache();
  });

  it("⭐ a bag on the floor: the loaf reads the room's ENVELOPE", () => {
    const shop = room(305);
    const bag = makeStuff(() => new Bag());
    const bread = loaf(275); // came in off a cold street

    ContainmentApi.move(bag, shop);
    ContainmentApi.move(bread, bag);
    settle(bread);

    expect(bread.lastAmbientK).toBeCloseTo(305, 0);
    // And it is the envelope, not the chain's biome default.
    expect(bread.lastAmbientK).not.toBeCloseTo(BIOME_K, 0);
  });

  it("⚠⚠ a WORN bag: two hops, and the middle one has no air to give", () => {
    // The case the whole repair exists for, and the one "step outward
    // once" cannot reach: the bag's container is the carrier, and a
    // Creature is a Container without being weather.
    //
    // ⭐ Measured, not argued: capping the walk at two (the immediate
    // holder plus one step) turns this case red and leaves the other
    // three green. The requirements said "one step outward" and that
    // would have shipped a repair which fixed a bag on the floor and
    // left a bag on your back exactly as frozen as before — for
    // precisely the journey the drive walks.
    const shop = room(305);
    const carrier = makeStuff(() => new Carrier());
    const bag = makeStuff(() => new Bag());
    const bread = loaf(275);

    ContainmentApi.move(carrier, shop);
    ContainmentApi.move(bag, carrier);
    ContainmentApi.move(bread, bag);
    settle(bread);

    expect(bread.lastAmbientK).toBeCloseTo(305, 0);
  });

  it("⭐ and it FOLLOWS — the world changes and the bagged loaf notices", () => {
    const bakery = room(305);
    const bag = makeStuff(() => new Bag());
    const bread = loaf(275);

    ContainmentApi.move(bag, bakery);
    ContainmentApi.move(bread, bag);
    settle(bread);
    expect(bread.lastAmbientK).toBeCloseTo(305, 0);

    // The fire goes out. Nothing restamps a loaf inside a bag — the
    // carrier is not moving — so the PULL side is the only thing that
    // can notice, and it is the half that used to return early.
    (bakery as unknown as { envelopeTemperatureK: number })
      .envelopeTemperatureK = 279;
    settle(bread);
    expect(bread.lastAmbientK).toBeCloseTo(279, 0);
  });

  it("⚠ a documented LIMIT: a bag inside a shut icebox reads the room", () => {
    // The holder read is deliberately immediate — what HOLDS you
    // outranks the room, and a bag is what holds the loaf. So the cold
    // does not reach through the bag. Asserted rather than left
    // implicit, so the limit is visible; it is on the slate.
    const kitchen = room(295);
    const box = makeStuffAtPath(() => new Icebox(), "/test/bagged/icebox");
    box.setStampedTemperatureK(273);
    box.lastAmbientK = 273;
    box.setOpen(false);
    const bag = makeStuff(() => new Bag());
    const bread = loaf(295);

    ContainmentApi.move(box, kitchen);
    ContainmentApi.move(bag, box);
    ContainmentApi.move(bread, bag);
    settle(bread);

    expect(bread.lastAmbientK).toBeCloseTo(295, 0);
  });
});
