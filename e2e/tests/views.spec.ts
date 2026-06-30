import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The cockpit-layout switch — the always-on "Views" dropdown in the
 * fixed chrome. Per the click model it is pure command-bus sugar:
 * clicking an item sends `layout <name>`; the server is authoritative on
 * `cockpit.layout` and pushes a `client-state-update` back, which swaps
 * the active layout. The default layout is `world` (Terminal + tab strip
 * in the left column); `forum` replaces that surface with the forum board
 * (no tab strip).
 *
 * This drives the real round-trip (menu click → `layout` verb → server →
 * clientState → re-render), so the assertions wait on the layout actually
 * landing, not on a local toggle.
 */
test('the Views menu switches the cockpit layout world↔forum', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'views');
  try {
    const viewsButton = page.getByRole('button', {
      name: 'Open the Views menu',
    });

    // The `world` layout is the default: the Terminal tab strip is present.
    await expect(page.getByTestId('tab-strip')).toBeVisible();

    // Switch to the forum layout — the tab strip (a world-layout-only
    // chrome) goes away once the server round-trip lands.
    await viewsButton.click();
    await page.getByTestId('views-item-forum').click();
    await expect(page.getByTestId('tab-strip')).toHaveCount(0);

    // Switch back to the world layout — the tab strip returns.
    await viewsButton.click();
    await page.getByTestId('views-item-world').click();
    await expect(page.getByTestId('tab-strip')).toBeVisible();
  } finally {
    await close();
  }
});

/**
 * Hovering a Views item previews its `layout <name>` command in the
 * always-on ghost command line (the on-ramp from point-and-click to the
 * CLI). The menu never sets layout locally on hover — only the preview
 * strip updates.
 */
test('hovering a Views item previews its layout command in the ghost line', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'views-preview');
  try {
    await page.getByRole('button', { name: 'Open the Views menu' }).click();
    await page.getByTestId('views-item-forum').hover();
    await expect(page.getByTestId('ghost-line')).toContainText('layout forum');
    // Still on the world layout — hover previews, it does not switch.
    await expect(page.getByTestId('tab-strip')).toBeVisible();
  } finally {
    await close();
  }
});

/**
 * The filter drawer — the gear (⚙) on the tab strip slides out a panel
 * for editing the active tab's filter. Open it, confirm it mounts.
 */
test('the tab gear toggles the filter drawer', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'views-drawer');
  try {
    await expect(page.getByTestId('filter-drawer')).toHaveCount(0);
    await page.getByTestId('tab-gear').click();
    await expect(page.getByTestId('filter-drawer')).toBeVisible();
  } finally {
    await close();
  }
});
