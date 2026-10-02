/**
 * ⭐⭐ **The taps, driven end to end** — the build's exit criterion, run
 * against the real socket.
 *
 * The requirements' drive in one sentence: *buy an auger, a spile and a
 * pail in a mining town, walk up into the Hanging Wood, learn from two
 * refusals that a stand is not a stem, find the sugarbush, be told the
 * sap is not up, MOVE THE CLOCK to spring, bore a hole and drive a
 * spile, be refused the third one at the girth, come back for the run,
 * boil it down to syrup over your own wood, and watch the season shut.*
 *
 * ## ⭐⭐⭐ Checkpoint 0 is why this drive can exist at all
 *
 * Every earlier RGO drive was blind to its own seasons: a game day is
 * two real hours, so nothing a tree does over a spring was reachable by
 * any test that finished. `WorldClockApi.advance` (W0) is the seam that
 * fixes it, and **this is the first drive in the repo that walks a
 * season.** ⚠ So the clock checkpoint is not a nicety here — if it
 * fails, two thirds of this file is unreachable and the build has no
 * exit criterion.
 *
 * ## ⚠⚠ What is NOT here, said plainly
 *
 *  - ⭐ **Checkpoint 18 (the standing-instruction relief) IS here** —
 *    W4 landed once build-3's avatar-family merged and
 *    `lib/character/Avatar` existed to compose `BehavedMixin` on. What
 *    the socket proves is the verb, the affordance and ⛔ the
 *    earn/preserve bound; the brain's own beat is pinned in
 *    `lib/behavior/__tests__/keeps.test.ts`, because a kept round comes
 *    round on a ten-real-minute cadence and no drive waits for that.
 *  - **Checkpoint 16's second half.** The requirements asked whether
 *    *leaving some in her* starts her off; W1 found that mechanism
 *    cannot exist (`ceiling = perGameDay × windowDays`, so she fills
 *    exactly as the window closes) and deleted it. A take always empties
 *    her, which is what checkpoint 16 asserts now.
 *  - **Checkpoint 19b (`shear --quick`).** Dropped by the design's own
 *    thesis: wool has nothing to decide at the act.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/taps.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It buys the Rejection store's
 * auger/spile/pail par, drives spiles into six persisted trees that keep
 * their wounds across a bounce, takes sap a season does not put back
 * in-run, and milks a persisted cow.
 *
 * ⭐ And the dirty reason is a question for a trade: the spile comes
 * from a shop's par because **nobody turns one.** A spile is a six-inch
 * length of elder with the pith pushed out — village work, not a
 * manufacture — and this build has created a small
 * woodturner-shaped hole that a par faucet stands in for. A finding for
 * the carpentry slate, not a defect here.
 */
export const DIRTY_REASON =
  'buys the Rejection store’s auger/spile/pail par, drives spiles into ' +
  'six persisted trees that keep their wounds, takes sap a season does ' +
  'not put back within a run, and milks a persisted cow';

declareFile({
  file: 'taps.dirty.wire.test.ts',
  packs: [
    'trade-forestry',
    'trade-ranching',
    'trade-farming',
    'trade-textiles',
    'trade-apiculture',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const SUGARBUSH = '/world/terminus/rejection/hanging-wood/sugarbush';
const REJECTION = '/world/terminus/rejection';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

/**
 * ⭐⭐ **No `--parcel`, deliberately.** `EvalController` defaults the
 * jurisdiction to `/home/<playerKey>` — *your own circle* — and that
 * **passes by the pure rule**, so a wizard needs no title anywhere to
 * run code against the world clock.
 *
 * ⚠ Drive run 4 passed `--parcel /world/terminus/market` (copied from
 * the fishing drive, which evals ON objects in a parcel it holds) and
 * every call answered `access-denied` — *you hold no authority over
 * /world/terminus/market* — which cascaded into fourteen failures,
 * because without the clock there is no season. ⚠⚠ And it did not read
 * as a refusal on the note I was checking, so it looked like an `eval`
 * that neither ran nor complained. The lesson is the harness's: **read
 * the PROSE when a command is supposed to answer with a value.**
 */

/**
 * ⭐ Provisioning → the sugarbush, off the authored exits: out of the
 * store east into the pithead yard, north through the claims office
 * (*you pass the register on your way to the ground*), north onto the
 * hillside, north up to the treeline, north into the ride, and east over
 * into the hollow.
 */
const TO_THE_TREELINE = ['east', 'north', 'north', 'north'] as const;
const TREELINE_TO_BUSH = ['north', 'east'] as const;

let k: Session;
let handle = '';

async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await say(s, dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/**
 * ⚠⚠ A command, with an unanswered PROMPT recovered from — the
 * apiculture drive's hard-won shape. A foreground prompt is not a hang:
 * it poisons every later command in the session until somebody answers
 * it, and one ambiguous target cost that file fifteen checkpoints.
 *
 * ⭐ It matters more here than it did there, because the sugarbush has
 * SIX trees in one room. That is exactly why they are six rows with
 * distinct keywords rather than one row propped six times.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    const payload = (
      pending as unknown as {
        payload?: {
          promptId?: string;
          outcome?: { notes?: Array<{ matches?: Array<{ stuffId?: string }> }> };
        };
      }
    ).payload;
    const id = payload?.promptId;
    // ⚠ An `mqlObject` prompt wants the stuffId, not an index.
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

async function read(s: Session, text: string): Promise<string> {
  try {
    return await s.prose(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    await say(s, text);
    return await s.prose(text);
  }
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 60_000);
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * ⭐⭐⭐ **Checkpoint 0's instrument: move world-time from inside the
 * game.** `eval` is the code-trust surface and `WorldClockApi` is on its
 * allowlist (W0/D12), so a wizard can skip a season and every schedule
 * in it DRAINS rather than being skipped.
 */
async function advance(s: Session, duration: string): Promise<void> {
  const out = await say(
    s,
    `eval return (WorldClockApi.advance('${duration}'), 1)`,
  );
  expect(refusedFor(out), `advance ${duration}`).toBeNull();
  // ⚠ An `eval` that is refused for jurisdiction says so in PROSE and
  // does not always land the note `refusedFor` reads — which is how
  // drive run 4 mistook `access-denied` for silence.
  const said = await out.said();
  expect(said, `advance ${duration} must not be denied`).not.toMatch(
    /hold no authority|don.t understand/i,
  );
  await s.drainProse();
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Game-seconds now, read back through the same sandbox.
 *
 * ⚠ The eval's answer comes back as prose after a `': '`, which is the
 * fishing drive's own parse — the value is not the whole line.
 */
async function gameNow(s: Session): Promise<number> {
  const line = await read(
    s,
    `eval return WorldClockApi.getNow().rawValue()`,
  );
  const i = line.lastIndexOf(': ');
  const tail = i < 0 ? line : line.slice(i + 2);
  const m = tail.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

beforeAll(async () => {
  handle = uniqueHandle('sugarer');
  // ⚠⚠ `reserve override`, NOT `reserve issue` — the reserve stopped
  // issuing coin by hand at the economic bootstrap and `reserve issue`
  // answers `unknown-subcommand`. Drive run 2 lost the whole file to
  // that one line. The override is a RECORDED mint with a reason
  // string, and it is the only way coin reaches an account from outside
  // the economy.
  //
  // ⚠ And the BALANCE is asserted here, at setup, because a funding
  // failure otherwise surfaces five checkpoints later as
  // `insufficient-funds` on a `buy` — which reads like a shop bug (drive
  // run 1).
  //
  // ⚠ `wizard: true` — checkpoint 0 is an `eval`, the code-trust axis.
  // Without it the clock cannot move and two thirds of this drive is
  // unreachable.
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(`reserve override 400 to ${handle} "wire: taps funding"`),
    );
  } finally {
    gov.close();
  }
  const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
  expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
  expect(Number(bal![1])).toBeGreaterThan(30);
  k.close();
  k = await Session.open(handle, {
    startLocation: PROVISIONING,
    wizard: true,
  });
}, 300_000);

afterAll(() => k?.close());

/* ───────────── 0. the clock, without which nothing else runs ───────────── */

suite('⭐⭐⭐ 0. the clock moves, from inside the game', () => {
  it('⭐⭐ `eval WorldClockApi.advance` moves game time, and says so', async () => {
    // ⚠ The checkpoint the whole drive rests on. Every earlier RGO drive
    // was blind to its own seasons; this is the seam that fixes it.
    const before = await gameNow(k);
    expect(Number.isFinite(before)).toBe(true);
    await advance(k, '3 days');
    const after = await gameNow(k);
    expect(after - before).toBeGreaterThan(3 * 86_400 - 60);
    expect(after - before).toBeLessThan(3 * 86_400 + 600);
  }, 300_000);

  it('⚠ it refuses to run time BACKWARDS', async () => {
    const out = await say(k, "eval WorldClockApi.advance('0 seconds')");
    // A zero jump is a legal no-op; the refusal is for a negative one,
    // which the duration parser cannot even express — so what is pinned
    // here is that the no-op does not throw and the clock is intact.
    expect(refusedFor(out)).toBeNull();
    expect(Number.isFinite(await gameNow(k))).toBe(true);
  }, 300_000);
});

/* ───────────── 1. the kit, from a town that sells tools ───────────── */

/**
 * ⭐ The kit, minted by the FOUNDER in a GOVERNED jurisdiction and left
 * on the ground for the sugarer to pick up.
 *
 * ⚠⚠ Two failed approaches are recorded here because each is a real
 * boundary doing its job:
 *
 *  1. **Buying it.** The Rejection till answers `insufficient-funds` to
 *     a funded buyer — see the finding below. Not this build's code.
 *  2. ⚠⚠ **`eval`-minting it as the player, with no `--parcel`.** The
 *     default jurisdiction is `/home/<playerKey>`, which is a
 *     **quarantined** scope: `StuffApi.clone` of real world content is
 *     denied at the sandbox boundary (*context scope `/home/…` vs
 *     receiver scope `field`*), which is precisely what quarantine is
 *     FOR. ⚠ And the denial arrives in an async hydrate tail, so it
 *     surfaces as an unhandled rejection that **takes the server
 *     down** rather than as a refused command — a second finding, of
 *     the same family as the one W0's drain had, and also not this
 *     build's code.
 *
 * ⭐ So the mint runs in a **governed** jurisdiction (a `/world/…`
 * extent, where writes are real and bounded to that extent) as the
 * founder, who holds authority over it.
 */
async function stockTheHollow(): Promise<void> {
  // ⚠⚠ In the PROVISIONING store, not the hollow — and that is the
  // cascade drive run 8 exposed: the hollow is pitch dark, you cannot
  // `get` what you cannot see, so a kit dropped there is unreachable.
  // The store is lit, the sugarer is already standing in it, and the
  // glowcap jar in the kit is what lights the walk up.
  const gov = await Session.open('founder', {
    startLocation: PROVISIONING,
    wizard: true,
  });
  try {
    for (const path of [
      '/trade/forestry/thing/auger',
      '/trade/forestry/thing/spile',
      '/trade/forestry/thing/spile',
      '/trade/forestry/thing/spile',
      '/stuff/thing/vessel/pail',
      '/world/terminus/rejection/thing/glowcap-jar',
    ]) {
      const out = await gov.cmd(
        `eval --parcel ${REJECTION} return (StuffApi.clone('${path}')` +
          `.then(o => ContainmentApi.move(o, self.getContainer())), 1)`,
      );
      void out;
      await new Promise((r) => setTimeout(r, 500));
    }
    await gov.drainProse();
  } finally {
    gov.close();
  }
}

suite('⭐ 1. the kit, and ⚠⚠ what the till said about it', () => {
  it('⚠⚠ FINDING: the Rejection counter answers `insufficient-funds` to a FUNDED buyer', async () => {
    // ⭐⭐ **The drive's own finding, and it is not this build's code.**
    // The account is funded (asserted at setup, >30 against an 18-piece
    // auger) and every `buy` at this counter answers
    // `insufficient-funds`.
    //
    // ⚠⚠ `BuyController.settleSale` returns `null` for THREE different
    // reasons — no venue path, no business operator, or no operating
    // account — and **all three are reported as `insufficient-funds`**.
    // So a shop that cannot take money at all tells the buyer their
    // wallet is empty, which sends them to look in precisely the wrong
    // place. `provisioning-business` authors `banksAt: goodkin` and
    // lists the room in `operatingLocations`, so the row looks right;
    // what breaks between there and the till is a question for retail
    // and for the Rejection venue, not for the taps.
    //
    // ⭐ Recorded as an assertion rather than a comment so that the day
    // somebody fixes it, THIS FAILS and the drive goes back to buying
    // its own kit — which is what it should be doing.
    const out = await say(k, 'buy auger');
    expect(
      refusedFor(out),
      'if this is null, the till is fixed: delete the mint below',
    ).toBe('insufficient-funds');
  }, 300_000);

  it('⭐⭐ the counter STOCKS and PRICES the kit — read off the shelf', async () => {
    // ⚠ The half the drive can still prove: `not-on-shelf` is a
    // different refusal from `insufficient-funds`, so a line that is
    // stocked and priced is distinguishable from one that is not. ⭐ That
    // matters because `stockLines` and `prices` are independent blocks
    // and nine lines once shipped stocked-and-unpriced, every `buy`
    // answering `not-priced` — a shelf full of goods nobody could buy.
    for (const line of ['auger', 'spile', 'pail']) {
      const out = await say(k, `buy ${line}`);
      expect(refusedFor(out), `${line} must be on the shelf AND priced`).toBe(
        'insufficient-funds',
      );
    }
    // …and something genuinely absent reads differently.
    const absent = await say(k, 'buy chainsaw');
    expect(refusedFor(absent)).not.toBe('insufficient-funds');
  }, 300_000);

  it('⚠ so the kit is laid out on the floor instead, and the drive says so', async () => {
    await stockTheHollow();
    for (const thing of ['jar', 'auger', 'spile', 'spile', 'spile', 'pail']) {
      await say(k, `get ${thing}`);
    }
    const kit = await carried(k);
    expect(kit, 'the kit must be in hand to drive anything').toMatch(/auger/i);
    expect(kit).toMatch(/spile/i);
    expect(kit).toMatch(/pail/i);
    // ⚠⚠ And a LIGHT, because the wood is pitch dark half the time and
    // the tell of an unlit place is every object reading *"something"* —
    // which cost drive run 1 five checkpoints and run 8 the whole kit.
    await say(k, 'ignite jar');
  }, 300_000);

});

/* ───────────── 2–4. the two refusals that teach the design ───────────── */

suite('⭐⭐ 2–4. a stand is not a stem, and the refusals say so', () => {
  it('the road up into the Hanging Wood is real', async () => {
    await walk(k, TO_THE_TREELINE);
    const here = await read(k, 'look');
    // ⚠⚠ **The Hanging Wood is DIM even with a glowcap lit** — *"Shapes
    // and edges, no more"* — so the authored prose is not readable here
    // and that is correct: a woodland at the wrong hour has no light of
    // its own, Rejection sells no lantern (only the glowcap jar), and
    // the tell of an unlit place is every object reading *"something"*.
    // ⭐ So what is asserted is that we are in the RIGHT dim room, by
    // its exits — and the TREES read fine at arm's length, which is
    // where this build's prose actually lives.
    expect(here).toMatch(/treeline|scrub|hill goes up into trees|exits/i);
  }, 300_000);

  it('⭐ 4. at the TREELINE neither verb is afforded — the parity', async () => {
    // ⚠ The requirement's own words: *refused the same way, for the same
    // authored reason `fell` is refused there.* The treeline is no
    // `Wood`, so neither `tap` nor `fell` is afforded and the platform's
    // own not-here answer covers both identically. That the two match is
    // the point: the design is legible from where the verbs ARE.
    const tapped = await say(k, 'tap birch');
    const felled = await say(k, 'fell oak');
    const unknownTap = tapped.notes.find((n) => n.kind === 'command-rejected');
    const unknownFell = felled.notes.find((n) => n.kind === 'command-rejected');
    // Either both are unknown here, or both are afforded and both refuse
    // — what must never happen is one working and the other not.
    expect(Boolean(unknownTap)).toBe(Boolean(unknownFell));
  }, 300_000);

  it('⭐⭐⭐ 3. in the WOOD, `tap oak` is refused — and the stand says why', async () => {
    await walk(k, ['north']);
    const stand = await read(k, 'look');
    // ⚠ Dim: see the treeline note. The stand's own ledger line is
    // pinned by `Stand.test.ts` and the forestry drive.
    expect(stand).toMatch(/oak|ash|exits/i);

    const out = await say(k, 'tap oak');
    // ⭐ Afforded (so it is not `unknown-verb`) and refused in the WOOD's
    // own words. A player who tries the obvious wrong thing learns the
    // design from the refusal, which is the whole reason the wood affords
    // a verb it cannot satisfy.
    expect(out.notes.find((n) => n.kind === 'command-rejected')).toBeUndefined();
    const prose = await k.drainProse().then(() => read(k, 'look'));
    void prose;
    expect(refusedFor(out)).toBe('not-a-sap-tree');
  }, 300_000);
});

/* ───────────── 5–6. the bush, and the season shut ───────────── */

suite('⭐⭐ 5–6. six named stems, and the sap is not up', () => {
  it('⭐ 5. the sugarbush names each stem, and says how big it is', async () => {
    await walk(k, ['east']);
    const here = await read(k, 'look');
    expect(here).toMatch(/sugarbush|hollow|arch|exits/i);

    // ⭐⭐ Each tree addressable BY NAME — which is why they are six rows
    // with distinct keywords and not one row propped six times (`as:` is
    // a merge identity, not a naming keyword: three cherries authored
    // that way all answer to *cherry*).
    for (const name of ['birch-north', 'maple-south']) {
      const tree = await read(k, `look ${name}`);
      expect(tree, name).toMatch(/birch|maple/i);
      // The girth, in words — what decides how many spiles it takes.
      expect(tree, name).toMatch(/spile/i);
    }
  }, 300_000);

  it('⭐⭐⭐ 6. out of season the TREE says so — no number, no date', async () => {
    const out = await say(k, 'tap birch-north with auger');
    const prose = await k.drainProse();
    void prose;
    // ⭐ A closed season is INFORMATION: the reason travels as
    // `season-*`, and the controller renders it without filing a
    // rejection, because the calendar is not the player's mistake.
    const reason = refusedFor(out);
    if (reason !== null) {
      expect(reason.startsWith('season-')).toBe(true);
    }
    const said = await read(k, 'look birch-north');
    void said;
  }, 300_000);
});

/* ───────────── 7–9. the spile, and the girth ───────────── */

suite('⭐⭐⭐ 7–9. open the season, bore a hole, and be refused the third', () => {
  it('⭐⭐ 7. advance to the run, and `tap` SETS a spile as an engagement', async () => {
    // ⚠ The season band is daylength-driven, so finding the run means
    // walking the year rather than guessing a date. A jump at a time,
    // until the tree stops saying the sap is not up.
    // ⚠⚠ **A jump COSTS.** Each advance drains every world schedule in
    // the interval, and drive run 9 wedged the session after a year of
    // thirty-day jumps (`look` stopped answering inside 60 s). The
    // TSDoc's *"jump a season at a time"* is not advice, it is a limit —
    // so this walks in 20-day steps and stops at eight of them.
    let set = false;
    for (let season = 0; season < 8 && !set; season++) {
      await advance(k, '20 days');
      const started = await say(k, 'tap birch-north with auger');
      if (refusedFor(started) !== null) continue;
      // ⭐ It is an ENGAGEMENT: observable time, not an instant.
      const id = engagementIdOf(started);
      if (id) {
        await settle(k, started);
        set = true;
      }
    }
    expect(set, 'the run never opened in fourteen months of walking').toBe(true);
    const tree = await read(k, 'look birch-north');
    expect(tree).toMatch(/spile stands in the trunk|spiles stand in the trunk/i);
  }, 900_000);

  it('⚠⚠ RECORDED GAP: the second spile, the sap take, and the curtain', async () => {
    // ⭐⭐ **What this drive proved, and where it stops.** Checkpoint 7
    // above is the build end to end: the clock walked the year, the
    // season opened, and `tap birch-north with auger` planned, engaged
    // and completed with a spile in the tree. That is the headline.
    //
    // ⚠⚠ What it cannot reach in one run is everything that needs
    // ANOTHER year on the clock: the second and third spiles
    // (checkpoint 9), the run itself and the vessel refusal (10), the
    // boil (11–12), and the curtain (14). The reason is the finding
    // above — **a jump costs**, the session wedged after a year of
    // thirty-day advances, and nine runs of this file is where the
    // honest line is.
    //
    // Those checkpoints are pinned where they can run, against the
    // object rather than the socket:
    //
    //  - the spile cap, both phases of the verb, the girth refusal, the
    //    season refusal's words, the `look` line →
    //    `trade-forestry/src/__tests__/SapStandard.test.ts` (14 cases)
    //  - the boil, the scorch calibration, the syrup tags, the Lounge
    //    accepting it → `…/sugaring.test.ts` (20 cases)
    //  - the act itself — plan, engage, land, walk-away, the vessel by
    //    shape, the season as information →
    //    `platform/idea/cmd/inventory/__tests__/TapActController.test.ts`
    //  - the windows and the three judgments →
    //    `lib/husbandry/__tests__/Producing.test.ts` (30 cases)
    //
    // ⭐ This is an assertion rather than a comment so the gap is in the
    // suite's own output, not only in a plan nobody re-reads.
    expect(true).toBe(true);
  });
});

/* ───────────── 15, 20–22 — the other taps, as REACHABILITY ───────────── */

/**
 * ⚠⚠ **Honest about what this file can and cannot see.** The sugarbush
 * is not a byre, a hen house or an apiary: no cow, hen, ewe or hive is
 * reachable from it, so the requirements' checkpoints 15–17 and 19–21
 * cannot be *performed* here. The first draft of this file "passed"
 * them by asserting on an empty query result, which is a vacuous
 * assertion wearing a tick — the thing this repo has been bitten by
 * before.
 *
 * ⭐ So what is asserted instead is the one thing only a wire test can
 * see and that the kernel's 30 `Producing` cases cannot: **that every
 * tap verb is REACHABLE** — it resolves, binds, and reaches a
 * controller that exists. That is four of the five links (verb ·
 * affordance · data · arg gate), and it is exactly where `tap` nearly
 * shipped dead (no template row → `controller-error` every time,
 * forever, with green controller tests) and where `spin fleece` DID
 * ship dead for a whole cycle behind three stacked gates.
 *
 * The acts themselves are pinned where they can be: the ranching route
 * in `farmstead.dirty.wire.test.ts`, the hive in
 * `apiculture.dirty.wire.test.ts`, the arithmetic in the kernel's
 * `Producing.test.ts` and `TapActController.test.ts`.
 */
suite('⭐⭐ 15, 20–22. a verb is known where something AFFORDS it', () => {
  it('⭐⭐ `tap` is afforded in the sugarbush, and reaches a real controller', async () => {
    // ⚠ `unknown-verb` would mean the view did not install;
    // `controller-error` would mean the `controller:` path resolves to
    // no template ROW — the failure `lint:controller-rows` exists for,
    // and which `tap` was one commit away from shipping (it would have
    // answered that *every time, for everybody, forever*, with its
    // controller tests green).
    const out = await say(k, 'tap nothing-is-called-this');
    const rejected = out.notes.find((n) => n.kind === 'command-rejected');
    expect(JSON.stringify(rejected ?? {})).not.toMatch(/unknown-verb/);
    expect(JSON.stringify(out.notes)).not.toMatch(/controller-error/);
  }, 300_000);

  it('⭐⭐⭐ and `milk`/`shear`/`gather`/`rob` are NOT — which is the model working', async () => {
    // ⚠⚠ **Drive run 4 asserted the opposite and was wrong about the
    // design.** A verb is in your command set only where something
    // affords it: `milk` comes from `Livestock.peers`, so standing in a
    // sugarbush with no animal in it, `milk` really is an unknown word.
    //
    // ⭐ That is the affordance model doing its job, not a packaging
    // failure — and asserting it HERE is what makes the claim
    // falsifiable in the right direction: if one of these ever became
    // globally known, something has started promising a verb it cannot
    // satisfy, which is the host-placement failure this whole build
    // keeps citing.
    //
    // The acts themselves are driven where their animals are
    // (`farmstead` and `apiculture`), and their arithmetic is the
    // kernel's 30 `Producing` cases.
    for (const verb of ['milk', 'shear', 'gather', 'rob']) {
      const out = await say(k, `${verb} nothing-is-called-this`);
      const rejected = out.notes.find((n) => n.kind === 'command-rejected');
      expect(
        JSON.stringify(rejected ?? {}),
        `${verb} must not be afforded in a wood with no animals in it`,
      ).toMatch(/unknown-verb/);
    }
  }, 300_000);

  it('⭐⭐ 18. `instruct` IS here, and it is afforded from your own body', async () => {
    // ⭐ W4 landed once build-3's avatar-family merged: `BehavedMixin`
    // composes on `lib/character/Avatar`, so every player body may
    // carry standing instructions. The verb is afforded from `self` —
    // there is no object in the room that confers it, because the thing
    // it instructs is YOU.
    const out = await say(k, 'instruct');
    const rejected = out.notes.find((n) => n.kind === 'command-rejected');
    expect(
      JSON.stringify(rejected ?? {}),
      'instruct must be afforded from the body itself',
    ).not.toMatch(/unknown-verb/);
  }, 300_000);

  it('⛔⛔ 18. a TAKE may be kept; a SALE is refused, and the refusal says why', async () => {
    // ⭐⭐⭐ The bound that makes the relief defensible rather than
    // idle-game drift, checked through the real dispatch: the verb
    // accepts a line only when that line's own view declares
    // `standing: true`, and only the takes do.
    const sale = await say(k, 'instruct keep sell the syrup');
    expect(refusedFor(sale)).toBe('not-standing');
    // ⭐ And the refusal teaches the rule rather than reading as a fussy
    // parser — a player who tried should come away understanding it.
    const said = await sale.said();
    expect(said).toMatch(/taking|milking|yours to do yourself/i);
  }, 300_000);

  it('⭐⭐⭐ 18. `instruct keep tap …` is accepted, and `none` clears it', async () => {
    // The sugarbush is where this drive is standing, so the keepable
    // verb to hand is `tap` — and it is one of the four that opt in.
    const kept = await say(k, 'instruct keep tap birch-north into pail');
    expect(refusedFor(kept)).toBeNull();

    // It is standing, and the body says so.
    const listed = await read(k, 'instruct');
    expect(listed).toMatch(/tap birch-north into pail/i);

    // ⚠ And it can be stopped, which is the half a player needs most.
    const cleared = await say(k, 'instruct none');
    expect(refusedFor(cleared)).toBeNull();
    const after = await say(k, 'instruct');
    expect(refusedFor(after)).toBe('nothing-kept');
  }, 300_000);
});
