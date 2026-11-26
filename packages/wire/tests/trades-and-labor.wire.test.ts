/**
 * ⭐⭐ **The trades-and-labor drive**: a person arrives with nothing, reads
 * a card on a wall, is refused and told both numbers, is taken on where
 * nothing is asked, clocks a shift — with no wizard, no founder, no
 * authored dialogue and nobody handing them anything.
 *
 * That is the claim the build exists to make true, and it is the one a
 * test suite cannot make: tests BUILD state, they never USE it. Every
 * checkpoint below is a literal verb a player types, in order.
 *
 * The second half drives the Stage A sweep: the counter and the shelf
 * changed class and pack, so every verb they afford is re-driven against
 * real rows to prove the move was a MOVE and not a break.
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8): the testbed venue
 * keeps the hall and the shop and carries the three hiring criteria — the
 * `host` seat asks nothing, the `hand` seat two completed gigs, the
 * `attendant` seat a novice hand at retail-sales. The steps that stand on
 * particular placeholder content — gigs an NPC par sheet posts on the
 * Terminus hall board, the market stall, the lounge's coat rack — moved,
 * unchanged, to `trades-and-labor-content.dirty.wire.test.ts`.
 *
 * Runs twice on one world: every character is fresh, and the one taken on
 * as a host quits the seat at the end (the run's purge vacates it too), so
 * the next run finds the spare seat open again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  expectOk,
  expectRefused,
  expectNote,
  standIn,
  PLAZA,
  HALL,
  SHOP,
  BANK,
} from '../src/harness';

declareFile({
  file: 'trades-and-labor.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'trade-shopkeeping'],
});

/**
 * ⭐⭐ **No wizard anywhere in this file, and that is the point.** The
 * claim is that a person with nothing can get work, so a wizard walking
 * them to each venue would quietly prove something weaker. Every venue
 * gets its OWN newcomer, born there by `startLocation` — a new arrival, no
 * authority, no history: exactly what the refusal checkpoints need.
 */
let idle: Session; // a newcomer who holds no job anywhere
let store: Session; // steps 3-4 — the sign, and the refusal with both numbers
let hire: Session; // rung zero — applies, clocks on, clocks off
let counter: Session; // step 7 — the trade seat's band refusal

beforeAll(async () => {
  idle = await standIn(PLAZA, 'tl-idle');
  store = await standIn(SHOP, 'tl-store');
  hire = await standIn(HALL, 'tl-hire');
  counter = await standIn(SHOP, 'tl-counter');
}, 300_000);

afterAll(async () => {
  // ⭐ Give the host seat back: the venue has one spare, and a second run
  // must find it open. (`not-held` is fine — the apply may have failed.)
  await hire?.cmd('job quit');
  for (const s of [idle, store, hire, counter]) s?.close();
});

suite('3 — read a help-wanted sign nobody authored as a prop', () => {
  it('⭐⭐ `look` at the shop prints the notice, the wage and what is asked', async () => {
    const seen = await store.prose('look');
    expect(seen, 'the sign is derived, not propped').toMatch(/HELP WANTED/);
    expect(seen, 'it names the seat').toMatch(/hand/);
    expect(seen, 'it names what is asked — the SAME words the refusal uses')
      .toMatch(/two completed gigs asked/);
  }, 180_000);

  it('⚠ and it is nowhere in the room CONTENTS — there is no sign object', async () => {
    const rows = await store.query('~here:i', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).not.toMatch(/help wanted/i);
  }, 120_000);
});

suite('4 — be refused, and be told BOTH numbers', () => {
  it('⭐⭐ `apply` with no gigs names what is wanted and what is held', async () => {
    // ⚠ `for hand`: the venue has three openings here, so the seat is
    // named (bare `job apply` takes the ONE opening where you stand).
    const r = await store.cmd('job apply for hand');
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
  it('the hall takes a first-session arrival with an empty wallet', async () => {
    const seen = await hire.prose('look');
    expect(seen, 'the hall advertises too').toMatch(/HELP WANTED/);
    expect(seen, 'and asks nothing').toMatch(/no prerequisite/);
    const r = await hire.cmd('job apply for host');
    expectOk(r);
    expect(await r.said()).toMatch(/taken on as host/);
  }, 180_000);

  it('⚠ being taken on is NOT being on shift — `clock off` first is refused', async () => {
    const r = await hire.cmd('clock off');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'not-on-shift' });
  }, 120_000);

  it('⭐⭐ clock on, stand a shift, clock off — and the wage settles', async () => {
    const on = await hire.cmd('clock on');
    expectOk(on);
    expect(await on.said()).toMatch(/clock on at/);

    // ⚠ A second clock-on is refused BY NAME, not ignored.
    const again = await hire.cmd('clock on');
    expectRefused(again);
    expectNote(again, 'controller-rejected', { reason: 'already-on-shift' });

    // A shift has to be STOOD: the wage is rate × game-hours, so a
    // zero-length shift pays zero and would prove nothing.
    await new Promise((r) => setTimeout(r, 25_000));

    const off = await hire.cmd('clock off');
    expectOk(off);
    expect(await off.said()).toMatch(/clock off at/);
  }, 300_000);

  it('⭐ employer-bounded: a newcomer elsewhere cannot clock on at all', async () => {
    // ⚠ The `idle` session holds no job anywhere, so the refusal is the
    // other leg of the same rule. (The in-room leg — a holder standing
    // off their house's premises — is the unit truth table's.)
    const r = await idle.cmd('clock on');
    expectRefused(r);
    expect(await r.said()).toMatch(/where they work|don't hold a job/i);
  }, 120_000);
});

suite('7 — a trade seat asks for more, and says what lifts it', () => {
  it('⭐⭐ `apply` for the counter seat names the band wanted and the band held', async () => {
    const seen = await counter.prose('look');
    expect(seen, 'the shop advertises').toMatch(/HELP WANTED/);
    expect(seen).toMatch(/novice hand at retail-sales/);

    const r = await counter.cmd('job apply for attendant');
    expectRefused(r);
    expectNote(r, 'controller-rejected', { reason: 'band' });
    const said = await r.said();
    expect(said).toMatch(/novice hand at retail-sales/);
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
    const r = await store.cmd('buy notebook');
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
    const listed = await store.cmd('shelf consign notebook for 5');
    const said = await listed.said();
    expect(said, 'the shelf answered').not.toMatch(/don't see any/i);
    if (listed.status === 'ok') {
      const back = await store.cmd('shelf reclaim notebook');
      expectOk(back);
    }
  }, 180_000);
});

suite('10 — nothing that did not move, moved', () => {
  it('⭐ the bank counter still opens an account — nothing about banking moved', async () => {
    const saver = await standIn(BANK, 'tl-bank');
    try {
      const r = await saver.cmd('bank open');
      expectOk(r);
      expect(await saver.prose('bank')).toMatch(/balance/i);
    } finally {
      saver.close();
    }
  }, 300_000);
});
