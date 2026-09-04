/**
 * The ford — ⭐ **a road that changes with the season**, and the whole of
 * it is a number the water system already computes.
 *
 * The claims:
 *
 *  - passability is READ from flow at a reach, not authored anywhere;
 *  - it flips both ways across the threshold, so a spring rise closes a
 *    crossing a dry August opens;
 *  - the answer is memoised on the SAME six-game-hour weather segment
 *    the catalogue itself memoises on, so two reads inside one segment
 *    cannot disagree;
 *  - an install with **no water pack** has a ford that is simply always
 *    passable — the honest degradation, and what keeps `transport` free
 *    of a dependency on `water` for one crossing;
 *  - a closed ford refuses with a reason that **names the water**.
 *
 * ⚠ The flow source here is a stand-in with a seasonal shape, not the
 * real Kestrel: what is under test is the MECHANISM (flow in, passability
 * out). That the authored threshold sits inside the Delight's real range
 * is a content fact, checked over the shipped rows in
 * `logistics-corridors.test.ts` and exercised for real by the drive.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import FordExit from '../idea/FordExit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { installModes } from './transport-fixtures';

const CATALOGUE = '/system/water/idea/WatercourseCatalogue';
const REACH = 'delight:mouth';
const HOUR = 3_600;

/** A stand-in for the water pack's catalogue, answering by SHAPE. */
class FakeWater extends Idea {
  static _mixinName = 'FakeWater';
  public m3s = 1;
  public asked: string[] = [];
  async flowAt(ref: string, _nowS: number): Promise<{ m3s: number } | null> {
    this.asked.push(ref);
    return { m3s: this.m3s };
  }
}

let water: FakeWater;

function installWater(): FakeWater {
  water = makeStuffAtPath(() => new FakeWater(), CATALOGUE);
  const real = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) =>
    path === CATALOGUE
      ? Promise.resolve(water as unknown as Stuff)
      : real(path)) as typeof StuffApi.singleton);
  return water;
}

/** A ford between two rooms, flooding above 12 m³/s. */
function ford(): FordExit {
  const zone = makeStuff(() => new CartesianZone());
  const here = makeStuff(() => new SingletonCartesianLocation());
  const there = makeStuff(() => new SingletonCartesianLocation());
  zone.addLocation(here, 0, 0, 0);
  zone.addLocation(there, 0, 1, 0);
  return makeStuff(
    () =>
      new FordExit({
        direction: 'south',
        source: here as never,
        destination: there as never,
        media: ['ground'],
        crossesReach: REACH,
        floodThresholdM3S: 12,
      }),
  );
}

/** Park the world clock at a fixed game time. */
function at(gameSeconds: number): void {
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(
    Quantity.of(gameSeconds, 's'),
  );
}

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
  at(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a ford reads the river', () => {
  it('⭐ closes when the water is up and opens when it is down', async () => {
    const w = installWater();
    const f = ford();

    // August: the stones are dusty.
    w.m3s = 2;
    at(1 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);

    // The melt: the ford is up.
    w.m3s = 30;
    at(100 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(true);

    // …and it opens again, which is the half that makes it a season
    // rather than a one-way switch.
    w.m3s = 3;
    at(200 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);

    // The reading came from the reach the ford declares, every time.
    expect(new Set(w.asked)).toEqual(new Set([REACH]));
  });

  it('the refusal names the water, not "the way"', async () => {
    const w = installWater();
    const f = ford();
    w.m3s = 30;
    await f.refreshCrossing();
    const guard = f.canTraverse({} as Stuff & Containable, 'walk');
    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.reason).toMatch(/ford is up/);
    expect(guard.reason).not.toMatch(/The way is blocked/);
  });

  it('two reads inside one weather segment agree exactly', async () => {
    const w = installWater();
    const f = ford();
    w.m3s = 2;
    at(1 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);

    // The river "rises" inside the same six-hour segment. The catalogue
    // memoises on that segment, so a ford that re-read here would
    // disagree with `measure` about the same water at the same moment.
    w.m3s = 30;
    at(3 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);

    // The next segment picks it up.
    at(9 * HOUR);
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(true);
  });

  it('⚠ with no water pack installed, a ford is just a road', async () => {
    // No catalogue registered — `StuffApi.singleton` fails to resolve it.
    const f = ford();
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);
    expect(f.canTraverse({} as Stuff & Containable, 'walk').ok).toBe(true);
  });

  it('a ford that names no reach never closes', async () => {
    installWater().m3s = 999;
    const f = makeStuff(() => new FordExit());
    await f.refreshCrossing();
    expect(f.isBlocked()).toBe(false);
  });

  it('applyTraversal refreshes and NEVER handles the traversal itself', async () => {
    const w = installWater();
    const f = ford();
    w.m3s = 30;
    // Returning true would mean "I moved them" — the ford never does.
    // It refreshes, returns false, and lets the ordinary `blocked` gate
    // do the refusing with the reason above.
    expect(await f.applyTraversal({} as Stuff)).toBe(false);
    expect(f.isBlocked()).toBe(true);
  });

  it('the threshold is validated — a negative flood level is an authoring error', () => {
    const f = makeStuff(() => new FordExit());
    expect(() => f.setFloodThresholdM3S(-1)).toThrow(TypeError);
    expect(() => f.setFloodThresholdM3S(Number.NaN)).toThrow(TypeError);
  });
});
