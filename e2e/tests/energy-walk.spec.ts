import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The energy build's live walk** — the half the wire drive cannot see.
 *
 * The wire tier (`packages/wire/tests/energy.dirty.wire.test.ts`) asserts the
 * ENVELOPE. This tier is a real Chromium against the real client, so it sees
 * what that tier structurally cannot: **what the prose actually says**, that
 * **the forms a person types parse**, and that **the card renders the light's
 * state**. It also exercises the pole-trim content (`look wires` as a room
 * Detail, the buried manhole) that only exists as rows.
 *
 * ⚠ ONE wizard session that `goto`s the whole route — avatar provisioning is
 * ~10 s a mint on a loaded box, so minting per-assertion blows the budget; one
 * mint + sequential gotos is both faster and a more honest "walk". Reads the
 * TRANSCRIPT for readings/refusals and the CARD for `look`.
 */

const LOBBY = '/world/terminus/mayfield-row/seznick-house/lobby';
const AVENUE = '/world/terminus/counting-houses/avenue-block';
const SQUARE = '/world/terminus/market/square';
const MAYFIELD = '/world/terminus/mayfield-row/street';
const VALLEY_GATE = '/world/terminus/hearts-delight/location/valley-gate';
const HINKLEY_LANE = '/world/terminus/hinkley-hills/location/lane';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return the new transcript. */
async function sayAwaiting(
  page: Page,
  cmd: string,
  reply: RegExp,
  timeout = 40_000,
): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

/** Run `cmd` and return what it added to the transcript once the echo lands. */
async function say(page: Page, cmd: string): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).length, { timeout: 20_000 })
    .toBeGreaterThan(before.length);
  return (await transcript(page)).slice(before.length);
}

/** The inspection cards' bodies, newest last. */
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

/** Run `look <what>` and read the card it pushed, by a word in it. */
async function lookFor(
  page: Page,
  what: string,
  matching: RegExp,
  timeout = 30_000,
): Promise<string> {
  await runCommand(page, `look ${what}`);
  let body = '';
  await expect
    .poll(
      async () => {
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout },
    )
    .toMatch(matching);
  return body;
}

/** Teleport (wizard `goto`) and wait for the room card/echo to settle. */
async function goTo(page: Page, path: string, here: RegExp): Promise<void> {
  await sayAwaiting(page, `goto ${path}`, here);
}

const NOT_FOUND =
  /don't see|can't see|don't understand|nothing (here|like that)|known command shape|too many arguments/i;

test.describe('the energy build, in a browser', () => {
  // One session, one long walk — give it room for ~10 gotos × cold standups.
  test('⭐⭐ the grid drive — electric home, the trimmed line, sever/splice, the derived epochs', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'energy-walk', {
      startLocation: LOBBY,
      wizard: true,
    });
    const { page } = w;
    try {
      // ── 1. The home reads electric, and its hall light is lit ──
      const lobby = await sayAwaiting(page, 'analyze grid', /locality/i);
      expect(lobby).toMatch(/electric locality/i);
      expect(lobby).toMatch(/domestic/i);
      expect(lobby).toMatch(/live/i);
      expect(await lookFor(page, 'light', /It is /)).toMatch(/It is lit\./);

      // Switchable renders OFF and comes back.
      await sayAwaiting(page, 'switch light off', /switch|off/i);
      expect(await lookFor(page, 'light', /It is /)).toMatch(
        /It is switched off\./,
      );
      await sayAwaiting(page, 'switch light on', /switch|on/i);
      expect(await lookFor(page, 'light', /It is /)).toMatch(/It is lit\./);

      // ── 2. A trimmed street: the line is a Detail, not an object ──
      await goTo(page, SQUARE, /square|market/i);
      for (const word of ['wires', 'line']) {
        expect(await say(page, `look ${word}`), `"look ${word}"`).not.toMatch(
          NOT_FOUND,
        );
      }
      expect(await lookFor(page, 'wires', /cable|feeder|overhead/i)).toMatch(
        /cable|feeder|overhead/i,
      );
      expect(await sayAwaiting(page, 'analyze grid', /locality/i)).toMatch(
        /electric locality[\s\S]*live/i,
      );

      // ── 3. The Mayfield spur keeps a BURIED manhole; its trace runs clear ──
      await goTo(page, MAYFIELD, /mayfield/i);
      expect(await lookFor(page, 'manhole', /manhole|cover|iron/i)).toMatch(
        /manhole|cover/i,
      );
      expect(await sayAwaiting(page, 'analyze grid manhole', /line/i)).toMatch(
        /clear back to its source|the line:/i,
      );

      // ── 4. Sever at the avenue → the lobby light goes dark → splice ──
      await goTo(page, AVENUE, /avenue|counting/i);
      expect(await sayAwaiting(page, 'analyze grid', /locality/i)).toMatch(
        /live/i,
      );
      expect(await sayAwaiting(page, 'sever', /sever|cut/i)).toMatch(
        /sever|cut/i,
      );

      await goTo(page, LOBBY, /lobby|Seznick/i);
      expect(await sayAwaiting(page, 'analyze grid', /locality/i)).toMatch(
        /dark/i,
      );
      expect(await lookFor(page, 'light', /It is /)).toMatch(/no power/i);

      await goTo(page, AVENUE, /avenue|counting/i);
      await sayAwaiting(page, 'splice', /splice|restore|join|back/i);
      await goTo(page, LOBBY, /lobby|Seznick/i);
      expect(await lookFor(page, 'light', /It is /)).toMatch(/It is lit\./);

      // ── 5. The epoch is derived — gas-lit valley, off-grid hills ──
      await goTo(page, VALLEY_GATE, /valley|gate|delight/i);
      expect(await sayAwaiting(page, 'analyze grid', /locality/i)).toMatch(
        /gas-lit locality/i,
      );
      expect(await lookFor(page, 'lamps', /oil|gas/i)).toMatch(/oil|gas/i);

      await goTo(page, HINKLEY_LANE, /hinkley|lane/i);
      const hinkley = await sayAwaiting(page, 'analyze grid', /locality/i);
      expect(hinkley).toMatch(/off-grid locality/i);
      expect(hinkley).toMatch(/no grid power/i);
    } finally {
      await w.close();
    }
  });
});
