/**
 * ⭐⭐ **The trades-and-labor drive — the CONTENT half** (split by
 * test-world-lifecycle D8): the steps that stand on a particular piece of
 * placeholder content, unchanged — an NPC par sheet putting gigs on the
 * Terminus hall board at world start, the market stall, and the lounge's
 * coat rack. The kernel half (the derived sign, the refusals with both
 * numbers, rung zero and the shift, the band refusal, the shop and the
 * bank) is `trades-and-labor.wire.test.ts`, standing in the scaffold.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle } from '../src/harness';

export const DIRTY_REASON =
  'reads gigs an NPC par sheet posted on the Terminus hall board (the ' +
  'postings a settled gig consumes), rents the market stall, and stands on ' +
  'the lounge — placeholder content, not the scaffold';

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

const HALL = '/world/terminus/terminal/place/hall';
const LOUNGE_BAR = '/world/lounge/place/bar';
const MARKET = '/world/terminus/market/square';

let hall: Session; // step 1 — reads the board where a new arrival stands
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
  lounge = await Session.open(uniqueHandle('tl-lounge'), {
    startLocation: LOUNGE_BAR,
  });
}, 300_000);

afterAll(() => {
  for (const s of [hall, lounge]) s?.close();
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
  it("⭐ the lounge rack is still there — trade-hospitality's class now", async () => {
    const seen = await lounge.prose('look');
    expect(seen, 'the rack is still in the room').toMatch(/rack|coat|check/i);
    // And the verb it affords still binds: `check` with nothing to check
    // answers about the CHECK, never `unknown-verb`.
    const r = await lounge.cmd('rack check sword');
    expect(await r.said()).not.toMatch(/unknown verb|don't know how/i);
  }, 180_000);
});
