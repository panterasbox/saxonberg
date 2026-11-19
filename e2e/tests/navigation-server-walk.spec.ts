import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The navigation-server build's browser walk** — what a person sees.
 *
 * The wire drive (`packages/wire/tests/navigation-server.dirty.wire.test.ts`)
 * asserts what reached the socket. This walks a real Chromium against the
 * real client: the navigator card now carries NO payload and reads the
 * where-you-are subscription from the store, so `map` must still show where
 * you are, it must follow a walk with nothing typed, and the shelf (now on
 * the one subscription wire) must still show its figures.
 */

const BANK = '/world/terminus/wharfside/bank';

test.describe('navigation server — the navigator reads the subscription', () => {
  test('the navigator shows where you are, follows a walk, and names whose ground it is', async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAs(browser, 'navwalk', { startLocation: BANK });
    try {
      await runCommand(page, 'map');
      const nav = page.getByTestId('navigator');
      await expect(nav).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('nav-crumbs')).toContainText(/Terminus/, { timeout: 30_000 });
      await expect(page.getByTestId('nav-jurisdiction')).toContainText(/Terminus/);
      const before = await nav.innerText();

      // A walk updates it in place — no command run for the card.
      await runCommand(page, 'north');
      await expect
        .poll(async () => nav.innerText(), { timeout: 30_000 })
        .not.toBe(before);
      await expect(nav).toContainText(/market square/i);

      // ⭐⭐ The pane says WHAT changed it (navigation-server review): the
      // ways carry a mark whose words are the move's own line — the
      // command you ran — not magic.
      const mark = page.getByTestId('change-mark-nav:ways');
      await expect(mark).toBeVisible({ timeout: 10_000 });
      await expect(mark).toHaveAttribute('title', /^Changed by: /);
      await mark.click();
      await expect(page.getByTestId('change-why-nav:ways')).toContainText(/show in scrollback/);

      // The ways out are the ones you can take, by name.
      await expect(page.getByTestId('nav-exit-south')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('the shelf and a live card still answer on the one wire', async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAs(browser, 'navshelf', { startLocation: BANK });
    try {
      // The shelf is the MQL source's `chrome: self` subscription.
      await expect(page.locator('body')).toContainText(/play|renown|skill|body/i, { timeout: 30_000 });
      // A look opens a card; its body renders the room.
      await runCommand(page, 'look');
      await expect(page.locator('body')).toContainText(/bank/i, { timeout: 30_000 });
    } finally {
      await close();
    }
  });
});
