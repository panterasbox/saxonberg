import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand, commandInput } from './helpers';

/**
 * ⭐⭐ **The ground build's live walk** — the half the wire drive cannot see.
 *
 * The wire tier asserts the ENVELOPE. This tier is a real Chromium against
 * the real client, so it sees the two things that tier structurally cannot:
 * **what the prose actually says**, and **whether the parser accepts the form
 * a person types**. The Lounge segment of this walk (driven by hand first)
 * found three defects a green wire run and 11 000 unit tests had all missed:
 * every fixture rendering as *"something"*, `look at the ground` failing to
 * parse, and the wire assertion for it passing vacuously.
 *
 * This spec is the REST of that walk — the road walk, the moor, the forge,
 * the holodeck and the dorm — plus regression cover for the three.
 *
 * ⚠ It reads the TRANSCRIPT, not the card. That is deliberate and is the
 * lesson of finding (1): `look floor` rendered correctly on its inspection
 * card while the same object read *"something"* in the transcript two lines
 * earlier. Two renderers; only one of them was honest, and the pretty one
 * was the one that lied by omission.
 */

const CROSSING = '/world/terminus/university-avenue/location/crossing';
const SQUARE = '/world/terminus/market/square';
const YARD = '/world/terminus/goods-yards/yard';
const LANE = '/world/terminus/hinkley-hills/location/lane';
const HEATH = '/world/moor/stormy-heath';
const SMITHY = '/world/terminus/hearthworks/location/smithy';
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';
const CLEARING = '/world/terminus/rejection/hanging-wood/oak-clearing';

/**
 * Everything the transcript pane holds, as a player reads it.
 *
 * ⚠ Via `data-testid="terminal"`, the hook `Terminal.tsx` ships for exactly
 * this. A first draft of this spec sniffed for a `<div>` containing the
 * greeting and silently returned `""` for half the walk — the assertions
 * then "passed" against an empty string wherever they were negative. A
 * harness that cannot read the thing it asserts on is worse than no harness.
 */
async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/**
 * Run `cmd` and return what it added to the transcript, once the ECHO has
 * landed. Use this to ask *did this refuse?* — a refusal prints, and a
 * command that renders to the card (`look`) adds only its echo.
 */
async function say(page: Page, cmd: string): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).length, { timeout: 10_000 })
    .toBeGreaterThan(before.length);
  return (await transcript(page)).slice(before.length);
}

/**
 * Run `cmd` and wait for a REPLY matching `reply`.
 *
 * ⚠ Not the same wait as {@link say}, and the difference cost a red run:
 * the command's own echo grows the transcript, so "wait for growth" returns
 * `"the ground> sit on the ground"` and the assertion fails against a
 * response that simply had not arrived yet. Waiting for the reply is the
 * honest wait for anything that has one.
 */
async function sayAwaiting(
  page: Page,
  cmd: string,
  reply: RegExp,
): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), {
      timeout: 10_000,
    })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

/**
 * The inspection cards' bodies, newest last — `look` renders THERE, not
 * inline (`card-surface.md`: a command pushes; the wire cannot name a card).
 */
async function cards(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h3')].map((h) => {
      const box =
        h.closest('article,section,div[class*=card],div[class*=Card]') ??
        h.parentElement;
      return box ? (box as HTMLElement).innerText : '';
    }),
  );
}

/**
 * Run `look <what>` and read the card it pushed.
 *
 * ⚠ Polls for the card rather than sleeping: a card is a round trip, and a
 * fixed beat made this read the ROOM's card half the time — which has no
 * "It is …" line, so the assertion failed against an empty string and looked
 * like a product defect. `matching` is what the card must contain to count.
 */
async function groundAt(
  page: Page,
  what = 'floor',
  matching = /It is /,
): Promise<{ card: string; line: string }> {
  await runCommand(page, `look ${what}`);
  let body = '';
  await expect
    .poll(
      async () => {
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout: 15_000 },
    )
    .toMatch(matching);
  const line = (body.match(/It is [^\n.]*\./) ?? [''])[0];
  return { card: body, line };
}

/** Run `look <what>` and read whatever card it pushed, by a word in it. */
async function lookFor(
  page: Page,
  what: string,
  matching: RegExp,
): Promise<string> {
  await runCommand(page, `look ${what}`);
  let body = '';
  await expect
    .poll(
      async () => {
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout: 15_000 },
    )
    .toMatch(matching);
  return body;
}

const NOT_FOUND =
  /don't see|can't see|don't understand|nothing (here|like that)|known command shape|too many arguments/i;

test.describe('the road walk, in a browser', () => {
  test('⭐ the university crossing reads as its own prose, and the wear is a detail of the FLOOR', async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-crossing', {
      startLocation: CROSSING,
    });
    try {
      const { line, card: body } = await groundAt(w.page);
      expect(body).toMatch(/granite/i);
      expect(line).toMatch(/It is granite, set as paving\./);

      // Step 21 — the worn diagonal track is a detail OF THE FLOOR, and it
      // has to be reachable by the word the room's own prose uses.
      expect(await lookFor(w.page, 'track', /diagonal|worn|pale/i)).toMatch(
        /diagonal|worn|pale/i,
      );

      // ⚠ Regression cover for the browser-found parse defect.
      expect(await say(w.page, 'look at the ground')).not.toMatch(NOT_FOUND);
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ the square and the goods yards agree, from DIFFERENT rungs', async ({
    browser,
  }) => {
    // AC 17, the claim the whole derived-kind design exists for: same
    // material, same construction, same answer — and one of them is three
    // words on the room while the other is a floor row with a gutter on it.
    const sq = await openWorldAs(browser, 'ground-square', {
      startLocation: SQUARE,
    });
    const yd = await openWorldAs(browser, 'ground-yard', {
      startLocation: YARD,
    });
    try {
      const square = await groundAt(sq.page);
      const yard = await groundAt(yd.page);
      expect(square.line).toMatch(/It is granite, set as paving\./);
      expect(yard.line).toBe(square.line);

      // Step 21 — the gutter MOVED from the room onto the paving, and
      // `look gutter` still binds because a fixture is in reach.
      expect(await lookFor(yd.page, 'gutter', /channel|water/i)).toMatch(
        /channel|water/i,
      );
    } finally {
      await sq.close();
      await yd.close();
    }
  });

  test("⭐ Hinkley's lane is a MADE road of dirt, and reads differently", async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-lane', {
      startLocation: LANE,
    });
    try {
      const { line } = await groundAt(w.page);
      expect(line).toMatch(/It is dark brown loam, beaten flat\./);
    } finally {
      await w.close();
    }
  });
});

test.describe('the authored floors, and the derived ones', () => {
  test("⭐ the moor is the AUTHOR's peat, not a derived guess", async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-moor', {
      startLocation: HEATH,
    });
    try {
      const { card: body, line } = await groundAt(w.page, 'ground');
      // The authored prose survives — rung 1 wins — and the derived line
      // names what the author said it is made of.
      expect(body).toMatch(/peat/i);
      expect(line).toMatch(/It is dark fibrous peat, (bare earth|waterlogged to mire)\./);
      // …and you can sit on it.
      await sayAwaiting(w.page, 'sit', /sit down/i);
    } finally {
      await w.close();
    }
  });

  test('⭐ the forge floor is still the forge floor — and is now sittable', async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-forge', {
      startLocation: SMITHY,
    });
    try {
      const { line } = await groundAt(w.page);
      expect(line).toMatch(/It is granite, set as paving\./);
      // ⚠ `forge-floor` authored NO staticSlots: it was the one floor in the
      // game you could pour molten iron onto and not sit down on.
      await sayAwaiting(w.page, 'sit', /sit down/i);
    } finally {
      await w.close();
    }
  });

  test('⭐ a WOOD answers what its ground is like — where only a field could', async ({
    browser,
  }) => {
    // AC 14, and the reading that the BiomeCatalogue fix turned from the
    // indoor default into honest earth.
    const w = await openWorldAs(browser, 'ground-wood', {
      startLocation: CLEARING,
    });
    try {
      const { line } = await groundAt(w.page, 'ground');
      expect(line).toMatch(/loam|clay|sand/i);
      expect(line).toMatch(/bare earth|loose underfoot|waterlogged to mire/i);
    } finally {
      await w.close();
    }
  });

  test('⚠ an interior reads as BUILT, never as the earth under the building', async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-dorm', {
      startLocation: DORM,
    });
    try {
      const { line } = await groundAt(w.page);
      expect(line).toMatch(/It is oak, laid as boards\./);
      expect(line).not.toMatch(/earth|loam|mire/i);
      await sayAwaiting(w.page, 'sit', /sit down/i);
    } finally {
      await w.close();
    }
  });
});

test.describe('regression cover for what the hand-walk found', () => {
  test('⚠⚠ a FIXTURE is named in prose, not rendered as "something"', async ({
    browser,
  }) => {
    // The defect: `canSee` walked getContainer(), a fixture has none, so
    // every sconce/sign/anchor — and every floor — read as "something"
    // anywhere scene prose named it. The card was right the whole time,
    // which is why it survived.
    const w = await openWorldAs(browser, 'ground-named', {
      startLocation: CROSSING,
    });
    try {
      const said = await sayAwaiting(w.page, 'search floor', /searching/i);
      expect(said).not.toMatch(/searching something/i);
      expect(said).toMatch(/paving|floor|ground/i);
    } finally {
      await w.close();
    }
  });

  test('⚠⚠ `look at the ground` parses — the article and the preposition', async ({
    browser,
  }) => {
    const w = await openWorldAs(browser, 'ground-parse', {
      startLocation: SQUARE,
    });
    try {
      for (const form of [
        'look at the ground',
        'look at floor',
        'look floor',
        'search the floor',
      ]) {
        expect(await say(w.page, form), `"${form}" was refused`).not.toMatch(
          NOT_FOUND,
        );
      }
      // …and the postures, in the form a person types.
      await sayAwaiting(w.page, 'sit on the ground', /sit down/i);
      await runCommand(w.page, 'stand');
    } finally {
      await w.close();
    }
  });

  test('⭐ the floor is not listed among the room’s contents', async ({
    browser,
  }) => {
    // A fixture is not contents. If a floor ever shows up in `You also see`,
    // every room in the game just grew a piece of furniture.
    const w = await openWorldAs(browser, 'ground-contents', {
      startLocation: SQUARE,
    });
    try {
      // ⚠ Read the CARD, not the transcript: `look` renders to the card
      // surface (`card-surface.md` — a command pushes; the wire cannot name
      // a card), and the room's enumeration is the card's `HERE` block.
      const body = await lookFor(w.page, '', /HERE|EXITS/);
      const here = (body.match(/HERE\n([\s\S]*?)(\nINTERFACES|$)/) ?? [
        '',
        '',
      ])[1];
      expect(here).not.toMatch(/floor|paving|cobbles/i);
      // …and the room card is genuinely the one being read.
      expect(body).toMatch(/EXITS|HERE/);
    } finally {
      await w.close();
    }
  });
});
