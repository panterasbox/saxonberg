import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * The summoned/right-column cockpit panes that live entirely in the
 * client: the Settings card (opened from the rail) and the `who` card. Single-avatar, no server
 * round-trip beyond the welcome snapshot, so immune to lounge churn.
 */

test('settings are a card: the rail opens it with `settings`, close is a command', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'pane-settings', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    const card = page.locator('[data-card-kind="settings"]');
    await expect(card).toHaveCount(0);
    await page.getByTestId('rail-settings').click();
    await expect(card).toBeVisible();
    await expect(card.getByText('Preferences')).toBeVisible();
    await card.getByLabel('cockpit card close settings').click();
    await expect(card).toHaveCount(0);
  } finally {
    await close();
  }
});

test('watch lays out the video over the terminal and stream chat as a terminal card', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'pane-watch', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    await page.getByTestId('rail-mode-watch').click();
    await expect(page.getByTestId('focal-slot')).toBeVisible();
    await expect(page.locator('[data-card-kind="terminal"]')).toBeVisible();
  } finally {
    await close();
  }
});

test('who is online is a card: `who` opens it, and it lists the viewer', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'pane-who', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    // ⭐ The inspection column's tab is gone (client-surface): who is
    // online is the `who` card, opened the way a player opens anything.
    const card = page.locator('[data-card-kind="who"]');
    // The first command after world entry can be dropped (see `sendUntil`).
    await sendUntil(page, 'who', card);
    // At least one player is online — the viewer themselves (a persistent
    // DB may hold lingering avatars, so not an exact count).
    await expect(card.getByText(/\d/).first()).toBeVisible();
  } finally {
    await close();
  }
});
