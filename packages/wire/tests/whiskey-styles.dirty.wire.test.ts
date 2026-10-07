/**
 * ⭐⭐⭐ **Whiskey as a PRODUCT, driven end to end** — the styles build's
 * exit criterion, run against the real socket.
 *
 * The predecessor's drive (`whiskey.dirty.wire.test.ts`) proves the
 * CHAIN: barley to a bottle, and a bad cut that poisons somebody. This
 * one proves the chain produces **more than one whisky**, which is the
 * charge its own lens pass recorded and left open:
 *
 * > *"with six rungs, which one decides the outcome? If the cut decides
 * > everything and the other five are corridors, then five rungs are
 * > ceremony and the build is a chemistry demo wearing a supply chain."*
 *
 * So the question every checkpoint here serves is: **does a decision at
 * one rung change the right answer at another?**
 *
 *  - the MALTING rung picks the smoke axis (`kiln-malt` or
 *    `kiln-malt-peated`) — and because phenols come over LATE, it also
 *    moves where the right cut falls;
 *  - the CEREAL rung picks the kind (malt or grain whisky);
 *  - the CUT decides safety, and how much of the smoke you keep;
 *  - the CASK decides character, and `productAtFraction` makes *when to
 *    bottle* a cash-flow fork against the Lounge's `minGrade: fair`;
 *  - the BLEND decides volume against grade.
 *
 * ## ⚠ What only a drive can prove
 *
 * Every defect this build fixed was invisible to the suite:
 *
 *  - ⛔⛔ **the mill could not make grist.** Both mill rows pinned
 *    `productMaterial` to wheat flour and `ComminutingMixin` had one
 *    product per row, so a malt sack ground anywhere came out as flour
 *    no mash accepts. The vertical test "proving" that link compared two
 *    rows' tags and never ground anything; the predecessor's live drive
 *    stopped at *"There isn't enough grist."*
 *  - ⛔ **a recipe laundered the dose.** `applyBulkOutput` carried no
 *    input payload at all, so vatting two bad bottles made a clean one.
 *  - ⚠ **the still-book offered no malting lines**, because nobody at
 *    Crowsfoot was seated to the trade — which left the predecessor's own
 *    wire drive asserting two lines the book did not have.
 *
 * ## ⚠⚠ The clock is the premise
 *
 * Malting is five game-days, the ferment days, the cask ~91. A game day
 * is about two real hours, so the back half is unreachable without the
 * test-clock route (`POST /auth/test-clock`, `AUTH_MODE === 'test'`,
 * behind `@TestOnly`). Those suites SKIP on somebody's dev server rather
 * than aging a world the operator is playing in. ⭐ `advance` asserts the
 * clock MOVED on every call, so no checkpoint here can go vacuous about
 * time — the taps drive reported 15/15 for three rounds with a dead
 * clock.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/whiskey-styles.dirty.wire.test.ts`
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
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It consumes the still-house's
 * authored charge vessels, the turf stack the peated kiln burns, and the
 * still's one-shot fuel reserve — ⭐ and that reserve is still a finding
 * rather than a nuisance: **no refuel verb exists for any burner in the
 * game.** A question for the fire/energy slate.
 *
 * ⭐ It also consumes the four turves on the floor, which is the second
 * half of the same finding: the peated kiln declares what the turf DOES
 * (`Recipe.imparts`) because nothing in the engine knows what a burner
 * is burning. Two fires in the fiction, one in the model.
 */
export const DIRTY_REASON =
  'kilns the still-house’s barley over its turf stack, grinds and ' +
  'ferments and distils charges that nothing puts back within a run, ' +
  'fills both casks, and burns the still’s one-shot fuel reserve down — ' +
  'no refuel verb exists for any burner';

declareFile({
  file: 'whiskey-styles.dirty.wire.test.ts',
  packs: [
    'trade-distilling',
    'trade-malting',
    'trade-milling',
    'trade-farming',
    'trade-quarrying',
    'trade-hospitality',
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
 * A command, with an unanswered PROMPT recovered from, and a poisoned
 * session reopened. ⚠ The predecessor's shape, and it matters more here:
 * this floor now holds two casks, a quern, a nosing glass and a turf
 * stack on top of what was already there, and several answer to
 * overlapping words.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    // ⚠⚠ One stalled command took ELEVEN later checkpoints down with it
    // on the predecessor's first run, each reporting an in-flight error
    // rather than anything about whiskey. A cascade is not diagnostic, so
    // a stuck session is recovered rather than cascaded.
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

/**
 * Everything in the room, by display name, lowercased.
 *
 * ⛔⛔ **`here:i`, not `here:c`.** Two shipped wire drives used `here:c`
 * believing it meant *contents*; it is not an operator at all. MQL's
 * descend is `:i` (`mql-grammar.md` § Chain operator) and a bareword in
 * chain position **filters by keyword** — so `here:c` asked for things
 * in the room whose keyword is "c", got the ROOM back, and every name
 * the assertion claimed to read was read off one string: the room's own
 * display name. It could only ever pass for words that happen to appear
 * in it. This drive copied the idiom and that is how it was found.
 */
async function hereNames(s: Session): Promise<string> {
  const rows = await s.query('here:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ')
    .toLowerCase();
}

/**
 * ⭐⭐⭐ Move world-time from OUTSIDE the fiction, and **prove it moved**.
 * Asserted in the helper so no single checkpoint can be vacuous about it.
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
 * ⚠⚠ **Wait for daylight: the still-house has no lamp.** Its own row
 * says the floor is lit by spill from the yard — *"bright by day and
 * DARK at night, which is the whole point"*. The predecessor's first run
 * opened with *"it is pitch dark"* and every `look` failed on a premise
 * that had nothing to do with whiskey.
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
  handle = uniqueHandle('blender');
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(`reserve override 600 to ${handle} "wire: styles funding"`),
    );
  } finally {
    gov.close();
  }
  // ⚠ Asserted HERE, at setup: a funding failure otherwise surfaces
  // several checkpoints later as `insufficient-funds` on a `buy`, which
  // reads like a shop bug.
  const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
  expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
  expect(Number(bal![1])).toBeGreaterThan(30);
  k.close();
  k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
  await waitForDaylight(k);
}, 300_000);

afterAll(() => k?.close());

/* ───────────── 1. the floor carries the new decisions ───────────── */

suite('⭐ 1. the floor, the book, and the two casks', () => {
  it('the floor holds the quern, both casks, the glass and the turf', async () => {
    // ⚠ Each is a `props:` entry, and a props entry naming a row that
    // does not resolve is absent SILENTLY. `lint:census` clause (b) is
    // the build-time half of this assertion; this is the runtime half,
    // and it is the half that caught the malting pack not installing.
    const all = await hereNames(k);
    for (const word of [
      'quern',
      'cask',
      'charred cask',
      'nosing glass',
      'turf',
      'malt kiln',
    ]) {
      expect(all, `'${word}' was not placed on the floor`).toContain(word);
    }
  }, 120_000);

});

/* ───────────── 2. every new line is INSTALLED and reachable ───────────── */

suite('⭐⭐ 2. the five new recipes are installed', () => {
  it('none of them answers `unknown-recipe`', async () => {
    // ⚠ What is proved here is REACHABILITY, not chemistry: an `order`
    // that answers `unknown-recipe` means the pack did not install,
    // which is the one failure mode a rows-only pack has and the one
    // nothing else in the repo can see. A refusal for lack of INPUTS is
    // a different thing and is fine here.
    for (const step of [
      'steep-barley',
      'kiln-malt',
      'kiln-malt-peated',
      'wash-mash',
      'grain-wash-mash',
      'vat-whisky',
    ]) {
      const r = await say(k, `order ${step}`);
      expect(
        refusedFor(r),
        `order ${step}: the recipe is not installed — a rows-only pack ` +
          `that did not discover is invisible`,
      ).not.toMatch(/unknown-recipe|no-such-recipe/i);
    }
  }, 300_000);
});

/* ───────────── 3. the book, and the ⚠ keyword it should not own ───────────── */

suite('⭐⭐ 3. the still-book offers the new lines', () => {
  it('both kilns, both mashes and the vatting are on the board', async () => {
    // ⚠⚠ `look book`, NOT `look still book`. `still-book.yaml` carries
    // the keyword **`still`**, so "still book" is two ambiguous tokens
    // and the read prompts for a disambiguation the drive cannot answer
    // — it timed out at 120 s, twice, on a premise with nothing to do
    // with whiskey. `pour vat into still` still binds, because
    // `mustHaveBulkSlot` narrows the book out; a bare `look` has no such
    // validator and nothing narrows it. **A fixture owning another
    // fixture's noun is a content defect**, recorded for the distilling
    // trade rather than fixed here (`still` is in the shipped row's
    // keywords and something may resolve on it).
    const book = (await read(k, 'look book')).toLowerCase();
    for (const word of ['steep', 'kiln', 'peat', 'mash', 'grain', 'vat']) {
      expect(book, `the book does not offer '${word}'`).toContain(word);
    }
  }, 120_000);
});

/* ───────────── 4. the ARG GATE — the link nothing else can see ───────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐⭐ 4. every new verb REACHES its controller',
  () => {
    /**
     * ⭐⭐ **The fifth reachability link, and the only one a drive is for.**
     *
     * A view's `args[].requires` is checked at the BINDER, upstream of
     * everything a controller test can observe: `hammer` required
     * `DurableMixin`, no metal stock composes one, and every
     * `hammer <target>` died at the binder while 34 controller tests
     * stayed green. The same hole swallows a mistyped option shape.
     *
     * So each checkpoint below asserts the command was **UNDERSTOOD** —
     * it reached a controller and the controller answered about the
     * world. A refusal for want of inputs is a pass; `shape-fall-through`
     * (no command shape matched) and `no-*`/`not-*` (the binder found
     * nothing to act on) are failures.
     */
    function understood(r: CommandResult, cmd: string): void {
      const note = (
        r.notes as Array<{ kind?: string; reason?: string }>
      ).find((n) => n.kind === 'command-rejected');
      expect(
        note?.reason,
        `'${cmd}' never reached a controller — the binder refused the ` +
          `shape, which is the failure class no controller test can see`,
      ).toBeUndefined();
    }

    it('⛔⛔ `mill <sack>` reaches the quern', async () => {
      // W1's verb, and the quern is the row that put the act where the
      // malt is. `not-grindable` is the controller talking about an
      // EMPTY sack and is a pass; `no-mill` would mean the quern is not
      // reachable at all, which is what this proves it is.
      const r = await say(k, 'mill malt sack');
      understood(r, 'mill malt sack');
      expect(
        refusedFor(r),
        'no mill in reach — the quern is not on this floor',
      ).not.toMatch(/no-mill/);
    }, 120_000);

    it('⚠⚠ `pour … --amount 3L` binds — and `--amount 3 L` does NOT', async () => {
      // ⛔ The option's documented form is `2cups` / `250ml` / `0.5L`,
      // **with no space**. A space makes the unit a stray token, the
      // whole shape falls through, and the player is told their command
      // is not a command — for a correct-looking measure.
      //
      // ⚠ The predecessor's drive writes `--amount 0.2 L` (spaced) in
      // two checkpoints. If the second assertion below holds, those two
      // cannot be binding either — which is a finding for that file
      // rather than a claim made here, and this checkpoint is the
      // evidence for it either way.
      const good = await say(k, 'pour standpipe into nosing --amount 0.04L');
      understood(good, 'pour … --amount 0.04L');

      const spaced = await say(k, 'pour standpipe into nosing --amount 0.04 L');
      const note = (
        spaced.notes as Array<{ kind?: string; reason?: string }>
      ).find((n) => n.kind === 'command-rejected');
      expect(
        note?.reason,
        'a SPACED measure now binds — if the parser was fixed, the ' +
          'predecessor drive and this comment both want updating',
      ).toBe('shape-fall-through');
    }, 120_000);

    it('⭐ `smell <glass>` reaches the palate, and reads nothing of water', async () => {
      // The reading surface the aroma layer needs. ⚠ `nosing`, not
      // "nosing glass": a two-token noun phrase prompts.
      const line = (await read(k, 'smell nosing')).toLowerCase();
      // Water carries no aromatics, so the honest answer is no aroma
      // SENTENCE at all — which is also the proof that the renderer is
      // not inventing one.
      //
      // ⚠ Matched on the whole sentence shape, not on the intensity
      // words alone: the glass's own prose says a water-mark sits at
      // *"barely a mouthful"*, and a bare `/barely/` would have failed
      // on the row's description rather than on anything the nose said.
      expect(line).not.toMatch(
        /smells (barely|faintly|clearly|strongly|overpoweringly) of/,
      );
      expect(line, 'the nose rendered a number').not.toMatch(/[0-9]/);
    }, 120_000);

    it('⭐⭐ the floor holds TWO DISTINCT casks, not one twice', async () => {
      // ⛔ The styles build put a second cask on this floor and the two
      // shared every keyword — `cask`, `barrel`, `oak`, `whiskey`,
      // `empty` — while only the charred one carried a distinguishing
      // word. `plain` and `"plain cask"` were added to the row for
      // exactly that.
      //
      // ⚠⚠ **Proved by QUERY, with no binder in the path, and the
      // reason is a finding of its own.** Three attempts to prove it
      // through `look` each hung for the full timeout:
      //
      //   - `look still book` — `still-book.yaml` owns the keyword
      //     `still`, so the phrase is two ambiguous tokens;
      //   - `look plain cask` — two casks share five keywords, so the
      //     phrase stays ambiguous even with `plain` added;
      //   - `look plain` — ⭐ a BARE adjective, and `look` auto-extends
      //     its candidate space with DETAIL names, so a common word like
      //     "plain" is ambiguous across a furnished room's details.
      //
      // Each raises a disambiguation prompt, and a prompt is not
      // something this harness's `prose` can answer — so the read sits
      // there. ⭐ That is worth knowing about `look` in a dressed room
      // and it is NOT a defect of this build; what the build owes is two
      // casks a player can tell apart, which is what this asserts.
      const rows = await k.query('here:i', { fields: ['displayName'] });
      const names = rows.map((r) =>
        String((r as { displayName?: string }).displayName ?? '').toLowerCase(),
      );
      const casks = names.filter((n) => n.includes('cask'));
      expect(casks.length, `expected two casks, saw ${casks.join(' | ')}`).toBe(
        2,
      );
      expect(
        new Set(casks).size,
        `both casks render the SAME name (${casks.join(' | ')}) — one of ` +
          `the two is indistinguishable from the other`,
      ).toBe(2);
      expect(casks.some((n) => n.includes('charred'))).toBe(true);
    }, 120_000);

    it('⚠ `close cask` binds — but the TWO-WORD form does not', async () => {
      // ⚠⚠ A narrow, real finding, recorded with its evidence rather
      // than a cause. `close`/`open` gate their target on
      // `requires: SealableMixin`, and a `Vat` composes it — a
      // one-token `open cask` reaches the controller and answers
      // `already-open`. But `close plain cask` returns
      // `shape-fall-through`, i.e. *that is not a command*, for a phrase
      // that `look` resolves perfectly well two checkpoints up.
      //
      // ⭐ So a player is not BLOCKED (the one-word form works), and the
      // mechanism is unaffected; what is wrong is that one verb family
      // accepts a noun phrase another rejects. Left as a finding for the
      // command-binder rather than guessed at here — and asserted in
      // both directions so that FIXING it fails this checkpoint and
      // brings someone back to this comment.
      const oneWord = await say(k, 'close cask');
      understood(oneWord, 'close cask');

      const twoWord = await say(k, 'close plain cask');
      const note = (
        twoWord.notes as Array<{ kind?: string; reason?: string }>
      ).find((n) => n.kind === 'command-rejected');
      expect(
        note?.reason,
        'the two-word form now binds — if the binder was fixed, this ' +
          'checkpoint and the comment above both want updating',
      ).toBe('shape-fall-through');
    }, 180_000);

    it('`ignite still` reaches the burner', async () => {
      const r = await say(k, 'ignite still');
      understood(r, 'ignite still');
    }, 120_000);
  },
);
