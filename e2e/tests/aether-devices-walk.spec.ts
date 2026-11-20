import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The aether-devices build's live walk** — the half the wire drive
 * cannot see (review question B3).
 *
 * The wire tier (`packages/wire/tests/aether-devices.dirty.wire.test.ts`)
 * asserts envelopes and frames. This is a real Chromium against the real
 * client, so it sees what a person sees: the phone's card, the words of a
 * refusal that names its fix, the default-pinned AETHER row on the status
 * shelf changing as the phone does, and a held line arriving in another
 * person's transcript.
 *
 * ⚠ Two seated sessions, one walk each — minting is ~10 s a body on a loaded
 * box. Reads the TRANSCRIPT for prose, the CARD for `look`, and the SHELF
 * for the AETHER word.
 */

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return what it added. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 40_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

/** Run `cmd` and return what it added once something lands. */
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
      const box = h.closest('article,section,div[class*=card],div[class*=Card]') ?? h.parentElement;
      return box ? (box as HTMLElement).innerText : '';
    }),
  );
}

/** Re-look until a card matches — `look` is idempotent, and a state change renders a tick later. */
async function lookFor(page: Page, what: string, matching: RegExp, timeout = 30_000): Promise<string> {
  let body = '';
  await expect
    .poll(
      async () => {
        await runCommand(page, `look ${what}`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

/** The status shelf's AETHER chip, as a person reads it. */
async function aetherRow(page: Page, matching: RegExp, timeout = 30_000): Promise<string> {
  let text = '';
  await expect
    .poll(
      async () => {
        text = await page.getByTestId('shelf').innerText();
        return text;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return text;
}

test.describe('the aether-devices build, in a browser', () => {
  test('⭐⭐ a new person has a phone, sees why it cannot send, and nothing is lost', async ({ browser }) => {
    test.setTimeout(240_000);
    const a = await openWorldAs(browser, 'ad-walk-a');
    const b = await openWorldAs(browser, 'ad-walk-b');
    try {
      const A = a.page;
      const B = b.page;

      // ── 1. Spawned with a phone: its card says what it is, and that it is theirs ──
      const card = await lookFor(A, 'phone', /Hollis Pal/);
      expect(card).toMatch(/battery reads \d+%/i);
      expect(card).toMatch(/runs Messages/i);
      expect(card).toMatch(/bound to you/i);

      // ── 2. The AETHER row is pinned by default, and reads tuned ──
      expect(await aetherRow(A, /AETHER/)).toMatch(/AETHER/);
      await aetherRow(A, /tuned/i);

      // ── 3. `apps` lists what the phone runs ──
      expect(await sayAwaiting(A, 'apps', /Messages/)).toMatch(/Messages/);

      // B's id — a test character's name is its handle, which no keyword
      // reads (the broadcast-ready walk's precedent): `look me`'s card has it.
      await runCommand(B, 'look me');
      let bId = '';
      await expect
        .poll(
          async () => {
            bId = await B.evaluate(() => {
              const cards = [...document.querySelectorAll('[data-testid="card-subject"]')];
              const mine = cards.find((c) => /^look me$/i.test(c.getAttribute('data-card-key') ?? ''));
              return mine?.querySelector('[data-stuff-id]')?.getAttribute('data-stuff-id') ?? '';
            });
            return bId;
          },
          { timeout: 20_000 },
        )
        .not.toBe('');

      // ── 4. Off: the row says so; a dm is refused with its fix, and held ──
      await sayAwaiting(A, 'switch phone off', /off/i);
      await aetherRow(A, /\boff\b/i);
      const refused = await sayAwaiting(A, `dm #${bId} hello from the walk`, /switch (it|phone) on/i);
      expect(refused).toMatch(/held/i);

      // ── 5. On: the held line goes as typed, and B reads it ──
      expect(await sayAwaiting(A, 'switch phone on', /Sending what you held/i)).toMatch(
        /Sending what you held/i,
      );
      await expect
        .poll(async () => transcript(B), { timeout: 30_000 })
        .toMatch(/hello from the walk/);
      await aetherRow(A, /tuned/i);

      // ── 6. Dropping the starter phone does not break it ──
      expect(await say(A, 'drop phone')).not.toMatch(/breaks/i);
      await sayAwaiting(A, 'get phone', /pick up|get|take/i);
    } finally {
      await a.close();
      await b.close();
    }
  });
});
