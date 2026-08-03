/**
 * The coexistence resolve (weather Wave 2) — `WeatherApi.resolveWeatherFor`
 * folds **authored pin → procgen(climate-lean-shaped) → biome** in
 * precedence, tags provenance, and exposes a resolved `precipitationHere`
 * that is sky-gated for procgen but ungated for an authored pin. Covers the
 * acceptance criteria: frozen never varies; alive forces the type but
 * animates intensity; a Locality pin covers its subtree; a scope pin
 * overrides within a modelled Locality; a climate lean shifts the procgen
 * distribution without a pin; author always wins.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import Locality from '../../obj/Locality';
import Biome from '../../lib/biome/Biome';
import { SkyExposedBiome } from '../../obj/SkyExposedBiome';
import AddressRegistry from '../../obj/AddressRegistry';
import { WeatherApi } from '../weather';
import { AddressApi } from '../address';
import { BiomeApi } from '../biome';
import { WorldClockApi } from '../worldclock';
import { StuffApi } from '../stuff';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  WEATHER_DEFAULTS,
  WEATHER_PROFILES,
  type ClimateLean,
  type WeatherType,
} from '../../lib/weather/WeatherType';

const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

class TestLocation extends Location {}

/** A mutable game-time provider so resolve reads can be moved in time. */
let nowS = 0;
function setNow(s: number): void {
  nowS = s;
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(5, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/obj/biome/universe');
}

/** A SkyExposed (weather-eligible) outdoor room. */
function skyRoom(): TestLocation {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/obj/biome/universe';
    return b;
  }, '/obj/biome/outdoor/field');
  const room = makeStuff(() => new TestLocation());
  room.setBiome(biome);
  return room;
}

/** A plain (indoor / sheltered) room — no sky. */
function indoorRoom(): TestLocation {
  const biome = makeStuffAtPath(() => {
    const b = new Biome();
    b._extendsBiomePath = '/obj/biome/universe';
    return b;
  }, '/obj/biome/indoor/hall');
  const room = makeStuff(() => new TestLocation());
  room.setBiome(biome);
  return room;
}

function installRegistry(): AddressRegistry {
  return makeStuffAtPath(() => new AddressRegistry(), '/obj/AddressRegistry');
}

describe('WeatherApi.resolveWeatherFor — the coexistence resolve', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    setNow(0);
    // Drive game-time directly: with the provider anchored at 0 and scale
    // 1000, `currentGameSeconds()` == the provider's raw value, so `setNow`
    // sets the game-seconds the resolve reads.
    WorldClockApi._setNowProviderForTesting(() => nowS);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WeatherApi._resetForTesting();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
    AddressApi._resetRegistryRefForReload();
  });

  it('a frozen scope pin never varies across time', async () => {
    const room = skyRoom();
    room.setWeatherPin({ type: 'storm', mode: 'frozen' });

    setNow(1);
    const a = await WeatherApi.resolveWeatherFor(room);
    setNow(SEG * 5 + 1);
    const b = await WeatherApi.resolveWeatherFor(room);

    expect(a.provenance).toBe('pin-frozen');
    expect(b.provenance).toBe('pin-frozen');
    expect(a.sample.type).toBe('storm');
    expect(b.sample.type).toBe('storm');
    // Frozen: the deviation is the static profile, unchanged over time.
    expect(a.sample.deviation.temperature.rawValue()).toBe(
      WEATHER_PROFILES.storm.deviation.temperature.rawValue(),
    );
    expect(b.sample.deviation.temperature.rawValue()).toBe(
      a.sample.deviation.temperature.rawValue(),
    );
    expect(a.precipitationHere).toBe('rain');
  });

  it('an alive scope pin forces the type but animates intensity', async () => {
    const room = skyRoom();
    room.setWeatherPin({ type: 'storm', mode: 'alive' });

    // Sample many segments; the type is pinned throughout, but the
    // deviation magnitude varies (animated) — not a single constant.
    const temps = new Set<number>();
    let allStorm = true;
    for (let seg = 0; seg < 12; seg++) {
      setNow(seg * SEG + 1);
      const r = await WeatherApi.resolveWeatherFor(room);
      if (r.sample.type !== 'storm') allStorm = false;
      expect(r.provenance).toBe('pin-alive');
      temps.add(r.sample.deviation.temperature.rawValue());
    }
    expect(allStorm).toBe(true); // type never leaves the pin
    expect(temps.size).toBeGreaterThan(1); // intensity breathes
    // ...and every animated magnitude stays within the profile envelope.
    const full = Math.abs(
      WEATHER_PROFILES.storm.deviation.temperature.rawValue(),
    );
    for (const t of temps) {
      expect(Math.abs(t)).toBeLessThanOrEqual(full + 1e-9);
      expect(Math.abs(t)).toBeGreaterThanOrEqual(
        full * WEATHER_DEFAULTS.ALIVE_ANIM_MIN - 1e-9,
      );
    }
  });

  it('author always wins: a pin outranks the procgen field', async () => {
    const room = skyRoom();
    // Force procgen to clear everywhere; the pin must still read storm.
    WeatherApi._forceTypeForTesting('clear');
    room.setWeatherPin({ type: 'storm', mode: 'frozen' });

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.sample.type).toBe('storm');
    expect(r.provenance).toBe('pin-frozen');
  });

  it('a pin rains even in an indoor scope (precipitation not sky-gated)', async () => {
    const room = indoorRoom();
    expect(BiomeApi.isSkyExposed(room)).toBe(false);
    room.setWeatherPin({ type: 'rain', mode: 'frozen' });

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.sample.type).toBe('rain');
    expect(r.precipitationHere).toBe('rain'); // ungated for a pin
  });

  it('an indoor no-pin scope reads the biome baseline (no rain)', async () => {
    const room = indoorRoom();
    WeatherApi._forceTypeForTesting('storm'); // procgen storm outside

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.provenance).toBe('biome');
    expect(r.precipitationHere).toBe('none'); // weather = sky dynamics
    expect(r.sample.type).toBe('clear');
  });

  it('an outdoor no-pin scope reads the procgen field, sky-gated precip', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('rain');

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.provenance).toBe('procgen');
    expect(r.sample.type).toBe('rain');
    expect(r.precipitationHere).toBe('rain');
  });

  it('a Locality-tier pin covers its address subtree', async () => {
    installRegistry();
    const moor = makeStuffAtPath(() => {
      const l = new Locality();
      l.setAddress('narnia/moor');
      l.setWeatherPin({ type: 'storm', mode: 'frozen' });
      return l;
    }, '/obj/Locality/moor');
    AddressApi.registerLocality(moor);

    // A room deep under the moor's address — no scope pin of its own.
    const room = skyRoom();
    room.setAddress('narnia/moor/hollow');

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.provenance).toBe('pin-frozen');
    expect(r.sample.type).toBe('storm');
  });

  it('a scope pin overrides a Locality pin within one room', async () => {
    installRegistry();
    const moor = makeStuffAtPath(() => {
      const l = new Locality();
      l.setAddress('narnia/moor');
      l.setWeatherPin({ type: 'storm', mode: 'frozen' });
      return l;
    }, '/obj/Locality/moor');
    AddressApi.registerLocality(moor);

    const room = skyRoom();
    room.setAddress('narnia/moor/oasis');
    room.setWeatherPin({ type: 'clear', mode: 'frozen' }); // a calm eye

    const r = await WeatherApi.resolveWeatherFor(room);
    expect(r.sample.type).toBe('clear'); // scope wins over Locality
  });

  it('a climate lean shifts the procgen distribution without a pin', () => {
    const snowy: ClimateLean = { snow: 8, clear: 0.2 };
    const plain = makeStuff(() => {
      const l = new Locality();
      l.setAddress('narnia/plain');
      return l;
    });
    const polar = makeStuff(() => {
      const l = new Locality();
      l.setAddress('narnia/plain'); // same seed → isolates the lean's effect
      l.setClimateLean(snowy);
      return l;
    });

    const count = (loc: Locality, type: WeatherType): number => {
      let n = 0;
      for (let seg = 0; seg < 400; seg++) {
        if (
          WeatherApi.weatherAt(Quantity.of(seg * SEG + 1, 's'), loc).type ===
          type
        ) {
          n++;
        }
      }
      return n;
    };

    expect(count(polar, 'snow')).toBeGreaterThan(count(plain, 'snow'));
  });
});
