import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The broadcast-ready walk** — the half the wire drive cannot see.
 *
 * The wire drive (`packages/wire/tests/broadcast-ready.dirty.wire.test.ts`)
 * reads the overlay's feed and the Stream Deck's door. This is a real
 * Chromium against the real client: the controls card opens on `stream`
 * and its chips send real commands; on air the type grows and a tell
 * reads *[private message]*, and in standby it reads in full; the card
 * pops out (or says why it cannot); a second player sees the marker.
 *
 * Rodney's `?mock` preview (step 13) is walked when `RODNEY_URL` is set
 * (the overlay's own vite server).
 */

const BAR = '/world/lounge/location/bar';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

async function rootFontPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

const phaseOf = (page: Page) => page.getByTestId('stream-phase');

test.describe('broadcast-ready, in a browser', () => {
  test('⭐⭐ the controls card, redaction on air, the size, pop-out, and the marker', async ({ browser }) => {
    test.setTimeout(600_000);
    const host = await openWorldAs(browser, 'br-walk-host', { startLocation: BAR, streamer: true });
    const guest = await openWorldAs(browser, 'br-walk-guest', { startLocation: BAR });
    const { page } = host;
    try {
      const baseFont = await rootFontPx(page);

      // `stream` opens the controls card.
      await runCommand(page, 'stream');
      await expect(page.getByTestId('stream-controls')).toBeVisible({ timeout: 30_000 });
      await expect(phaseOf(page)).toHaveText(/OFFLINE/);

      // Every chip is a real command: Start, then Go live.
      await page.getByTestId('stream-start').click();
      await expect(phaseOf(page)).toHaveText(/STARTING/, { timeout: 15_000 });
      await page.getByTestId('stream-live').click();
      await expect(phaseOf(page)).toHaveText(/LIVE/, { timeout: 15_000 });

      // ⭐ On air the type grows (~140%).
      await expect.poll(() => rootFontPx(page)).toBeGreaterThan(baseFont * 1.3);

      // The streamer's own id, off the card `look me` opens (a test
      // character's name is its handle, which no keyword reads); the
      // guest addresses them by it.
      await runCommand(page, 'look me');
      let hostId = '';
      await expect
        .poll(
          async () => {
            hostId = await page.evaluate(() => {
              // The card `look me` opened is keyed by that command.
              const cards = [...document.querySelectorAll('[data-testid="card-subject"]')];
              const mine = cards.find((c) => /^look me$/i.test(c.getAttribute('data-card-key') ?? ''));
              return mine?.querySelector('[data-stuff-id]')?.getAttribute('data-stuff-id') ?? '';
            });
            return hostId;
          },
          { timeout: 20_000 },
        )
        .not.toBe('');

      // ⭐ A DM reads *[private message]* on air — the words never render.
      await runCommand(guest.page, `dm #${hostId} the secret plans`);
      await expect(page.getByTestId('redacted-frame').first()).toBeVisible({ timeout: 20_000 });
      expect(await transcript(page)).not.toContain('the secret plans');

      // The second player sees the marker on the room and on the streamer.
      await runCommand(guest.page, 'look');
      await expect
        .poll(async () => guest.page.locator('body').innerText(), { timeout: 20_000 })
        .toContain('A broadcast reaches this place.');
      await runCommand(guest.page, `look #${hostId}`);
      await expect
        .poll(async () => guest.page.locator('body').innerText(), { timeout: 20_000 })
        .toMatch(/broadcasting/);

      // Away for the bathroom from the card: standby, a countdown — and off
      // the air the tell reads in full on the streamer's own screen.
      await page.getByTestId('stream-away-bathroom').click();
      await expect(phaseOf(page)).toHaveText(/STANDBY/, { timeout: 15_000 });
      await expect(page.getByTestId('stream-timer')).toHaveText(/back in 4:5\d|back in 5:00/);
      await expect.poll(() => transcript(page), { timeout: 15_000 }).toContain('the secret plans');

      // Back: on air again, redacted again.
      await page.getByTestId('stream-live').click();
      await expect(phaseOf(page)).toHaveText(/LIVE/, { timeout: 15_000 });
      await expect.poll(() => transcript(page), { timeout: 15_000 }).not.toContain('the secret plans');

      // ⭐ Pop out: a Document Picture-in-Picture window where the browser
      // has one, and an honest note where it does not — never silence.
      const controlsCard = page.getByTestId('card-stream');
      await controlsCard.getByTestId('card-popout').click();
      await expect(
        controlsCard.getByTestId('card-popped').or(controlsCard.getByTestId('card-popout-note')),
      ).toBeVisible({ timeout: 15_000 });

      // A popped card is in its own window; closing it brings it home.
      if (await controlsCard.getByTestId('card-popped').isVisible()) {
        await controlsCard.getByTestId('card-popout').click();
        await expect(controlsCard.getByTestId('stream-controls')).toBeVisible({ timeout: 15_000 });
      }

      // Off the air: the type and the tell come back.
      await runCommand(page, 'stream off');
      await expect(phaseOf(page)).toHaveText(/OFFLINE/, { timeout: 15_000 });
      await expect.poll(() => rootFontPx(page)).toBeLessThan(baseFont * 1.05);
      await expect.poll(() => transcript(page), { timeout: 15_000 }).toContain('the secret plans');
    } finally {
      await guest.close();
      await host.close();
    }
  });

  test('step 13 — Rodney’s mock preview cycles the lower third with no server', async ({ browser }) => {
    const rodney = process.env.RODNEY_URL;
    test.skip(!rodney, 'RODNEY_URL is not set (the overlay’s own vite server)');
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    try {
      await page.goto(`${rodney}/live.html?mock`);
      const first = await page.locator('body').innerText();
      await expect
        .poll(async () => page.locator('body').innerText(), { timeout: 60_000, intervals: [2_000] })
        .not.toBe(first);
    } finally {
      await context.close();
    }
  });
});
