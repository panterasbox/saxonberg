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
  test('⭐⭐ the skyline from the Market, the hills and the headland', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'geography-walk', {
      startLocation: MARKET,
      committees: ['/world/terminus', '/world/terminus/hinkley-hills'],
    });
    const { page } = w;
    try {
      // ── 1. The Market: the Terminal close by. The light on Gannet Rock is
      // 18.7 nm off, under a 37 m eye's horizon on this small world. ──
      const market = await sayAwaiting(page, 'query ~horizon', /clock tower/i);
      expect(market).toMatch(/clock tower[^.]*close by/i);
      expect(market).not.toMatch(/light on Gannet Rock/i);
      // ⛔ The transcript never carries a true bearing.
      expect(market).not.toMatch(/\b\d{3}°/);
      const near = await sayAwaiting(page, 'analyze bearing tower', /too near|bears|cannot see/i);
      expect(near).toMatch(/too near/i);

      // ── 2. Hinkley Hills, 132 m up: the light to the east, and the eye's bearing ──
      await sayAwaiting(page, `goto ${HINKLEY}`, /hinkley|lane|arrival/i);
      await sayAwaiting(page, 'look', /.+/);
      const hills = await sayAwaiting(page, 'query ~horizon', /light on Gannet Rock/i);
      expect(hills).toMatch(/light on Gannet Rock\s*, to the east/i);
      expect(hills).toMatch(/clock tower\s*, to the south/i);
      const eye = await sayAwaiting(page, 'analyze bearing light', /bears|cannot see/i);
      expect(eye).toMatch(/bears \d{3}° ± 10°/);

      // ── 3. The headland brow, a hundred meters up: the light, and the ships ──
      await sayAwaiting(page, `goto ${BROW}`, /headland|brow/i);
      await sayAwaiting(page, 'look', /.+/);
      const brow = await sayAwaiting(page, 'query ~horizon', /light on Gannet Rock/i);
      expect(brow).toMatch(/light on Gannet Rock\s*, to the north-east/i);
      expect(brow).toMatch(/clock tower\s*, to the west/i);
    } finally {
      await w.close();
    }
  });
});
