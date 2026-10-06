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
  engagementIdOf,
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
/**
 * ⭐ The distributor's showroom — where the malt comes from. The malting
 * floor can make its own, but a steep is five game-days and the thing
 * this drive most needs to prove is the GRIND, so it buys the feedstock
 * and spends its clock on the cask instead.
 */
const CASH_AND_CARRY = '/world/terminus/counting-houses/cash-and-carry';

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

/** Everything carried, by display name, lowercased. */
async function carriedNames(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ')
    .toLowerCase();
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 120_000);
  await new Promise((r) => setTimeout(r, 500));
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

  it('⭐⭐ the book offers BOTH kilns, both mashes, and the vatting', async () => {
    const book = await read(k, 'look still book');
    const lower = book.toLowerCase();
    // ⚠ The predecessor left `steep` and `kiln` OFF because nobody at
    // Crowsfoot was seated to `malting` — and its own drive asserted
    // them anyway, i.e. RED. The fix was the SEAT, not the assertion.
    for (const word of ['steep', 'kiln', 'peat', 'mash', 'grain', 'vat']) {
      expect(lower, `the book does not offer '${word}'`).toContain(word);
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

/* ───────────── 3. the mill makes what it is fed ───────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⛔⛔ 3. the quern grinds MALT to GRIST — the link that had never run',
  () => {
    it('buys a sack of malt from the distributor and carries it back', async () => {
      // ⚠ A separate session at the showroom, same character — the
      // predecessor's bank-then-floor idiom. Inventory persists.
      const shop = await Session.open(handle, {
        startLocation: CASH_AND_CARRY,
        wizard: true,
      });
      try {
        const bought = await shop.cmd('buy malt sack');
        expect(
          refusedFor(bought),
          'the distributor would not sell a malt sack — check its par line',
        ).toBeNull();
      } finally {
        shop.close();
      }
      k.close();
      k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
      await waitForDaylight(k);
      expect(await carriedNames(k), 'the malt did not come back').toMatch(
        /malt/,
      );
    }, 300_000);

    it('⛔⛔ grinding it yields GRIST, not wheat flour', async () => {
      // THE defect. Before this build `productMaterial` was one path per
      // mill row and both rows pinned it to wheat flour, so this exact
      // act produced a material no mash slot asks for — and the test
      // that claimed to prove otherwise compared two rows' tags.
      const ground = await say(k, 'mill malt sack');
      expect(refusedFor(ground), 'the quern refused the malt').toBeNull();
      await settle(k, ground);

      const all = `${await carriedNames(k)} ${await hereNames(k)}`;
      expect(all, 'the quern produced no grist').toContain('grist');
      expect(all, 'the quern made FLOUR out of malt').not.toContain('flour');
    }, 300_000);
  },
);

/* ───────────── 4. the cut, and the cask ───────────── */

suite.skipIf(!isOwnedTestWorld())(
  '⭐⭐⭐ 4. the run, the two casks, and the nose',
  () => {
    it('mashes the grist and ferments the wash', async () => {
      const mashed = await say(k, 'order wash-mash');
      expect(
        refusedFor(mashed),
        'the mash refused the grist the quern just made',
      ).toBeNull();
      await advance('7 days');
      expect(await hereNames(k), 'no wash in the vat').toMatch(/wash/);
    }, 400_000);

    it('charges and lights the still', async () => {
      expectOk(await say(k, 'pour vat into still'));
      const lit = await say(k, 'ignite still');
      expect(refusedFor(lit), 'the still would not light').toBeNull();
      const first = await read(k, 'smell still');
      expect(first.toLowerCase(), 'nothing is coming off the still').toMatch(
        /solvent|varnish|sharp|raw|hot/,
      );
    }, 300_000);

    it('⭐ fills both casks from ONE run and bungs them', async () => {
      // Pour the foreshots and heads away first — the cut.
      for (let i = 0; i < 3; i++) {
        await say(k, 'pour still into slop bucket --amount 0.5 L');
      }
      expectOk(await say(k, 'pour still into cask --amount 3 L'));
      expectOk(await say(k, 'pour still into charred cask --amount 3 L'));
      // ⚠ Both casks ship OPEN, so `close` is what starts them working
      // (`sealedOnly` on the aging profile means bunged).
      expectOk(await say(k, 'close cask'));
      expectOk(await say(k, 'close charred cask'));
    }, 300_000);

    it('⭐⭐ bottled EARLY it is young, POOR whiskey', async () => {
      // `productAtFraction: 0.25` — drawable at about 23 game-days. The
      // cash-flow fork, against the Lounge sour's `minGrade: fair`.
      await advance('26 days');
      expectOk(await say(k, 'open cask'));
      const early = await say(k, 'fill bottle from cask');
      expect(refusedFor(early), 'nothing drawable from a young cask').toBeNull();
      const bottle = (await read(k, 'look bottle')).toLowerCase();
      expect(bottle, 'the young draw is not whiskey yet').toMatch(/whisk/);
      expect(bottle, 'a cask opened at a quarter should read POOR').toMatch(
        /poor/,
      );
      expectOk(await say(k, 'close cask'));
    }, 400_000);

    it('⭐⭐⭐ left to finish, the two casks read DIFFERENTLY', async () => {
      await advance('70 days');
      expectOk(await say(k, 'open cask'));
      expectOk(await say(k, 'open charred cask'));

      expectOk(await say(k, 'pour cask into nosing glass --amount 0.04 L'));
      const plain = (await read(k, 'smell nosing glass')).toLowerCase();
      expectOk(await say(k, 'drink nosing glass'));
      expectOk(
        await say(k, 'pour charred cask into nosing glass --amount 0.04 L'),
      );
      const charred = (await read(k, 'smell nosing glass')).toLowerCase();

      // ⭐⭐ Same wood, same spirit, same clock — different character.
      // The proof that the CASK is a decision and a second one is a ROW.
      expect(plain, 'the plain cask gave no oak').toMatch(/oak/);
      expect(charred, 'the charred cask gave no vanilla or char').toMatch(
        /vanilla|char/,
      );
      expect(
        charred === plain,
        'both casks read identically — `imparts` is not reaching the contents',
      ).toBe(false);
      // ⚠ No digit, at any band: the amounts are mg/L, the reading is
      // words, and the moment it carries a number the nose is a gauge.
      expect(charred, 'the nose rendered a number').not.toMatch(/[0-9]/);
    }, 400_000);

    it('⭐ and the dram says how long it sat — in words, naming days', async () => {
      const dram = (await read(k, 'smell nosing glass')).toLowerCase();
      expect(dram, 'no age statement on a ~96-day whisky').toMatch(
        /in the wood/,
      );
      expect(dram, 'the age statement rendered a number').not.toMatch(/[0-9]/);
    }, 300_000);
  },
);
