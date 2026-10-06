/**
 * The butchery drive — **does a carcass come apart into named joints, and
 * does the pot know the difference?**
 *
 * ⭐⭐⭐ The build this drives exists because the carcass chain shipped the
 * PLUMBING for butchery and skipped butchery: every land animal yielded
 * twelve units of one generic `stew-meat`, so a cow and a ewe differed
 * only in kilograms-per-unit. The gap was named in the tree the whole
 * time — `butchery.yaml` says the Discipline is *"where the joints are,
 * WHICH CUT IS WHICH, and how to open a carcass without opening its
 * gut"*, and two of those three had shipped.
 *
 * ## What only a drive can see here
 *
 * The three things 65 gates and ~2500 unit tests cannot:
 *
 *  1. **The law is LEGIBLE.** `look` at two cuts off one animal has to
 *     read differently, in words, with no number — and the difference has
 *     to be about texture. A unit test can assert a band; only a player
 *     can tell you the sentence means something.
 *  2. **The refusals teach.** A knife-only butchering must SAY which tool
 *     the joints want. That sentence is the progression UI, and it is
 *     invisible to every controller test.
 *  3. **The chain runs end to end** — carcass → joint → pot → a dish that
 *     is better for having been cooked right.
 *
 * ## ⚠⚠ What is NOT here, said plainly
 *
 *  - **The cow half.** The valley now has an ox pair (W24), but a 700 kg
 *    ox is not something a player can get to a block: droving is still
 *    not expressible, which is the carcass chain's own recorded gap. The
 *    drive reads the ox BOOK and compares the two species' authored
 *    yields instead of pretending the collection round exists. ⭐ AC12's
 *    arithmetic is proven in `trade-ranching`'s suite, off the shares,
 *    which is a better proof than one weighing.
 *  - **The sausage end to end.** `scrape-casing` → `sausage` is a
 *    three-input craft and the drive's hand has the gut; what it cannot
 *    cheaply get in one session is grain and a second fat. The
 *    checkpoints assert the recipes RESOLVE and the casing carries the
 *    gut's load — the parts this build added — and leave the full stuff
 *    to the cooking suite.
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
 * ⚠ **Why this file cannot run twice.** It drafts and KILLS a head out of
 * the persisted Delight flock — the tally falls and does not come back.
 *
 * ⭐ And its dirty reason is a question for a trade, as every dirty reason
 * should be: **nothing in the valley sells a saw.** The general store
 * three miles away stocks one (W26), but the farm that keeps the sheep
 * has no way to take a joint off the bone without a trip to town — which
 * is either a real constraint worth keeping or a missing line on a
 * farmstead's shelf. A finding for `ranching-slate`, not a defect here.
 */
export const DIRTY_REASON =
  'drafts and kills a head out of the persisted Delight flock (the tally ' +
  'falls and does not come back), and consumes the carcass it makes';

declareFile({
  file: 'butchery.dirty.wire.test.ts',
  packs: [
    'trade-ranching',
    'trade-cooking',
    'trade-farming',
    'generic-objects',
    'base-library',
    'hearts-delight',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/terminus/hearts-delight/location/farmstead-yard';

let k: Session;
let handle = '';

/* ───────────────────────────── helpers ───────────────────────────── */
/* ⭐ Lifted from `carcass-chain.dirty.wire.test.ts`, whose nine runs paid
 * for every one of these shapes: the prompt recovery, the ms-aware clock,
 * the daylight assertion that can actually fail, and the shop retry. */

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
  const want = Number(m![1]) * (m![2] === 'day' ? 86_400 : 3_600);
  const { before, after } = await advanceWorldClock(duration);
  expect(
    after - before,
    `advance ${duration}: world-time did not move (the clock is the ` +
      `premise of the tanning and the rotting in this file)`,
  ).toBeGreaterThan(want * 0.9);
  await new Promise((r) => setTimeout(r, 400));
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
    // ⭐⭐⭐ **It asks the ROOM, not the sky, and finding out why is this
    // drive's best catch.**
    //
    // The carcass drive asked `analyze sky` and tested *is it not night*.
    // That is vacuous twice over: in a dark room the instrument refuses,
    // so the answer matches neither word and the helper returns swearing
    // it is day. Demanding the word `daylight` fixed the vacuity and
    // immediately exposed the thing underneath — ⚠⚠ **`analyze sky`
    // itself fails**, with *"Couldn't resolve 'tool' (resolve):
    // details.keys is not a function"*. `DetailedMixin.details` is a
    // persistent **Map**, and a Map does not survive a JSON round trip,
    // so a restored host answers an object where `getDetailIds` expects
    // a Map — and ONE such thing in reach breaks arg resolution for
    // every `analyze` in the room. Recorded as a finding; not this
    // build's to fix blind.
    //
    // ⭐ And the room is the better question anyway: what this file needs
    // is to be able to SEE, not to know the hour. A pitch-dark room is
    // the failure it actually guards against (every object reading
    // "something" is the tell), so the predicate is now exactly that.
    if (!/pitch dark|can make out no/.test(room)) {
      await s.drainProse();
      return;
    }
    if (!isOwnedTestWorld()) {
      throw new Error(
        'butchery drive: the room is dark and this is not an owned test ' +
          'world, so the clock cannot be moved. Re-run with WIRE_BOOT=1, ' +
          `or drop the database. The room reads: "${room}"`,
      );
    }
    await advance('4 hours');
  }
  throw new Error(
    'butchery drive: eight jumps of four game hours and the room is still ' +
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
async function buyOrWait(s: Session, good: string): Promise<boolean> {
  for (let i = 0; i < 3; i += 1) {
    const bought = await say(s, `buy ${good}`);
    const reason = refusedFor(bought);
    if (reason === null) return true;
    if (reason !== 'sold-out' || !isOwnedTestWorld()) return false;
    await advance('1 day', s);
    await ensureDaylight(s);
  }
  return false;
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
  handle = uniqueHandle('butcher');
  // ⚠ No bank, no shopping: this drive's constraint is the farmyard's own
  // kit. The carcass chain already paid for learning that a cold world's
  // shops are empty and that `clone --here` is access-denied — so the
  // only tools here are the ones the farm has, which is also the point of
  // checkpoint 3.
  k = await Session.open(handle, { startLocation: YARD, wizard: true });
  await ensureDaylight(k);
  await k.drainProse();
}, 300_000);

afterAll(() => k?.close());

/* ───────────────────────────── the drive ─────────────────────────── */

suite('1–2. a head out of the flock, and a body', () => {
  it('⭐ the yard has a flock book and a block', async () => {
    const here = await read(k, 'look');
    expect(here).toMatch(/yard|farmstead/i);
    const book = await read(k, 'look flock book');
    expect(book, 'the flock book must be readable').toMatch(/column|number|lambed|ruled/i);
  });

  it('⭐⭐ `draft` takes one head out, and `slaughter` leaves a body', async () => {
    expectOk(await say(k, 'draft 3'));
    const drafted = await read(k, 'look head');
    expect(drafted, 'a drafted head must be lookable').toMatch(/ewe|sheep|hogget|ram|head/i);
    const killed = await say(k, 'slaughter head');
    expect(
      noteKinds(killed).includes('command-rejected'),
      `slaughter was refused: ${await killed.said()}`,
    ).toBe(false);
    const body = await read(k, 'look body');
    expect(body, 'a body must be where the animal stood').toMatch(/body|carcass|still/i);
  });
});

suite('⭐⭐⭐ 3–5. the tool is the depth, and the carcass REDUCES', () => {
  it('⚠⚠ a knife-only butchering NAMES the tool the joints want', async () => {
    const out = await say(k, 'butcher body');
    expect(
      noteKinds(out).includes('command-rejected'),
      `butcher was refused outright: ${await out.said()}`,
    ).toBe(false);
    const said = await out.said();
    // ⭐⭐ The refusal IS the progression UI: a knife takes the boneless
    // cuts and the sentence has to say what wants a saw. This is the
    // checkpoint no controller test can see.
    expect(
      said,
      `a knife-only butchering must name the saw: ${said}`,
    ).toMatch(/saw/i);
  });

  it('⭐⭐⭐ and the carcass is STILL THERE, with the joints on it', async () => {
    // The whole reason a side can be worked to order.
    const body = await read(k, 'look body');
    expect(
      body,
      'the body must survive a partial butchering',
    ).toMatch(/body|carcass/i);
  });

  it('⭐⭐ SEVERAL things came off, and each is a nameable cut', async () => {
    // ⚠⚠ Probed by NAME rather than by reading the room, and two findings
    // are why. First, `butcher` lays the cuts where the beast fell, not
    // in your hands (the carcass drive's finding 7) — so `inventory` was
    // the wrong place to look. Second, a bare `look` renders the room to
    // the CARD and returns empty prose, which is the textiles build's
    // own recorded finding and made the replacement assert nothing at
    // all. Naming the things is the only form that can fail honestly.
    const words = ['neck', 'belly', 'trim', 'offal', 'gut', 'suet', 'hide', 'bone'];
    const found: string[] = [];
    for (const word of words) {
      const text = await read(k, `look ${word}`);
      if (!/don't see|do not see|couldn't resolve/i.test(text)) found.push(word);
    }
    // ⭐ A sheep is not one thing: the whole point of the build is that a
    // carcass comes apart into several named goods.
    expect(
      found.length,
      `at least three named goods must be on the ground; found: ${found.join(', ') || 'none'}`,
    ).toBeGreaterThanOrEqual(3);
  });
});

suite('⭐⭐⭐ 6–7. the law is LEGIBLE', () => {
  it('⭐⭐⭐ a cut says what it wants in the pot, in WORDS with no number', async () => {
    // ⚠ This is the build's central claim and the thing only a player can
    // check: the sentence has to mean something to somebody who has never
    // read a table.
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
    // ⚠⚠ And NOT a number — bands, never a figure.
    expect(described).not.toMatch(/work: ?0|0\.\d\d/);
  });
});

suite('⚠ 8. regressions — nothing a player could do before has stopped', () => {
  it('the flock book still reads and the tally fell', async () => {
    const book = await read(k, 'look flock book');
    expect(book).toMatch(/column|number|lambed|ruled|eleven|11/i);
  });

  it('⭐⭐⭐ `butcher` still refuses a PERSON, and the world says why', async () => {
    const out = await say(k, 'butcher me');
    const said = await out.said();
    // ⭐⭐⭐ **The world's own words, and they are better than the
    // assertion:** *"You put the knife away. Whatever else a human is
    // now, it was somebody — and there is no cut of meat on this earth
    // worth the road that starts here."*
    //
    // ⚠ My first pattern was `/cannot|can't|not/` and it MISSED that —
    // which is the carcass drive's own lesson repeating one build later:
    // asserting on the SHAPE of prose rather than its subject. The
    // refusal is matched on what it is about now.
    expect(
      said,
      `butchering a person must be refused in words: ${said}`,
    ).toMatch(/somebody|human|person|knife away/i);
    // ⚠ And nothing came off: the refusal is real, not decorative.
    expect(said).not.toMatch(/work it down/i);
  });
});
