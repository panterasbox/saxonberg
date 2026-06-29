import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The primary-view switch — Terminal | Forum — at the top of the left
 * column. A client-only toggle (`store.mainView`): the Terminal view
 * carries the tab strip + scrollback; the Forum view replaces them with
 * the forum board. Switching is independent of any server round-trip.
 */
test('the Terminal/Forum view switch swaps the left-column surface', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'views');
  try {
    // Terminal is the default view: the tab strip is present.
    await expect(page.getByTestId('tab-strip')).toBeVisible();

    // Switch to Forum — the tab strip (a terminal-only chrome) goes away.
    await page.getByRole('button', { name: 'Forum', exact: true }).click();
    await expect(page.getByTestId('tab-strip')).toHaveCount(0);

    // Switch back to Terminal — the tab strip returns.
    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    await expect(page.getByTestId('tab-strip')).toBeVisible();
  } finally {
    await close();
  }
});

/**
 * The filter drawer — the gear (⚙) on the tab strip slides out a panel
 * for editing the active tab's filter. Open it, confirm it mounts, close.
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
