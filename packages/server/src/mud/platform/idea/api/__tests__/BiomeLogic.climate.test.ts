/**
 * The biome chain under the sky (climate build W1, D4) — where no author
 * said a temperature, the answer IS the climate at the place's site.
 *
 * Claims:
 *
 *  1. A sky-exposed room whose chain falls through to the universe
 *     constant reads `WeatherApi.climateAt(site)` plus the weather, and
 *     the trace says `climate` and names the zone.
 *  2. An authored temperature anywhere in the chain wins and takes only
 *     the weather TYPE's deviation.
 *  3. The zone chain's latitude is what the climate is read at: a room
 *     at −42° reads the opposite season, and a polar zone reads colder.
 *  4. An ENCLOSED room's outside is the derived climate too — the winter
 *     reaches indoors (before the build an indoor-biomed room's outside
 *     was 295 K the year round).
 *  5. The sync evaporation air folds the same climate as the live read,
 *     and the segment walk integrates it (it used to have no season).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { BiomeApi } from '../../../../api/biome';
import { WeatherApi } from '../../../../api/weather';
import { WorldClockApi } from '../../../../api/worldclock';
import { CelestialApi } from '../../../../api/celestial';
import {
  PersistenceManager,
  Collections,
} from '../../../../../backend/PersistenceManager';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Biome from '../../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../SkyExposedBiome';
import { Zone } from '../../../../lib/zone/Zone';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Quantity } from '../../../../lib/quantity';
import { WEATHER_PROFILES, type ClimateSite } from '../../../../lib/weather/WeatherType';
import {
  makeStuff,
  makeStuffAtPath,
  EXIT_KIND_TEST_ROWS,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

const DAY = 86_400;

function installInMemoryStore(initial: Doc[] = []): void {
  const store: Doc[] = [...(EXIT_KIND_TEST_ROWS as unknown as Doc[]), ...initial].map(
    (d, i) => ({ ...d, _id: String(i + 1) }),
  );
  const save = vi.fn(async (_c: string, doc: Doc) => doc._id ?? '1');
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') return store.filter((d) => d.path === query.path);
    return store.slice();
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

function skyBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b.setExtendsBiomePath('/stuff/idea/biome/universe');
    return b;
  }, '/stuff/idea/biome/outdoor/field');
}

function indoorBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setExtendsBiomePath('/stuff/idea/biome/universe');
    return b;
  }, '/stuff/idea/biome/indoor/hall');
}

async function zoneAt(
  path: string,
  levers: { latitude?: number; elevation?: number; continentality?: number },
): Promise<Zone> {
  installInMemoryStore([
    { path, class: '/platform/idea/location/CartesianZone', data: {} },
  ]);
  const zone = await StuffApi.singleton<Zone>(path);
  if (levers.latitude !== undefined) zone.setLatitude(levers.latitude);
  if (levers.elevation !== undefined) zone.setElevation(levers.elevation);
  if (levers.continentality !== undefined) zone.setContinentality(levers.continentality);
  return zone;
}

function roomIn(zone: Zone, biome: Biome): CartesianLocation {
  const room = makeStuff(() => new CartesianLocation());
  Stuff._stampZone(room, zone as never);
  room.setBiome(biome);
  return room;
}

const site = (latitudeDeg: number, elevationM = 0, continentality = 0.5): ClimateSite => ({
  latitudeDeg,
  elevationM,
  continentality,
  offsetK: 0,
});

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  BiomeApi.invalidateRootBiomeCache();
  installRootBiome();
  WorldClockApi._resetForTesting();
  WeatherApi._forceTypeForTesting('clear'); // active, zero TYPE deviation
});

afterEach(() => {
  WeatherApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
  BiomeApi.invalidateRootBiomeCache();
});

describe('the temperature under the sky is the climate (D4)', () => {
  it('replaces the universe constant with the climate at the zone\'s site, and the trace says so', async () => {
    const zone = await zoneAt('/north', { latitude: 71, elevation: 50, continentality: 0.7 });
    const room = roomIn(zone, skyBiome());
    const k = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
    const expected = WeatherApi.climateAt(site(71, 50, 0.7), WorldClockApi.getNow()).rawValue();
    expect(k).toBeCloseTo(expected, 6);
    expect(k).toBeLessThan(270); // not the 295 K constant

    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('climate');
    expect(trace.sourcePath).toBe('/north');
    expect(trace.site?.latitudeDeg).toBe(71);
    expect(trace.value.rawValue()).toBeCloseTo(k, 6);
  });

  it('folds the weather type on top of the climate', async () => {
    const zone = await zoneAt('/north', { latitude: 71 });
    const room = roomIn(zone, skyBiome());
    const clear = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
    WeatherApi._forceTypeForTesting('snow');
    const snowing = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
    expect(snowing - clear).toBeCloseTo(WEATHER_PROFILES.snow.deviation.temperature.rawValue(), 6);
  });

  it('an authored temperature wins and takes only the weather type', async () => {
    const zone = await zoneAt('/north', { latitude: 71 });
    const warm = makeStuffAtPath(() => {
      const b = new SkyExposedBiome();
      b.setExtendsBiomePath('/stuff/idea/biome/universe');
      b.setDefaultTemperature(Quantity.of(290, 'K'));
      return b;
    }, '/stuff/idea/biome/outdoor/hotspring');
    const room = roomIn(zone, warm);
    WeatherApi._forceTypeForTesting('storm');
    const k = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
    expect(k).toBeCloseTo(290 + WEATHER_PROFILES.storm.deviation.temperature.rawValue(), 6);
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('biome');
  });

  it('weather inactive: the chain answers the universe constant exactly as before', async () => {
    WeatherApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    // No `_forceTypeForTesting` — nothing creates the weather singleton.
    expect(WeatherApi.isActive()).toBe(false);
    const zone = await zoneAt('/north', { latitude: 71 });
    const room = roomIn(zone, skyBiome());
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(295);
  });
});

describe('latitude is the zone chain\'s', () => {
  it('a southern room reads the opposite season', async () => {
    const north = roomIn(await zoneAt('/n', { latitude: 42 }), skyBiome());
    const south = roomIn(await zoneAt('/s', { latitude: -42 }), skyBiome());
    const t = Quantity.of(10 * DAY, 's');
    expect(await CelestialApi.currentSeason(north, t)).toBe('spring');
    expect(await CelestialApi.currentSeason(south, t)).toBe('fall');
  });

  it('the sun at 89° S does not rise on day 3', async () => {
    const pole = roomIn(await zoneAt('/pole', { latitude: -89 }), skyBiome());
    const t = Quantity.of(3 * DAY + 12 * 3600, 's');
    expect(await CelestialApi.isDayAt(pole, t)).toBe(false);
    expect((await CelestialApi.daylightFractionAt(pole, t))).toBe(0);
  });

  it('an unauthored chain reads the realm default, 42°', async () => {
    const room = roomIn(await zoneAt('/plain', {}), skyBiome());
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.site?.latitudeDeg).toBe(42);
    expect(trace.value.rawValue()).toBeCloseTo(
      WeatherApi.climateAt(site(42), WorldClockApi.getNow()).rawValue(),
      6,
    );
  });
});

describe('the winter reaches indoors', () => {
  it('an enclosed room\'s outside is the derived climate', async () => {
    const zone = await zoneAt('/north', { latitude: 71, elevation: 50, continentality: 0.7 });
    const room = roomIn(zone, indoorBiome());
    const outside = (await BiomeApi.outsideTemperatureFor(room)).rawValue();
    expect(outside).toBeCloseTo(
      WeatherApi.climateAt(site(71, 50, 0.7), WorldClockApi.getNow()).rawValue(),
      6,
    );
  });
});

describe('the sync evaporation air agrees with the live read', () => {
  it('airFor folds the same climate once the site memo has landed', async () => {
    const zone = await zoneAt('/north', { latitude: 71 });
    const room = roomIn(zone, skyBiome());
    // Before the memo lands the sync read is the realm default (R8)…
    const early = BiomeApi.airFor(room).tempK;
    expect(early).toBeCloseTo(
      WeatherApi.climateAt(site(42), WorldClockApi.getNow()).rawValue(),
      6,
    );
    // …and once it has, it is the place's own climate, equal to the live
    // read (this room is under no Locality, so neither path adds a
    // weather deviation, and the forced `clear` type adds nothing).
    await room.resolveClimateSite();
    const live = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
    expect(BiomeApi.airFor(room).tempK).toBeCloseTo(live, 6);
  });
});
