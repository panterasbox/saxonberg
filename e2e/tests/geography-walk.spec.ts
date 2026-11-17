import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The geography build's live walk** — a real browser against the real
 * client: what a person types to see the horizon, and what the prose says.
 * The wire drive (`packages/wire/tests/geography.wire.test.ts`) asserts the
 * same steps over the socket; this tier proves the forms a person types parse
 * and that the transcript reads the rough direction, never a bearing.
 *
 * ⚠ ONE seated session that `goto`s the route (the energy walk's precedent):
 * the Market, Hinkley Hills, the headland brow, Gannet Rock's gallery.
 */

const MARKET = '/world/terminus/market/square';
const HINKLEY = '/world/terminus/hinkley-hills/location/arrival';
const BROW = '/world/terminus/estuary/headland/brow';
const GALLERY = '/world/terminus/gannet-rock/gallery';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return the new transcript. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 40_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

test.describe('the geography build, in a browser', () => {
  test('⭐⭐ the skyline from the Market, the hills, the headland and the light', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'geography-walk', {
      startLocation: MARKET,
      committees: ['/world/terminus', '/world/terminus/hinkley-hills'],
    });
    const { page } = w;
    try {
      // ── 1. The Market: the tower close by, the light with a rough direction ──
      const market = await sayAwaiting(page, 'query horizon', /light on Gannet Rock/i);
      expect(market).toMatch(/clock tower[^.]*close by/i);
      expect(market).toMatch(/light on Gannet Rock, to the north-east, some \d+ miles off/i);
      // ⛔ The transcript never carries a true bearing.
      expect(market).not.toMatch(/\b\d{3}°/);

      // ── 2. The instrument narrows it: the eye reads a bearing ±10° ──
      const eye = await sayAwaiting(page, 'analyze bearing light', /bears|cannot see/i);
      expect(eye).toMatch(/bears \d{3}° ± 10°/);

      // ── 3. Hinkley Hills: the same light, another direction ──
      await sayAwaiting(page, `goto ${HINKLEY}`, /hinkley|lane|arrival/i);
      const hills = await sayAwaiting(page, 'query horizon', /light on Gannet Rock/i);
      expect(hills).toMatch(/light on Gannet Rock, to the east/i);

      // ── 4. The headland: a hundred meters up, the light and the town ──
      await sayAwaiting(page, `goto ${BROW}`, /headland|brow/i);
      const brow = await sayAwaiting(page, 'query horizon', /light on Gannet Rock|clock tower/i);
      expect(brow).toMatch(/light on Gannet Rock, to the/i);

      // ── 5. The gallery on Gannet Rock: the coast to the north-west ──
      await sayAwaiting(page, `goto ${GALLERY}`, /gallery|lantern/i);
      const gallery = await sayAwaiting(page, 'query horizon', /clock tower|rubber works/i);
      expect(gallery).toMatch(/to the (north-west|west)/i);
    } finally {
      await w.close();
    }
  });
});
