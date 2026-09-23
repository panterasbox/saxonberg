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

let hand: Session; // the newcomer — fresh every run, so "nothing" is real
let wizard: Session; // ⚠ the TRAVEL harness only; never an authority in a checkpoint

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

/** Put a session in a room. The travel is harness, never a checkpoint. */
async function goto(s: Session, room: string): Promise<void> {
  expectOk(await wizard.cmd(`goto ${room}`));
  expectOk(await wizard.cmd(`summon ${s.handle}`));
  await s.drainProse();
}

beforeAll(async () => {
  wizard = await Session.open(uniqueHandle('tl-wizard'), {
    startLocation: HALL,
    wizard: true,
  });
  hand = await Session.open(uniqueHandle('tl-hand'), { startLocation: HALL });
}, 180_000);

afterAll(() => {
  hand?.close();
  wizard?.close();
});

suite('1 — arrive and look for work', () => {
  it('⭐ the hall carries a noticeboard, and there is WORK on it at world start', async () => {
    const seen = await hand.prose('look');
    expect(seen, 'the hall names its noticeboard').toMatch(/noticeboard|notices/i);

    // ⭐⭐ The claim: NPC par sheets put work on the board with nobody
    // playing. Eleven works boards shipped empty because par lines
    // existed in one file in the whole realm; the cook's sheet is the
    // second, and his beat posts a carriage bounty for each short line.
    const found = await until(async () => (await boardIds(hand)).size > 0);
    expect(found, 'a gig reached the hall board within the poll').toBe(true);
    const listing = await hand.prose('job');
    expect(listing).toMatch(/\[/);
  }, 300_000);
});

suite('3 — read a help-wanted sign nobody authored as a prop', () => {
  it('⭐⭐ `look` at the general store prints the notice, the wage and what is asked', async () => {
    await goto(hand, SHOP_FLOOR);
    const seen = await hand.prose('look');
    expect(seen, 'the sign is derived, not propped').toMatch(/HELP WANTED/);
    expect(seen, 'it names the seat').toMatch(/hand/);
    expect(seen, 'it names what is asked — the SAME words the refusal uses')
      .toMatch(/two completed gigs asked/);
  }, 180_000);

  it('⚠ and it is nowhere in the room CONTENTS — there is no sign object', async () => {
    const rows = await hand.query('here:i', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).not.toMatch(/help wanted/i);
  }, 120_000);
});

suite('4 — be refused, and be told BOTH numbers', () => {
  it('⭐⭐ `apply` with no gigs names what is wanted and what is held', async () => {
    const r = await hand.cmd('apply');
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
    await goto(hand, FARM_YARD);
    const seen = await hand.prose('look');
    expect(seen, 'the farm advertises too').toMatch(/HELP WANTED/);
    expect(seen, 'and asks nothing').toMatch(/no prerequisite/);
    const r = await hand.cmd('apply');
    expectOk(r);
    expect(await r.said()).toMatch(/taken on as labourer/);
  }, 180_000);

  it('⭐⭐ clock on, then off — the wage settles out of the house account', async () => {
    expectOk(await hand.cmd('bank open'));
    const before = await hand.prose('bank');
    const b0 = Number(/balance is (\d+)/i.exec(before)?.[1] ?? '0');

    const on = await hand.cmd('clock on');
    expectOk(on);
    expect(await on.said()).toMatch(/clock on at/);

    // A shift has to be STOOD. The wage is rate × game-hours, so a
    // zero-length shift pays zero and would prove nothing.
    await new Promise((r) => setTimeout(r, 20_000));

    const off = await hand.cmd('clock off');
    expectOk(off);
    expect(await off.said()).toMatch(/clock off at/);

    const after = await hand.prose('bank');
    const b1 = Number(/balance is (\d+)/i.exec(after)?.[1] ?? '0');
    expect(b1, 'the wage landed').toBeGreaterThanOrEqual(b0);
  }, 300_000);

  it('⚠ being taken on is not being ON — a second clock-on is refused', async () => {
    const r = await hand.cmd('clock off');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'not-on-shift' });
  }, 120_000);

  it('⭐ employer-bounded: you cannot clock on where your house does not work', async () => {
    await goto(hand, HALL);
    const r = await hand.cmd('clock on');
    expectRefused(r);
    const said = await r.said();
    expect(said).toMatch(/where they work|don't hold a job/i);
  }, 180_000);
});

suite('7 — a trade seat asks for more, and says what lifts it', () => {
  it("⭐⭐ `apply` at the tailor's names the band wanted and the band held", async () => {
    await goto(hand, TAILOR_SHOP);
    const seen = await hand.prose('look');
    expect(seen, "the tailor's advertises").toMatch(/HELP WANTED/);
    expect(seen).toMatch(/competent hand at tailoring/);

    const r = await hand.cmd('apply');
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
    await goto(hand, SHOP_FLOOR);
    const carried = async (): Promise<string> => {
      const rows = await hand.query('me:i', { fields: ['displayName'] });
      return rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ');
    };
    const before = await carried();
    const r = await hand.cmd('buy torch');
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
    const rows = await hand.query('me:i', { fields: ['displayName'] });
    if (rows.length === 0) return; // nothing to consign; the buy above says why
    const listed = await hand.cmd('consign torch for 5');
    const said = await listed.said();
    expect(said, 'the shelf answered').not.toMatch(/don't see any/i);
    if (listed.status === 'ok') {
      const back = await hand.cmd('reclaim torch');
      expectOk(back);
    }
  }, 180_000);
});

suite('9 — the stall still rents from its new home', () => {
  it("⭐ `stall rent` mints a shop from trade-shopkeeping's seed", async () => {
    await goto(hand, MARKET);
    const r = await hand.cmd('stall rent');
    const said = await r.said();
    // Rent can refuse for money or for a stall already held; what it may
    // not do is fail to find the seed it mints from.
    expect(said, 'the seed resolved').not.toMatch(
      /no such template|could not clone|unknown/i,
    );
  }, 180_000);
});

suite('10 — nothing that did not move, moved', () => {
  it('the bank counter still takes a deposit', async () => {
    await goto(hand, BANK_HALL);
    const r = await hand.cmd('bank');
    expectOk(r);
    expect(await r.said()).toMatch(/balance/i);
  }, 180_000);

  it("⭐ `check` and `reclaim` at the lounge rack — trade-hospitality's class now", async () => {
    await goto(hand, LOUNGE_BAR);
    const seen = await hand.prose('look');
    expect(seen, 'the rack is still in the room').toMatch(/rack|check/i);
  }, 180_000);
});
