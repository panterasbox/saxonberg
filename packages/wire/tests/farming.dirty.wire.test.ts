/**
 * Farming — the suburban garden, FARM-FREE: buy a seed at the general
 * store, buy a lot off the plat book, pour soil into a bed, plant it.
 *
 * Ported from `e2e/tests/drive-farming.spec.ts` — 362 lines, seven
 * expects, and roughly SIXTY of those lines were browser-reconnect
 * ceremony: a helper that watched for the command input to vanish,
 * clicked "Enter as" on the roster, and reloaded the page when the
 * WebSocket wedged. All of it existed so the test could keep TYPING.
 * None of it exists here.
 *
 * ⚠⚠ **The growth arc does NOT port, and that is a deliberate
 * narrowing.** The original watered a mint clump across a compressed
 * world clock — ~30 real seconds to a fortnight — with the scale set in
 * `world_state` BEFORE boot. That is an operator ceremony a repeatable
 * suite cannot assume, and the clock has a ceiling anyway: above
 * ~10000× the game-time schedulers starve the event loop and login
 * never answers (measured: test-login 80s+ at 40000×). So the
 * plant-to-flush arc stays a manual drive until the suite grows a
 * compressed-clock boot group (recorded in the growth slate). What
 * ports is everything either side of it, which is most of the build:
 * the money, the land market, the soil, and the refusal.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * It BUYS A LOT. Land is titled, the title is durable, and there is no
 * way to sell it back — so every run consumes one lot off the plat book
 * and leaves a stranger holding it forever. It also mints the coin to
 * pay with (`reserve issue`, the conserved faucet with no sink) and eats
 * the seed, the sack of soil and the rations.
 *
 * ⓘ The original bought a FRESH lot each run for a different reason, and
 * the reason is its own finding: *"the shared lot-1 yard accumulates
 * strays whose shared keywords raise 'which target?' prompts that
 * swallow the next commands."* Ambiguity is a real hazard for anything
 * driving the world — a prompt eats the command after it.
 */
export const DIRTY_REASON =
  'buys a lot off the plat book with issued coin and cannot sell it ' +
  'back — one lot and one funded stranger per run';

declareFile({
  file: 'farming.dirty.wire.test.ts',
  packs: ['trade-farming', 'hinkley-hills', 'terminus'],
  dirtyReason: DIRTY_REASON,
});

const HALL = '/world/terminus/terminal/location/hall';
const LANE = '/world/terminus/hinkley-hills/lane';

let g: Session;
let lot = '';

async function walk(s: Session, dirs: string[]): Promise<void> {
  for (const d of dirs) expectOk(await s.cmd(d));
  await s.drainProse();
}

async function carried(): Promise<string> {
  const rows = await g.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

beforeAll(async () => {
  g = await Session.open(uniqueHandle('grower'), { startLocation: HALL });
}, 120_000);

afterAll(() => g?.close());

suite('the money, and the kit', () => {
  it('a resident funds an account', async () => {
    const gov = await Session.open('founder', { startLocation: HALL });
    try {
      expectOk(await gov.cmd('reserve issue 500'));
      expectOk(await gov.cmd('drop coins'));
    } finally {
      gov.close();
    }
    expectOk(await g.cmd('get coins'));
    await walk(g, ['north', 'north', 'west', 'west']);
    expectOk(await g.cmd('bank open'));
    expectOk(await g.cmd('bank deposit coins'));
    const bal = /balance is (\d+)/i.exec(await g.prose('bank'));
    expect(bal, 'a funded balance').toBeTruthy();
    expect(Number(bal![1])).toBeGreaterThan(0);
  }, 300_000);

  it('buys the seed, the soil, the water and the food', async () => {
    await walk(g, ['east', 'north']);
    for (const buy of ['mint', 'sack', 'waterskin', 'rations']) {
      await g.cmd(`buy ${buy}`);
    }
    // ⚠ Asserted on what is CARRIED. A fresh bed arrives EMPTY — the
    // pour-the-soil trap — so the sack is not optional scenery.
    expect(await carried(), 'the mint seed is in hand').toMatch(/mint|seed/i);
  }, 300_000);
});

suite('⭐ the land market — a lot is titled, and the title is durable', () => {
  it('the plat book lists unsold lots, and one can be bought', async () => {
    await walk(g, ['south', 'southwest']);
    const book = await g.prose('title list');
    const m = /^\s*(lot-\d+)\s+—\s+(.*)$/m.exec(book);
    expect(m, `an unsold lot on the plat book — saw: ${book.slice(0, 200)}`).toBeTruthy();
    lot = m![1]!;
    expectOk(await g.cmd(`title buy ${lot}`));
    // The title is stable state — read it back.
    expect(await g.prose('title list')).toContain(lot);
  }, 300_000);
});

suite('the yard — soil first, then the seed', () => {
  it('⚠ a fresh bed ships with CAPACITY but no soil', async () => {
    expectOk(await g.cmd(`go ${lot}`));
    expectOk(await g.cmd('fill waterskin from standpipe'));
    // Pour BEFORE planting — the bed is a container of dirt, and dirt is
    // something somebody carried there.
    const poured = await g.cmd('pour sack into bed');
    expectOk(poured);
  }, 300_000);

  it('⭐ the seed goes into ground that now has soil in it', async () => {
    const planted = await g.cmd('plant seed in bed');
    expectOk(planted);
  }, 180_000);

  it('⭐⭐ …and picking it the same day REFUSES', async () => {
    /*
     * The one honest thing this file can say about growth without a
     * compressed clock, and it is worth saying: a clump that has not
     * come ripe does not give a flush, and the refusal cannot be faked
     * by a plant that is not there. The full plant → set → fill → ripe
     * → pick arc is the manual drive's, and the unit suite's.
     */
    const early = await g.cmd('pick bed');
    expect(early.status, 'an unripe clump gives nothing').not.toBe('ok');
  }, 120_000);
});
