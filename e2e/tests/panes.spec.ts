import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The summoned/right-column cockpit panes that live entirely in the
 * client: the Settings pane (toggled from the fixed chrome) and the
 * Who's Online tab of the inspection column. Single-avatar, no server
 * round-trip beyond the welcome snapshot, so immune to lounge churn.
 */

test('the Settings pane toggles open and closed from the chrome', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'pane-settings');
  try {
    const pane = page.getByLabel('Settings', { exact: true });
    await expect(pane).toHaveCount(0);

    // The chrome's Settings button summons the pane.
    await page.getByLabel('Toggle settings pane').click();
    await expect(pane).toBeVisible();
    // It carries its standing sections.
    await expect(pane.getByText('Preferences')).toBeVisible();

    // Its close affordance dismisses it.
    await page.getByLabel('Close settings').click();
    await expect(pane).toHaveCount(0);
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
