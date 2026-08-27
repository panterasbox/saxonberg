/**
 * The Weeping Moor — the spine-invariant end-to-end. The whole build hangs on
 * one claim: **authored and modelled rain are indistinguishable downstream.**
 * This drives the real weather boundary fan-out over two scopes — an authored
 * indoor scope-pinned rain (the weeping chamber) and a modelled procgen storm
 * (the heath) — and proves a body in each accrues the **same** wetness and
 * each Floor fills the **same** puddle. Source-indifference, demonstrated.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../../lib/stuff/Location';
import Thing from '../../../lib/stuff/Thing';
import Floor from '../../../platform/thing/Floor';
import Biome from '../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import Material from '../../../lib/material/Material';
import { WeatherApi } from '../../../api/weather';
import { BiomeApi } from '../../../api/biome';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import { Quantity } from '../../../lib/quantity';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { User } from '../../../lib/identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestRoom extends Location {}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantMoor';
}

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(285, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

function installFreshWater(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setElectricalConductivity(Quantity.of(0.01, 'S/m'));
    return m;
  }, '/stuff/idea/material/bulk/water');
}

/** A SkyExposed (modelled-weather-eligible) room. */
function skyRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/stuff/idea/biome/universe';
    return b;
  }, '/stuff/idea/biome/outdoor/field');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

/** An indoor (no-sky) room — its weather is authored, not modelled. */
function indoorRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new Biome();
    b._extendsBiomePath = '/stuff/idea/biome/universe';
    return b;
  }, '/stuff/idea/biome/indoor/hall');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

function dryFloor(room: TestRoom): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (floor as unknown as { surfaceCapacity: Quantity<'L'> }).surfaceCapacity =
    Quantity.of(80, 'L');
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  return floor;
}

let occSeq = 0;
async function occupy(room: TestRoom): Promise<Thing> {
  const n = occSeq++;
  const occupant = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occupant, room);
  const user = { _id: `moor-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `wsock-${n}`,
    `wsess-${n}`,
    user,
  );
  interactive.setHolder(occupant as unknown as HasInteractive & Stuff);
  return occupant;
}

const wetness = (t: Thing): number =>
  (t as unknown as { getWetness(): number }).getWetness();
const surfaceL = (f: Floor): number => f.getBulkAmount('surface').rawValue();

describe('The Weeping Moor — the spine invariant', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    installFreshWater();
    WorldClockApi._resetForTesting(); // now = 0
  });

  afterEach(() => {
    WeatherApi._resetForTesting();
    ConnectionManager.get().clearAll();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('authored rain ≡ procgen rain: same wetness, same puddle', async () => {
    // Authored: an indoor weeping chamber, scope-pinned to a frozen rain.
    const chamber = indoorRoom();
    (chamber as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin({
      type: 'rain',
      mode: 'frozen',
    });
    const chamberFloor = dryFloor(chamber);
    const chamberBody = await occupy(chamber);
    expect(BiomeApi.isSkyExposed(chamber)).toBe(false); // no sky, yet it rains

    // Modelled: an outdoor SkyExposed heath, procgen forced to rain.
    const heath = skyRoom();
    const heathFloor = dryFloor(heath);
    const heathBody = await occupy(heath);
    WeatherApi._forceTypeForTesting('rain');

    // One boundary pass over both occupied scopes.
    await WeatherApi.onBoundary();
    await flush();

    // The bodies are equally wet — source-indifferent.
    expect(wetness(chamberBody)).toBeGreaterThan(0);
    expect(wetness(chamberBody)).toBeCloseTo(wetness(heathBody), 6);

    // Both floors filled with fresh water — the same puddle sink.
    expect(surfaceL(chamberFloor)).toBeGreaterThan(0);
    expect(surfaceL(chamberFloor)).toBeCloseTo(surfaceL(heathFloor), 6);
    expect(chamberFloor.getBulkMaterial('surface')?.getName()).toBe('water');
  });

  it('the authored resolve tags its provenance (authored, not modelled)', async () => {
    const chamber = indoorRoom();
    (chamber as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin({
      type: 'rain',
      mode: 'frozen',
    });
    const resolved = await WeatherApi.resolveWeatherFor(chamber);
    expect(resolved.provenance).toBe('pin-frozen');
    expect(resolved.precipitationHere).toBe('rain');
  });
});
