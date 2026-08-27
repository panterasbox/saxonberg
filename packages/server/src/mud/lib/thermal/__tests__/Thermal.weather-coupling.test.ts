/**
 * Thermal ← weather coupling (D4). A segment boundary fires a
 * **presence-gated restamp fan-out** over occupied SkyExposed rooms,
 * re-resolving thermal's cached ambient (`lastAmbientK`) against the now
 * weather-deviated biome temperature — cache invalidation, not a sim
 * tick. No weather state is stored; thermal's sync read path is
 * untouched.
 *
 * Coverage:
 *   - the restamp re-resolves the weathered ambient (the D-F seam);
 *   - `onBoundary` over an occupied SkyExposed room updates the body's
 *     ambient, while an unoccupied room does **zero** restamp work
 *     (presence-gating, asserted via a spy);
 *   - the WorldClock `every` schedule (mirroring
 *     `registerSystemSchedules`) drives `onBoundary` across a boundary.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Thing from '../../stuff/Thing';
import Location from '../../stuff/Location';
import Material from '../../material/Material';
import Biome from '../../biome/Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import { ThermalMixin } from '../Thermal';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { WeatherApi } from '../../../api/weather';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import '../../../platform/idea/WorldClockRegistry';
import type { Stuff } from '../../stuff/Stuff';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import type { HasInteractive } from '../../connection/HasInteractive';
import type { User } from '../../identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  WEATHER_PROFILES,
  WEATHER_DEFAULTS,
} from '../../weather/WeatherType';

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = 'ThermalThingWeather';
}
class TestRoom extends Location {}
/** A Containable occupant carrying the connection surface (isLinkdead etc.). */
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantWeather';
}

const BASE_T = 290; // K — the SkyExposed biome's default temperature
const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
const STORM_DT = WEATHER_PROFILES.storm.deviation.temperature.rawValue(); // −5

/** Flush the fire-and-forget restamp chain (dynamic import + one await). */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

let matCounter = 0;
function thermalBody(stampedK: number): ThermalThing {
  matCounter += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`wmat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_weather/m-${matCounter}`) as unknown as Material;
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(0.3, 'kg'));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(stampedK);
    return t;
  });
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(BASE_T, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

/** A SkyExposed room (weather-eligible) with a Thermal body inside it. */
async function skyRoomWithBody(): Promise<{
  room: TestRoom;
  body: ThermalThing;
}> {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/stuff/idea/biome/universe';
    return b;
  }, '/stuff/idea/biome/outdoor/field');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  const body = thermalBody(BASE_T);
  await ContainmentApi.move(body, room);
  await body.restamp(); // seed lastAmbientK = BASE_T (no weather yet)
  return { room, body };
}

/** Register a connected occupant standing in `room`. */
async function occupy(room: TestRoom): Promise<void> {
  const occupant = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occupant, room);
  const user = { _id: 'weather-occupant' } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    'wsock',
    'wsess',
    user,
  );
  interactive.setHolder(occupant as unknown as HasInteractive & Stuff);
}

describe('Thermal ← weather coupling (D4)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    WorldClockApi._resetForTesting(); // testMode, now = 0
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WeatherApi._resetForTesting();
    ConnectionManager.get().clearAll();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('the restamp re-resolves the weather-deviated ambient (D-F seam)', async () => {
    const { body } = await skyRoomWithBody();
    expect(body.lastAmbientK).toBeCloseTo(BASE_T, 0);

    WeatherApi._forceTypeForTesting('storm'); // activate + force
    await body.restamp();
    expect(body.lastAmbientK).toBeCloseTo(BASE_T + STORM_DT, 0); // 285

    WeatherApi._forceTypeForTesting('clear'); // flat
    await body.restamp();
    expect(body.lastAmbientK).toBeCloseTo(BASE_T, 0);
  });

  it('onBoundary over an OCCUPIED SkyExposed room updates the body', async () => {
    const { room, body } = await skyRoomWithBody();
    await occupy(room);

    const spy = vi.spyOn(BiomeApi, 'restampThermalContentsOf');
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi.onBoundary();
    await flush();

    expect(spy).toHaveBeenCalled();
    expect(body.lastAmbientK).toBeCloseTo(BASE_T + STORM_DT, 0);
  });

  it('onBoundary over an UNOCCUPIED room does zero restamp work', async () => {
    const { body } = await skyRoomWithBody();
    // No occupant registered.
    const spy = vi.spyOn(BiomeApi, 'restampThermalContentsOf');
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi.onBoundary();
    await flush();

    expect(spy).not.toHaveBeenCalled();
    expect(body.lastAmbientK).toBeCloseTo(BASE_T, 0); // unchanged
  });

  it('the WorldClock every-schedule drives onBoundary across a boundary', async () => {
    const { room, body } = await skyRoomWithBody();
    await occupy(room);
    WeatherApi._forceTypeForTesting('storm');

    // Mirror registerSystemSchedules: arm the boundary on the clock.
    const nextBoundary = WeatherApi.nextBoundaryAfter(WorldClockApi.getNow());
    WorldClockApi.every(
      Quantity.of(SEG, 's'),
      () => WeatherApi.onBoundary(),
      { startAt: nextBoundary, tag: 'weather:boundary' },
    );

    // Advance game-time past the first boundary (scale 12 → real ms).
    WorldClockApi._advanceForTesting((SEG / 12) * 1000 + 1000);
    await flush();

    expect(body.lastAmbientK).toBeCloseTo(BASE_T + STORM_DT, 0);
  });
});
