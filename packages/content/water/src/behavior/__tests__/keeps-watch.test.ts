/**
 * The hired lookout (maritime R7): on shift in the lookout seat she keeps
 * a watch and CALLS what comes into view, off the ship's head; out of the
 * seat she stands down and nobody is told anything.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import type { HorizonNews } from '@saxonberg/server/mud/lib/perception/HorizonWatch';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { brain } from '../keeps-watch';
import { BrainMoves } from '@saxonberg/server/mud/lib/behavior/BrainMoves';

const HOUSE = '/t/ship/outfit';
let job: { positionKey: string; status: string } | null;
let watch: { takeNews(): HorizonNews[] } | undefined;
let news: HorizonNews[];
let commands: string[];
let said: string[];
let host: Stuff;
let craft: Ship;

function ctx(): BrainContext {
  return {
    host,
    config: {},
    state: {},
    trigger: { source: 'cadence', raw: 'cadence:30s' },
    say: (t: string) => { said.push(t); },
    emote: async () => {},
    ...new BrainMoves(host, {}).members(),
    emoteFree: () => {},
  };
}

beforeEach(() => {
  job = { positionKey: 'lookout', status: 'on-shift' };
  news = [];
  commands = [];
  said = [];
  watch = { takeNews: () => { const n = news; news = []; return n; } };
  host = {
    isDestroyed: () => false,
    getEngagementByType: () => watch,
    getEmployment: (p: string) => (p === HOUSE ? job : null),
    executeCommand: async (c: string) => { commands.push(c); },
    getRootContainer: () => ({ getTemplatePath: () => '/t/ship/deck', getDurableHandle: () => null }),
  } as unknown as Stuff;
  vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isCommandGiver').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
  craft = makeStuff(() => new Ship());
  craft.setHouse(HOUSE);
  craft.setCourse({ bearingDeg: 0, speedKn: 6, node: null });
  vi.spyOn(ExpanseApi, 'craftAt').mockResolvedValue(craft as never);
});
afterEach(() => vi.restoreAllMocks());

describe('keeps-watch', () => {
  it('⭐ on shift as lookout: calls each new sighting off the ship\'s head', async () => {
    news = [
      { change: 'sighted', name: 'the light on Gannet Rock', bearingDeg: 40, rangeNm: 14 },
      { change: 'lost', name: 'the brig', bearingDeg: 180, rangeNm: 9 },
    ];
    await brain.act(ctx());
    expect(said).toEqual(['The light on Gannet Rock, on the starboard bow!']);
  });

  it('takes up the watch when she has none', async () => {
    watch = undefined;
    await brain.act(ctx());
    expect(commands).toEqual(['watch horizon']);
  });

  it('⛔ out of the seat (or off shift) she stands down and says nothing', async () => {
    job = { positionKey: 'lookout', status: 'off-shift' };
    news = [{ change: 'sighted', name: 'the light', bearingDeg: 0, rangeNm: 9 }];
    await brain.act(ctx());
    expect(commands).toEqual(['watch off']);
    expect(said).toEqual([]);
  });

  it('at anchor (no course) she calls by the compass', () => {
    expect(brain.where(90, null)).toBe('to the east');
    expect(brain.where(270, 0)).toBe('abeam to port');
    expect(brain.where(175, 0)).toBe('astern');
  });
});
