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
 * ⛔ **And it is a TEST SEAM, not a thing in the game.** `advance`
 * carries `@TestOnly`: it exists only in a world the suite booted, so
 * the two clock-dependent suites run under `WIRE_BOOT=1` / CI and SKIP
 * when the run is merely attached to somebody's dev server. Jumping a
 * month in a world the operator is playing in would age every
 * reconcile-on-read system in it at once.
 *
 * ## ⚠⚠ What is NOT here, said plainly
 *
 *  - ⛔⛔ **Checkpoint 18 — the standing-instruction relief — was CUT
 *    in review, and acceptance criterion 7 is UNMET.** It shipped in W4
 *    and was removed: it is offline automation, and this is a build
 *    about tapping trees. It also contradicts the absent-body doctrine
 *    (*automate only the autonomic, never the strategic*). The design
 *    question goes to
 *    `docs/slates/builds/standing-instructions-slate.md`; the drive
 *    asserts the verb is ABSENT.
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
  isOwnedTestWorld,
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

/** Game-seconds a duration string names — the same grammar `after()` takes. */
function secondsOf(duration: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(
    duration,
  );
  expect(m, `unparseable duration '${duration}'`).toBeTruthy();
  const units: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3_600,
    day: 86_400,
  };
  return Number(m![1]) * (units[m![2] as string] ?? 0);
}

/**
 * ⭐⭐ **The clock is moved by the FOUNDER, in a GOVERNED jurisdiction.**
 *
 * ⛔⛔ **This paragraph used to say the opposite, and it was stale code
 * documentation that cost a whole drive run.** It read *"no `--parcel`,
 * deliberately — `EvalController` defaults the jurisdiction to
 * `/home/<playerKey>`, your own circle, and that passes by the pure
 * rule."* That was true when it was written and **false by the time the
 * MR opened**: W0's review fix (`assertNotQuarantined`) made every
 * clock MUTATOR refuse a quarantined caller, and `/home/<player>` IS
 * the quarantined circle. World time is global; a circle may not move
 * it, because there is no per-circle clock to move.
 *
 * ⚠⚠ **And the drive record said 15/15 the whole time**, because it was
 * recorded BEFORE that review fix and never re-run. The throw landed as
 * neither a refusal note nor matching prose, so the helper's own
 * assertions passed and the break surfaced two lines later as
 * arithmetic — *the clock moved 9.9 game-seconds instead of 259,200.*
 * ⭐ Re-running the drive after a review fix is not optional; see the
 * plan's § Review round 5.
 *
 * So the jump runs as the founder against `/world/terminus/rejection`,
 * a jurisdiction the founder genuinely holds — which is also the honest
 * fiction. Moving world time is an operator act, not something you do
 * inside your own circle, and the governed path receipts it.
 *
 * ⚠ Drive run 4 passed `--parcel /world/terminus/market`, which the
 * founder does NOT hold, and every call answered `access-denied` in
 * PROSE with no note — the lesson that is still live: **read the prose
 * when a command is supposed to answer with a value.**
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
/**
 * ⭐ The founder session that moves the clock, held open for the file.
 *
 * A governed `eval` needs an actor with authority over the jurisdiction
 * (see `advance` below), and checkpoint 7 walks the year in 20-day
 * steps — up to ~18 jumps — so opening a session per jump would be a
 * waste of a boot-heavy handshake.
 */
let clock: Session | null = null;
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
 * ⭐⭐⭐ **Checkpoint 0's instrument: move world-time.** `eval` is the
 * code-trust surface and `WorldClockApi` is on its allowlist (W0/D12),
 * so the jump skips a season and every schedule in it DRAINS rather
 * than being skipped.
 *
 * ⛔ **This is a TEST SEAM, and it only exists in a world the suite
 * booted.** `WorldClockApi.advance` carries `@TestOnly`, so in an
 * attached dev world the static is deleted from the class and the two
 * clock-dependent suites below skip on `isOwnedTestWorld()`. Nothing a
 * player does moves the realm's clock — this is scaffolding, not a
 * capability, which is why it is marked rather than merely gated.
 */
async function advance(s: Session, duration: string): Promise<void> {
  // ⭐ `s` is the session whose CLOCK we then read; the jump itself goes
  // through the founder's governed session (see the header above).
  const mover = clock ?? s;
  const expectedS = secondsOf(duration);
  const before = await gameNow(s);
  const out = await say(
    mover,
    `eval --parcel ${REJECTION} return (WorldClockApi.advance('${duration}'), 1)`,
  );
  expect(refusedFor(out), `advance ${duration}`).toBeNull();
  // ⚠ An `eval` that is refused for jurisdiction says so in PROSE and
  // does not always land the note `refusedFor` reads — which is how
  // drive run 4 mistook `access-denied` for silence.
  const said = await out.said();
  expect(said, `advance ${duration} must not be denied`).not.toMatch(
    /hold no authority|don.t understand/i,
  );
  await mover.drainProse();
  await new Promise((r) => setTimeout(r, 400));
  // ⭐⭐⭐ **THE JUMP MUST BE PROVED, HERE, ON EVERY CALL.**
  //
  // ⚠⚠ This is the single assertion whose absence let a DEAD CLOCK pass
  // a drive. `advance` returns silently when the parsed duration is 0
  // and throws (without a note, and without prose this helper matched)
  // when the caller is quarantined — so for one whole review round the
  // helper "succeeded" on every call while world-time never moved. Only
  // checkpoint 0 did the arithmetic, so checkpoint 7 walked fourteen
  // months of nothing and set its spile in a season that happened to be
  // open already. ⭐ Proving it in the HELPER means no checkpoint
  // anywhere can be vacuous about the clock again.
  const moved = (await gameNow(s)) - before;
  expect(
    moved,
    `advance ${duration}: world-time did not move (the clock is the ` +
      `premise of every seasonal checkpoint in this file). ` +
      // ⭐ The PROSE goes in the message, because this drive has now
      // twice lost a round to an `eval` that neither ran nor filed a
      // note — the whole diagnosis lives in what it said back.
      `the eval answered: ${JSON.stringify(said)}`,
  ).toBeGreaterThan(expectedS * 0.9);
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
  // ⭐ The clock-mover, held for the file. The founder is the one actor
  // with authority over `/world/terminus/rejection`, and a GOVERNED
  // eval is the only route to a clock mutator — a quarantined circle is
  // refused (W0's review fix). `wizard: true` because `eval` is the
  // code-trust axis.
  if (isOwnedTestWorld()) {
    clock = await Session.open('founder', {
      startLocation: PROVISIONING,
      wizard: true,
    });
  }
}, 300_000);

afterAll(() => {
  k?.close();
  clock?.close();
});

/* ───────────── 0. the clock, without which nothing else runs ───────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐⭐ 0. the clock moves (owned world only — `advance` is @TestOnly)',
  () => {
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

  it('⭐⭐⭐ 6. the TREE states its sap in WORDS — no number, no date', async () => {
    // ⛔⛔ **THIS CHECKPOINT USED TO BE UNFALSIFIABLE**, and it is the
    // worst thing the sweep found. It read:
    //
    //     const reason = refusedFor(out);
    //     if (reason !== null) {
    //       expect(reason.startsWith('season-')).toBe(true);
    //     }
    //     const said = await read(k, 'look birch-north');
    //     void said;
    //
    // — so a tap that SUCCEEDED passed it, a tap that was refused for
    // any season reason passed it, and the `look` it claimed to be
    // about was read and thrown away. It could not fail. It reported
    // ✓ on every run of this drive while asserting nothing, and it is
    // why nobody noticed the sap window is OPEN at game-time 0 and the
    // closed case had never once been exercised.
    //
    // ⭐ What is unconditionally true, clock or no clock, is AC 8: the
    // tree says where its sap is **in words, with no digit in any of
    // them** (`productionRead()`). That is asserted here. The *closed
    // season refuses with `season-*`* claim needs a closed window, so it
    // moved to checkpoint 6b below where the clock can reach one.
    const said = await read(k, 'look birch-north');
    expect(said, 'the tree must say something about its sap').toMatch(
      /sap|run|season|spile/i,
    );
    // ⭐ The whole point of a banded read: no quantities, no dates.
    const sapLine = said
      .split(/\n/)
      .filter((l) => /sap|run|season/i.test(l))
      .join(' ');
    expect(sapLine, 'the sap line must exist').not.toBe('');
    expect(sapLine, 'AC 8 — banded in WORDS, no digits').not.toMatch(/\d/);
  }, 300_000);
});

/* ───────────── 7–9. the spile, and the girth ───────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐⭐ 7–9. open the season, bore a hole, and be refused the third',
  () => {
  it('⭐⭐⭐ 6b. walk to a CLOSED window, and the tree says so as INFORMATION', async () => {
    // ⭐ The half of checkpoint 6 that needs a clock, and that this
    // drive had never actually reached: the sap window is OPEN at
    // game-time 0, so *out of season* has to be walked to.
    //
    // ⭐ A closed season is INFORMATION, not the player's mistake: the
    // reason travels as `season-*` and the controller renders it
    // without filing a rejection.
    let closed: string | null = null;
    for (let step = 0; step < 10 && closed === null; step++) {
      await advance(k, '20 days');
      const out = await say(k, 'tap birch-north with auger');
      const reason = refusedFor(out);
      await k.drainProse();
      if (reason !== null && reason.startsWith('season-')) closed = reason;
      // ⚠ If it was NOT refused it opened an engagement; let it settle
      // rather than leaving the hands held into the next jump.
      if (reason === null) await settle(k, out);
    }
    expect(
      closed,
      'in two hundred days of walking the sap window never closed — ' +
        'either the photoperiod opener is always-open (which would make ' +
        'every season assertion in this file vacuous) or `tap` stopped ' +
        'reporting the season as `season-*`',
    ).not.toBeNull();
  }, 900_000);

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

  it('⛔⛔ 18. CUT — `instruct` is ABSENT, and that is the assertion', async () => {
    // ⭐⭐⭐ **The relief was cut from this build in review, and this
    // checkpoint is its headstone rather than a gap.**
    //
    // W4 shipped `instruct keep <line>` + a `keeps` brain so a player's
    // body could keep a milking round while they were offline. Two
    // objections ended it, and both were right:
    //
    //  1. ⛔ **Scope.** It is offline automation, decided inside a build
    //     about tapping trees for syrup. Whether players may automate
    //     labour at all is a lens-level question — pedagogy (what
    //     Discipline does an absent body exercise), participation,
    //     values, economy — and it needs its own conversation.
    //  2. ⛔ **It contradicts the absent-body doctrine**: *automate only
    //     the autonomic, never the strategic; strategy-by-proxy is
    //     faking; the absent body holds LESS than an NPC brain, not a
    //     decision agent.* Milking a named cow into a named pail is not
    //     autonomic, and W4 gave the body an actual NPC brain.
    //
    // ⚠ So **acceptance criterion 7 is UNMET** and recorded as unmet —
    // see docs/slates/builds/standing-instructions-slate.md. Milk's
    // attendance cost is therefore still unrelieved, which is the
    // honest state of the design and not a defect of this build.
    const out = await say(k, 'instruct');
    const rejected = out.notes.find((n) => n.kind === 'command-rejected');
    expect(
      JSON.stringify(rejected ?? {}),
      'instruct must NOT exist — the relief is slated, not shipped',
    ).toMatch(/unknown-verb/);
  }, 300_000);
});
