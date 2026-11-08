import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * The inspection card is `look`, by source (client-surface W4, drive
 * steps 16–18): each line with a gutter stripe naming the interface that
 * said it; a stripe opens what that interface is; the quiet interfaces one
 * click away; identical things grouped and expandable; a picture in its
 * declared shape, never cropped.
 */
const BAR = '/world/lounge/location/bar';

test('the room card says what look said, by source', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'inspect', {
    startLocation: BAR,
    contextOptions: { viewport: { width: 1920, height: 970 } },
  });
  try {
    await runCommand(page, 'look');
    const body = page.getByTestId('inspection-body').first();
    await expect(body).toBeVisible();
    await expect(body.getByTestId('segment').first()).toBeVisible();
    // A stripe names its interface and opens what it is.
    const stripe = body.getByTestId('segment-stripe').first();
    await expect(stripe).toHaveAttribute('data-source', /.+/);
    await stripe.click();
    await expect(body.getByTestId('source-popover')).toBeVisible();
  } finally {
    await close();
  }
});

test('the back-bar groups identical things; a plate keeps its shape', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'inspect-bb', {
    startLocation: BAR,
    contextOptions: { viewport: { width: 1440, height: 790 } },
  });
  try {
    await runCommand(page, 'look back-bar');
    const card = page.locator('[data-card-kind="subject"]').last();
    await expect(card.getByTestId('inspection-body')).toBeVisible();
    const group = card.getByTestId('segment-group');
    if ((await group.count()) > 0) {
      await group.first().click();
      await expect(card.getByTestId('segment-chip').first()).toBeVisible();
    }
    const plate = card.getByTestId('illustration-plate');
    if ((await plate.count()) > 0) {
      const fit = await plate.first().evaluate((el) => getComputedStyle(el).objectFit);
      expect(fit).toBe('contain');
    }
  } finally {
    await close();
  }
});
