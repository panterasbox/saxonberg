import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * The cockpit tab strip — user-creatable named filter tabs above the
 * terminal. Exercises the full create → rename → delete lifecycle
 * through the real client (Zustand store + the clientState round-trip).
 *
 * The 'All' tab is permanent; new tabs get hover-revealed pencil (rename)
 * and × (delete) controls. Those controls are `visibility: hidden` until
 * the tab is hovered, so each interaction hovers the tab first.
 */

test('a tab can be created, renamed, and deleted', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'tabs');
  try {
    const strip = page.getByTestId('tab-strip');
    await expect(strip).toBeVisible();
    // The permanent 'All' tab is always present.
    await expect(page.getByTestId('tab-All')).toBeVisible();

    // Create — click +, type a name, commit with Enter.
    await page.getByTestId('tab-add').click();
    const newInput = page.getByTestId('tab-new-input');
    await expect(newInput).toBeVisible();
    await newInput.fill('Scratch');
    await newInput.press('Enter');
    await expect(page.getByTestId('tab-Scratch')).toBeVisible();

    // Rename — hover to reveal controls, click the pencil, retype.
    const scratch = page.getByTestId('tab-Scratch');
    await scratch.hover();
    await page.getByTestId('tab-rename-Scratch').click();
    const renameInput = page.getByTestId('tab-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed');
    await renameInput.press('Enter');
    await expect(page.getByTestId('tab-Renamed')).toBeVisible();
    await expect(page.getByTestId('tab-Scratch')).toHaveCount(0);

    // Delete — hover, click ×, confirm in the popover.
    const renamed = page.getByTestId('tab-Renamed');
    await renamed.hover();
    await page.getByTestId('tab-delete-Renamed').click();
    await expect(page.getByTestId('tab-delete-confirm')).toBeVisible();
    await page.getByTestId('tab-delete-confirm-yes').click();
    await expect(page.getByTestId('tab-Renamed')).toHaveCount(0);

    // 'All' survives the whole dance.
    await expect(page.getByTestId('tab-All')).toBeVisible();
  } finally {
    await close();
  }
});

test('cancelling a tab deletion keeps the tab', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'tabs-cancel');
  try {
    await page.getByTestId('tab-add').click();
    const newInput = page.getByTestId('tab-new-input');
    await newInput.fill('Keeper');
    await newInput.press('Enter');
    await expect(page.getByTestId('tab-Keeper')).toBeVisible();

    const keeper = page.getByTestId('tab-Keeper');
    await keeper.hover();
    await page.getByTestId('tab-delete-Keeper').click();
    await expect(page.getByTestId('tab-delete-confirm')).toBeVisible();
    // Back out — the tab stays.
    await page.getByTestId('tab-delete-confirm-no').click();
    await expect(page.getByTestId('tab-delete-confirm')).toHaveCount(0);
    await expect(page.getByTestId('tab-Keeper')).toBeVisible();
  } finally {
    await close();
  }
});
