import { test, expect, request } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { openWorldAs, runCommand, tipText } from './helpers';

/**
 * ⭐⭐ **The persistence-model build's live walk** — the half the wire drive
 * cannot see (review question B3).
 *
 * The wire tier (`packages/wire/tests/persistence-model.dirty.wire.test.ts`)
 * asserts the envelope. This is a real Chromium against the real client, on
 * the testbed (`SAXONBERG_TEST_WORLD=1`), so it sees what a person sees when
 * they wonder whether what they leave will be there:
 *
 *   1. the Explore card's place section says the hall is NOT kept, and its
 *      tooltip says what to do about it;
 *   2. `look` says so in words;
 *   3. the first notebook set down teaches the line once; the second says
 *      nothing;
 *   4. `look in lockers` says the lockers keep; `rack check` and
 *      `rack reclaim` round-trip a notebook through them.
 *
 * Goods are handed through the test seam (`/auth/test-hand`).
 */

const PLAZA = '/world/testbed/location/plaza';
const NOTEBOOK = '/platform/thing/book';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Everything a person can read: the transcript and the card feed. */
async function everything(page: Page): Promise<string> {
  return squash(await page.locator('body').innerText());
}

/** Run `cmd`, wait for the page to read `reply`; return what the transcript added. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 40_000): Promise<string> {
  const before = await transcript(page);
  const beforeAll = await everything(page);
  await runCommand(page, cmd);
  // What this command ADDED — the transcript's new tail, or a card's new words.
  const added = async (): Promise<string> => {
    const t = squash((await transcript(page)).slice(before.length)).replace(`> ${cmd}`, '').trim();
    const all = await everything(page);
    return reply.test(t) ? t : all.length > beforeAll.length && !reply.test(beforeAll) ? all : t;
  };
  await expect.poll(added, { timeout }).toMatch(reply);
  const said = await added();
  console.log(`> ${cmd}\n${said.slice(0, 400)}`);
  return said;
}

async function hand(handle: string, template: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: { handle, template } });
    expect(res.ok(), `hand ${template}: ${await res.text()}`).toBe(true);
  } finally {
    await ctx.dispose();
  }
}

/** Open a section the Explore card may have folded to fit. */
async function openSection(page: Page, name: string): Promise<Locator> {
  const sec = page.getByTestId(`nav-section-${name}`);
  await expect(sec).toBeVisible({ timeout: 30_000 });
  if ((await sec.getAttribute('data-open')) !== 'true') {
    await page.getByTestId(`nav-section-${name}-toggle`).click();
  }
  await expect(sec).toHaveAttribute('data-open', 'true');
  return sec;
}

test.describe('the persistence-model build, in a browser', () => {
  test.use({ actionTimeout: 20_000 });

  test('⭐⭐ a person can tell what keeps: the hall does not, the lockers do', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, handle, close } = await openWorldAs(browser, 'pm-walk', {
      startLocation: PLAZA,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await sayAwaiting(page, 'north', /hall/i);

      // ── 1. The Explore card's place section: not kept, and why ──
      await runCommand(page, 'map');
      await expect(page.getByTestId('nav-card')).toBeVisible({ timeout: 30_000 });
      await openSection(page, 'place');
      const row = page.getByTestId('nav-place-kept');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(row).toContainText(/not kept/i);
      expect(await tipText(page, row)).toMatch(/kept locker, or carry them/i);

      // ── 2. `look` says it in words ──
      await sayAwaiting(page, 'look', /Not kept: what is left in this place is gone at the next restage/);

      // ── 3. The first set-down teaches the line; the second does not ──
      await hand(handle, NOTEBOOK);
      await sayAwaiting(page, 'drop notebook', /lies somewhere that does not keep what is left in it/);
      await hand(handle, NOTEBOOK);
      const before = await transcript(page);
      await runCommand(page, 'drop notebook');
      await expect.poll(async () => (await transcript(page)).length, { timeout: 20_000 }).toBeGreaterThan(before.length);
      await page.waitForTimeout(1_500);
      expect(squash((await transcript(page)).slice(before.length))).not.toMatch(/lies somewhere that does not keep/);

      // ── 4. The lockers keep: check a notebook in, read it, reclaim it ──
      await sayAwaiting(page, 'look in lockers', /Kept: what is left in its inside stays/);
      await hand(handle, NOTEBOOK);
      const checked = await sayAwaiting(page, 'rack check notebook', /You check a notebook at .*lockers.* ticket/i);
      expect(checked).not.toMatch(/isn't|can't|cannot/i);
      const reclaimed = await sayAwaiting(page, 'rack reclaim notebook', /You take a notebook back|isn't yours/i);
      expect(reclaimed).not.toMatch(/isn't yours|nothing kept|can't|cannot/i);
    } finally {
      await close();
    }
  });
});
