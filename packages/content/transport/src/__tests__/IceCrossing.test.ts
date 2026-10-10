/**
 * The ice crossing (the climate build, W8) — a road the ice OPENS: across
 * iff the sheet on the reach bears the mover, refusing in words that say
 * what is wrong with the ice; a wall with no water pack behind it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import IceCrossingExit from '../idea/IceCrossingExit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { installModes } from './transport-fixtures';

const CATALOGUE = '/system/water/idea/WatercourseCatalogue';
const REACH = 'circlemere:mere';

interface Ice {
  thicknessM: number;
  bearsKg: number;
  rotting: boolean;
  reason: 'running' | 'warm' | null;
}

class FakeWater extends Idea {
  static _mixinName = 'FakeIceWater';
  public ice: Ice = { thicknessM: 0, bearsKg: 0, rotting: false, reason: 'warm' };
  async iceAt(_ref: string, _nowS: number): Promise<Ice | null> {
    return this.ice;
  }
}

let water: FakeWater;
function installWater(): FakeWater {
  water = makeStuffAtPath(() => new FakeWater(), CATALOGUE);
  const real = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) =>
    path === CATALOGUE ? Promise.resolve(water as unknown as Stuff) : real(path)) as typeof StuffApi.singleton);
  return water;
}

function crossing(): IceCrossingExit {
  const zone = makeStuff(() => new CartesianZone());
  const here = makeStuff(() => new SingletonCartesianLocation());
  const there = makeStuff(() => new SingletonCartesianLocation());
  zone.addLocation(here, 0, 0, 0);
  zone.addLocation(there, 0, 1, 0);
  return makeStuff(
    () =>
      new IceCrossingExit({
        direction: 'across',
        source: here as never,
        destination: there as never,
        media: ['ground'],
        crossesReach: REACH,
      }),
  );
}

/** A mover of `kg`. */
function body(kg: number): Stuff {
  const s = makeStuff(() => new Idea()) as unknown as Stuff & { getMass(): Quantity<'kg'> };
  (s as unknown as { getMass: () => Quantity<'kg'> }).getMass = () => Quantity.of(kg, 'kg');
  return s;
}

const reasonOf = (x: IceCrossingExit): string => {
  const g = x.canTraverse({} as Stuff & Containable, 'walk');
  return g.ok ? '' : g.reason;
};

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(1000, 's'));
  vi.spyOn(MixinApi, 'isTangible').mockImplementation(((s: Stuff) =>
    typeof (s as unknown as { getMass?: unknown }).getMass === 'function') as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('an ice crossing reads the sheet', () => {
  it('⭐ open water refuses; a bearing sheet lets a person across', async () => {
    const w = installWater();
    const x = crossing();
    await x.applyTraversal(body(80));
    expect(x.isBlocked()).toBe(true);
    expect(reasonOf(x)).toMatch(/water is open/);

    w.ice = { thicknessM: 0.1, bearsKg: 250, rotting: false, reason: null };
    await x.applyTraversal(body(80));
    expect(x.isBlocked()).toBe(false);
  });

  it('bears a person and refuses a horse — the answer is the mover\'s', async () => {
    const w = installWater();
    const x = crossing();
    w.ice = { thicknessM: 0.1, bearsKg: 250, rotting: false, reason: null };
    await x.applyTraversal(body(80));
    expect(x.isBlocked()).toBe(false);
    await x.applyTraversal(body(500));
    expect(x.isBlocked()).toBe(true);
    expect(reasonOf(x)).toMatch(/would not bear you/);
  });

  it('rotten ice and running water refuse in their own words', async () => {
    const w = installWater();
    const x = crossing();
    w.ice = { thicknessM: 0.3, bearsKg: 2250, rotting: true, reason: null };
    await x.applyTraversal(body(80));
    expect(reasonOf(x)).toMatch(/rotten/);
    w.ice = { thicknessM: 0, bearsKg: 0, rotting: false, reason: 'running' };
    await x.applyTraversal(body(80));
    expect(reasonOf(x)).toMatch(/moving/);
  });

  it('the margin is added to the mover', async () => {
    const w = installWater();
    const x = crossing();
    x.setBearsMarginKg(100);
    w.ice = { thicknessM: 0.08, bearsKg: 160, rotting: false, reason: null };
    await x.applyTraversal(body(80));
    expect(x.isBlocked()).toBe(true);
  });

  it('⚠ with no water pack, the crossing is a wall', async () => {
    const x = crossing();
    await x.refreshCrossing();
    expect(x.isBlocked()).toBe(true);
    expect(reasonOf(x)).toMatch(/no crossing here/);
  });

  it('applyTraversal never handles the traversal itself', async () => {
    installWater().ice = { thicknessM: 0.2, bearsKg: 1000, rotting: false, reason: null };
    expect(await crossing().applyTraversal(body(80))).toBe(false);
  });
});
