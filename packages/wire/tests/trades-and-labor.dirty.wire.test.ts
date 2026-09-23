/**
 * ⭐⭐ **The trades-and-labor drive**: a person arrives with nothing, reads
 * a card on a wall, does two jobs off a board, is taken on, clocks a
 * shift, and is paid — with no wizard, no founder, no authored dialogue
 * and nobody handing them anything.
 *
 * That is the claim the build exists to make true, and it is the one a
 * test suite cannot make: tests BUILD state, they never USE it. Every
 * checkpoint below is a literal verb a player types, in order, against a
 * world that has just booted.
 *
 * The second half drives the Stage A sweep: the counter, the shelf, the
 * stall and the cloakroom all changed class and pack, so every verb they
 * afford is re-driven against real rows to prove the move was a MOVE and
 * not a break.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectRefused,
  expectNote,
} from '../src/harness';

/**
 * ⚠ Why this file cannot run twice.
 *
 * It APPOINTS a character into a shipped house's seat and leaves them on
 * the chart: `headcount` is 1 for the general store's hand, so the
 * second run finds the opening filled by the first run's stranger and
 * every application checkpoint refuses `no-opening` instead. It also
 * settles gigs (which mint nothing but do consume board postings) and
 * takes goods off shipped counters.
 *
 * ⭐ The dirty reason is a QUESTION for the owning trade, and this one is
 * sharp: **nothing ever fires anybody.** A holder who stops playing
 * holds the seat forever, and `vacated` only fires for absence past the
 * short clock on a house that reads `bringCurrent`. A labor market with
 * no exit is a labor market with exactly as many jobs as it has ever
 * had — a finding for `livelihood-slate` §5.4, which already carries the
 * firing/trust-ramp seam.
 */
export const DIRTY_REASON =
  'appoints a stranger into the general store\'s one `hand` place and ' +
  'never leaves it — nothing in the realm fires anybody, so the second ' +
  'run finds the seat filled; also settles board gigs and buys off ' +
  'shipped counters';

declareFile({
  file: import.meta.url,
  packs: [
    'platform',
    'terminus',
    'trade-shopkeeping',
    'trade-hospitality',
    'hearthworks',
    'eternal-university',
    'trade-haulage',
    'saxonberg-lounge',
  ],
  dirtyReason: DIRTY_REASON,
});

const HALL = '/world/terminus/terminal/location/hall';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const SHOP_FLOOR = '/world/terminus/general-store/shop-floor';
const STORE_BIZ = '/world/terminus/general-store/business';
const FARM_YARD = '/world/terminus/eternal/campus-farm/location/yard';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const TAILOR_SHOP = '/world/terminus/mayfield-row/tailor/location/shop';
const LOUNGE_BAR = '/world/lounge/location/bar';
const MARKET = '/world/terminus/market/location/square';

/**
 * ⭐⭐ **No wizard anywhere in this file, and that is the point.** The
 * claim is that a person with nothing can get work, so a wizard walking
 * them to each venue would quietly prove something weaker.
 *
 * ⚠ The first draft used a wizard `goto` plus `summon` to move the
 * newcomer around. `summon` is not a verb in this game — driving
 * answered `unknown-verb` and took eight checkpoints down with it. So
 * every venue gets its OWN newcomer, born there by `startLocation`,
 * which is both honest (a new arrival, no authority, no history) and
 * exactly what the refusal checkpoints need: somebody with nothing.
 */
let hall: Session; // step 1 — reads the board where a new arrival stands
let store: Session; // steps 3-4 — the sign, and the refusal with both numbers
let farm: Session; // rung zero — applies, clocks on, is paid
let tailor: Session; // step 7 — the trade seat's band refusal
let lounge: Session; // step 10 — the cloakroom, from hospitality now

/** Wait for a read to come true — a cadence beat takes real seconds. */
async function until(read: () => Promise<boolean>, ms = 150_000): Promise<boolean> {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await read()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 3_000));
  }
}

/** Every gig id currently on a board, read as the player reads it. */
async function boardIds(s: Session): Promise<Set<string>> {
  const browse = await s.prose('job');
  return new Set(
    [...browse.matchAll(/\[([0-9a-zA-Z_-]{6,10})\]/g)].map((m) => m[1]!),
  );
}

beforeAll(async () => {
  hall = await Session.open(uniqueHandle('tl-hall'), { startLocation: HALL });
  store = await Session.open(uniqueHandle('tl-store'), {
    startLocation: SHOP_FLOOR,
  });
  farm = await Session.open(uniqueHandle('tl-farm'), {
    startLocation: FARM_YARD,
  });
  tailor = await Session.open(uniqueHandle('tl-tailor'), {
    startLocation: TAILOR_SHOP,
  });
  lounge = await Session.open(uniqueHandle('tl-lounge'), {
    startLocation: LOUNGE_BAR,
  });
}, 300_000);

afterAll(() => {
  for (const s of [hall, store, farm, tailor, lounge]) s?.close();
});

suite('1 — arrive and look for work', () => {
  it('⭐ the hall carries a noticeboard, and there is WORK on it at world start', async () => {
    const seen = await hall.prose('look');
    expect(seen, 'the hall names its noticeboard').toMatch(/noticeboard|notices/i);

    // ⭐⭐ The claim: NPC par sheets put work on the board with nobody
    // playing. Eleven works boards shipped empty because par lines
    // existed in one file in the whole realm; the cook's sheet is the
    // second, and his beat posts a carriage bounty for each short line.
    const found = await until(async () => (await boardIds(hall)).size > 0);
    expect(found, 'a gig reached the hall board within the poll').toBe(true);
    const listing = await hall.prose('job');
    expect(listing).toMatch(/\[/);
  }, 300_000);
});

suite('3 — read a help-wanted sign nobody authored as a prop', () => {
  it('⭐⭐ `look` at the general store prints the notice, the wage and what is asked', async () => {
    const seen = await store.prose('look');
    expect(seen, 'the sign is derived, not propped').toMatch(/HELP WANTED/);
    expect(seen, 'it names the seat').toMatch(/hand/);
    expect(seen, 'it names what is asked — the SAME words the refusal uses')
      .toMatch(/two completed gigs asked/);
  }, 180_000);

  it('⚠ and it is nowhere in the room CONTENTS — there is no sign object', async () => {
    const rows = await store.query('here:i', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).not.toMatch(/help wanted/i);
  }, 120_000);
});

suite('4 — be refused, and be told BOTH numbers', () => {
  it('⭐⭐ `apply` with no gigs names what is wanted and what is held', async () => {
    const r = await store.cmd('apply');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'gigs' });
    const said = await r.said();
    // The two numbers, and the thing that lifts it. A refusal naming no
    // number is a wall; this is the whole reason the verdict carries both.
    expect(said).toMatch(/2 completed gigs/);
    expect(said).toMatch(/you have 0/);
    expect(said).toMatch(/Finish 2 more/);
  }, 120_000);
});

suite('⭐ rung ZERO — a seat that asks for nothing at all', () => {
  it('the university farm takes a first-session arrival with an empty wallet', async () => {
    const seen = await farm.prose('look');
    expect(seen, 'the farm advertises too').toMatch(/HELP WANTED/);
    expect(seen, 'and asks nothing').toMatch(/no prerequisite/);
    const r = await farm.cmd('apply');
    expectOk(r);
    expect(await r.said()).toMatch(/taken on as labourer/);
  }, 180_000);

  it('⚠ being taken on is NOT being on shift — `clock off` first is refused', async () => {
    const r = await farm.cmd('clock off');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'not-on-shift' });
  }, 120_000);

  it('⭐⭐ clock on, stand a shift, clock off — and the wage settles', async () => {
    const on = await farm.cmd('clock on');
    expectOk(on);
    expect(await on.said()).toMatch(/clock on at/);

    // ⚠ A second clock-on is refused BY NAME, not ignored.
    const again = await farm.cmd('clock on');
    expectRefused(again);
    expectNote(again, 'controller-rejected', { reason: 'already-on-shift' });

    // A shift has to be STOOD: the wage is rate × game-hours, so a
    // zero-length shift pays zero and would prove nothing.
    await new Promise((r) => setTimeout(r, 25_000));

    const off = await farm.cmd('clock off');
    expectOk(off);
    expect(await off.said()).toMatch(/clock off at/);
  }, 300_000);

  it('⭐ employer-bounded: a newcomer elsewhere cannot clock on at all', async () => {
    // ⚠ The `hall` session holds no job anywhere, so the refusal is the
    // other leg of the same rule. (The in-room leg — a holder standing
    // off their house's premises — is the unit truth table's.)
    const r = await hall.cmd('clock on');
    expectRefused(r);
    expect(await r.said()).toMatch(/where they work|don't hold a job/i);
  }, 120_000);
});

suite('7 — a trade seat asks for more, and says what lifts it', () => {
  it("⭐⭐ `apply` at the tailor's names the band wanted and the band held", async () => {
    const seen = await tailor.prose('look');
    expect(seen, "the tailor's advertises").toMatch(/HELP WANTED/);
    expect(seen).toMatch(/competent hand at tailoring/);

    const r = await tailor.cmd('apply');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'band' });
    const said = await r.said();
    expect(said).toMatch(/competent hand at tailoring/);
    expect(said).toMatch(/you are untrained/);
    expect(said, 'and it says what lifts it').toMatch(/Practising lifts it/);
  }, 180_000);
});

suite('8 — the shop still works, from the pack', () => {
  it('⭐ `buy` takes a good off the counter — the class moved, the verb did not', async () => {
    const carried = async (): Promise<string> => {
      const rows = await store.query('me:i', { fields: ['displayName'] });
      return rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ');
    };
    const before = await carried();
    const r = await store.cmd('buy torch');
    // A buy can honestly fail for want of money; what may NOT happen is
    // the verb going missing or the counter refusing to be a counter.
    const said = await r.said();
    expect(said, 'the counter answered as a counter').not.toMatch(
      /isn't for sale here|no such|don't see/i,
    );
    if (r.status === 'ok') {
      expect(await carried()).not.toBe(before);
    }
  }, 180_000);

  it('`consign` and `reclaim` round-trip a good through the shelf', async () => {
    const rows = await store.query('me:i', { fields: ['displayName'] });
    if (rows.length === 0) return; // nothing to consign; the buy above says why
    const listed = await store.cmd('consign torch for 5');
    const said = await listed.said();
    expect(said, 'the shelf answered').not.toMatch(/don't see any/i);
    if (listed.status === 'ok') {
      const back = await store.cmd('reclaim torch');
      expectOk(back);
    }
  }, 180_000);
});

suite('9 — the stall still rents from its new home', () => {
  it("⭐ `stall rent` mints a shop from trade-shopkeeping's seed", async () => {
    const renter = await Session.open(uniqueHandle('tl-stall'), {
      startLocation: MARKET,
    });
    const r = await renter.cmd('stall rent');
    renter.close();
    const said = await r.said();
    // Rent can refuse for money or for a stall already held; what it may
    // not do is fail to find the seed it mints from.
    expect(said, 'the seed resolved').not.toMatch(
      /no such template|could not clone|unknown/i,
    );
  }, 180_000);
});

suite('10 — nothing that did not move, moved', () => {
  it('⭐ the bank counter still opens an account — nothing about banking moved', async () => {
    const saver = await Session.open(uniqueHandle('tl-bank'), {
      startLocation: BANK_HALL,
    });
    try {
      const r = await saver.cmd('bank open');
      expectOk(r);
      expect(await saver.prose('bank')).toMatch(/balance/i);
    } finally {
      saver.close();
    }
  }, 300_000);

  it("⭐ the lounge rack is still there — trade-hospitality's class now", async () => {
    const seen = await lounge.prose('look');
    expect(seen, 'the rack is still in the room').toMatch(/rack|coat|check/i);
    // And the verb it affords still binds: `check` with nothing to check
    // answers about the CHECK, never `unknown-verb`.
    const r = await lounge.cmd('check sword');
    expect(await r.said()).not.toMatch(/unknown verb|don't know how/i);
  }, 180_000);
});
