import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The crowded-rooms live walk** (review question B3) — the half the
 * wire drive cannot see: that a REAL client reports what is on screen.
 *
 * A browser stands in the square with the room card up. The card is trayed
 * (`client-card minimize`): the page's own socket must say
 * `mql-subscription-pause` for it. While it is trayed a second person walks
 * in. Restored, the page says `mql-subscription-resume`, the server answers
 * one fresh result, and the card shows who is there now.
 */

const SQUARE = '/world/terminus/market/square';
const BLOCK = '/world/terminus/counting-houses/avenue-block';

/** Every client→server message type the page sends, in order. */
function watchSent(page: Page): string[] {
  const sent: string[] = [];
  page.on('websocket', (ws) => {
    ws.on('framesent', (f) => {
      try {
        const msg = JSON.parse(String(f.payload)) as { type?: string; payload?: { subscriptionId?: string } };
        if (msg.type) sent.push(`${msg.type}${msg.payload?.subscriptionId ? `:${msg.payload.subscriptionId}` : ''}`);
      } catch {
        // not JSON
      }
    });
  });
  return sent;
}

test.describe('crowded rooms, in a browser', () => {
  test('⭐⭐ a trayed room card pauses, and is current the moment it is restored', async ({ browser }) => {
    test.setTimeout(600_000);
    // The socket must be watched from before it opens.
    let sent: string[] = [];
    const a = await openWorldAs(browser, 'crowd-walk-watcher', {
      startLocation: SQUARE,
      onContext: async (context) => {
        context.on('page', (p) => {
          sent = watchSent(p);
        });
      },
    });
    const { page } = a;
    try {
      await runCommand(page, 'look');
      const card = page.locator('[data-card-kind="subject"]').first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      const key = (await card.getAttribute('data-card-key')) ?? 'look';
      const before = await card.innerText();

      await runCommand(page, `client-card minimize ${key}`);
      await expect.poll(() => sent.some((m) => m.startsWith('mql-subscription-pause:')), { timeout: 10_000 }).toBe(true);

      const b = await openWorldAs(browser, 'crowd-walk-arriver', { startLocation: BLOCK });
      try {
        await runCommand(b.page, 'go southwest');
        await runCommand(b.page, 'go northeast');
        await runCommand(b.page, 'go southwest');

        await runCommand(page, `client-card restore ${key}`);
        await expect.poll(() => sent.some((m) => m.startsWith('mql-subscription-resume:')), { timeout: 10_000 }).toBe(true);
        const restored = page.locator('[data-card-kind="subject"]').first();
        await expect(restored).toBeVisible();
        // The card is current: somebody arrived while it was trayed, and it
        // shows a room that is not the one it was trayed on, within 2 s.
        await expect
          .poll(async () => (await restored.innerText()) !== before, { timeout: 2_000 })
          .toBe(true);
      } finally {
        await b.close();
      }
    } finally {
      await a.close();
    }
  });
});
