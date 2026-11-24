import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { openWorldAs, openWorldAsFounder, runCommand, uniqueHandle } from './helpers';

/**
 * ⭐⭐ The stream-arrival walk — the half the wire drive cannot see: a real
 * Chromium against the real client, from a carrier's link to the lounge.
 *
 * The carriers' players are STUBBED (`page.route`), each answering a page
 * that shows a boot id, so "the video did not restart" is a fact the walk
 * can read: the same boot id means the same iframe load. The sign-in round
 * trip is a REAL navigation away and back: `/auth/twitch` is routed to the
 * test seam `/auth/test-return`, which signs in and calls the same
 * `finishSignIn` the providers' callbacks do.
 *
 *   1  tagged from Twitch, the program on air: the player plays its Twitch
 *      feed, muted; *You came from Twitch.*; Twitch first
 *   2  unmute: the src loses the mute flag
 *   3  untagged: no video, Google · Twitch · Kick
 *   4  off air: the offline tile with the next show, no video
 *   5  sign in: away and back, the video resumes DOCKED with no click
 *   6  creation: no "aspiration" anywhere; confirm shows and sends
 *      `embody confirm --watch <program> --twitch`
 *   7  the lounge: watch mode, the player in the stage's SLOT
 *   12 phone width: sign-in and the show both inside the viewport
 */

const CLIENT_URL = process.env.E2E_CLIENT_URL ?? 'http://localhost:5173';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

const tag = Date.now().toString(36);
const PROGRAM = `walk-${tag}`;
const TWITCH = `walker${tag}`;

/** Stub every carrier player with a page that reports its own boot id. */
async function stubCarriers(context: BrowserContext): Promise<void> {
  await context.route(/player\.twitch\.tv|player\.kick\.com|youtube\.com\/embed/, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><body><div id="boot">${Math.random().toString(36).slice(2)}</div></body></html>`,
    }),
  );
}

/** The one player's iframe src, or null. */
async function playerSrc(page: Page): Promise<string | null> {
  const frame = page.getByTestId('stream-player').locator('iframe');
  if ((await frame.count()) === 0) return null;
  return frame.getAttribute('src');
}

test.describe('stream arrival, in a browser', () => {
  test('⭐⭐ from a carrier into the lounge, watching', async ({ browser }) => {
    test.setTimeout(900_000);

    // ── staging, by playing: a broadcaster files and runs the program ──
    const caster = await openWorldAs(browser, 'sa-walk-caster', { linked: { twitch: TWITCH } });
    const founder = await openWorldAsFounder(browser);
    try {
      for (const line of [
        'apps install broadcast',
        `program create ${PROGRAM} --title "The Walk Hour"`,
        `program schedule ${PROGRAM} Saturdays 10am Eastern`,
        `program channel ${PROGRAM} twitch`,
        `program run ${PROGRAM}`,
        'rodney start',
        'rodney live',
      ]) {
        await runCommand(caster.page, line);
        await caster.page.waitForTimeout(600);
      }
      await runCommand(founder.page, `config set stream.featuredProgram ${PROGRAM}`);
      await expect
        .poll(async () => ((await (await fetch(`${SERVER_URL}/api/front`)).json()) as { show?: { live: boolean } }).show?.live, {
          timeout: 30_000,
        })
        .toBe(true);

      // ── 1–2: tagged from Twitch, on air ──
      const visitorCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await stubCarriers(visitorCtx);
      const v = await visitorCtx.newPage();
      await v.goto(`${CLIENT_URL}/?from=twitch`);
      await expect(v.getByTestId('start-screen')).toBeVisible({ timeout: 30_000 });
      await expect.poll(() => playerSrc(v), { timeout: 30_000 }).toContain(`channel=${TWITCH}`);
      expect(await playerSrc(v)).toContain('muted=true');
      await expect(v.getByTestId('came-from')).toHaveText('You came from Twitch.');
      const firstProvider = await v.getByTestId(/^provider-/).first().getAttribute('data-testid');
      expect(firstProvider).toBe('provider-twitch');
      await v.getByTestId('stream-player-unmute').click();
      await expect.poll(() => playerSrc(v)).toContain('muted=false');

      // ── 3: untagged ──
      const plainCtx = await browser.newContext();
      await stubCarriers(plainCtx);
      const p = await plainCtx.newPage();
      await p.goto(`${CLIENT_URL}/`);
      await expect(p.getByTestId('start-screen')).toBeVisible({ timeout: 30_000 });
      await expect(p.getByTestId('show-tile')).toBeVisible({ timeout: 30_000 });
      expect(await playerSrc(p)).toBeNull();
      expect(await p.getByTestId(/^provider-/).first().getAttribute('data-testid')).toBe('provider-google');
      await plainCtx.close();

      // ── 5–7: sign in with Twitch, create, arrive watching ──
      const newcomer = uniqueHandle('sa-walk-new');
      await v.route('**/auth/status', async (route) => {
        const res = await route.fetch();
        const body = (await res.json()) as Record<string, unknown>;
        // Twitch reads as configured, so its real button is the one clicked.
        const providers = Array.isArray(body.providers) ? (body.providers as string[]) : [];
        await route.fulfill({ response: res, json: { ...body, providers: [...new Set([...providers, 'twitch'])] } });
      });
      await v.route('**/auth/twitch', (route) =>
        route.fulfill({
          status: 302,
          headers: { location: `${SERVER_URL}/auth/test-return?handle=${newcomer}&provider=twitch` },
        }),
      );
      await v.getByTestId('provider-twitch').click();
      // A real navigation away and back: the dock plays the same video.
      await expect.poll(() => v.getByTestId('stream-player').getAttribute('data-player-place'), { timeout: 60_000 }).toBe('dock');
      expect(await playerSrc(v)).toContain(`channel=${TWITCH}`);
      // Creation: no aspiration, and confirm says what it sends.
      const confirm = v.getByTestId('chargen-confirm');
      await expect(confirm).toBeVisible({ timeout: 60_000 });
      expect(await v.locator('body').innerText()).not.toMatch(/aspir/i);
      await expect(confirm).toContainText(`embody confirm --watch ${PROGRAM} --twitch`);
      // Fill what is missing, through the controls the stage offers.
      for (const id of ['chargen-option-human', 'chargen-option-female', 'chargen-option-they']) {
        const el = v.getByTestId(id);
        if (await el.isVisible().catch(() => false)) await el.click();
      }
      await expect(confirm).toBeEnabled({ timeout: 30_000 });
      await confirm.click();
      // The lounge: watch mode, the player in the stage's slot.
      await expect.poll(() => v.getByTestId('stream-player').getAttribute('data-player-place'), { timeout: 60_000 }).toBe('slot');
      expect(await playerSrc(v)).toContain(`channel=${TWITCH}`);
      await visitorCtx.close();

      // ── 4: off air ──
      await runCommand(caster.page, 'rodney off');
      const offCtx = await browser.newContext();
      await stubCarriers(offCtx);
      const o = await offCtx.newPage();
      await o.goto(`${CLIENT_URL}/?from=twitch`);
      await expect(o.getByTestId('show-offline')).toContainText('Saturdays', { timeout: 60_000 });
      expect(await playerSrc(o)).toBeNull();
      await offCtx.close();

      // ── 12: phone width ──
      const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const ph = await phoneCtx.newPage();
      await ph.goto(`${CLIENT_URL}/`);
      await expect(ph.getByTestId('start-screen')).toBeVisible({ timeout: 30_000 });
      const sideways = await ph.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(sideways, 'no sideways scroll at phone width').toBe(false);
      await phoneCtx.close();
    } finally {
      await runCommand(founder.page, `config set stream.featuredProgram ""`).catch(() => undefined);
      await caster.close();
      await founder.close();
    }
  });
});
