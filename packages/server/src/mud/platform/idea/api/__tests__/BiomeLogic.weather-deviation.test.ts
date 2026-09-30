/**
 * Biome weather-deviation seam (D2) — a SkyExposed scope's four
 * weather-deviated resolves reflect the active weather; an indoor scope
 * and the non-deviated fields (gravity) do not; and **weather-absent is
 * byte-identical to pre-weather** (the regression guard / no-dependency
 * acceptance criterion).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../../../lib/stuff/Location';
import Biome from '../../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../SkyExposedBiome';
import { BiomeApi } from '../../../../api/biome';
import { WeatherApi } from '../../../../api/weather';
import { WorldClockApi } from '../../../../api/worldclock';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { WEATHER_PROFILES } from '../../../../lib/weather/WeatherType';

class TestLocation extends Location {}

const BASE_T = 295; // K
const BASE_P = 101_325; // Pa
const BASE_H = 50; // %
const BASE_W = 5; // m/s

/**
 * ⭐⭐ The temperature the solar term alone would produce right now,
 * over the biome base.
 *
 * ⚠ Since the envelope build (D3a) the outdoor temperature carries a
 * **solar deviation** as well as the weather TYPE deviation: two
 * cosines, one turning once a year and one once a day, so that the
 * realm has a winter and a night at all. Before it, `SEASON_BIAS`
 * biased only how often it SNOWED and mid-winter at 3 a.m. read 17 °C.
 *
 * That term is a pure function of game time, so every absolute
 * temperature in this file would otherwise be a pin on what o'clock the
 * test clock happens to say. The seam this file is about is the
 * WEATHER fold, so the assertions compare against this baseline and the
 * claims are unchanged: *a storm reads its type's deviation below a
 * clear sky, and an indoor scope reads neither.*
 */
async function solarBaseT(room: ReturnType<typeof skyRoom>): Promise<number> {
  // ⚠ Forces `clear` unconditionally, which also CREATES the weather
  // singleton. An earlier draft short-circuited to `BASE_T` when
  // weather was inactive — and then the caller activated it, so the
  // baseline was measured in a world without a solar term and the
  // comparison against a world with one was off by exactly that term.
  WeatherApi._forceTypeForTesting('clear'); // zero TYPE deviation
  return (await BiomeApi.resolveTemperatureFor(room)).rawValue();
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(BASE_T, 'K'));
    b.setDefaultPressure(Quantity.of(BASE_P, 'Pa'));
    b.setDefaultHumidity(Quantity.of(BASE_H, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(BASE_W, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

/** A room whose biome composes SkyExposedMixin (weather-eligible). */
function skyRoom(): Location {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b.setExtendsBiomePath('/stuff/idea/biome/universe');
    return b;
  }, '/stuff/idea/biome/outdoor/field');
  const room = makeStuff(() => new TestLocation());
  room.setBiome(biome);
  return room;
}

/** A room whose biome is a plain (indoor / sheltered) Biome. */
function indoorRoom(): Location {
  const biome = makeStuffAtPath(() => {
    const b = new Biome();
    b.setExtendsBiomePath('/stuff/idea/biome/universe');
    return b;
  }, '/stuff/idea/biome/indoor/hall');
  const room = makeStuff(() => new TestLocation());
  room.setBiome(biome);
  return room;
}

describe('BiomeLogic — weather deviation seam (D2)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    WorldClockApi._resetForTesting(); // pin now = 0
  });

  afterEach(() => {
    WeatherApi._resetForTesting(); // clear forced type (before clearAll)
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('weather-absent reads are byte-identical to the biome base', async () => {
    const room = skyRoom();
    expect(WeatherApi.isActive()).toBe(false); // nothing created the singleton

    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(BASE_T);
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(BASE_P);
    expect((await BiomeApi.resolveHumidityFor(room)).rawValue()).toBe(BASE_H);
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(BASE_W);
  });

  it('a SkyExposed scope reflects the active weather deviation', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('storm'); // creates singleton → active
    expect(WeatherApi.isActive()).toBe(true);

    const d = WEATHER_PROFILES.storm.deviation;
    const clearT = await solarBaseT(room);
    WeatherApi._forceTypeForTesting('storm');
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBeCloseTo(
      clearT + d.temperature.rawValue(),
      6,
    );
    expect((await BiomeApi.resolveHumidityFor(room)).rawValue()).toBe(
      BASE_H + d.humidity.rawValue(),
    );
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(
      BASE_W + d.wind.rawValue(),
    );
  });

  it('a storm reads BELOW base pressure (the Barometer criterion)', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('storm');
    const p = (await BiomeApi.resolvePressureFor(room)).rawValue();
    expect(p).toBeLessThan(BASE_P);
    expect(p).toBe(BASE_P + WEATHER_PROFILES.storm.deviation.pressure.rawValue());
  });

  it('an indoor (non-SkyExposed) scope is unaffected', async () => {
    const room = indoorRoom();
    WeatherApi._forceTypeForTesting('storm');
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(BASE_T);
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(BASE_P);
  });

  it('gravity is never weather-deviated, even SkyExposed', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('storm');
    expect((await BiomeApi.resolveGravityFor(room)).rawValue()).toBe(9.81);
  });

  it('regression guard: weather forced clear ⇒ byte-identical to base', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('clear'); // active, but zero deviation
    expect(WeatherApi.isActive()).toBe(true);

    // ⚠ Temperature is not pinned here: the solar term (D3a) is a pure
    // function of game time and moves it. What "byte-identical" means
    // for the WEATHER seam is that a clear sky adds nothing, which is
    // exactly what the storm case above measures against.
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(BASE_P);
    expect((await BiomeApi.resolveHumidityFor(room)).rawValue()).toBe(BASE_H);
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(BASE_W);
  });

  // ── Wave 2: the fold is pin-aware ──

  it('a pinned SkyExposed scope folds the PINNED type deviation', async () => {
    const room = skyRoom();
    // Procgen forced clear (zero deviation); the authored pin must still
    // fold the storm deviation — author wins over the model in the fold.
    WeatherApi._forceTypeForTesting('clear');
    (room as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin({
      type: 'storm',
      mode: 'frozen',
    });

    const d = WEATHER_PROFILES.storm.deviation;
    // The pinned storm's temperature deviation, over whatever the solar
    // term says right now — the pin is what this test is about.
    const unpinned = await (async (): Promise<number> => {
      const saved = (room as unknown as { getWeatherPin(): unknown })
        .getWeatherPin();
      (room as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin(
        null,
      );
      const t = (await BiomeApi.resolveTemperatureFor(room)).rawValue();
      (room as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin(
        saved,
      );
      return t;
    })();
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBeCloseTo(
      unpinned + d.temperature.rawValue(),
      6,
    );
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(
      BASE_P + d.pressure.rawValue(),
    );
  });

  it('a pin still does NOT deviate an indoor (non-SkyExposed) scope', async () => {
    const room = indoorRoom();
    WeatherApi._forceTypeForTesting('clear');
    (room as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin({
      type: 'storm',
      mode: 'frozen',
    });
    // Field-deviation stays SkyExposed-gated (Wave-1 preserved); the pin's
    // precipitation reaches indoors via the resolve, but the temperature
    // fold does not.
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(BASE_T);
  });

  it('regression: a no-pin SkyExposed scope is byte-identical to baseline', async () => {
    const room = skyRoom();
    const d = WEATHER_PROFILES.storm.deviation;
    // Unchanged from the pre-Wave-2 fold: procgen deviation, not a pin.
    // Measured as a DELTA against the same clock (see `solarBaseT`).
    const clearT = await solarBaseT(room);
    WeatherApi._forceTypeForTesting('storm'); // no pin set
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBeCloseTo(
      clearT + d.temperature.rawValue(),
      6,
    );
  });
});
