import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * The summoned/right-column cockpit panes that live entirely in the
 * client: the Settings panel (opened from the top bar) and the `who` card. Single-avatar, no server
 * round-trip beyond the welcome snapshot, so immune to lounge churn.
 */

test('settings: the top bar toggles master\'s settings panel, and its ✕ closes it', async ({
  browser,
}) => {
  // ⚠ Since B42 (e0d4e6ae7) the rail keeps only the modes, and Settings is
  // master's top-bar button toggling master's settings PANEL again — not a
  // card in the feed, so it is not closed by `client-card close`.
  const { page, close } = await openWorldAs(browser, 'pane-settings', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    const panel = page.locator('aside[aria-label="Settings"]');
    await expect(panel).toHaveCount(0);
    await page.getByLabel('Toggle settings card').click();
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Preferences')).toBeVisible();
    await panel.getByLabel('Close settings').click();
    await expect(panel).toHaveCount(0);
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
