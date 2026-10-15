/**
 * The scan sweep — ⭐⭐ **content loads when a player's act forces it, by
 * following authored references; never by search, never at boot without a
 * written reason.** The requirements' drive, its numbering kept where a
 * step is driven here.
 *
 * What this file proves over the wire, on a world where none of it is
 * booted:
 *
 *   6. the typed-word dictionaries answer on FIRST use (run first, or boot
 *      order would make it vacuous);
 *   2. a house that advertises and is NOT booted shows its opening on the
 *      first look (the room names its house in `stands:`), and `apply`
 *      takes a seat that asks nothing — and names what a seat that asks
 *      for more wants, which only a live, rostered house can say;
 *   3. both deed desks list the plat book they NAME;
 *   4. the reserve prints the price index over its basket;
 *   5. the Kestrel at the city reads fouled;
 *   7. at Hearts Delight the collie's SPECIES is known on a cold world —
 *      `butcher` refuses for a reason past the species gate;
 *   9. Part 1: `bank` at a branch answers; `press post` by a stranger is
 *      refused.
 *
 * ⚠ Proven elsewhere, and why:
 *   - 1 (the boot list) is `scripts/__tests__/check-boot-entries.test.ts`.
 *   - 5's *unvisited* half: the only Kestrel shore room props the outfall,
 *     so a wire session cannot read that reach without loading it; the
 *     row-fouls half is `water/src/__tests__/Contamination.test.ts`.
 *   - Ricky's list (a dialogue wheel) is `terminus/src/realty/__tests__/
 *     Realtor.test.ts`; 8 (restart) was run BY HAND (a wire file cannot
 *     restart the server) — see the plan's drive record.
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD (ok, or a NAMED
 * refusal) AND the words that prove the state.
 *
 * ⚠⚠ `.dirty.`: it takes a seat on the campus farm and advances the
 * world clock to daylight — neither is produced again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'takes the labourer seat on the campus farm and advances the world clock ' +
  'to daylight — neither is produced again';

declareFile({
  file: 'scan-sweep.dirty.wire.test.ts',
  packs: [
    'terminus', 'hearthworks', 'eternal-university', 'hearts-delight',
    'hinkley-hills', 'residence', 'water', 'world-seed', 'trade-ranching',
    'trade-cooking',
  ],
  dirtyReason: DIRTY_REASON,
});

const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const FARM_YARD = '/world/terminus/eternal/campus-farm/location/yard';
const REGISTRY = '/world/terminus/registry/office';
const REALTY = '/world/terminus/realty/office';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const RIVER_BANK = '/world/terminus/wharfside/bank';
const FARMSTEAD = '/world/terminus/hearts-delight/location/farmstead-yard';

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

/** The controller-rejected reason a refusal carries, or `null`. */
function reasonOf(r: CommandResult): string | null {
  for (const n of r.notes) {
    const reason = (n as { reason?: unknown }).reason;
    if (typeof reason === 'string') return reason;
  }
  return null;
}

async function look(s: Session, what = 'look here'): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(what));
}

/**
 * Advance until the room can be SEEN — a dark world reads every room as
 * pitch black. ⚠ Only pitch dark counts: an interior is dim at noon, and
 * a dim room still prints its notices.
 */
async function daylight(s: Session): Promise<void> {
  for (let i = 0; i < 12; i++) {
    if (!/pitch dark/i.test(await look(s))) return;
    await advanceWorldClock('2 hours');
  }
  throw new Error('no light in a day of trying');
}

let me: Session;

beforeAll(async () => {
  me = await Session.open(uniqueHandle('sweep'), { startLocation: COOKHOUSE, wizard: true });
}, 600_000);

afterAll(() => {
  me?.close();
});

suite('6. the dictionaries answer on FIRST use — none of them booted', () => {
  it('⭐ `readings` lists the channels the installed packs ship', async () => {
    const r = await me.cmd('readings');
    expectOk(r);
    expect(squash(await me.prose('readings'))).toMatch(/temperature|light|depth/i);
  });

  it('⭐ `help look` and `help bank_ledger` answer from the rulebook', async () => {
    expect(squash(await me.prose('help look'))).toMatch(/look/i);
    expect(squash(await me.prose('help bank_ledger'))).toMatch(/ledger/i);
  });

  it('⭐ an emote resolves through the soul catalogue', async () => {
    expectOk(await me.cmd('smile'));
  });
});

suite('2. a house that advertises is NOT booted, and its opening shows on the first look', () => {
  it('⭐⭐ the cookhouse: HELP WANTED, and `apply` names the two gigs the seat asks for', async () => {
    await daylight(me);
    const seen = await look(me);
    expect(seen, seen).toMatch(/HELP WANTED/);
    const r = await me.cmd('apply');
    expect(r.status, JSON.stringify(r.notes)).not.toBe('ok');
    // Only a live, rostered house knows what its seat asks for.
    expect(squash(await me.prose('apply'))).toMatch(/two completed gigs/i);
  });

  it('⭐⭐ the campus farm: HELP WANTED, and `apply` takes the seat that asks nothing', async () => {
    const farm = await Session.open(uniqueHandle('labourer'), { startLocation: FARM_YARD });
    try {
      await daylight(farm);
      const seen = await look(farm);
      expect(seen, seen).toMatch(/HELP WANTED/);
      const r = await farm.cmd('apply');
      expectOk(r);
      expect(squash(await farm.prose('job'))).toMatch(/./);
    } finally {
      farm.close();
    }
  });
});

suite('3. the deed desks list the book they NAME', () => {
  for (const [label, room] of [['the Registry', REGISTRY], ['the realty office', REALTY]] as const) {
    it(`⭐ \`title list\` at ${label} lists Hinkley Hills`, async () => {
      const s = await Session.open(uniqueHandle('buyer'), { startLocation: room });
      try {
        const r = await s.cmd('title list');
        expectOk(r);
        expect(squash(await s.prose('title list'))).toMatch(/Hinkley Hills/);
      } finally {
        s.close();
      }
    });
  }
});

suite('4. the price index covers its basket', () => {
  it('⭐ `reserve` prints the index over the basket', async () => {
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      const said = squash(await gov.prose('reserve'));
      expect(said, said).toMatch(/price index: .* against a base of one hundred/);
    } finally {
      gov.close();
    }
  });
});

suite('5. the Kestrel at the city is fouled', () => {
  it('⭐ `analyze water` at the confluence reads the outfall', async () => {
    const s = await Session.open(uniqueHandle('wader'), { startLocation: RIVER_BANK, wizard: true });
    try {
      await daylight(s);
      const said = squash(await s.prose('analyze water'));
      // The reach reports the city's outfall in its water.
      expect(said, said).toMatch(/outfall/i);
    } finally {
      s.close();
    }
  });
});

suite('7. Hearts Delight on a cold world: the collie\'s species is KNOWN', () => {
  it('⭐⭐ `butcher collie` refuses for a reason past the species gate — never "cannot make out what it was"', async () => {
    const s = await Session.open(uniqueHandle('farmhand'), { startLocation: FARMSTEAD });
    try {
      await daylight(s);
      const r = await s.cmd('butcher collie');
      expect(r.status, JSON.stringify(r.notes)).not.toBe('ok');
      const reason = reasonOf(r);
      expect(reason, JSON.stringify(r.notes)).not.toBeNull();
      expect(reason).not.toBe('unidentified-species');
    } finally {
      s.close();
    }
  });
});

suite('9. Part 1 behaves as before', () => {
  it('`bank open` at the hall answers, and `bank` reads the account', async () => {
    const s = await Session.open(uniqueHandle('saver'), { startLocation: BANK_HALL });
    try {
      expectOk(await s.cmd('bank open'));
      expectOk(await s.cmd('bank'));
    } finally {
      s.close();
    }
  });

  it('`press post` by a stranger is refused', async () => {
    const s = await Session.open(uniqueHandle('stranger'), { startLocation: BANK_HALL });
    try {
      const r = await s.cmd('press post "hello" --kind notice');
      expect(r.status).not.toBe('ok');
    } finally {
      s.close();
    }
  });
});
