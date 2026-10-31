import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil } from './helpers';

/**
 * ⭐ The client-surface layout, at the widths players actually have
 * (client-surface AC 1–2; drive steps 12–15, 21).
 *
 * Zoom is a CSS width — a 1920 screen at 150% IS a 1280 screen to the
 * page — so each row of the slate's table is run at its CSS width, which
 * covers the 125% and 150% cases (browser zoom cannot be set by the API).
 *
 * Asserted per width: the card-area column count; the terminal's text
 * measure is at most 42rem; nothing scrolls the page sideways; there is
 * a nav rail and no top bar.
 */

const WIDTHS: { w: number; h: number; panelShut: number }[] = [
  { w: 1280, h: 720, panelShut: 1 },
  { w: 1440, h: 790, panelShut: 1 },
  { w: 1536, h: 864, panelShut: 2 },
  { w: 1728, h: 1117, panelShut: 2 },
  { w: 1920, h: 970, panelShut: 3 },
  { w: 2560, h: 1440, panelShut: 4 },
];

async function columns(page: Page): Promise<number> {
  return page.locator('[data-testid="card-column"]').count();
}

/**
 * Shut the side panel. ⚠ It opens when the room card ARRIVES (after the
 * login `look`), so a one-shot `count()` raced it: the panel opened a
 * beat later and took a column back. Wait for it, then collapse.
 */
async function collapsePanel(page: Page): Promise<void> {
  const collapse = page.getByTestId('panel-collapse');
  const shown = await collapse
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true, () => false);
  if (shown) await collapse.click();
}

async function horizontalScroll(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('client-surface layout (rem tiers, rail, feed/workspace)', () => {
  test('⭐ every common width: the right column count, a ≤ 42rem measure, no sideways scroll', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'layout', {
      contextOptions: { viewport: { width: 1920, height: 970 } },
    });
    try {
      await expect(page.getByTestId('nav-rail')).toBeVisible();
      await expect(page.getByTestId('top-bar')).toHaveCount(0);
      // Collapse the panel so the shut-panel row of the table applies.
      await collapsePanel(page);
      // At least one flowing card, so the card area renders columns.
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      for (const { w, h, panelShut } of WIDTHS) {
        await page.setViewportSize({ width: w, height: h });
        await expect
          .poll(() => columns(page), { message: `${w}px columns` })
          .toBe(panelShut);
        const measure = await page
          .getByTestId('terminal-measure')
          .evaluate((el) => el.getBoundingClientRect().width);
        expect(measure, `${w}px measure`).toBeLessThanOrEqual(42 * 16 + 1);
        expect(await horizontalScroll(page), `${w}px sideways scroll`).toBeLessThanOrEqual(0);
      }
    } finally {
      await close();
    }
  });

  test('⭐ a placed card returns to its slot after narrowing and widening (AC 2)', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'placed', {
      contextOptions: { viewport: { width: 1920, height: 970 } },
    });
    try {
      await collapsePanel(page);
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      await runCommand(page, 'cockpit card move who 2 0');
      const third = page.locator('[data-testid="card-column"]').nth(2);
      // (A server round trip: the move lands when `card-arranged` does.)
      await expect(third.locator('[data-card-kind="who"]')).toBeVisible({ timeout: 15_000 });
      await page.setViewportSize({ width: 1440, height: 790 });
      await expect.poll(() => columns(page)).toBe(1);
      await page.setViewportSize({ width: 1920, height: 970 });
      await expect(
        page.locator('[data-testid="card-column"]').nth(2).locator('[data-card-kind="who"]'),
      ).toBeVisible();
    } finally {
      await close();
    }
  });

  test('medium sits across the terminal column; full takes the stage with a terminal strip', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'sizes', {
      contextOptions: { viewport: { width: 1440, height: 790 } },
    });
    try {
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      await runCommand(page, 'cockpit card grow who');
      await expect(page.getByTestId('medium-slot').locator('[data-card-kind="who"]')).toBeVisible({
        timeout: 15_000,
      });
      await runCommand(page, 'cockpit card grow who');
      await expect(page.getByTestId('full-stage')).toBeVisible();
      await expect(page.getByTestId('terminal-strip')).toBeVisible();
      await runCommand(page, 'cockpit card shrink who');
      await runCommand(page, 'cockpit card shrink who');
      await expect(page.getByTestId('full-stage')).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('minimize puts a card in the tray; restore previews its command and brings it back', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'tray', {
      contextOptions: { viewport: { width: 1440, height: 790 } },
    });
    try {
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      await runCommand(page, 'cockpit card minimize who');
      const icon = page.getByTestId('tray-card');
      await expect(icon).toBeVisible();
      await icon.hover();
      await expect(page.getByTestId('ghost-line')).toContainText('cockpit card restore who');
      await icon.click();
      await expect(page.getByTestId('tray-card')).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('a mode with no layout says so (govern)', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'govern', {
      contextOptions: { viewport: { width: 1440, height: 790 } },
    });
    try {
      await page.getByTestId('rail-mode-govern').click();
      await expect(page.getByTestId('mode-fallback-notice')).toContainText(
        "govern isn’t laid out yet — showing explore",
      );
    } finally {
      await close();
    }
  });
});
