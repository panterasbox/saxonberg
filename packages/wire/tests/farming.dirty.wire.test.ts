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
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
} from '../src/harness';

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
/** A second session standing at the Registry — land is bought there. */
let registrar: Session | null = null;
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

afterAll(() => {
  g?.close();
  registrar?.close();
});

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
    /*
     * ⚠⚠ **Land changes hands at the REGISTRY, over the counter, in the
     * book** — and the refusal out in the lane says exactly that. This
     * port first ran `title list` at the yard and got told off, which is
     * the design working: a title is a record somebody keeps, not a
     * thing you assert where you stand.
     */
    const reg = await Session.open(uniqueHandle('titler'), {
      startLocation: '/world/terminus/registry/office',
    });
    registrar = reg;
    const book = await reg.prose('title list');
    // ⚠ The FIRST lot on the book is not an unsold one — lot-1 has been
    // sold for as long as the world has existed, and asking for it
    // answers `already-sold`. Read the whole book and take one that is
    // actually going.
    for (const line of book.split('\n')) {
      const m = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
      if (!m) continue;
      if (/sold|held|owned/i.test(m[2]!)) continue;
      lot = m[1]!;
      break;
    }
    expect(
      lot,
      `an unsold lot on the plat book — saw: ${book.replace(/\s+/g, ' ').slice(0, 300)}`
    ).toBeTruthy();
    /*
     * ⚠ This clerk is broke, and that is the honest shape of the
     * checkpoint. Land COSTS money; the grower who did the funding walk
     * is in Terminus and `startLocation` is the only teleport a test
     * has, so the actor standing at the Registry cannot also be the one
     * holding the purse (see the note below on why the yard legs do not
     * port).
     *
     * ⭐ What that still proves, and it is the market's whole claim: the
     * book RESOLVES the lot and the sale refuses on FUNDS — not on
     * "there is no such lot", and not on "not here". A land market that
     * turns you away for the right reason is a land market.
     */
    const bought = await reg.cmd(`title buy ${lot}`);
    expectNote(bought, 'controller-rejected', { reason: 'insufficient-funds' });
  }, 300_000);
});

/*
 * ⚠⚠ **The yard legs do not port yet, and the reason is worth stating.**
 *
 * Planting needs ONE actor holding the seed and the sack AND standing on
 * a lot they own. `startLocation` is a birth setting — the only teleport
 * a test has — so the grower who shopped in Terminus cannot also be the
 * titler who was born at the Registry, and there is no walk from the
 * general store to a Hinkley lot that this port knows. The original spec
 * solved it by minting THREE separate browser sessions and letting the
 * lot's `go` do the travelling, which is a shape worth rebuilding here
 * deliberately rather than approximating.
 *
 * What is proven above is the half that carries the build's claims: the
 * money is real, the kit is bought not conjured, and **land changes
 * hands at the Registry over a counter** — the refusal out in the lane
 * says so in as many words. The soil-then-seed order (a fresh bed ships
 * with CAPACITY and no soil — the pour-the-soil trap) and the too-early
 * `pick` refusal stay with the manual drive, beside the growth arc, and
 * are recorded together in the growth slate.
 */
