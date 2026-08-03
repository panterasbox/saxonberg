/**
 * Weather per-locality — the procedural seed derives from the covering
 * Locality's claimed address (D1). Different Localities / Region roots
 * diverge; the same address yields identical weather; `null` (no covering
 * Locality) is the single global field, reached through
 * `AddressApi.resolveLocalityFor` (Acceptance: Per-locality).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../weather';
import { AddressApi } from '../address';
import { WorldClockApi } from '../worldclock';
import { StuffApi } from '../stuff';
import { Quantity } from '../../lib/quantity';
import Locality from '../../obj/Locality';
import Location from '../../lib/stuff/Location';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import {
  WEATHER_DEFAULTS,
  type WeatherType,
} from '../../lib/weather/WeatherType';

const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

class TestLocation extends Location {}

function locality(address: string): Locality {
  const l = makeStuff(() => new Locality());
  l.setAddress(address);
  return l;
}

/** The type sequence a locality produces over the first N segments. */
function sequence(loc: Locality | null, n: number): WeatherType[] {
  const out: WeatherType[] = [];
  for (let seg = 0; seg < n; seg++) {
    out.push(
      WeatherApi.weatherAt(Quantity.of(seg * SEG + 1, 's'), loc).type,
    );
  }
  return out;
}

describe('Weather per-locality seed', () => {
  afterEach(() => {
    WeatherApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('different Localities produce different weather sequences', () => {
    const castle = locality('narnia/castle');
    const wild = locality('narnia/wild');
    const a = sequence(castle, 200);
    const b = sequence(wild, 200);
    expect(a).not.toEqual(b);
  });

  it('two Localities claiming the same address share weather (seed from address)', () => {
    const one = locality('narnia/castle');
    const two = locality('narnia/castle');
    expect(sequence(one, 150)).toEqual(sequence(two, 150));
  });

  it('a Locality diverges from the global (null) field', () => {
    const narnia = locality('narnia');
    expect(sequence(narnia, 200)).not.toEqual(sequence(null, 200));
  });

  it('the global field is stable across calls', () => {
    expect(sequence(null, 120)).toEqual(sequence(null, 120));
  });

  it('a scope with no covering Locality resolves the global field via AddressApi', async () => {
    WorldClockApi._resetForTesting(); // pin now = 0
    const room = makeStuff(() => new TestLocation());
    const resolved = await AddressApi.resolveLocalityFor(room);
    expect(resolved).toBeNull(); // no registry / no declared address

    const sample = await WeatherApi.sampleFor(room);
    const global = WeatherApi.weatherAt(WorldClockApi.getNow(), null);
    // The scope's sample uses the same (global) seed as the null field.
    expect(sample.type).toBe(global.type);
    expect(sample.segmentIndex).toBe(global.segmentIndex);
  });
});
