import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The Inspection pane (right column) — its live MQL subscription paints
 * the player's current location by default. We assert via the focus
 * breadcrumb, which reflects ONLY the current room (so it's churn-immune:
 * unlike the terminal scrollback it doesn't accumulate). A fresh avatar
 * spawns in the lounge Warren, so the breadcrumb reads "the lounge".
 */

test('the inspection pane paints the spawn room and survives a refresh', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'inspect');
  try {
    const breadcrumb = page.locator('[aria-label="focus breadcrumbs"]');
    await expect(breadcrumb).toContainText('the lounge');

    // The pane body renders the room's obvious-exits projection.
    await expect(page.getByText('Obvious exits:').last()).toBeVisible();

    // Refresh re-resolves the same focus — the breadcrumb stays put.
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(breadcrumb).toContainText('the lounge');
  } finally {
    await close();
  }
});

test('the inspection column toggles between Inspect and Who\'s Online', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'inspect-tabs');
  try {
    // Inspect is the default tab — the focus breadcrumb is present.
    await expect(
      page.locator('[aria-label="focus breadcrumbs"]')
    ).toBeVisible();

    // Switch to Who's Online — that pane mounts. (`exact` so the tab
    // button is hit, not the WhoPane's own "Who's Online" heading / other
    // substring matches.)
    await page
      .getByRole('button', { name: "Who's Online", exact: true })
      .click();
    await expect(page.getByLabel("Who's Online")).toBeVisible();

    // Switch back to Inspect — the breadcrumb returns.
    await page.getByRole('button', { name: 'Inspect', exact: true }).click();
    await expect(
      page.locator('[aria-label="focus breadcrumbs"]')
    ).toBeVisible();
  } finally {
    await close();
  }
});
