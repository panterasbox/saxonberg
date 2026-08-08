/**
 * Weather → Floor puddle (Wave 2, Phase D). The presence-gated boundary
 * fan-out accrues an occupied scope's Floor surface-bulk pool under resolved
 * rain (procgen OR authored-indoor — source-indifferent) and evaporates it
 * otherwise; a fresh rain pool is weakly conductive, so a live source in it
 * shocks a bridged body through the shipped `ElectricityApi.conduct` (the
 * weather→bulk→electricity loop) with no new glue.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../../lib/stuff/Location';
import Thing from '../../../lib/stuff/Thing';
import Floor from '../../Floor';
import Biome from '../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../SkyExposedBiome';
import Material from '../../../lib/material/Material';
import { EnergizedMixin } from '../../../lib/electricity/Energized';
import { WeatherApi } from '../../../api/weather';
import { BiomeApi } from '../../../api/biome';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ElectricityApi } from '../../../api/electricity';
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
import '../../WorldClockRegistry';

class TestRoom extends Location {}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantPuddle';
}
class TestWire extends EnergizedMixin(Thing) {
  static _mixinName = 'TestWirePuddle';
}

async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/obj/biome/universe');
}

/** Seed the fresh-water bulk material the puddle fills with (conductivity 0.01). */
function installFreshWater(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setElectricalConductivity(Quantity.of(0.01, 'S/m'));
    return m;
  }, '/obj/material/bulk/water');
}

function skyRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/obj/biome/universe';
    return b;
  }, '/obj/biome/outdoor/field');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

function indoorRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new Biome();
    b._extendsBiomePath = '/obj/biome/universe';
    return b;
  }, '/obj/biome/indoor/hall');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

/** Attach an empty surface-bulk Floor (a drainless basin) with a capacity. */
function dryFloor(room: TestRoom, capacityL = 40): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (floor as unknown as { surfaceCapacity: Quantity<'L'> }).surfaceCapacity =
    Quantity.of(capacityL, 'L');
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  return floor;
}

/** Register a connected occupant so the room counts as occupied. */
async function occupy(room: TestRoom): Promise<void> {
  const occupant = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occupant, room);
  const user = { _id: `puddle-occ-${occSeq++}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    'wsock',
    'wsess',
    user,
  );
  interactive.setHolder(occupant as unknown as HasInteractive & Stuff);
}
let occSeq = 0;

const surfaceL = (f: Floor): number => f.getBulkAmount('surface').rawValue();

describe('Weather → Floor puddle (Phase D)', () => {
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

  it('procgen rain accrues an occupied SkyExposed Floor pool', async () => {
    const room = skyRoom();
    const floor = dryFloor(room);
    await occupy(room);
    expect(surfaceL(floor)).toBe(0);

    WeatherApi._forceTypeForTesting('rain');
    await WeatherApi.onBoundary();
    await flush();

    expect(surfaceL(floor)).toBeGreaterThan(0);
    // Filled with the fresh-water material.
    expect(floor.getBulkMaterial('surface')?.getName()).toBe('water');
  });

  it('accrual clamps at the Floor capacity', async () => {
    const room = skyRoom();
    const floor = dryFloor(room, 20);
    await occupy(room);
    WeatherApi._forceTypeForTesting('rain');
    for (let i = 0; i < 5; i++) {
      await WeatherApi.onBoundary();
      await flush();
    }
    expect(surfaceL(floor)).toBeLessThanOrEqual(20 + 1e-9);
  });

  it('evaporates over non-rain segments', async () => {
    const room = skyRoom();
    const floor = dryFloor(room);
    floor.setBulkMaterial(
      'surface',
      StuffApi.findByTemplatePath<Material>('/obj/material/bulk/water')!,
    );
    floor.setBulkAmount('surface', Quantity.of(30, 'L'));
    await occupy(room);

    WeatherApi._forceTypeForTesting('clear');
    await WeatherApi.onBoundary();
    await flush();

    expect(surfaceL(floor)).toBeLessThan(30);
    expect(surfaceL(floor)).toBeGreaterThan(0);
  });

  it('authored indoor rain accrues a puddle too (source-indifferent)', async () => {
    const room = indoorRoom();
    room.setWeatherPin({ type: 'rain', mode: 'frozen' });
    const floor = dryFloor(room);
    await occupy(room);
    expect(BiomeApi.isSkyExposed(room)).toBe(false);

    await WeatherApi.onBoundary();
    await flush();

    expect(surfaceL(floor)).toBeGreaterThan(0);
  });

  it('a live wire in the rain pool shocks a bridged body (weather→bulk→electricity)', async () => {
    const room = skyRoom();
    const floor = dryFloor(room);
    await occupy(room);
    WeatherApi._forceTypeForTesting('rain');
    // Fill the pool over a few segments.
    for (let i = 0; i < 3; i++) {
      await WeatherApi.onBoundary();
      await flush();
    }
    expect(surfaceL(floor)).toBeGreaterThan(0);

    // Drop a live wire + a body into the now-conductive fresh pool.
    const wire = makeStuff(() => {
      const w = new TestWire();
      w.setVoltage(Quantity.of(120, 'V'));
      return w;
    });
    await ContainmentApi.move(wire, room);
    const body = makeStuff(() => new Thing());
    await ContainmentApi.move(body, room);

    const outcomes = ElectricityApi.conduct(wire);
    // The loop lit up: at least one conduction outcome resolved in the pool.
    expect(Array.isArray(outcomes)).toBe(true);
    expect(
      ElectricityApi.currentThrough(wire, body).rawValue(),
    ).toBeGreaterThan(0);
  });
});
