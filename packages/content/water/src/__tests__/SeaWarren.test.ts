/**
 * SeaWarren — ⭐ the water beside a ship that has stopped (river D30): a
 * room only where she lies still, shared by ships stopped within hail of
 * one another, a way up onto each one's deck, and nothing under way.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import SeaWarren from '../idea/SeaWarren';
import SeaRoom from '../location/SeaRoom';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const SEA = '/sea';

function ship(name: string, pos: GeoPosition | null, underWay = false) {
  return {
    stuffId: name,
    getTemplatePath: () => `/ship/${name}`,
    getEntrance: () => `/ship/${name}/deck`,
    getName: () => `the ${name}`,
    getCourse: () => (underWay ? { bearingDeg: 0 } : null),
    getExpanse: () => SEA,
    getExpansePosition: () => pos,
  };
}

let ships: Record<string, ReturnType<typeof ship>> = {};
let rooms: SeaRoom[] = [];
let installed: Array<{ room: SeaRoom; direction: string; target: string }> = [];

beforeEach(() => {
  StuffApi.clearAll();
  ships = {};
  rooms = [];
  installed = [];
  vi.spyOn(NavigationApi, 'structureAt').mockImplementation((async (p: string) => {
    const name = p.split('/')[2] ?? '';
    return (ships[name] ?? null) as never;
  }) as never);
  vi.spyOn(MixinApi, 'isVoyaging').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isPositioned').mockReturnValue(true);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (row: string) => {
    if (row.endsWith('/water')) {
      const r = makeStuffAtPath(() => new SeaRoom(), row);
      vi.spyOn(r, 'installExit').mockImplementation((async (_k: string, o: { direction: string }, cfg: (e: unknown) => void) => {
        const e = { configureSea: (_w: string, t: string) => installed.push({ room: r, direction: o.direction, target: t }) };
        cfg(e);
        return e;
      }) as never);
      rooms.push(r);
      return r;
    }
    return { adopt: () => undefined };
  }) as never);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
    if (p === SEA) return { depthAt: async () => 30 };
    return { stuffId: p, getTemplatePath: () => p };
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const deck = (name: string) => ({ getTemplatePath: () => `/ship/${name}/deck` }) as unknown as Stuff;

describe('SeaWarren (river D30)', () => {
  it('⭐ a boat goes into the water beside a ship that has stopped — on the chart where she lies', async () => {
    ships.hesper = ship('hesper', new GeoPosition(42, -8.47));
    const w = makeStuff(() => new SeaWarren());
    const room = (await w.launchPlaceFor(deck('hesper'))) as unknown as SeaRoom;
    expect(room).toBeInstanceOf(SeaRoom);
    expect(room.getExpanse()).toBe(SEA);
    expect(room.getExpansePosition()!.distanceNm(new GeoPosition(42, -8.47))).toBeLessThan(0.01);
    expect(installed).toEqual([{ room, direction: 'hesper', target: '/ship/hesper/deck' }]);
  });

  it('⭐ under way she is alongside nothing', async () => {
    ships.hesper = ship('hesper', new GeoPosition(42, -8.47), true);
    const w = makeStuff(() => new SeaWarren());
    expect(await w.launchPlaceFor(deck('hesper'))).toBeNull();
  });

  it('⭐⭐ two ships stopped within hail share one room, with a way up onto each', async () => {
    ships.hesper = ship('hesper', new GeoPosition(42, -8.47));
    ships.kittiwake = ship('kittiwake', new GeoPosition(42.0001, -8.4701));
    const w = makeStuff(() => new SeaWarren());
    const a = await w.launchPlaceFor(deck('hesper'));
    const b = await w.launchPlaceFor(deck('kittiwake'));
    expect(b).toBe(a);
    expect(rooms).toHaveLength(1);
    expect(installed.map((i) => i.direction).sort()).toEqual(['hesper', 'kittiwake']);
  });

  it('ships a mile apart have water of their own', async () => {
    ships.hesper = ship('hesper', new GeoPosition(42, -8.47));
    ships.gannet = ship('gannet', new GeoPosition(42.02, -8.47));
    const w = makeStuff(() => new SeaWarren());
    expect(await w.launchPlaceFor(deck('gannet'))).not.toBe(await w.launchPlaceFor(deck('hesper')));
  });
});
