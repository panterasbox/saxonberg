/**
 * ⭐ The positional lean (maritime R10): a scope aboard a craft inside a
 * fog band rolls the weather with the band's `weatherLean` multiplied
 * over its Locality's — so the haar's sky reads fog with nothing anywhere
 * authoring *foggy*. Ashore (no lean under the place) the field is the
 * Locality's alone.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Place from '../../../../lib/stuff/Place';
import { WeatherApi } from '../../../../api/weather';
import { BiomeApi } from '../../../../api/biome';
import { AddressApi } from '../../../../api/address';
import { ExpanseApi } from '../../../../api/expanse';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

let lean: Record<string, number> | null = null;
let nowS = 0;

beforeEach(() => {
  StuffApi.clearAll();
  lean = null;
  vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
  vi.spyOn(ExpanseApi, 'leanAtSync').mockImplementation(() => lean as never);
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
});
afterEach(() => vi.restoreAllMocks());

describe('the positional lean', () => {
  it('⭐ inside the haar the sky reads fog, segment after segment; ashore it is the climate\'s', async () => {
    const deck = makeStuffAtPath(() => new Place(), '/test/ship/deck');
    const seen = new Set<string>();
    lean = { fog: 1e6 };
    for (let seg = 0; seg < 12; seg++) {
      nowS = seg * 6 * 3600 + 60;
      seen.add((await WeatherApi.skyReadFor(deck)).currentType);
    }
    expect([...seen]).toEqual(['fog']);
    expect(ExpanseApi.leanAtSync).toHaveBeenCalledWith('/test/ship/deck');

    lean = null;
    const ashore = new Set<string>();
    for (let seg = 0; seg < 24; seg++) {
      nowS = seg * 6 * 3600 + 60;
      ashore.add((await WeatherApi.skyReadFor(deck)).currentType);
    }
    expect(ashore.size).toBeGreaterThan(1);
  });

  it('a lean resolves as `climate-leaned`', async () => {
    const deck = makeStuffAtPath(() => new Place(), '/test/ship/deck');
    lean = { fog: 4 };
    expect((await WeatherApi.resolveWeatherFor(deck)).provenance).toBe('climate-leaned');
    lean = null;
    expect((await WeatherApi.resolveWeatherFor(deck)).provenance).toBe('procgen');
  });
});
