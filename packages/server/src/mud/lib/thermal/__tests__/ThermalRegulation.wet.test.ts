/**
 * ThermalRegulation ← wetness coupling (weather Wave 2). A wet body loses
 * heat faster in the cold: `effectiveAmbient()` folds an extra fraction of
 * the core→ambient gap scaled by the stored saturation (the wet-collapse
 * coupling). Read synchronously off the gauge at re-stamp. A dry body is
 * byte-identical to pre-Wave-2. See docs/subsystems/weather.md.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Location from "../../stuff/Location";
import Biome from "../../biome/Biome";
import { Creature } from "../../creature/Creature";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import { BiomeApi } from "../../../api/biome";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import "../../../obj/WorldClockRegistry";

class TestRoom extends Location {}

const COLD_K = 265; // well below the ~310 K endotherm setpoint

const now = 1_000_000;

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(COLD_K, "K"));
    b.setDefaultPressure(Quantity.of(101_325, "Pa"));
    b.setDefaultHumidity(Quantity.of(50, "%"));
    b.setDefaultGravity(Quantity.of(9.81, "m/s²"));
    b.setDefaultWind(Quantity.of(0, "m/s"));
    b.setDefaultAtmosphere("air");
    return b;
  }, "/obj/biome/universe");
}

function coldRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new Biome();
    b._extendsBiomePath = "/obj/biome/universe";
    return b;
  }, "/obj/biome/indoor/cell");
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

async function regBody(room: TestRoom): Promise<Creature> {
  const c = makeStuff(() => {
    const b = new Creature();
    b.setMass(Quantity.of(1, "kg"));
    return b;
  });
  await ContainmentApi.move(c, room);
  return c;
}

function effAmb(c: Creature): number {
  return (c as unknown as { effectiveAmbientK: number }).effectiveAmbientK;
}

describe("ThermalRegulation ← wetness coupling", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it("a wet body resolves a lower effective ambient (loses heat faster)", async () => {
    const room = coldRoom();
    const wet = await regBody(room);
    const dry = await regBody(room);
    (wet as unknown as { wet(n: number): void }).wet(1); // soaked

    await wet.restamp();
    await dry.restamp();

    expect(effAmb(wet)).toBeLessThan(effAmb(dry));
    // The dry body is unchanged from pre-Wave-2: at/above the cold biome
    // temperature (no wind, no wet fold).
    expect(effAmb(dry)).toBeGreaterThanOrEqual(COLD_K - 0.5);
  });

  it("a dry body is unaffected by the coupling", async () => {
    const room = coldRoom();
    const dry = await regBody(room);
    await dry.restamp();
    // No wet fold: effective ambient tracks the cold biome (+/- warmth=0).
    expect(effAmb(dry)).toBeCloseTo(COLD_K, 0);
  });
});
