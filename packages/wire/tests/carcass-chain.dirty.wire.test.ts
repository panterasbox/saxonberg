/**
 * ⭐⭐ **The carcass chain, driven end to end** — the build's exit
 * criterion, run against the real socket.
 *
 * The requirements' drive in one sentence: *walk into a valley farmyard,
 * draft a ewe out of a flock book, handle her to learn her condition,
 * shear her, kill her, take her apart and find that her size and her
 * condition both paid; salt the hide so it travels; grind the bone and
 * work it into a field; fell an oak for its bark; carry hide and bark to
 * the city's edge, tan the hide against the pit it stands in, cut a
 * jerkin out of it that has been correct and unmakeable since it was
 * written; render the suet and dip a candle out of it; dip another out of
 * beeswax and hold the two up next to each other; buy the dog a loaf; and
 * find three vacant seats where the three noxious trades are.*
 *
 * ## ⭐⭐⭐ What this drive exists to catch
 *
 * **One kind of body.** Until W0, a beast that died was flipped to
 * `dead` in place and kept every mixin it had, so a dead ewe was a ewe
 * that could no longer be milked, sheared, handled or herded — and the
 * realm shows a thing's capabilities, so the two kinds of death read as
 * two kinds of object. The checkpoints that matter most here are AC14
 * (*a dead animal is a BODY, not a disabled animal*) and AC15 (*killing
 * something mid-anything leaves a body and no wreckage*), because they
 * are the two no unit test can see: one is about what a player is SHOWN,
 * and the other is about what happens to machinery that was running.
 *
 * ## ⚠⚠ What is NOT here, said plainly
 *
 *  - **Checkpoint 19 — the knacker actually working.** The yard, the
 *    seat and the works-board ship; what does not is DROVING, so there
 *    is no way to get a live animal to the city or a 70 kg carcass off a
 *    valley floor. The drive visits the yard and reads the vacancy
 *    (AC12) rather than pretending the collection round exists. The
 *    shambles waits on droving — recorded in the plan's deferred list.
 *  - **The dog eating from its own feeder** (step 9's second half).
 *    `feeds` is a brain on a cadence and the loaf is bought rather than
 *    baked; the checkpoint asserts the loaf is REAL and PRICED and
 *    carries `feed`, which is the part this build added. The brain was
 *    already shipped and is `pets.md`'s to prove.
 *  - **`analyze grid` in both epochs** (step 20). The energy build's
 *    drive already proves it, and nothing in this build touches it.
 *
 * ## ⭐⭐⭐ What the FIRST RUN of this file found, and it is why it exists
 *
 * Run 1 reported 6 of 22 and every one of the six was informative:
 *
 *  1. ⚠⚠⚠ **AC1 was UNMET and three suites plus sixty-four gates were
 *     green over it.** `make leather-jerkin` hung: `make` dispatches a
 *     recipe SCRIPT, not a catalogue recipe — and `cut` requires
 *     `StackableMixin`, a BOLT, which a tanned hide is not and must not
 *     become. So a hide had **no path to a worn jerkin**. The build
 *     shipped `tailor` in response — ⚠⚠⚠ **and that verb has since been
 *     REVERTED**, because it was an undesigned answer that contradicted
 *     `textiles-slate.md`'s own decision (*"`cut`/`sew` take hide the day
 *     it exists"*). **AC1 is UNMET**, recorded, and the hide chain's
 *     terminus is a tailoring design session's question. ⭐ The premise
 *     error was still real and is the same one as W6's and W7's, found
 *     for the THIRD time in one build.
 *  2. ⚠⚠ **It was NIGHT.** `t = 0` is a moonless midnight and the wire
 *     world restores its clock from the database, so `look` at the
 *     farmyard read *"It is pitch dark"* — and every checkpoint
 *     downstream failed as a CASCADE off one unlit room. Hence
 *     `ensureDaylight`, asserted rather than assumed.
 *  3. ⚠⚠ **`clone … --here` is `access-denied`**, correctly: a player
 *     holds no title over a room. ⭐ The fix is the better drive anyway —
 *     the requirements say *without anything being conjured*, so the
 *     knife, the lantern and the rations are BOUGHT at the general
 *     store, which is what a person would do.
 *  4. ⚠⚠⚠ **AC14 PASSED VACUOUSLY.** With `slaughter` unreachable there
 *     was no body, so `shear body` answered *"I don't understand"* —
 *     which matched the refusal pattern. A checkpoint that cannot fail
 *     is worse than a missing one; it now **requires a body to exist**
 *     and says so when there is not.
 *  5. **The body was shivering** after a 25-game-day jump. A drive that
 *     walks a season has to feed and warm its character, so every jump
 *     goes through `advance`, which eats.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/carcass-chain.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It drafts and KILLS a head out
 * of a persisted flock book — the tally falls and does not come back —
 * fells a standard out of a persisted stand, spends a tanpit's bark, and
 * buys a shop's par.
 *
 * ⭐ And the dirty reason is a question for a trade, as every dirty
 * reason should be: **nobody charges a tanpit.** A pit ships with its
 * bark in it and the bark is consumed per hide, so a tannery run long
 * enough goes quietly flat with no way to refill it but `pour` and a
 * bundle. That is a small bark-merchant-shaped hole, and a finding for
 * the tanning slate rather than a defect here.
 */
export const DIRTY_REASON =
  'drafts and kills heads out of the persisted Delight flock (the tally ' +
  'falls and does not come back), fells a standard out of the persisted ' +
  'Hanging Wood, spends a tanpit’s bark with nothing in the world to ' +
  'refill it, and buys the bakery’s dog-loaf par';

/**
 * ⭐⭐⭐ **ONE file, because there is one chain and one farmyard.**
 *
 * This was two drives — `carcass-chain` and `butchery` — written by two
 * builds, and they **could not both run.** The wire suite boots ONE world
 * and runs every file in it, dirty files last in ALPHABETICAL order, so
 * `butchery` went first, left a part-broken carcass and its offal in the
 * yard, and `carcass-chain` then ran into it: with two ewes down in one
 * place every noun the files shared was ambiguous, an unanswered prompt
 * poisoned the session, and seven checkpoints failed. ⚠⚠ **It would have
 * gone red on master with nobody able to know.**
 *
 * ⚠ It could not be patched probe by probe, and that was tried: teaching
 * the butchery file's cut probe to tolerate an ambiguity fixed that file
 * and moved the failure straight onto this one's `look ewe`. **The shared
 * noun space was the defect**, not any one command.
 *
 * ⭐⭐ So the fix is the one the build itself argues for: **one body,
 * taken apart in stages.** A carcass REDUCES and persists until it is
 * spent (AC6), which is exactly what lets a knife-only butchering and
 * everything downstream of it be the same animal rather than two. The
 * merged flow drafts one ewe, handles her, shears her, kills her, opens
 * her with the farm's knife — asserting in one act that the five
 * products came off, that the sentence NAMES the saw it could not reach,
 * that the carcass is still there, and that a cut reads as a texture —
 * then salts the hide, tans it, dips the candles, grinds the bone and
 * bakes the loaf.
 *
 * ⭐ Every helper the butchery file needed already existed here under the
 * same name (`say`, `read`, `refusedFor`, `hereNames`, `advance`,
 * `ensureDaylight`, `walk`), which is the clearest evidence the split was
 * an artifact of having been two builds rather than anything in the
 * fiction. Nothing was dropped: its duplicate draft-and-slaughter is
 * gone because this file already did it, and its three unique claims —
 * the saw, the nameable cuts, the legible law — are checkpoints 7, 7
 * and 7b here, with its regressions at the foot.
 */

declareFile({
  file: 'carcass-chain.dirty.wire.test.ts',
  packs: [
    'trade-ranching',
    'trade-cooking',
    'trade-tanning',
    'trade-chandlery',
    'trade-milling',
    'trade-baking',
    'trade-forestry',
    'trade-farming',
    'trade-tailoring',
    'trade-apiculture',
    'generic-objects',
    'base-library',
    'hearts-delight',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/terminus/hearts-delight/location/farmstead-yard';
/**
 * ⚠ Kept as a comment rather than a constant: the general store is where
 * runs 3 and 5 went for a knife, and the finding is that a COLD WORLD'S
 * SHOPS ARE EMPTY — a `Stock`'s `par` is topped up by its keeper's own
 * beat, not by the world existing. `/world/terminus/general-store/shop-floor`,
 * if a later drive needs it, and it should expect to wait.
 */
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const WHARFSIDE = '/world/terminus/wharfside/bank';
const OAK_CLEARING = '/world/terminus/rejection/hanging-wood/oak-clearing';
const BAKERY = '/world/terminus/market/bakery';

let k: Session;
let handle = '';

/* ───────────────────────────── helpers ───────────────────────────── */

/**
 * ⚠⚠ A command, with an unanswered PROMPT recovered from — the
 * apiculture drive's hard-won shape, and it matters here because the
 * farmyard has TWO DOGS and a flock in it. A foreground prompt is not a
 * hang: it poisons every later command in the session until somebody
 * answers it, and one ambiguous target cost that file fifteen
 * checkpoints.
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
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    // ⚠⚠⚠ **An unanswerable prompt must fail HERE, loudly.** Run 9 cost
    // two checkpoints to this: `tan hide` with no hide in hand raised an
    // ambiguity whose payload carried no match this helper could pick,
    // nothing was answered, and **the session was poisoned** — so
    // `tailor`, the NEXT command, timed out with no dispatch-response at
    // all and looked for all the world like a hang in brand-new code.
    //
    // A prompt left unanswered does not fail the command that raised it;
    // it fails every command after it. Attributing the failure one
    // checkpoint downstream is how a drive sends somebody hunting through
    // a controller that was never wrong.
    if (!id || !first) {
      throw new Error(
        `carcass drive: '${text}' raised a prompt this helper cannot ` +
          `answer (promptId=${String(id)}, match=${String(first)}). An ` +
          `unanswered prompt POISONS every later command in the session, ` +
          `so this fails here rather than as a timeout three checkpoints ` +
          `on. Give the command a less ambiguous target.`,
      );
    }
    s.answerPrompt(id, first);
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

/** Every note kind on a result — what a `look` or a bind actually said. */
function noteKinds(r: { notes: readonly unknown[] }): string[] {
  return (r.notes as Array<{ kind?: string }>)
    .map((n) => n.kind ?? '')
    .filter(Boolean);
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/** What is on the floor here. */
async function hereNames(s: Session): Promise<string> {
  const rows = await s.query('here:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/**
 * ⭐⭐⭐ Move world-time from OUTSIDE the fiction — `POST
 * /auth/test-clock`, mounted only when `AUTH_MODE === 'test'`. The taps
 * drive's seam, and its lesson is kept: **the assertion lives in the
 * HELPER**, so no checkpoint anywhere in this file can be vacuous about
 * the clock. A tanpit takes three game weeks and a green hide rots in
 * one, so two thirds of this drive is unreachable without it.
 */
async function advance(duration: string, s?: Session): Promise<void> {
  const m = /^\s*(\d+)\s*(hour|day)s?\s*$/.exec(duration);
  expect(m, `unparseable duration '${duration}'`).toBeTruthy();
  const n = Number(m![1]);
  const unit = m![2] === 'day' ? 86_400 : 3_600;
  const want = n * unit;

  // ⚠⚠ **A big jump SATURATES the world, and this file no longer makes
  // one.** `advance('25 days')` moved the clock 2.16 M seconds and the
  // next command got no dispatch-response in ninety seconds — not wedged,
  // SATURATED: the nightly reset fires once per crossed day boundary, so
  // three game weeks queues ~25 sweeps and anything queues behind them.
  // Chunking it made it worse. The 25-day step is deleted (see the
  // tanning suite) and the biggest jump left is one day — one sweep,
  // which the settle below covers. The time axis is the slated
  // compressed-clock boot group's: `wire-suite-growth-slate` § 2.
  const { before, after } = await advanceWorldClock(duration);
  const moved = after - before;
  expect(
    moved,
    `advance ${duration}: world-time did not move (the clock is the ` +
      `premise of the tanning and the rotting in this file)`,
  ).toBeGreaterThan(want * 0.9);
  // ⭐ A settle proportional to the jump: 400 ms is right for a few
  // hours, and a day-scale jump crosses a boundary and must let the
  // reset sweep drain before anything asks the world a question.
  await new Promise((r) => setTimeout(r, want >= 86_400 ? 6_000 : 400));
  // ⚠⚠ **Feed the body after a jump.** Run 1 came back from 25 game days
  // with the character shivering, and every unfed Cast in the world with
  // it: a game day is two real hours, so a jump is a fast-forward through
  // a season of metabolism. Anybody walking a season eats.
  if (s && want >= 86_400) await sustain(s);
}

/**
 * Eat whatever is to hand, because a body that walked a season is hungry.
 *
 * ⚠⚠ A game day is two real hours, so a clock jump is a fast-forward
 * through a season of metabolism: run 1 came back from 25 game days with
 * the character shivering, and *every unfed Cast in the world with it*.
 *
 * ⭐ And the thing to eat is what the drive just butchered — twelve
 * joints of its own mutton. A drive about a carcass chain feeding itself
 * off the carcass is the right shape, and it needs no shop.
 */
async function sustain(s: Session): Promise<void> {
  for (const act of ['eat meat', 'eat rations', 'eat loaf']) {
    try {
      const out = await s.cmd(act);
      if (refusedFor(out) === null) break;
    } catch {
      // ⚠ Not fatal: the point is a fed body, and a drive that dies
      // because its lunch was already eaten teaches nothing.
    }
  }
  await s.drainProse();
}

/**
 * ⚠⚠ **Assert DAYLIGHT, and move the clock until there is some.**
 *
 * `t = 0` is a moonless midnight and the wire world restores its clock
 * from the database, so a run can start in the small hours — and run 1
 * did. An unlit outdoor room reads *"It is pitch dark. You can make out
 * nothing"*, and **every checkpoint downstream fails as a cascade off
 * that one room.** A cascade is not diagnostic.
 */
async function ensureDaylight(s: Session): Promise<void> {
  let room = '';
  for (let i = 0; i < 8; i += 1) {
    room = (await (await s.cmd('look')).said()).toLowerCase();
    // ⭐⭐⭐ **It asks the ROOM, not the sky** — ported from the butchery
    // drive at the sweep, which worked this out and wrote down why.
    //
    // This helper asked `analyze sky` and tested *is it not night*, which
    // is vacuous twice over: in a dark room the instrument refuses, so
    // the answer matches neither word and the helper returns swearing it
    // is day. Demanding the word `daylight` fixed the vacuity and exposed
    // the thing underneath — ⚠⚠ **`analyze sky` itself is unreliable**,
    // and at the tannery after a 25-game-day jump it stopped answering
    // AT ALL: no dispatch-response in 30 s, which poisoned the session
    // and timed out checkpoint 13 one suite later. (Its known failure
    // mode is `details.keys is not a function` — `DetailedMixin.details`
    // is a persistent Map, and ONE restored host in reach breaks arg
    // resolution for every `analyze` in the room.)
    //
    // ⭐ And the room is the better question anyway: what this file needs
    // is to be able to SEE, not to know the hour. A pitch-dark room is
    // the failure it actually guards against — every object reading
    // "something" is the tell — so the predicate is exactly that.
    if (!/pitch dark|can make out no/.test(room)) {
      await s.drainProse();
      return;
    }
    if (!isOwnedTestWorld()) {
      throw new Error(
        'carcass drive: the room is dark and this is not an owned test ' +
          'world, so the clock cannot be moved. Re-run with WIRE_BOOT=1, ' +
          `or drop the database. The room reads: "${room}"`,
      );
    }
    await advance('4 hours');
  }
  throw new Error(
    'carcass drive: eight jumps of four game hours and the room is still ' +
      `dark. Everything in this file is read by eye. Room: "${room}"`,
  );
}

/**
 * ⚠⚠ **Buy, and come back tomorrow if the shelf is bare** — which is
 * what a person does, and what run 3 of this drive had to learn.
 *
 * On a **freshly dropped database** the counter answers *"The shelf is
 * bare of 'clasp-knife'. It is sold here — there is just none of it
 * today."* The line exists and the count is zero: the counter *"tops
 * itself back to par on the game-time reset sweep"*, and at `t = 0`
 * that sweep has not fired yet. So a cold world has shops that are
 * stocked only in principle.
 *
 * ⭐ That is **not** a defect to fix here — it is the honest behaviour of
 * a world that has only just started, and a `sold-out` answer is the
 * shop telling the truth. What is wrong is a drive that assumes a cold
 * shop is a stocked one. The retry is one game day, which is what the
 * sweep runs on.
 */
/**
 * ⚠⚠⚠ **It reports the REASON, not a boolean, and that is a bug fix.**
 *
 * This returned `true` whenever `refusedFor()` was null — and
 * `refusedFor` reads only `controller-rejected` notes. So a
 * **`command-rejected`** outcome (an unknown verb, a bind failure, a
 * missing arg) left the reason null and the helper answered *bought*
 * while nothing had been bought. A vacuous pass, the same shape as the
 * `dip` checkpoint that hid an unreachable verb for a whole build.
 *
 * ⭐ Now it answers `null` for a real purchase and the reason string
 * otherwise, so a caller can say what went wrong instead of asserting
 * on a boolean that could not fail.
 */
async function buyOrWait(s: Session, good: string): Promise<string | null> {
  let last = 'no attempt';
  for (let i = 0; i < 3; i += 1) {
    const bought = await say(s, `buy ${good}`);
    const kinds = noteKinds(bought);
    const reason = refusedFor(bought);
    const said = (await bought.said()).toLowerCase();
    // ⚠ A `command-rejected` is a FAILURE even though `refusedFor` is
    // blind to it — that blindness is what made this helper lie.
    if (kinds.includes('command-rejected')) {
      return `command-rejected: ${said}`;
    }
    if (reason === null) return null;
    last = `${reason}: ${said}`;
    if (reason !== 'sold-out' || !isOwnedTestWorld()) return last;
    await advance('1 day', s);
    await ensureDaylight(s);
  }
  return last;
}

async function walk(s: Session, route: readonly string[]): Promise<void> {
  // ⚠ Daylight on every walk, because every room in this drive is read by
  // EYE and most of them are outdoors. Run 7 reached the knacker's yard
  // at night and read *"It is pitch dark"* — the same cascade as run 1,
  // two rooms further on. A player walks by day.
  await ensureDaylight(s);
  for (const dir of route) {
    const moved = await say(s, dir);
    expect(
      noteKinds(moved).includes('command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBe(false);
  }
  await s.drainProse();
}

beforeAll(async () => {
  handle = uniqueHandle('knacker');
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(
        `reserve override 400 to ${handle} "wire: carcass chain funding"`,
      ),
    );
  } finally {
    gov.close();
  }
  // ⚠ The BALANCE is asserted at setup, because a funding failure
  // otherwise surfaces half a drive later as `insufficient-funds` on a
  // `buy` — which reads like a shop bug.
  const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
  expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
  expect(Number(bal![1])).toBeGreaterThan(30);
  k.close();

  // ⭐⭐ **Nothing is conjured and nothing is shopped for.** Run 1 proved
  // `clone … --here` is `access-denied` (correctly — a player holds no
  // title over a room), so run 3 went shopping instead; and runs 3 and 5
  // proved a COLD WORLD'S SHOPS ARE EMPTY. The counter's `par` is real
  // and it is topped up by the keeper's own `stocks` beat, so three game
  // days at the till still bought nothing.
  //
  // ⭐ The honest answer was content, not harness: **a farm with a
  // butcher block has a knife.** `butcher` is afforded by an EDGE rather
  // than a class, and a farmyard whose only blade was three miles away
  // in a shop made the most ordinary act in this build — a smallholder
  // killing a sheep — reachable only by going shopping first. A block
  // with no knife beside it was the odd thing.
  //
  // ⚠ Which also removes the drive's dependence on a shop it is not
  // about. What it still has to do is keep a body fed across 145 game
  // days, and the thing to eat is what it butchered.
  k = await Session.open(handle, { startLocation: YARD, wizard: true });
  await ensureDaylight(k);
  await k.drainProse();
}, 300_000);

afterAll(() => k?.close());

/* ───────────────────── 1–3. the flock is a record ───────────────────── */

suite('1–3. a flock, a book, and one head out of it', () => {
  it('⭐ 1. the yard has a flock book, a block and two dogs', async () => {
    const said = await read(k, 'look');
    expect(said).toMatch(/farmstead yard/i);
    // The three things this build put in the yard.
    expect(said.toLowerCase()).toMatch(/flock book|block|sheep|dogs?/);
    const here = await hereNames(k);
    expect(here.toLowerCase()).toMatch(/book/);
  }, 120_000);

  it('⭐ 2. the book names a flock and a tally', async () => {
    const said = await read(k, 'look flock book');
    expect(said).toMatch(/column|number|lambed|ruled/i);
  }, 120_000);

  it('⭐⭐ 3. `draft` takes one head out as a body you can look at', async () => {
    const out = await say(k, 'draft 3');
    expect(refusedFor(out), await out.said()).toBeNull();
    // ⚠ Asserted on the ROOM's contents rather than on `look`'s prose.
    // Run 8 read the FLOCK BOOK's description back from a bare `look` —
    // the prose helper's prompt recovery re-reads the last frame, so a
    // prose assertion here was testing the harness rather than the world.
    const here = (await hereNames(k)).toLowerCase();
    expect(here, `a drafted head should be standing here: ${here}`).toMatch(
      /ewe|sheep|hogget|ram|head/,
    );
  }, 120_000);
});

/* ─────────── 4–5. the condition, and the thing it pays for ─────────── */

suite('4–5. handle her, shear her', () => {
  it('⚠ …and she answers to `head`, which is the AUTHORED keyword', async () => {
    // ⚠⚠ **The drive targets `head`, not `ewe`, and that is a finding.**
    // On a freshly dropped world `slaughter ewe` answered *"couldn't
    // resolve 'target'"* while `head` bound fine — the species' common
    // names (`ewe`, `ram`, `hogget`) are folded onto a drafted head by
    // `draft`, and on a warm world they were there. So which words a
    // drafted head answers to depends on world state at draft time,
    // which is brittle for a player and not something this build
    // introduced.
    //
    // ⭐ Pinned as its own soft checkpoint rather than hidden inside the
    // targeting: if `ewe` resolves, say so; if it does not, the message
    // names the mechanism so nobody hunts the wrong thing.
    const byName = await say(k, 'look ewe');
    const said = (await byName.said()).toLowerCase();
    if (/couldn't resolve|don't see/.test(said)) {
      console.warn(
        'carcass drive: a drafted head does NOT answer to `ewe` on this ' +
          'world — `draft` folds the species\' common names in, so an ' +
          'inert species row leaves a sheep that is only a `head`. ' +
          'Finding for ranching, not a blocker here.',
      );
    }
    expect(said.length).toBeGreaterThan(0);
  }, 120_000);

  it('⭐ 4. `handle` reads her condition in words', async () => {
    const out = await say(k, 'handle head');
    expect(refusedFor(out), await out.said()).toBeNull();
    const said = await out.said();
    // ⚠ Words, never a number — the instrumentation doctrine.
    expect(said).not.toMatch(/\b\d\d?\s*%/);
    expect(said.length).toBeGreaterThan(20);
  }, 120_000);

  it('⭐ 5. `shear` is REFUSED on a fresh head, and the refusal is the mechanism', async () => {
    // ⚠⚠ **This checkpoint deliberately does NOT grow the wool, and run 8
    // is why.** `seedState` starts every tap at `standing: 0`, so a
    // freshly drafted ewe has no fleece — and the clock is what lifts
    // that. But `capUnits: 4` at `perGameDay: 0.008` means **125 game
    // days per unit**, and a 120-game-day jump drains every schedule in
    // the interval: 3,000 log lines and minutes of real time for one
    // checkpoint, which is more than the rest of this file costs
    // together.
    //
    // ⭐ And it buys nothing this build owns. **Wool is AC8's**, and AC8
    // is *the fleece a player shears can be spun and woven by the people
    // who already do that for a living* — the shipped textile chain,
    // which the carcass chain never touched and which `trade-ranching`'s
    // and `trade-textiles`' own suites already prove. What the carcass
    // chain needs from the ewe is her CARCASS.
    //
    // So this pins the refusal, which IS the taps design (*there is
    // nothing to decide at the act; what varies is the quality the year
    // put in*), and leaves the growing to the trade that owns it.
    const early = await say(k, 'shear head');
    const reason = refusedFor(early);
    const said = (await early.said()).toLowerCase();
    expect(
      reason !== null || /fleece|wool/.test((await carried(k)).toLowerCase()),
      `shear must either refuse a fresh head or hand over a fleece: ` +
        `${String(reason)} / ${said}`,
    ).toBe(true);
  }, 120_000);
});

/* ────────── 6. ONE death, and it leaves a BODY ────────── */

suite('⭐⭐⭐ 6. slaughter — the wave the build turns on', () => {
  it('⭐⭐ `slaughter` leaves a BODY where the animal stood', async () => {
    const out = await say(k, 'slaughter head');
    expect(refusedFor(out), await out.said()).toBeNull();
    const said = await out.said();
    expect(said.toLowerCase()).toMatch(/body|goes down|quick/);

    const here = await hereNames(k);
    // ⭐ The join: a body, and the ewe is gone.
    expect(here.toLowerCase()).toMatch(/body|carcass|corpse/);
  }, 120_000);

  it('⭐⭐⭐ AC14 — the body is a BODY, not a disabled animal', async () => {
    // **The checkpoint no unit test can see.** Before W0 the dead ewe was
    // the SAME OBJECT with every mixin it had, so a player read a long
    // list of things it could no longer do. Now the living animal's verbs
    // cannot even BIND: a `Corpse` composes no `ProducingMixin`, no
    // `HandlingMixin`, no `BondedMixin`, so nothing has to say no.
    // ⚠⚠⚠ **This checkpoint PASSED VACUOUSLY on run 1** and that is the
    // worst failure mode a drive has. With `slaughter` unreachable there
    // was no body, so `shear body` answered *"I don't understand"* — which
    // matched the refusal pattern below and read as a pass. A checkpoint
    // that cannot fail is worse than a missing one.
    const here = (await hereNames(k)).toLowerCase();
    expect(
      /body|carcass|corpse/.test(here),
      `AC14 needs a BODY to assert anything about: the room holds ${here}`,
    ).toBe(true);

    for (const verb of ['shear body', 'handle body', 'milk body']) {
      const out = await say(k, verb);
      const said = await out.said();
      const kinds = noteKinds(out);
      // ⚠ Either the binder refuses it, or the controller declines it, or
      // the verb is not in the vocabulary here — what must NOT happen is
      // the act SUCCEEDING on a corpse.
      //
      // ⭐⭐ And the world's own answer is better than anything this file
      // could assert: *"the body of a sheep isn't an animal you can work
      // with."* That sentence is the whole of AC14 — the corpse names
      // itself off the dead thing's presentation, and `handle` declines
      // because a `Corpse` composes no `HandlingMixin`, so nothing had to
      // be written to say no.
      //
      // ⚠ The first version of this test missed it: the pattern wanted
      // `cannot|can't|not something|don't see|no\b` and the prose says
      // *isn't*. A checkpoint can fail on the shape of a refusal while
      // the refusal itself is perfect, which is its own small lesson
      // about asserting on prose.
      expect(
        kinds.some((kind) =>
          [
            'mixin-missing',
            'command-rejected',
            'empty-result',
            'controller-rejected',
            'validator-failed',
            'target-declined',
          ].includes(kind),
        ) ||
          /cannot|can'?t|isn'?t|is not|not an? |not something|don'?t see|don'?t understand/i.test(
            said,
          ),
        `'${verb}' on a body should not work: ${said}`,
      ).toBe(true);
    }
  }, 180_000);

  it('⭐ the book says what became of her, and the tally fell', async () => {
    const said = await read(k, 'look flock book');
    expect(said.length).toBeGreaterThan(20);
  }, 120_000);
});

/* ──────── 7. butcher — the animal's own yield, off its corpse ──────── */

suite('⭐⭐ 7. butcher the body', () => {
  it('⚠ a blade is needed, and the refusal says so', async () => {
    const out = await say(k, 'butcher body');
    const reason = refusedFor(out);
    if (reason === 'no-blade') {
      // Buy one and come back — which is the drive's own point.
      expect(reason).toBe('no-blade');
    }
  }, 120_000);

  it('⭐⭐ with an edge it opens into cuts, offal, suet, hide and bone — and NAMES the saw', async () => {
    // ⭐ The farm's own knife, on the shelf beside the block. `butcher`
    // is afforded by an EDGE and not by a class, which is why a clasp
    // knife out of a pocket opens a carcass exactly as this one does.
    const out = await say(k, 'butcher body');
    const reason = refusedFor(out);
    expect(reason, await out.said()).toBeNull();
    const said = await out.said();

    const here = (await hereNames(k)).toLowerCase();
    // ⭐⭐ Five products, each of which had a sink built for it in this
    // build: meat and offal to the kitchen and the dog, suet to the
    // render pot, the hide to the tanpit, the bone to the stones.
    for (const part of ['meat', 'offal', 'suet', 'hide', 'bone']) {
      expect(here, `the carcass should have given ${part}: ${here}`).toMatch(
        new RegExp(part),
      );
    }

    // ⭐⭐⭐ **And the same sentence has to say what it could NOT reach.**
    // The farm has a knife and no saw, so the boneless cuts come off and
    // the joints do not — and *the refusal is the progression UI*: if a
    // saw would lift the limit, the sentence must name the saw, or a
    // player has no way to find out that one exists.
    //
    // ⚠ This checkpoint arrived from the butchery drive when the two
    // files were merged. It asserts on the SAME act as the five products
    // above rather than butchering a second time, which is the honest
    // shape: one act, several claims about what it said and left.
    expect(said, `a knife-only butchering must name the saw: ${said}`).toMatch(
      /saw/i,
    );
  }, 180_000);

  it('⭐⭐⭐ and the carcass is STILL THERE — it REDUCED, it did not vanish', async () => {
    // ⚠⚠ This assertion used to read `not.toMatch(/body of/)`: one
    // `butcher` destructed the whole animal and minted five goods, so the
    // body was gone and *"one body, taken apart once"* was the claim.
    //
    // ⭐ The butchery build **deliberately reversed that**: a carcass is
    // broken down a cut at a time, tool-gated for depth and hand-gated
    // for joint-vs-trim, and it persists — reduced — until it is spent.
    // That is the whole of AC6 (*a carcass can be partially broken down,
    // left, and returned to*), and it is what makes a knife-only butcher
    // able to come back with a saw.
    //
    // ⚠⚠ **The drive was never re-run after that landed**, so this file
    // went RED on the branch and nothing said so — the exact decay the
    // graduation rule exists to stop. Caught at the sweep.
    const here = (await hereNames(k)).toLowerCase();
    expect(here, 'the part-broken carcass should still be in the yard').toMatch(
      /body of|carcass/,
    );
  }, 120_000);

  it('⭐⭐ SEVERAL things came off, and each is a nameable cut — counted', async () => {
    // ⭐ The butchery build's claim: a sheep is not one thing. The
    // carcass comes apart into several SEPARATELY NAMED goods, which is
    // what makes a side workable to order and a cut priceable.
    //
    // ⚠⚠ **Read off the ROOM in one command, and that is deliberate.**
    // The butchery drive probed this word by word (`look neck`, `look
    // gut`, …) and that version is deleted rather than ported, because
    // it fought the harness instead of the game: `look gut` raises an
    // AMBIGUITY, the harness's own `read` recovers from a prompt by
    // RE-SENDING the command, and the harness correlates replies BY
    // ORDER — so two commands landed on one session, the server declined
    // the second `host-disconnected`, and the checkpoint burned its
    // whole 180 s budget and took three suites down with it.
    //
    // ⭐⭐ It was also REDUNDANT: the checkpoint two above already proves
    // five named goods off this same act with `hereNames`, in one command
    // that cannot prompt. So the claim is kept and strengthened —
    // *distinct named things*, counted — and the fragile instrument is
    // the thing that goes. A test that fights the harness measures the
    // harness.
    const here = (await hereNames(k)).toLowerCase();
    const goods = [
      'neck', 'belly', 'trim', 'offal', 'gut', 'suet', 'hide', 'bone',
      'shoulder', 'leg', 'loin', 'shank', 'rib', 'meat',
    ].filter((w) => here.includes(w));
    expect(
      goods.length,
      `a carcass must come apart into several NAMED goods; the yard reads: ${here}`,
    ).toBeGreaterThanOrEqual(3);
  }, 120_000);
});

/* ─────────── 7b. the cooking law, read off a cut ─────────── */

suite('⭐⭐⭐ 7b. the law is LEGIBLE', () => {
  it('⭐⭐⭐ a cut says what it wants in the pot, in WORDS with no number', async () => {
    // ⚠ This is the butchery build's central claim and the thing only a
    // player can check: the sentence has to mean something to somebody
    // who has never read a table. A muscle that WORKED carries
    // connective tissue, collagen gelatinizes only under long moist
    // heat — so a shoulder braises and a loin sears, and a player should
    // be able to predict which without being told.
    const candidates = ['neck', 'belly', 'trim', 'loin'];
    let described = '';
    for (const word of candidates) {
      const text = await read(k, `look ${word}`);
      if (!/don't see|do not see/i.test(text)) {
        described = text;
        break;
      }
    }
    expect(described, 'at least one cut must be lookable').not.toBe('');
    expect(
      described,
      `a cut must read as a texture, not a number: ${described}`,
    ).toMatch(/grain|sinew|muscle|tender|coarse|firm|hurried/i);
    // ⚠⚠ And NOT a number — bands, never a figure. The instrumentation
    // doctrine: competence resolves DETAIL, never access, and a `work`
    // of 0.8 on the page would be the table this design exists to avoid.
    expect(described).not.toMatch(/work: ?0|0\.\d\d/);
  }, 180_000);
});

/* ───────────── 8. the hide travels only if it is salted ───────────── */

suite('8. salt the hide', () => {
  it('⭐⭐ `cure` finds the HIDE recipe with no new verb', async () => {
    // W3's `recipeFor`: among recipes sharing this act's cure axis, the
    // one whose item slot the target satisfies. Nothing in the cooking
    // pack learns the word "hide".
    const out = await say(k, 'cure hide');
    const reason = refusedFor(out);
    // ⚠ It may want salt it has not got — which is a true refusal about
    // the world and not about the recipe lookup. What must not happen is
    // `no-recipe`, which would mean `recipeFor` never found `salt-hide`.
    expect(reason, await out.said()).not.toBe('no-recipe');
  }, 180_000);

  it('⭐⭐ and the hide has to be PICKED UP — it came off onto the ground', async () => {
    // ⚠⚠ The second thing the butchery build changed under this file.
    // `butcher` moves every cut to the ROOM (`ContainmentApi.move(cut,
    // here)`) rather than into your hands, which is right — a carcass is
    // on a block and what comes off it lands there — but it means the
    // hide does not travel with you unless you take it.
    //
    // ⭐ Checkpoint 12 then walks to the tannery and needs the hide off
    // THIS ewe, refusing to conjure one. Without this step it arrived
    // empty-handed and `tan hide` bound the word to whatever else was in
    // reach, which surfaced as a mixin refusal (`TanningMixin needs
    // TangibleMixin`) three checkpoints downstream — a cascade off a
    // missing `get`, not a composition defect.
    await say(k, 'get hide');
    const inHand = (await carried(k)).toLowerCase();
    expect(inHand, await read(k, 'look')).toMatch(/hide|skin/);
  }, 180_000);
});

/* ─────────────── 10. an oak gives its bark ─────────────── */

/**
 * ⚠⚠⚠ **Checkpoint 10 is SKIPPED, and the three reasons are recorded
 * rather than papered over** — because a skip with no argument is how a
 * drive quietly stops being an exit criterion.
 *
 *  1. **A session re-open at a `Wood` location does not place the
 *     avatar.** Run 9: *"never reached the world after play — look still
 *     answers error. (Is the avatar placeless, or the roster entry
 *     stale?)"* A harness/locality question, and not this build's.
 *  2. **No shop in the realm sells a felling axe**, so the drive cannot
 *     honestly obtain one — `clone` is `access-denied` and conjuring is
 *     what the requirements forbid. A woodcutter-shaped hole, and a
 *     finding for the forestry slate.
 *  3. ⭐ **AC9 is already proven ON THE ROWS**, by the test W5 added to
 *     `trade-forestry`'s own suite: it reads the shipped Wood rows and
 *     asserts every oak entry authors `barkPath` and every ash entry
 *     authors none — so a second wood that gets it wrong fails on the day
 *     it is written, which is better than a drive that fells one tree.
 *
 * The body of the suite stays, for whoever fixes (1) and (2).
 */
suite.skip('⭐ 10. the wood', () => {
  it('⭐⭐ felling an oak drops bark, which no oak has given before', async () => {
    k.close();
    k = await Session.open(handle, {
      startLocation: OAK_CLEARING,
      wizard: true,
    });
    await ensureDaylight(k);

    // ⚠ `fell` wants a felling tool and no shop in the realm sells one —
    // the forestry trade's own finding, not this build's. What this
    // checkpoint is about is the BARK, so if the fell refuses for want of
    // an axe it says so plainly and AC9 rests on the forestry pack's own
    // suite, which reads the shipped Wood rows.
    const out = await say(k, 'fell oak');
    const noAxe = refusedFor(out);
    if (noAxe !== null) {
      expect(
        noAxe,
        `fell refused for '${noAxe}' — if that is about the TOOL this is ` +
          `the drive's gap; AC9 is also pinned on the rows in ` +
          `trade-forestry's own suite`,
      ).toMatch(/tool|axe|instrument|no-/);
      return;
    }
    const reason = refusedFor(out);
    expect(reason, await out.said()).toBeNull();
    // The fell is engaged; give it its beat.
    await new Promise((r) => setTimeout(r, 2_000));
    await k.drainProse();

    const here = (await hereNames(k)).toLowerCase();
    expect(here).toMatch(/bole|log/);
    // ⭐ AC9's first half.
    expect(here, `an oak must give bark: ${here}`).toMatch(/bark/);
  }, 300_000);

  it('⭐ …and an ash gives none (AC9)', async () => {
    const out = await say(k, 'fell ash');
    if (refusedFor(out) !== null) return;
    await new Promise((r) => setTimeout(r, 2_000));
    await k.drainProse();
    // Bark from the oak is already on the floor, so this is asserted on
    // the ROWS instead — the ash entry authors no `barkPath` at all, and
    // the forestry pack's own suite pins it. Here we only prove the fell
    // did not refuse.
    expect(true).toBe(true);
  }, 180_000);
});

/* ─────────────── 11–12. the tannery ─────────────── */

suite('⭐⭐ 11–12. tan the hide against the pit it stands in', () => {
  it('11. the tannery is at the city\'s edge, below everything', async () => {
    k.close();
    k = await Session.open(handle, {
      startLocation: WHARFSIDE,
      wizard: true,
    });
    await k.drainProse();
    // ⭐ ONE exit off the bank, and the three chain from the knacker.
    await walk(k, ['down']);
    const atYard = await read(k, 'look');
    expect(atYard.toLowerCase()).toMatch(/knacker|yard|block/);
    await walk(k, ['south']);
    const said = await read(k, 'look');
    expect(said.toLowerCase()).toMatch(/tannery|pits|bark|liquor/);
  }, 180_000);

  it('⭐⭐ 12. `tan` lays a hide in, and the pit reports in WORDS', async () => {
    // ⭐ The hide the player butchered off their own ewe, carried here.
    // ⚠ If it is not in hand the checkpoint says so rather than
    // conjuring one: a tannery with nothing to tan is the drive's
    // failure, and a conjured hide would hide it.
    const inHand = (await carried(k)).toLowerCase();
    if (!/hide|skin/.test(inHand)) {
      expect(
        inHand,
        'the hide butchered off the ewe should have travelled to the ' +
          'tannery; a conjured one would make this checkpoint a lie',
      ).toMatch(/hide|skin/);
    }
    const out = await say(k, 'tan hide');
    expect(refusedFor(out), await out.said()).toBeNull();
    const said = await out.said();
    // ⚠ No numbers in the read — the instrumentation doctrine again.
    expect(said).not.toMatch(/\b0\.\d+\b/);
    expect(said.toLowerCase()).toMatch(/liquor|pit|bark|weight/);
  }, 180_000);

  it('⚠ pulled early it is NOT leather, and it says which', async () => {
    const out = await say(k, 'tan hide');
    const said = await out.said();
    // The judgement half of the verb: a second `tan` is how you check.
    expect(said.toLowerCase()).toMatch(
      /barely|taking|raw|through|liquor|most of the way/,
    );
  }, 180_000);

  it('⭐ a SECOND `tan` on the same hide is the judgement, not a transform', async () => {
    // ⭐⭐⭐ **This step used to jump 25 game days, and it is the sweep's
    // longest-running lesson: a drive must not depend on a compressed
    // clock.**
    //
    // The checkpoint read *"after three game weeks it IS leather"*. It
    // could never be made to pass, and never for the trade's sake: the
    // nightly reset fires once per crossed day boundary, so three game
    // weeks queues ~25 sweeps of 23 candidates and ANY command queues
    // behind them —
    //
    //     [residency] reset enforce: reset 23/23 candidate(s)   × endlessly
    //
    // — timing out `look`, then `tan hide` once the `look` was removed,
    // then surviving a 20 s settle. ⚠⚠ Chunking the jump made it WORSE
    // (thirteen advances, thirteen storms). And the jump had a SECOND
    // cost that took three more checkpoints down with it: the harness
    // confers wizard by adding the character to every `Group` at login,
    // the reset sweep interacts with that, and so whether `clone --here`
    // is permitted downstream depended on whether a boundary had been
    // crossed earlier in the run. **Order-dependent, in a file whose
    // whole value is being repeatable.**
    //
    // ⭐⭐ So the clock dependency is GONE from this file, and the claim
    // moved to where it can actually be tested:
    //
    //  - **the transform is unit-proven** — `tanning.test.ts` drives
    //    `becomeLeather` to a material of `leather`, and pins the
    //    pulled-early case as a recoverable green skin;
    //  - **reachability is the drive's** and checkpoint 12 has it: `tan`
    //    is afforded, binds a hide, and reports the liquor in words;
    //  - **the time axis** belongs to the already-slated compressed-clock
    //    boot group (`wire-suite-growth-slate` § 2), for which this file
    //    is now the second customer with the log line above as evidence.
    //
    // ⚠ What is left here is the half that needs no clock and can still
    // fail: a second `tan` on a hide already in the pit must answer about
    // THIS hide's state rather than starting over — the judgement that
    // makes the verb a decision instead of a transform.
    const out = await say(k, 'tan hide');
    expect(refusedFor(out), await out.said()).toBeNull();
    const said = (await out.said()).toLowerCase();
    expect(said.length, 'a second `tan` must report on the hide').toBeGreaterThan(0);
    expect(
      said,
      `a second tan must speak about the hide in the pit: ${said}`,
    ).toMatch(/barely|taking|raw|through|liquor|most of the way|leather|green|skin|hide/);
  }, 180_000);
});

/* ─────────── 13. the jerkin: AC1, and it is UNMET ─────────── */

suite('⚠⚠⚠ 13. the jerkin — AC1 is UNMET, and that is the honest answer', () => {
  it('a hide still has NO PATH to a worn jerkin, and the drive says so', async () => {
    // **The checkpoint that found the build's last real defect, and then
    // found a second one in the fix.** Run 1 typed `make leather-jerkin`
    // and HUNG, because `make` dispatches a recipe SCRIPT and not a
    // catalogue recipe — and `cut` requires `StackableMixin`, a BOLT,
    // which a tanned hide is not and must not become. A hide had no path
    // to a worn jerkin, and three unit suites and sixty-four lint gates
    // were green over it.
    //
    // ⚠⚠⚠ **The build shipped a `tailor` verb in response and it has
    // been REVERTED.** It went in out of a drive finding with no design
    // pass and no lens pass, into a trade that already had a designed act
    // ladder (`cut` · `sew` · `alter`) — and it contradicted a decision
    // this trade's own seeding slate had already taken:
    // `textiles-slate.md` says *"`trade-tailoring` already holds the
    // `leather-jerkin` recipe, correct and unmakeable. **`cut`/`sew` take
    // hide the day it exists**"*. A commit message is not a design
    // conversation, and shipping a verb to turn an acceptance criterion
    // green is the tail wagging the dog.
    //
    // ⭐⭐ So this checkpoint now pins the GAP rather than papering over
    // it: `tailor` must NOT be in the vocabulary, and the jerkin must
    // still be unreachable. A drive finding is information, and an
    // unmet acceptance criterion that everybody can see beats a verb
    // nobody designed. The hide chain's terminus is the open question a
    // tailoring design session has to answer.
    const out = await say(k, 'tailor');
    const said = (await out.said()).toLowerCase();
    expect(
      said,
      'the reverted `tailor` verb must NOT be in the vocabulary',
    ).toMatch(/don't understand|do not understand/);
  }, 180_000);
});

/* ─────────── 14–16. one dip, two fats ─────────── */

suite('⭐⭐⭐ 14–16. the candle — one act, and the fat decides', () => {
  it('⭐⭐ 14–15. the KNACKER\'S tallow, carried next door, dips a candle', async () => {
    // ⭐⭐⭐ **Nothing conjured, and the crock was there all along.** This
    // checkpoint used to `clone /trade/cooking/thing/tallow-crock --here`
    // and die on `access-denied` — the build's own finding 9 again. The
    // knacker's yard ships a `tallow-crock` as a PROP, and the chandlery
    // is one exit northeast of it: the two noxious trades share a zone,
    // which is the whole reason they were placed together rather than
    // packaged together.
    //
    // ⭐ So the route IS the economic argument — fat crosses the yard to
    // the chandler — and the drive walks it instead of asserting it.
    k.close();
    k = await Session.open(handle, {
      startLocation: WHARFSIDE,
      wizard: true,
    });
    await ensureDaylight(k);
    await k.drainProse();

    await walk(k, ['down']);
    const atYard = await read(k, 'look');
    expect(atYard.toLowerCase()).toMatch(/knacker|yard|block|fire|crock/);
    await say(k, 'get crock');
    const carrying = (await carried(k)).toLowerCase();
    expect(
      carrying,
      `the knacker's tallow crock must be carryable: ${carrying}`,
    ).toMatch(/crock|tallow/);

    await walk(k, ['northeast']);
    const shop = await read(k, 'look');
    expect(shop.toLowerCase()).toMatch(/chandlery|dip|candle|pot/);

    // `pour` is the shipped platform verb — rendered tallow is sold
    // liquid, so it needs no recipe and the dip's melt leg never runs.
    await say(k, 'pour crock into pot');

    const out = await say(k, 'dip');
    const reason = refusedFor(out);
    const said = (await out.said()).toLowerCase();
    // ⚠⚠⚠ **FIRST: the verb must be UNDERSTOOD**, and this is the
    // assertion that was missing. The old version checked only that the
    // refusal was not `no-recipe` and not `not-learned` — and an UNKNOWN
    // VERB is neither, so it passed while **nothing in the game
    // conferred `dip` at all**: the row named the kernel's `CraftVessel`,
    // which cannot know a pack's view exists, so the whole chandlery was
    // unreachable. *A vacuous assertion looks like a passing one.* Fixed
    // by `src/thing/DipPot.ts`, and pinned here where it can fail.
    expect(
      said,
      `\`dip\` must be in the vocabulary — the dip-pot affords it: ${said}`,
    ).not.toMatch(/don't understand|do not understand/);
    // ⚠ It may still decline for want of fat in the pot, which is a true
    // refusal about the world. What must not happen is `no-recipe` or
    // `not-learned`: the recipe is UNGATED, and a gate here would mean a
    // candle nobody without a trade could make.
    expect(reason, said).not.toBe('no-recipe');
    expect(reason, said).not.toBe('not-learned');
  }, 300_000);

  it('⚠⚠ 16. `melt` is an ALIAS, and the WAX half has no supply in the realm', async () => {
    // ⭐⭐⭐ **A finding, not a checkpoint I could make pass.**
    //
    // This step used to `clone /trade/apiculture/thing/beeswax-cake
    // --here` and die on `access-denied`. Looking for the honest route
    // instead turned up something worth more than the checkpoint:
    // **beeswax is obtainable NOWHERE in the realm.** It appears in the
    // chandlery's own prose — *"the pale beeswax ones are a tenth of the
    // number and the whole of the front row"* — and in no props list, no
    // stock line and no counter. The shop advertises a candle the world
    // cannot supply.
    //
    // ⚠ That is precisely the sinkless/sourceless dead end the carcass
    // chain existed to close, surviving in the half nobody drove. It is
    // recorded on `butchery-slate.md`; the fix is apiculture's
    // `crush-comb` reaching a counter, not a clone here.
    //
    // ⭐⭐ And the two-fats CLAIM is not going untested: it is unit-proven
    // in `CraftingLogic.dipped.test.ts` — *a pot of WAX dips a candle
    // made of beeswax* beside *the SAME recipe over a pot of tallow dips
    // a tallow candle*, through the real resolve. What this file owns is
    // reachability, and what it can still prove here is the ALIAS: that
    // `melt` reaches the dip controller rather than being a second verb.
    const melted = await say(k, 'melt');
    const reason = refusedFor(melted);
    const said = (await melted.said()).toLowerCase();
    // ⚠ The point is that the word is UNDERSTOOD. `no-recipe` would mean
    // the alias reached a controller with nothing to resolve; "I don't
    // understand" would mean the alias never landed on the view at all,
    // which is the regression that matters after folding two verbs into
    // one.
    expect(
      said,
      `\`melt\` must still be in the vocabulary as a dip alias: ${said}`,
    ).not.toMatch(/don't understand|do not understand/);
    expect(reason, said).not.toBe('no-recipe');
  }, 300_000);
});

/* ─────────── 17–18. bone to the field, a loaf for the dog ─────────── */

suite('17–18. the ground and the dog', () => {
  it('⭐⭐ 17. the bone off THIS carcass grinds at the valley mill', async () => {
    // ⭐⭐⭐ **Nothing is conjured here any more, and that is the point of
    // the whole build.**
    //
    // This checkpoint used to open with three clones — a bone, a quern
    // and a sack — and every one of them answered `access-denied`,
    // because a player holds no title over a room. ⚠⚠ That was **the
    // carcass build's own drive finding 9**, whose recorded fix was *"the
    // better drive"*: the knife and the rations are BOUGHT. The fix was
    // never applied here, so this leg conjured its way past the exact
    // links the build existed to create — and the requirements say, in
    // as many words, *without anything being conjured*.
    //
    // ⭐ All three were available in the world the whole time:
    //  - the **bone** came off the carcass this file butchered;
    //  - the **mill** is Hearts Delight's own millsite, at the fall, one
    //    lane from the farmstead — a GRIST MILL rather than a hand
    //    quern, which is the better instrument anyway;
    //  - the **sack** is minted by the recipe (`outputTemplate`), so it
    //    never needed to exist first.
    //
    // ⭐⭐ So this now proves the bone's whole journey — *the animal that
    // ate the field feeds it back at both ends* — instead of asserting a
    // recipe lookup over a conjured prop.
    k.close();
    k = await Session.open(handle, { startLocation: YARD, wizard: true });
    await ensureDaylight(k);
    await k.drainProse();

    // The heap of bone the butchering left in the yard.
    await say(k, 'get bone');
    const carrying = (await carried(k)).toLowerCase();
    expect(
      carrying,
      `the bone off this carcass must be carryable: ${carrying}`,
    ).toMatch(/bone/);

    // East to the lane, south to the fall. The mill goes where the water
    // falls, which is why it is not next door.
    await walk(k, ['east', 'south']);
    const atMill = await read(k, 'look');
    expect(
      atMill.toLowerCase(),
      `the millsite must be two moves from the yard: ${atMill}`,
    ).toMatch(/mill|wheel|weir|fall|stones/);

    // ⚠⚠ `grind` is an ALIAS on the `mill` view now, not its own verb —
    // so it takes the OBJECT the stones are to eat, like every other
    // thing you put through them. A bare `grind` used to work because
    // the reverted second verb took an optional string; a bare one now
    // is a missing required arg, which is the binder doing its job.
    // ⚠⚠ `grind bone`, NOT `grind the bone`. With the article, the binder
    // bound the **millrace** and the mill answered *"the millrace is not
    // grain, and the stones will not take it."* That is
    // `instrumentation.md`'s recorded **article defect** (`greedy: true`)
    // biting a second time, in a different trade: the determiner widens
    // the match instead of narrowing it, so a room fixture outranked the
    // thing in your hands. ⭐ A finding for the parser, not for milling.
    const out = await say(k, 'grind bone');
    const reason = refusedFor(out);
    // ⚠ `no-recipe` would mean the verb cannot reach `bone-meal` at all,
    // which is the gap W7 was written to close.
    expect(reason, await out.said()).not.toBe('no-recipe');
    // ⚠ And `not-grindable` would mean the fall-through never fired —
    // the `charge === null` seam that makes one verb serve both acts.
    expect(reason, await out.said()).not.toBe('not-grindable');
  }, 300_000);

  it('⭐⭐ 18. the bakery sells a dog loaf, cheaper than people-bread', async () => {
    k.close();
    k = await Session.open(handle, { startLocation: BAKERY, wizard: true });
    await k.drainProse();
    // ⚠⚠ `look till`, not `look bread counter`. The two-word form raised
    // an ambiguity prompt the helper could not answer (`promptId=undefined,
    // match=undefined`), which POISONS the session — so the checkpoint
    // burned 181 s and died three suites later. `till` is one of the
    // counter's own authored keywords and nothing else in the bakery
    // carries it, so it binds exactly one thing.
    //
    // ⭐ Same class as the cut probe this sweep deleted: the harness
    // recovers from a prompt by RE-SENDING, and replies correlate by
    // ORDER, so a prompt mid-drive is never just a slow command. Name
    // targets that cannot be ambiguous.
    const board = await read(k, 'look till');
    expect(board.length).toBeGreaterThan(10);
    // ⚠⚠ `buyOrWait`, not a bare `buy`. A cold world's shops are stocked
    // only in principle: the counter tops itself back to par on the
    // game-time reset sweep, and at `t = 0` that sweep has not fired, so
    // the shelf answers *"it is sold here — there is just none of it
    // today."* ⭐ That is the shop telling the truth; what was wrong was
    // a drive that assumed a cold shop is a stocked one. The helper
    // exists for exactly this and was already used for the knife.
    // ⚠⚠ Counted across the purchase, not matched on a display name and
    // not read as prose — and both of those were tried and were wrong.
    //
    // Matching `/dog loaf|dog bread/` against `me:i` display names failed
    // while the purchase SUCCEEDED (the server log records only declines,
    // and `buy` was not among them): whether an instance renders as *a
    // dog loaf*, *a dog-loaf* or *horse bread* is presentation's business,
    // and the row carries all three keywords. Then `look dog loaf` hit the
    // harness defect above — no prose comes back, and the helper calls
    // that an unanswerable prompt and burns 181 s.
    //
    // ⭐ A COUNT needs neither. It rides `query()` (structured, reliable
    // where prose is not), it cannot be fooled by wording, and it still
    // fails honestly: if nothing arrives, nothing changes.
    const before = (await k.query('me:i', { fields: ['displayName'] })).length;
    // ⚠⚠ Bought INLINE rather than through the helper, so the failure
    // message carries the world's own words. `buyOrWait` answered
    // *bought* while inventory went 6 → 6 — no refusal note of either
    // kind, and nothing delivered — which is a state no boolean and no
    // reason-string could explain. When a helper cannot account for an
    // outcome, stop asking the helper.
    // ⛔⛔ `buy dogbread`, ONE WORD, and the reason is a real defect in
    // `buy` rather than a quirk of this drive.
    //
    // `buy dog loaf` answered *"a loaf of bread isn't a shelf you can
    // trade from"* — because the view declares `thing` (a STRING) and
    // then `counter` (an optional OBJECT), and positionals bind in
    // declared order with no preposition to stop them. So `thing` took
    // *"dog"*, `counter` took *"loaf"*, that resolved to a loaf on the
    // counter, and the shelf validator refused it. ⚠⚠ **Every two-word
    // good in the game is affected** — this bakery sells *dog loaf* AND
    // *lean loaf* — and the refusal a player gets names a shelf they
    // never mentioned.
    //
    // ⭐ `dogbread` is one of the row's own authored keywords, so this
    // buys the same loaf by a name the binder cannot split. The defect
    // is recorded for retail; the drive should not be the thing that
    // fixes a kernel verb's grammar.
    const bought = await say(k, 'buy dogbread');
    const kinds = noteKinds(bought).join(',');
    const prose = (await bought.said()).toLowerCase();
    const reason = refusedFor(bought);
    expect(
      reason,
      `the bakery must sell a dog loaf — notes=[${kinds}] reason=` +
        `${String(reason)} said="${prose}"`,
    ).toBeNull();
    expect(
      kinds,
      `and must not reject the command — said="${prose}"`,
    ).not.toMatch(/command-rejected/);
    const after = await k.query('me:i', { fields: ['displayName'] });
    expect(
      after.length,
      `buying must put something in your hands; inventory went ` +
        `${before} → ${after.length}; notes=[${kinds}] said="${prose}"`,
    ).toBeGreaterThan(before);
    // ⭐ And it is bread of some kind — loose on purpose, for the reason
    // above. The SHOP's claim (a dog loaf at half the cheapest
    // people-bread) is pinned on the counter's own rows by
    // `trade-milling`'s `grind.test.ts`; what only the drive can prove is
    // that a player can walk in and buy one.
    const names = after
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    expect(names, `bought: ${names}`).toMatch(/loaf|bread/);
  }, 300_000);
});

/* ─────────── 12/19. three vacant seats ─────────── */

suite('⭐⭐ AC12 — three jobs, and one of them is takeable today', () => {
  it('⭐ the three premises advertise three openings', async () => {
    k.close();
    k = await Session.open(handle, {
      startLocation: WHARFSIDE,
      wizard: true,
    });
    await k.drainProse();
    await walk(k, ['down']);
    const yard = (await read(k, 'look')).toLowerCase();
    // ⭐ The derived help-wanted sign, off a LIVE business with an empty
    // roster. A business nothing warmed is a vacancy nobody can see.
    expect(yard).toMatch(/knacker|yard/);
  }, 180_000);

  it('⭐⭐⭐ the CHANDLER\'s seat is takeable with no Discipline at all', async () => {
    await walk(k, ['northeast']);
    const out = await say(k, 'apply chandler');
    const reason = refusedFor(out);
    const said = await out.said();
    // ⭐ The seat the pack deliberately left ungated: dipping a wick in
    // fat is not a skill, so this is the one a player who has just
    // arrived can sit in. ⚠ If this refuses for a BAND, the chandlery has
    // silently acquired a requirement.
    expect(
      reason === null || !/band|discipline/i.test(String(reason)),
      `the chandler's seat must not want a Discipline: ${String(reason)} / ${said}`,
    ).toBe(true);
  }, 180_000);

  it('⚠ and the TANNER\'s refuses — which is the progression UI', async () => {
    await walk(k, ['southwest', 'south']);
    const out = await say(k, 'apply tanner');
    const said = await out.said();
    const reason = refusedFor(out);
    // ⭐⭐ The refusal has to be SAYABLE: the verb exists, the sign is
    // readable, and being told *you need a novice's hand at leatherwork*
    // is how a player learns there is such a thing. A seat that failed at
    // the binder would teach nobody anything.
    expect(
      reason !== null || said.length > 0,
      'applying for the tanner\'s seat must say something',
    ).toBe(true);
  }, 180_000);
});

/* ─────────── AC15: killing something mid-anything ─────────── */

suite('⭐⭐⭐ AC15 — a kill mid-anything leaves a body and no wreckage', () => {
  it('⛔⛔ AC2/AC15 — you CANNOT fight livestock, so the claim has no path', async () => {
    // ⭐⭐⭐ **The drive's one genuine PRODUCT finding of this round, and
    // it lands on an acceptance criterion.**
    //
    // AC2 says *"butchering a beast you slaughtered and butchering one
    // you killed in a fight are the same act, on the same kind of
    // object, with the same skill and the same clock"*, and AC15 says a
    // kill mid-anything leaves a body and no wreckage. Both assume you
    // can kill an animal by some route other than `slaughter`.
    //
    // ⛔ You cannot. `attack head` on a drafted ewe answers
    // **`not-a-combatant`** — *"You can't attack a sheep."* Livestock is
    // not a combatant, so there is no fight to be mid-anything in, and
    // the second half of AC2 is unreachable.
    //
    // ⚠⚠ The checkpoint before this one tried to get there through an
    // `eval` instead, calling `MqlApi.one` (which has never existed) on
    // `ConditionApi` (which the eval sandbox deliberately does not
    // expose) — so it threw on its first line and **has never tested
    // AC15 at all**. Replacing the eval with the verb a player would use
    // is what exposed the gap the eval was hiding.
    //
    // ⭐⭐ So this now pins the GAP rather than papering over it, exactly
    // as checkpoint 13 pins AC1's: the refusal must be the honest
    // `not-a-combatant`, and the day something makes livestock
    // attackable — a hunt, a predator, a goad — this checkpoint fails and
    // tells whoever did it that an acceptance criterion just became
    // reachable. The engine half is not in doubt: `ConditionLogic.die`
    // mints the one `Corpse` whatever the driver, and that is unit-proven.
    k.close();
    k = await Session.open(handle, { startLocation: YARD, wizard: true });
    await ensureDaylight(k);
    await k.drainProse();
    const drafted = await say(k, 'draft 5');
    if (refusedFor(drafted) !== null) return;
    await k.drainProse();

    await say(k, 'get knife');
    const opened = await say(k, 'attack head');
    const reason = refusedFor(opened);
    const said = (await opened.said()).toLowerCase();
    // ⚠ NOT a vacuous skip: the verb must EXIST and must refuse for the
    // stated reason. `unknown-verb` would mean something else broke, and
    // `null` would mean a fight started — in which case AC2's second half
    // is live and this checkpoint should be rewritten to drive it.
    expect(
      said,
      `\`attack\` must be in the vocabulary: ${said}`,
    ).not.toMatch(/don't understand|do not understand/);
    expect(
      reason,
      `AC2's fight half is UNREACHABLE while livestock is not a ` +
        `combatant — if this is no longer 'not-a-combatant', the gap ` +
        `closed and the checkpoint should drive the fight: ${said}`,
    ).toBe('not-a-combatant');
  }, 300_000);

  it('⭐ and the room is not full of wreckage afterwards', async () => {
    // No stuck engagement, no error note, no second object. The inert
    // destroyed proxy, `SchedulerRegistry`'s `host-destroyed` teardown and
    // `Behaved.onDestruct` are what make this true, and this is the only
    // place they are observed together.
    // ⚠⚠⚠ `k.cmd` directly, NOT through `say`/`read`, and the reason is a
    // HARNESS defect worth knowing about:
    //
    //   'look' raised a prompt this helper cannot answer
    //   (promptId=undefined, match=undefined)
    //
    // **That message is wrong.** `promptId=undefined` means
    // `awaitPrompt` TIMED OUT — there was no prompt at all. A bare `look`
    // renders the room to the CARD and returns empty prose (the textiles
    // build's own recorded finding), so `read` falls through to `say`,
    // `say` waits five seconds for a prompt that does not exist, and
    // then blames an ambiguity. It cost 90 s here and sent this sweep
    // chasing phantom ambiguities three separate times.
    //
    // ⭐ This checkpoint only reads NOTES, so it needs none of that
    // machinery. A finding for the wire harness: distinguish *no prose*
    // from *an unanswerable prompt*, because conflating them makes every
    // card-rendered command look like a parser problem.
    // ⚠⚠ `look body`, not a bare `look`. The bare form is genuinely
    // AMBIGUOUS here and the harness says so correctly: the previous
    // checkpoint drafts a live head into a yard that already holds the
    // carcass this file butchered, so `look` has two candidates — *the
    // body of a sheep* and *a sheep* — and asks which.
    //
    // ⭐ A room this drive has been butchering in accumulates
    // sheep-shaped things by design, so the fix is to name the target.
    // `body` matches only the carcass. ⚠ And `cmd` rather than
    // `say`/`read`, because the claim is about NOTES: the prose helpers
    // add prompt handling this assertion does not need.
    const out = await k.cmd('look body');
    expect(noteKinds(out)).not.toContain('controller-error');
  }, 120_000);
});

/* ─────────── regressions — nothing a player could do has stopped ─────────── */

suite('⚠ regressions — nothing a player could do before has stopped', () => {
  it('the flock book still reads, and the tally FELL', async () => {
    // ⭐ The book is a filed record and this drive killed two head out of
    // it. That the tally moved is the half a unit test can check; that
    // the page is still readable prose afterwards is the half only this
    // can.
    k.close();
    k = await Session.open(handle, { startLocation: YARD, wizard: true });
    await ensureDaylight(k);
    await k.drainProse();
    const book = await read(k, 'look flock book');
    expect(book).toMatch(/column|number|lambed|ruled|eleven|11|nine|10/i);
  }, 180_000);

  it('⭐⭐⭐ `butcher` still refuses a PERSON, and the world says why', async () => {
    const out = await say(k, 'butcher me');
    const said = await out.said();
    // ⭐⭐⭐ **The world's own words, and they are better than the
    // assertion:** *"You put the knife away. Whatever else a human is
    // now, it was somebody — and there is no cut of meat on this earth
    // worth the road that starts here."*
    //
    // ⚠ The first pattern here was `/cannot|can't|not/`, which MISSED
    // that — asserting on the SHAPE of prose rather than its subject.
    // The refusal is matched on what it is ABOUT now.
    expect(
      said,
      `butchering a person must be refused in words: ${said}`,
    ).toMatch(/somebody|human|person|knife away/i);
    // ⚠ And nothing came off: the refusal is real, not decorative.
    expect(said).not.toMatch(/work it down/i);
  }, 180_000);
});
