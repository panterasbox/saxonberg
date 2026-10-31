import { test, expect } from '@playwright/test';
import { openWorldAs } from './helpers';

/**
 * Modes and views (client-surface W3/W5): the rail's mode buttons are real
 * `cockpit mode <m>` commands, previewed in the status bar; the views above
 * the terminal are filters on the PRIMARY terminal card (`cockpit terminal
 * <view>`), and "⋯" edits the view it shows. Each assertion waits on the
 * server round trip, never a local toggle.
 */
test('the rail switches modes explore ↔ chat, and previews the command it sends', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'views', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    const chat = page.getByTestId('rail-mode-chat');
    await chat.hover();
    await expect(page.getByTestId('ghost-line')).toContainText('cockpit mode chat');
    await chat.click();
    await expect(chat).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('rail-mode-explore').click();
    await expect(page.getByTestId('rail-mode-explore')).toHaveAttribute('aria-current', 'page');
  } finally {
    await close();
  }
});

test('the view chooser retargets the primary terminal; ⋯ opens the view editor', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'views-chooser', {
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    const chooser = page.getByTestId('view-chooser');
    await expect(chooser).toBeVisible();
    await page.getByTestId('view-Chat').click();
    await expect(page.getByTestId('view-Chat')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('view-All').click();
    await expect(page.getByTestId('view-All')).toHaveAttribute('aria-pressed', 'true');
    await chooser.getByRole('button', { name: 'edit this view' }).click();
    await expect(page.getByTestId('filter-drawer')).toBeVisible();
  } finally {
    await close();
  }
});
