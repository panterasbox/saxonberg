import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The "Social / Notifications" settings pane — the thin front over the
 * `notify` verb (social-graph Wave 3). Opened from the account menu.
 *
 * Beyond proving the pane mounts, this guards a cross-cutting client
 * invariant: every clickable previews the command it would issue on
 * hover (so players learn the CLI). The pane's controls call
 * `onCommandPreview`, which under per-bar input mode can't live *in* a
 * command bar (a moded bar would prepend its prefix and the preview
 * would lie about what sends). So the preview surfaces in the always-on
 * ghost command line — we hover and assert that strip shows the exact
 * command string.
 */

async function openSocialPane(page: import('@playwright/test').Page) {
  await page.locator('[aria-haspopup="menu"]').click();
  await page
    .getByRole('menuitem', { name: /Social \/ Notifications/ })
    .click();
  await expect(page.getByTestId('social-pane')).toBeVisible();
}

test('the social pane opens from the account menu with its fields', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'social-open');
  try {
    await openSocialPane(page);
    await expect(page.getByTestId('social-add-input')).toBeVisible();
    await expect(page.getByTestId('presence-format-input')).toBeVisible();

    // Close it again.
    await page.getByTestId('social-pane').getByLabel('Close').click();
    await expect(page.getByTestId('social-pane')).toHaveCount(0);
  } finally {
    await close();
  }
});

test('pane controls preview their command in the command bar on hover', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'social-preview');
  try {
    await openSocialPane(page);

    const ghost = page.getByTestId('ghost-line');

    // Add-rule button: previews `notify <ref> --render name` for the
    // typed reference.
    await page.getByTestId('social-add-input').fill('friends');
    await page.getByTestId('social-add-button').hover();
    await expect(ghost).toContainText('notify friends --render name');

    // Reset button: a fixed, ref-independent command.
    await page.getByTestId('presence-format-reset').hover();
    await expect(ghost).toContainText('settings unset social.presenceFormat');
  } finally {
    await close();
  }
});
