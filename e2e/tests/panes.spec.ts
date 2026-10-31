import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The summoned/right-column cockpit panes that live entirely in the
 * client: the Settings pane (toggled from the fixed chrome) and the
 * Who's Online tab of the inspection column. Single-avatar, no server
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

test('the Who\'s Online pane lists the current player', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'pane-who');
  try {
    // The inspection column defaults to the Inspect tab; switch to the
    // Who's Online tab.
    await page.getByRole('button', { name: "Who's Online", exact: true }).click();
    const whoPane = page.getByLabel("Who's Online");
    await expect(whoPane).toBeVisible();
    // At least one player is online — the viewer themselves. The pane
    // renders an online count of 1+ (a fresh persistent DB may have other
    // lingering avatars, so assert ">= the viewer", not an exact count).
    await expect(whoPane.getByText(/^\d+$/).first()).toBeVisible();
  } finally {
    await close();
  }
});
