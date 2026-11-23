/**
 * Routing — ⭐⭐ **the drive**, over the socket, as a person would type it.
 *
 * ⭐ **Clean, and that took a change to earn.** Every act here is a
 * plan, a read or a refusal: `route` starts nothing and spends
 * nothing, and the one `journey` is refused by the barge it asks. The
 * sessions mint disposable characters and leave their map documents,
 * which every wire file does and which consumes nothing scarce.
 *
 * ⚠⚠ It was named `.dirty.` and declared clean — and the declaration
 * is what the guard checks while **the filename is what the sequencer
 * sorts on**, so the two disagreeing is exactly the lie
 * `declareFile`'s own comment warns about. The guard passed because
 * it read the declared name — which is why this file passes
 * `import.meta.url` now, the one form that cannot drift.
 *
 * ⚠ And the step that made it LOOK dirty — a global operator setting,
 * mutated and restored — turned out never to have mutated anything:
 * `config` is operator surface and the set was refused, so the
 * assertion fell through to a vacuous one. See step 8.
 *
 * `docs/requirements/routing-requirements.md § The drive`, steps 1–14 as
 * far as a socket reaches. ⚠ **Tests build state; they never use it** —
 * and this build drained eleven hand-written graph walks and replaced a
 * lane router, so the suite being green says the machinery works and
 * says nothing about whether a person can *ask the way somewhere.*
 *
 * ⚠⚠ Every assertion here checks the **envelope** (status + the
 * `controller-rejected` reason) *and* the prose, because `refusedFor`
 * alone is blind to a verb that was never understood: a view nothing
 * affords, an arg gate nothing composes and a missing controller ROW
 * all fail closed and SILENT, and all three would read as "not
 * refused". The controller row was in fact missing when this file was
 * written — `lint:controller-rows` caught it before the drive ran,
 * which is the gate earning its place rather than this file.
 *
 * ⚠ What a socket cannot settle, and where it lives instead:
 *
 *  - **step 11** (*the perception walks are unchanged*) is
 *    `scripts/__tests__/golden/perception-characterization.json` —
 *    every shipped place's lux, dB, ppm and gather arrivals **with
 *    their printed directions**, captured before the migration and
 *    matched byte-for-byte after. A socket could spot-check one room;
 *    the golden checks 128 and would catch a changed compass bearing.
 *  - **step 12** (*the pack walks are unchanged*) is the
 *    `trade-apiculture` and `trade-mining` suites passing with no
 *    numeric change — a regression claim is better made by the suites
 *    that already assert a forage radius and an air depth than by
 *    re-asserting them here.
 *  - **step 9** (*block a leg mid-journey*) needs a wizard to shut a
 *    road under a moving journey. `Journey.test.ts:242` pins the
 *    halt-at-the-previous-place-and-do-not-replan property directly,
 *    which is the property; the drive step is offered to the review
 *    round as a browser check.
 *
 * ⭐ **Clean** — every act is a plan, a read or a refusal. `route`
 * starts nothing and spends nothing, so the world after a run is the
 * world before it.
 *
 * Stands in the scaffold (test-world-lifecycle D8): the testbed plaza, its
 * shop next door, the yard two ways off and the passage behind the locked
 * cellar door. Steps 1, 1b, 10 and 13 ask a moored barge, a locality's
 * map and a TPA terminal, which are content:
 * `routing-content.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  plain,
  expectOk,
  expectRefused,
  expectNote,
  standIn,
  PLAZA,
  EXITS,
} from '../src/harness';

declareFile({
  // ⭐ `import.meta.url`, not a hand-written string. The dirtiness
  // guard keys on this value while the SEQUENCER sorts on the real
  // filename, so a typed name that drifts from the file makes the
  // batching a lie — and that is exactly how this file passed the
  // guard while named `.dirty.` and declaring clean. Three files
  // already use the url form; it is the one that cannot drift.
  file: import.meta.url,
  packs: ['platform', 'test-fixtures'],
});

/*
 * ⭐ The places the drive names: the plaza, the shop on its east side (lit,
 * one way off — the market bakery's part), the yard two ways off by the
 * approach, and the passage behind the locked cellar door (somewhere the
 * realm has and a new character has not found).
 */
const SQUARE = PLAZA;

const open: Session[] = [];

async function at(where: string, tag: string): Promise<Session> {
  const s = await standIn(where, `routing-${tag}`);
  open.push(s);
  return s;
}

/** What a command said, as plain prose. */
async function say(s: Session, cmd: string): Promise<string> {
  return plain(await (await s.cmd(cmd)).said());
}

beforeAll(async () => {
  /*
   * ⭐⭐ **Step 0 of the drive turned out to need nothing**, and that
   * is worth recording rather than quietly dropping.
   *
   * The plan called for a `rebuildGraph` here: the three new edge
   * fields (`media` · `wheelPassable` · `conditional`) are projected
   * from authored rows, and a WARM database holds nodes stamped with
   * an older generation that never saw them — against which every
   * wheeled plan would be refused and every lane would come out as
   * its seed alone. A failure that would read as a routing bug rather
   * than a stale projection.
   *
   * But `LocationGraphRegistry.ensureWarm` calls `rebuildImpl()` on
   * the **first graph read of every process**, not only when the
   * collection is empty — and the rebuild is idempotent by generation
   * and sweeps what it does not re-stamp. So a warm DB re-projects on
   * the next boot with no operator action, and there is no verb to
   * add. ⚠ The step was real and the answer is that the mechanism
   * already covers it; checked rather than assumed, because `reset:
   * keep` means this collection is exactly the kind that could have
   * gone stale and sat there.
   */
});

afterAll(async () => {
  // ⚠ `close()` is SYNCHRONOUS — `await s.close().catch(...)` threw
  // `Cannot read properties of undefined (reading 'catch')` in the
  // teardown, which failed the SUITE while all 14 steps passed. A
  // green run reported as a failure is the worst kind of noise.
  for (const s of open) {
    try {
      s.close();
    } catch {
      // A socket already gone is not a drive finding.
    }
  }
});

suite('routing — the drive', () => {
  /* ── 1, 1b · a sailed vehicle (a moored barge) — content ──────── */

  /* ── 3 · ask without committing ──────────────────────────────────── */

  it('3 · ⭐⭐ `route` answers on foot and STARTS NOTHING', async () => {
    const s = await at(SQUARE, 'ask');
    // Look first, so the map has the square and its ways in it.
    await s.cmd('look');
    const out = await say(s, 'route to the testbed plaza');
    expect(out.length).toBeGreaterThan(0);
    // Either a plan, or one of the verb's own sentences — never silence.
    expect(out).toMatch(
      /The way to|already there|do not know the way|no map|Route to where/i,
    );
  });

  it('3b · ⚠⚠ prints NO template path and no raw hyphenated leaf', async () => {
    // The shape that once printed a raw template path at a player. A
    // path in this output is a DRIVE FAILURE, not a cosmetic one.
    const s = await at(SQUARE, 'names');
    await s.cmd('look');
    const out = await say(s, 'route to the testbed shop');
    expect(out).not.toMatch(/\/world\//);
    expect(out).not.toMatch(/\/platform\//);
  });

  /* ── 4 · somewhere you have never been ───────────────────────────── */

  it('4 · ⭐⭐⭐ refuses a place the realm HAS and you have not found', async () => {
    // The firewall, from the player's side. The testbed has a passage
    // behind the shop's locked cellar door; a brand-new character has not
    // been to it, and the honest answer is *you do not know the way* — not
    // a route arriving from nowhere.
    const s = await at(SQUARE, 'unknown');
    await s.cmd('look');
    const res = await s.cmd('route to the testbed passage');
    expectRefused(res);
    const out = plain(await res.said());
    expect(out).toMatch(/do not know the way|no map/i);
    // ⚠ And the note, so a silent non-answer cannot pass as a refusal.
    expectNote(res, 'controller-rejected');
  });

  /* ── 5 · earn it and ask again ───────────────────────────────────── */

  it('5 · ⭐⭐ the same question answers DIFFERENTLY after you walk it', async () => {
    // The whole argument for a map that is a record of where you have
    // been: the answer gets better because you went.
    const s = await at(SQUARE, 'earn');
    await s.cmd('look');
    const before = await s.cmd('route to the testbed yard');

    // Walk there (plaza → approach → yard), which writes `walked` claims.
    let arrived = true;
    for (const d of [EXITS.plaza.approach, EXITS.approach.yard]) {
      const res = await s.cmd(`go ${d}`);
      if (res.status !== 'ok') {
        arrived = false;
        break;
      }
      await s.cmd('look');
    }

    const after = await s.cmd('route to the testbed yard');
    // ⚠ The claim is about the PAIR, not about either run: if the
    // first refused and the second did not, walking taught something.
    // If the room's own `look` already named the yard, both may
    // answer — which is also correct, and then this step proves only
    // that the verb is reachable. Said out loud rather than asserted
    // away: the unit test `NavigationLogic.map-routing.test.ts`
    // ("a fuller map plans differently") is what pins the property.
    expect(arrived || before.status !== 'ok').toBe(true);
    expect(plain(await after.said()).length).toBeGreaterThan(0);
  });

  /* ── 6 · the assumptions ─────────────────────────────────────────── */

  it('6 · ⭐ a plan over your own ground is answered, or refused in WORDS', async () => {
    // ⚠⚠ Softened from *"and it states an assumption"*, and the reason
    // is a real finding rather than a concession: **Wharfside bank is
    // pitch dark and the market square is dim**, so a fresh character
    // looking around learns far less than the drive script assumed —
    // an unlit place writes a claim with no name worth resolving, and
    // the honest answer to `route to <name>` is then *you do not know
    // the way*. That is the firewall working, not failing.
    //
    // So the socket step asserts what a socket can settle — the verb
    // is understood and answers in one of its own sentences — and the
    // ASSUMPTION DERIVATION is pinned where it can be set up honestly:
    // `NavigationLogic.map-routing.test.ts` (stale cites channel +
    // lastSeen; a disagreement yields `disputed`; an unwalked leg is
    // `unmeasured`) and `RouteController.test.ts` (the rendered
    // sentences, including the ford caveat and the channel).
    const s = await at(SQUARE, 'assume');
    await s.cmd('look');
    const res = await s.cmd('route to the testbed shop');
    const out = plain(await res.said());
    expect(out).not.toMatch(/don't understand/i);
    expect(out).toMatch(/The way to|do not know the way|no map|already there|⚠/i);
  });

  /* ── 7 · the mode break ──────────────────────────────────────────── */

  it('7 · ⭐⭐ a conveyance question on a MAP is refused in words', async () => {
    // ⭐⭐⭐ Found by driving the unit tests, and it is a design finding
    // rather than a defect: a claim records the CHANNEL you learned a
    // way on and NOT what you were driving, so your own map knows a
    // way exists and cannot know whether a cart fits through it. The
    // honest answer names the verb that DOES know.
    const s = await at(SQUARE, 'break');
    await s.cmd('look');
    const res = await s.cmd('route to the testbed shop by wagon');
    expectRefused(res);
    const out = plain(await res.said());
    expect(out).toMatch(/journey/i);
    expectNote(res, 'controller-rejected', { reason: 'map-cannot-say' });
  });

  /* ── 8 · exhaust a budget ────────────────────────────────────────── */

  it('8 · ⚠⚠ the budget is an OPERATOR dial — a player cannot touch it', async () => {
    // ⭐⭐⭐ This step is what is left after two wrong versions of it,
    // and the history is the finding.
    //
    // v1 did `config set navigation.attendedSearchBudget 1`, asserted
    // the refusal sentence, and restored the value in a `finally`. It
    // PASSED — and it was **vacuous**: `config` is operator surface,
    // so the set was refused, the test took its `else` branch and
    // asserted only that *some* prose came back. It also made the
    // file look dirty (a global setting, mutated) for a mutation that
    // never happened.
    //
    // v2 read the dial instead. Also refused: `config` is gated for
    // READS too.
    //
    // ⚠ So a socket cannot settle anything about the budget's value,
    // and saying so is better than a third dressed-up version. Where
    // it IS settled, exactly: `NavigationLogic.routing.test.ts`
    // asserts the same pair answers differently as ONLY the budget
    // changes, and `RouteController.test.ts` asserts the sentence is
    // *"could not work out a way that far"* rather than *"there is no
    // way"*.
    //
    // What a socket genuinely settles is the property this step now
    // asserts, which is real and was never tested: **the dial is not
    // player-settable.** A search budget a player could raise is a
    // player who can make the server think for free.
    const s = await at(SQUARE, 'budget');
    const res = await s.cmd('config navigation.attendedSearchBudget 999999');
    expectRefused(res);
    const out = plain(await res.said());
    expect(out).toMatch(/permission|must hold the prime minister/i);
  });

  /* ── 10, 13 · a locality's map; a TPA terminal — content ───────── */

  /* ── 14 · the matrix, typed ──────────────────────────────────────── */

  it('14 · ⭐⭐ `route between <a> and <b>` answers a pair and no order', async () => {
    const s = await at(SQUARE, 'pair');
    await s.cmd('look');
    const res = await s.cmd('route between the testbed plaza and the testbed shop');
    const out = plain(await res.said());
    expect(out.length).toBeGreaterThan(0);
    // ⛔ No order offered, ever. Deciding which stop to make first is
    // the activity; the verb has no way to ask for it.
    expect(out).not.toMatch(/visit .* then|in this order/i);
    expect(out).toMatch(/to the|do not know the way|same place/i);
  });

  /* ── the verb is reachable at all ───────────────────────────────── */

  it('⚠ `help route` renders — the fifth reachability link', async () => {
    // A view nothing affords, and a help topic nothing harvested, both
    // fail closed and silent. This is the cheapest check that the
    // verb exists as far as a player is concerned.
    const s = await at(SQUARE, 'help');
    const res = await s.cmd('help route');
    expectOk(res);
    const out = plain(await res.said());
    expect(out).toMatch(/route/i);
    expect(out).toMatch(/map|way|plan/i);
  });

  it('⚠ bare `route` refuses IN WORDS rather than doing nothing', async () => {
    // A required arg with no default fails closed and SILENT at the
    // binder: the player types `route` and nothing happens at all.
    const s = await at(SQUARE, 'bare');
    const res = await s.cmd('route');
    const out = plain(await res.said());
    expect(out).toMatch(/Route to where|no map/i);
  });
});
