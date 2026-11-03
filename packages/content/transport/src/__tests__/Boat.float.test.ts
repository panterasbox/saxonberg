/**
 * Boat — ⭐ load and swamping, and the hire (harbors B3, P18, P22).
 *
 * - her freeboard IS her capacity: loaded past it, afloat, she swamps
 *   where she lies; ashore nothing happens;
 * - otherwise the water's roughness must top what freeboard her load has
 *   left her — at a sea patch, the sea state (a pinned storm's chop);
 * - a hire ends when she is put down on the landing she was let from.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WaterExpanse from '@saxonberg/content-water/src/idea/WaterExpanse';
import WaterBand from '@saxonberg/content-water/src/idea/WaterBand';
import SeaPatch from '@saxonberg/content-water/src/location/SeaPatch';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Boat from '../thing/Boat';

const SEA = '/test/sea/grey';
const ORIGIN = new GeoPosition(50, 0);

/** A chart point as the graph authors it: range (m) and bearing from the origin. */
function focusAt(latDeg: number, lonDeg: number): { rho: number; theta: number } {
  const p = new GeoPosition(latDeg, lonDeg);
  return { rho: ORIGIN.distanceNm(p) * 1852, theta: ORIGIN.bearingTo(p) };
}

/** A rowboat's hull (the kind row's numbers). */
function rowboat(): Boat {
  const boat = makeStuff(() => new Boat());
  boat.setHull({ form: 'round', draftM: 0.25, beamM: 1.3, lengthM: 4.5, freeboardM: 0.4, capacityKg: 500 });
  return boat;
}

/** Give her `kg` of load and put her in `room`. */
function lay(boat: Boat, room: Stuff, kg: number): void {
  vi.spyOn(boat, 'getContainer').mockReturnValue(room as never);
  vi.spyOn(boat, 'getContents').mockReturnValue(
    kg > 0 ? [{ getMass: () => ({ rawValue: () => kg }) } as never] : [],
  );
  vi.spyOn(MixinApi, 'isTangible').mockImplementation(((x: Stuff) => 'getMass' in x) as never);
}

/** The water beside a ship stopped at sea, on a sea with a long fetch over deep water. */
function seaPatch(): SeaPatch {
  const sea = makeStuffAtPath(() => new WaterExpanse(), SEA);
  sea.setOrigin(ORIGIN);
  const band = makeStuffAtPath(() => new WaterBand(), `${SEA}/open`);
  band.setExtent({ kind: 'belt', from: focusAt(49, -30), to: focusAt(51, 30) });
  band.setFetchKm(150);
  band.setDepthM(80);
  const live = new Map<string, Stuff>([[SEA, sea], [`${SEA}/open`, band]]);
  vi.spyOn(Template, 'findDescendants').mockImplementation(async () =>
    [`${SEA}/open`].map((path) => ({ path, data: {} }) as unknown as Template),
  );
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
    const s = live.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s as never;
  });
  const patch = seaWater();
  patch.setExpanse(SEA);
  patch.setExpansePosition(ORIGIN);
  return patch;
}

/** The weather pinned to a wind, m/s, everywhere. */
function wind(mps: number): void {
  vi.spyOn(WeatherApi, 'deviatedFieldFor').mockReturnValue({ rawValue: () => mps } as never);
}

/** A patch of sea as the warren mints one: its water stamped, with its depth. */
function seaWater(): SeaPatch {
  const p = makeStuff(() => new SeaPatch());
  p.setWater({ of: '/test/sea', depthM: 20 });
  return p;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('Boat — load and swamping (harbors P22)', () => {
  it('⭐ afloat and loaded past her freeboard, she swamps where she lies', async () => {
    const boat = rowboat();
    const water = seaWater();
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(true);
    const over = vi.spyOn(boat, 'capsize');
    // 4.5 × 1.3 × 0.7 × 1000 = 4,095 kg a meter: 2,000 kg takes 0.49 m.
    lay(boat, water, 2000);
    expect(boat.freeboardNowM()).toBeLessThanOrEqual(0);
    expect(await boat.reconcileFloat()).toBe(true);
    expect(over).toHaveBeenCalledWith('She is loaded past her freeboard.');
  });

  it('ashore — on a landing, a deck — she floats on nothing, and nothing happens', async () => {
    const boat = rowboat();
    const shingle = seaWater();
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(false);
    const over = vi.spyOn(boat, 'capsize');
    lay(boat, shingle, 2000);
    expect(await boat.reconcileFloat()).toBe(false);
    expect(over).not.toHaveBeenCalled();
  });

  it('⭐⭐ at a sea patch, a chop that an empty boat rides tops the freeboard of a loaded one; a storm swamps her outright', async () => {
    const patch = seaPatch();
    wind(5); // a fresh breeze over 150 km of fetch: a slight sea
    const empty = rowboat();
    lay(empty, patch, 0);
    expect(await empty.reconcileFloat()).toBe(false);

    const loaded = rowboat();
    const over = vi.spyOn(loaded, 'capsize');
    lay(loaded, patch, 1000); // ~0.24 m of her 0.4 gone
    expect(loaded.freeboardNowM()).toBeGreaterThan(0);
    expect(await loaded.reconcileFloat()).toBe(true);
    expect(over.mock.calls[0]![0]).toMatch(/comes in over her gunwale/);

    wind(25); // a pinned storm
    const third = rowboat();
    lay(third, patch, 160);
    expect(await third.reconcileFloat()).toBe(true);
  });

  it('a look says how low her load has her riding', () => {
    const boat = rowboat();
    lay(boat, seaWater(), 0);
    expect(boat.describeBoat()).toEqual([]);
    vi.restoreAllMocks();
    lay(boat, seaWater(), 1000);
    expect(boat.describeBoat().join(' ')).toMatch(/riding low/);
  });
});

describe('Boat — the hire (harbors P18)', () => {
  it('⭐ the hire ends when she is put down on the landing she was let from — anywhere else, she is still out', () => {
    const boat = rowboat();
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(false);
    // The hire is laid as `rent` leaves it (hireTo is gated to RentController;
    // the hydrator's own field is the seam — the kernel suite pins the act).
    (boat as unknown as { hire: unknown }).hire = { id: 'h1', by: '/platform/agent/Avatar/ann', byName: 'Ann', untilS: 2 * 86_400, home: '/test/put-in', letter: '/test/counter' };
    expect(boat.isHired()).toBe(true);
    expect(boat.describeBoat()).toContain('She is out on hire to Ann.');

    const stop = makeStuffAtPath(() => new SeaPatch(), '/test/reach/stop');
    boat.onMoved(null, stop as never);
    expect(boat.isHired()).toBe(true);

    const home = makeStuffAtPath(() => new SeaPatch(), '/test/put-in');
    boat.onMoved(stop as never, home as never);
    expect(boat.isHired()).toBe(false);
    expect(boat.hiredUntilS()).toBeNull();
  });
});
