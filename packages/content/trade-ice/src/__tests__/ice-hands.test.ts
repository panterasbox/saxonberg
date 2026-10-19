/**
 * ⭐⭐ The ice crew and the boss, beat by beat (`IceHand` + the two brains).
 *
 * The pre-merge sweep found the Hollow Mere crew had never once worked the
 * ice: seats off for the autumn ice, a station ON the water, a crew stuck
 * in it, a bare `north` no NPC could say. Each was found by driving — but
 * a drive's months-long clock jumps race the real-time brain beats and
 * hourly roster ticks, so a drive cannot pin WHAT A HAND DOES ON A BEAT.
 * This file does, one beat at a time, against a stub world (a shore, a
 * mere with a sheet whose readings the test sets, a hand that records the
 * commands it is forced to give):
 *
 *  1. On shift at the bank, out onto the ice only when it is READY — the
 *     boss at his margin, the crew on the boss's grid — by `go <out>`.
 *  2. In the water: haul out (`stand`) where the ice bears, else swim back.
 *  3. OFF shift and still on the mere: back to the bank — walking on ice
 *     that holds, swimming water that does not.
 *  4. On the ice, the boss scrapes and scores the grid; the crew cuts.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';
import { brain as Bosses } from '../behavior/bosses';
import { brain as Harvests } from '../behavior/harvests';

const SHORE = '/world/test/shore';
const POOL = '/world/test/pool';
const CONFIG = { pool: POOL, shore: SHORE, out: 'north', back: 'south', marginKg: 200 };

interface World {
  /** What the sheet bears, kg. */
  bearsKg: number;
  /** Whether the sheet is holding the hand up. */
  supported: boolean;
  /** The sheet's log. */
  log: { kind: string; areaM2: number }[];
}

let world: World;
let shore: { getTemplatePath(): string; getFloor(): null };
let pool: { getTemplatePath(): string; getFloor(): IceSheet };
let sheet: IceSheet;

function hand(where: 'shore' | 'pool', shift: 'on-shift' | 'off-shift') {
  const said: string[] = [];
  const host = {
    getContainer: () => (where === 'shore' ? shore : pool),
    shiftState: () => shift,
    forceCommand: async (c: string) => void said.push(c),
  };
  return { host, said };
}

const beat = async (b: { act(ctx: never): Promise<void> }, host: unknown): Promise<void> =>
  b.act({ host, config: CONFIG } as never);

beforeEach(() => {
  world = { bearsKg: 0, supported: false, log: [{ kind: 'field', areaM2: 100 }] };
  sheet = Object.create(IceSheet.prototype) as IceSheet;
  Object.assign(sheet, {
    supports: () => world.supported,
    bears: (kg: number) => world.bearsKg >= kg,
    supportLoadKgOf: () => 90,
    getLog: () => world.log,
  });
  shore = { getTemplatePath: () => SHORE, getFloor: () => null };
  pool = { getTemplatePath: () => POOL, getFloor: () => sheet };
  for (const p of ['isCommandGiver', 'isContainable', 'isEmployed', 'isAdornable'] as const) {
    vi.spyOn(MixinApi, p).mockReturnValue(true as never);
  }
  vi.spyOn(StuffApi, 'singleton').mockResolvedValue(pool as never);
});

afterEach(() => vi.restoreAllMocks());

describe('1. waiting on the bank, out when the ice is ready', () => {
  it('the boss walks out (`go north`) only when the field bears his margin', async () => {
    const { host, said } = hand('shore', 'on-shift');
    world.bearsKg = 150;
    await beat(Bosses, host);
    expect(said).toEqual([]);
    world.bearsKg = 250;
    await beat(Bosses, host);
    expect(said).toEqual(['go north']);
  });

  it('the crew waits for the boss\'s grid, then walks out', async () => {
    const { host, said } = hand('shore', 'on-shift');
    world.bearsKg = 500;
    await beat(Harvests, host);
    expect(said).toEqual([]);
    world.log.push({ kind: 'marked', areaM2: 4 });
    await beat(Harvests, host);
    expect(said).toEqual(['go north']);
  });

  it('nobody walks out from anywhere but the bank', async () => {
    const { host, said } = hand('shore', 'on-shift');
    shore.getTemplatePath = () => '/world/test/shed';
    world.bearsKg = 500;
    await beat(Bosses, host);
    expect(said).toEqual([]);
  });
});

describe('2. in the water', () => {
  it('hauls out where the ice bears, swims back where it does not', async () => {
    const { host, said } = hand('pool', 'on-shift');
    world.supported = false;
    world.bearsKg = 500;
    await beat(Harvests, host);
    world.bearsKg = 10;
    await beat(Harvests, host);
    expect(said).toEqual(['stand', 'swim south']);
  });
});

describe('3. off shift and still on the mere', () => {
  it('walks back on ice that holds, swims water that does not; nothing from the bank', async () => {
    const { host, said } = hand('pool', 'off-shift');
    world.supported = true;
    await beat(Bosses, host);
    world.supported = false;
    await beat(Harvests, host);
    expect(said).toEqual(['go south', 'swim south']);
    const home = hand('shore', 'off-shift');
    await beat(Bosses, home.host);
    expect(home.said).toEqual([]);
  });
});

describe('4. on the ice', () => {
  it('the boss scrapes and scores the first grid when the ice bears the margin', async () => {
    const { host, said } = hand('pool', 'on-shift');
    world.supported = true;
    world.bearsKg = 250;
    await beat(Bosses, host);
    expect(said).toEqual(['scrape', 'mark scraped']);
  });

  it('the crew scrapes, then cuts the boss\'s grid', async () => {
    const { host, said } = hand('pool', 'on-shift');
    world.supported = true;
    world.bearsKg = 500;
    world.log.push({ kind: 'marked', areaM2: 4 });
    await beat(Harvests, host);
    world.log.push({ kind: 'scraped', areaM2: 4 });
    await beat(Harvests, host);
    expect(said).toEqual(['scrape', 'cut marked']);
  });
});
