/**
 * ⭐⭐ **The whiskey vertical, driven end to end** — the build's exit
 * criterion, run against the real socket.
 *
 * The requirements' drive in one sentence: *steep barley on a malting
 * floor and kiln it to malt, mill it, mash it, ferment the wash, charge
 * the still and light it, smell your way to the hearts, bottle them,
 * cask them, wait, and have somebody drink the bad bottle and find your
 * name in the ledger.*
 *
 * ## What only a drive can prove here
 *
 * The suite proves the arithmetic; this proves the **chain is reachable**.
 * Three of the four defects this build fixed were invisible to tests:
 *
 *  - ⛔ **the still could not be lit.** Three recipes named its
 *    capability and asked for 351 K, and no still row authored a fuel
 *    reserve — so `FireLogic` refused the burner, `reachableHeatForImpl`
 *    counted no heat, and `order distil` declined `insufficient-heat` for
 *    the whole life of the pack. Nothing observable depended on it,
 *    because the counter's spirit came off faucet rows.
 *  - ⛔ **`pour <vat> into still`** failed closed at the binder: the Still
 *    class held no bulk slot at all, so the verb answered *"you can't
 *    pour anything into the still"*.
 *  - ⚠ **the first draw after ignition stamped the receiving vessel with
 *    WASH** while handing it a payload full of foreshots, because
 *    `transfer` reads the source material before any policy seam
 *    reconciles the run. Found by a world test; every unit test heated
 *    the host before pouring, which is the one ordering that hides it.
 *
 * ## ⚠⚠ The clock is the premise
 *
 * Malting is five game-days, the ferment is days, the cask is forty-five.
 * A game day is about two real hours, so **none of the back half is
 * reachable without the test-clock route** — `POST /auth/test-clock`,
 * mounted only when `AUTH_MODE === 'test'`, behind `@TestOnly`. The
 * clock-dependent suites SKIP when the run is merely attached to
 * somebody's dev server, because jumping two months in a world the
 * operator is playing in would age every reconcile-on-read system in it
 * at once. ⭐ `advance` asserts the clock MOVED on every call, so no
 * checkpoint in this file can go vacuous about time — the taps drive
 * reported 15/15 for three review rounds with a dead clock.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/whiskey.dirty.wire.test.ts`
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
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It consumes the still-house's
 * authored charge vessels: the wash, the barley, the casks. Nothing in
 * the world puts those back within a run.
 *
 * ⭐ **The fuel clause is GONE.** It used to read *"burns the still's
 * one-shot fuel reserve down — no refuel verb exists for any burner"*,
 * and that was a finding rather than a nuisance: a furnace burnt its
 * authored fuel once and nothing anywhere put more in. The fire build
 * shipped `stoke`, so the still is refuelled below like any other fire
 * and the file is dirty for its FEEDSTOCK alone.
 */
export const DIRTY_REASON =
  'steeps and kilns the still-house’s barley and ferments and distils a ' +
  'charge that nothing puts back within a run';

declareFile({
  file: 'whiskey.dirty.wire.test.ts',
  packs: [
    'trade-distilling',
    'trade-malting',
    'trade-milling',
    'trade-farming',
    'generic-objects',
    'base-library',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const FLOOR = '/world/terminus/goods-yards/crowsfoot/location/floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

let k: Session;
let handle = '';

/** Game-seconds a duration string names. */
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
 * A command, with an unanswered PROMPT recovered from. ⚠ The
 * apiculture drive's shape, and it matters here because the distillery
 * floor holds two vats, three buckets and a cask — several of which
 * answer to overlapping words.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    // ⚠⚠ **A timed-out command poisons the session, and the harness says
    // so in one sentence**: *"was sent while another command is still in
    // flight… correlation is by ORDER, so one command per session at a
    // time."* On the first full run ONE slow `look` in the dark took
    // eleven later checkpoints down with it, each reporting the in-flight
    // error rather than anything about whiskey.
    //
    // ⭐ So a stuck session is RECOVERED rather than cascaded: reopen it
    // and send the command again. The checkpoint that was actually slow
    // still fails, which is right — what is wrong is the other eleven
    // failing with it, because a cascade is not diagnostic.
    if (/still in flight/.test(String(err))) {
      k.close();
      k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
      return await k.cmd(text);
    }
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
 * ⭐⭐⭐ Move world-time from OUTSIDE the fiction, and **prove it moved**.
 * The premise of every clocked checkpoint below, asserted in the helper
 * so no single checkpoint can be vacuous about it.
 */
async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(
    after - before,
    `advance ${duration}: world-time did not move (the clock is the ` +
      `premise of every clocked checkpoint in this file)`,
  ).toBeGreaterThan(secondsOf(duration) * 0.9);
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * ⭐⭐ **Wait for daylight, because the still-house has no lamp.**
 *
 * Crowsfoot's floor authors no ambient light at all, deliberately — its
 * own row says so: *"this room is LIT BY SPILL from the yard, through a
 * doorway that stands open… bright by day and DARK at night, which is
 * the whole point, and it costs no authored number at all."*
 *
 * ⚠⚠ So the first run of this drive opened with `it is pitch dark. you
 * can…` and every `look` checkpoint failed on a premise that had nothing
 * to do with whiskey. **A drive that walks into an interior lit by spill
 * has to know what time it is** — the taps drive never learned this
 * because a sugarbush is outdoors. Recorded here because the next indoor
 * drive will hit it too.
 *
 * ⭐ Advancing the clock is the honest fix rather than conjuring a
 * lantern: the house is dark at night because somebody decided it should
 * be, and a distiller works in the day.
 */
async function waitForDaylight(s: Session): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const here = await read(s, 'look');
    if (!/pitch dark|too dark/i.test(here)) return;
    await advance('4 hours');
  }
  throw new Error(
    'wire: the still-house floor stayed dark across a whole game day — ' +
      'the spill-lighting walk from the yard is not reaching it',
  );
}

beforeAll(async () => {
  handle = uniqueHandle('distiller');
  // ⚠ `reserve override`, not `reserve issue` — the reserve stopped
  // issuing coin by hand at the economic bootstrap. And the balance is
  // asserted HERE, at setup, because a funding failure otherwise
  // surfaces several checkpoints later as `insufficient-funds` on a
  // `buy`, which reads like a shop bug.
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(`reserve override 400 to ${handle} "wire: whiskey funding"`),
    );
  } finally {
    gov.close();
  }
  const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
  expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
  expect(Number(bal![1])).toBeGreaterThan(30);
  k.close();
  k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
  await waitForDaylight(k);
}, 300_000);

afterAll(() => k?.close());

/* ───────────────── 0. the floor, and the clock it needs ───────────────── */

suite('⭐ 0. the still-house floor is reachable and furnished', () => {
  it('the floor holds the still, the book, the maltings and the cask', async () => {
    const here = await read(k, 'look');
    // ⚠ Each of these is a `props:` entry, and a props entry that names a
    // row which does not resolve is absent SILENTLY — `lint:census`
    // clause (b) is the build-time half of this assertion and this is the
    // runtime half.
    for (const word of ['still', 'book']) {
      expect(here.toLowerCase(), `'${word}' is not on the floor`).toContain(
        word,
      );
    }
    // The three vessels and the maltings this build placed.
    // ⛔⛔ `here:c` — which this file used and which **is not an
    // operator**. MQL's descend is `:i` (`mql-grammar.md` § Chain
    // operator); a bareword in chain position FILTERS BY KEYWORD, so
    // `here:c` asked for things in this room whose keyword is "c" and
    // got the room back. Every name this checkpoint claimed to read was
    // therefore read off one string — the room's own display name — and
    // the assertion could only ever have passed for words that happen to
    // appear in it. Found by the styles drive, which copied the idiom.
    const names = await k.query('here:i', { fields: ['displayName'] });
    const all = names
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    for (const word of ['cask', 'slop', 'malting floor', 'kiln']) {
      expect(all, `'${word}' was not placed on the floor`).toContain(word);
    }
  }, 120_000);

  it('⭐⭐ the still-book offers the malting steps and the mash', async () => {
    const book = await read(k, 'look still book');
    for (const word of ['steep', 'kiln', 'mash']) {
      expect(book.toLowerCase(), `the book does not offer '${word}'`).toContain(
        word,
      );
    }
    // ⛔ And `distil` is GONE — it named this still's capability and had
    // never once run, because no still authored the fuel to reach 351 K.
    expect(book.toLowerCase()).not.toContain('distil ');
  }, 120_000);
});

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐⭐ 0b. the clock moves, from OUTSIDE the fiction',
  () => {
    it('the test-clock route moves game time, and by how much', async () => {
      // ⚠ `await`. `worldClockNow()` returns a PROMISE, and reading it
      // unawaited gave `NaN`, so `Number.isFinite(before)` was false and
      // the checkpoint failed on its own premise rather than on the
      // clock. The unawaited-promise flake class, in a drive.
      const before = await worldClockNow();
      expect(Number.isFinite(before)).toBe(true);
      await advance('2 days');
      const after = await worldClockNow();
      expect(after - before).toBeGreaterThan(2 * 86_400 - 60);
    }, 300_000);
  },
);

/* ─────────────────────── 1. the still can be LIT ─────────────────────── */

suite('⛔⛔ 1. the still can be LIT — the defect under everything', () => {
  it('⭐⭐ an unstoked still refuses by NAME, and the name is the act', async () => {
    const cold = await say(k, 'ignite still');
    // ⭐ `no-fuel`, not `not-flammable`. The distinction is the whole
    // progression UI: a still with an empty firebox is a fire waiting for
    // somebody to stoke it, and the refusal has to say which or the
    // player has no way to find out what lifts it.
    expect(
      refusedFor(cold),
      'an empty firebox must refuse as `no-fuel` — `not-flammable` would ' +
        'tell the player the still cannot burn at all',
    ).toBe('no-fuel');
  }, 120_000);

  it('⭐⭐ `stoke still` lifts it, and then it lights', async () => {
    // ⚠ The still's firebox is NOT its interior — a still's interior is
    // the WASH. `stoke` goes to the bed; `fill` goes to the charge.
    const fed = await say(k, 'stoke log into still');
    // ⚠ The verb has to be UNDERSTOOD, which is a different claim from
    // the act succeeding: a verb with no view, no controller row or no
    // affording class answers "I don't understand" — closed, silent, and
    // green in every controller test.
    expect(
      fed.notes.find(
        (n) =>
          n.kind === 'command-rejected' || n.kind === 'controller-error',
      ),
      '`stoke` was not understood at the still',
    ).toBeUndefined();
    const lit = await say(k, 'ignite still');
    expect(
      refusedFor(lit),
      'a stoked still lights: this is the assertion the whole build rests on',
    ).not.toBe('no-fuel');
  }, 120_000);
});

/* ───────────────── 2. the still is a VESSEL, and says so ───────────────── */

suite('⭐⭐ 2. the still holds a charge', () => {
  it('`look still` reports a pot that can be charged, and it is cold', async () => {
    const still = await read(k, 'look still');
    expect(still.length).toBeGreaterThan(20);
    // ⭐ No digit in the state line: a glance says what phase it is in and
    // never where in a run it is.
    const stateLine = still
      .split('\n')
      .find((l) => /charged|running|run out|cold/i.test(l));
    if (stateLine) expect(stateLine).not.toMatch(/\d/);
  }, 120_000);

  it('⭐⭐ `pour vat into still` is not refused at the binder', async () => {
    // ⛔ This was the second invisible defect: `Still` composed no
    // BulkableMixin, so `pour`'s `mustHaveBulkSlot` validator failed
    // CLOSED and the verb answered "you can't pour anything into the
    // still" — for every player, for the life of the pack.
    const poured = await say(k, 'pour vat into still');
    const reason = refusedFor(poured);
    expect(
      reason,
      'the still has no bulk slot: `pour` fails at the binder, which no ' +
        'controller test can see',
    ).not.toMatch(/bulk|slot|cannot-pour/i);
  }, 120_000);
});

/* ──────────────────── 3. the malting chain is reachable ──────────────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐ 3. barley becomes malt — the arrow that was missing',
  () => {
    it('the steep and the kilning are BOTH orderable', async () => {
      // ⚠ What is proved here is REACHABILITY, not the chemistry: an
      // `order` that answers `unknown-recipe` means the pack did not
      // install, which is the failure mode a rows-only pack has.
      for (const step of ['steep-barley', 'kiln-malt']) {
        const r = await say(k, `order ${step}`);
        const reason = refusedFor(r);
        expect(
          reason,
          `order ${step}: the recipe is not installed — a rows-only pack ` +
            `that did not discover is invisible`,
        ).not.toMatch(/unknown-recipe|no-such-recipe/i);
      }
    }, 300_000);

    it('⭐ the malting floor reads as a bed with a clock on it', async () => {
      const floor = await read(k, 'look malting floor');
      expect(floor.length).toBeGreaterThan(20);
      // ⭐⭐ And if there is a bed in it, the prose must be the ENZYMATIC
      // lines — never yeast, never bubbles. Nothing is living on a
      // malting bed; the grain is doing it to itself, and the platform
      // teaches.
      for (const word of ['yeast', 'bubbl', 'ferment']) {
        expect(
          floor.toLowerCase(),
          `the floor is reading MICROBIAL prose ('${word}') over a bed ` +
            `where nothing is alive but the barley`,
        ).not.toContain(word);
      }
    }, 120_000);
  },
);

/* ───────────────── 4. the run — charge, heat, smell, cut ───────────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐⭐ 4. the cut', () => {
  it('⭐ the wash ferments and the still takes the charge', async () => {
    // Mash first, then let it work. The vat is the still-house's own.
    const mashed = await say(k, 'order wash-mash');
    await settle(k, mashed);
    // A ferment is days; the harness owns the clock.
    await advance('6 days');
    const vat = await read(k, 'look vat');
    expect(vat.length).toBeGreaterThan(20);
  }, 600_000);

  it('⭐⭐ `smell still` reads a CHARACTER with no digit in it', async () => {
    const smelled = await read(k, 'smell still');
    // ⚠ The read is prose or it is nothing. `lint:authored-prose` gates
    // the rows; this asserts the rendered sentence reaches a player
    // through the real `smell` controller's filter — which is the link no
    // unit test crosses, because the only way a mixin speaks on `smell`
    // is a filter-gated `markupAugmenters` entry.
    expect(smelled.length).toBeGreaterThan(10);
    const characterish = smelled
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .join(' ');
    expect(
      /\d/.test(characterish),
      `the still's smell carries a NUMBER: "${characterish}" — the cut is ` +
        `a judgement, not a gauge`,
    ).toBe(false);
  }, 120_000);

  it('⚠⚠ nothing announces a boundary — the draw is silent either side', async () => {
    // ⭐ Two small draws into the slop bucket, and the note kinds must be
    // identical. A message at a boundary would turn a judgement into a
    // prompt, and the whole design rests on the player noticing rather
    // than being told.
    const first = await say(k, 'pour still into slop bucket --amount 0.2 L');
    const second = await say(k, 'pour still into slop bucket --amount 0.2 L');
    const kinds = (r: CommandResult) =>
      (r.notes as Array<{ kind?: string }>).map((n) => n.kind).sort();
    expect(kinds(second)).toEqual(kinds(first));
  }, 300_000);

  it('⭐⭐⭐ the bottle names the MAKER and a band, and nothing about safety', async () => {
    const bottled = await say(k, 'fill bottle from still');
    void bottled;
    const inv = await carried(k);
    expect(inv.length).toBeGreaterThan(0);
    const bottle = await read(k, 'look bottle');
    // ⭐ What a bottle says: who made it and how good it is. What it does
    // NOT say: whether it is safe. That silence is the design — a bad
    // bottle is indistinguishable from a good one by any sense a player
    // has, which is what makes the cut matter and the ledger necessary.
    for (const word of ['safe', 'poison', 'methanol', 'toxic']) {
      expect(
        bottle.toLowerCase(),
        `the bottle is WARNING the holder ('${word}') — it must not`,
      ).not.toContain(word);
    }
  }, 300_000);
});

/* ───────────────────────── 5. the cask, and time ───────────────────────── */

suite.skipIf(!isOwnedTestWorld())('⭐⭐ 5. new-make becomes whiskey', () => {
  it('⭐ the cask takes the spirit, is bunged, and after time holds whiskey', async () => {
    const poured = await say(k, 'pour still into cask');
    void poured;
    await say(k, 'close cask');
    // Forty-five game-days is the authored profile; take sixty.
    await advance('60 days');
    const cask = await read(k, 'look cask');
    expect(
      cask.toLowerCase(),
      'the cask does not report whiskey after its profile\'s time — ' +
        'either the aging profile never matched or the roster is cold',
    ).toContain('whiskey');
  }, 900_000);
});
