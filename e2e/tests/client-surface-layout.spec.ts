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
 * Asserted per width: the card gallery has at least one column and never
 * loses one as the window widens; the terminal's text measure is at most
 * 42rem; nothing scrolls the page sideways; there is a mode rail AND
 * master's top bar.
 *
 * ⚠ Two owner reversals on master since this spec was written: the top
 * bar came back over the stage (B42, e0d4e6ae7), and the column arranger
 * was retired for a packed gallery whose columns are as many as fit at
 * the minimum card width (e30fc2aea) — so a column count per width is
 * the gallery's arithmetic now, not a table, and a card's place is the
 * client's order, not a server placement.
 */

const WIDTHS: { w: number; h: number }[] = [
  { w: 1280, h: 720 },
  { w: 1440, h: 790 },
  { w: 1536, h: 864 },
  { w: 1728, h: 1117 },
  { w: 1920, h: 970 },
  { w: 2560, h: 1440 },
];

async function columns(page: Page): Promise<number> {
  const grid = page.getByTestId('card-grid');
  if ((await grid.count()) === 0) return 0;
  return Number((await grid.getAttribute('data-columns')) ?? 0);
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
      await expect(page.getByTestId('top-bar')).toHaveCount(1);
      // Collapse the panel so the shut-panel row of the table applies.
      await collapsePanel(page);
      // At least one flowing card, so the card area renders columns.
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      let previous = 1;
      for (const { w, h } of WIDTHS) {
        await page.setViewportSize({ width: w, height: h });
        await expect
          .poll(() => columns(page), { message: `${w}px columns` })
          .toBeGreaterThanOrEqual(previous);
        previous = await columns(page);
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

  test('⭐ a moved card stays in the gallery after narrowing and widening (AC 2)', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'placed', {
      contextOptions: { viewport: { width: 1920, height: 970 } },
    });
    try {
      await collapsePanel(page);
      // The first command after world entry can be dropped (see `sendUntil`).
      await sendUntil(page, 'who', page.locator('[data-card-kind="who"]'));
      // The move is still a typed command the server accepts; the gallery
      // packs by the client's order (e30fc2aea), so what holds across a
      // resize is that the card is still there, in the gallery.
      await runCommand(page, 'client-card move who 2 0');
      const grid = page.getByTestId('card-grid');
      // (`.first()`: a re-sent `who` under load leaves a second snapshot.)
      const who = grid.locator('[data-card-kind="who"]').first();
      await expect(who).toBeVisible({ timeout: 15_000 });
      const wide = await columns(page);
      await page.setViewportSize({ width: 1440, height: 790 });
      await expect.poll(() => columns(page)).toBeLessThanOrEqual(wide);
      await page.setViewportSize({ width: 1920, height: 970 });
      await expect.poll(() => columns(page)).toBe(wide);
      await expect(who).toBeVisible();
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
      await runCommand(page, 'client-card grow who');
      await expect(page.getByTestId('medium-slot').locator('[data-card-kind="who"]')).toBeVisible({
        timeout: 15_000,
      });
      await runCommand(page, 'client-card grow who');
      await expect(page.getByTestId('full-stage')).toBeVisible();
      await expect(page.getByTestId('terminal-strip')).toBeVisible();
      await runCommand(page, 'client-card shrink who');
      await runCommand(page, 'client-card shrink who');
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
      await runCommand(page, 'client-card minimize who');
      const icon = page.getByTestId('tray-card');
      await expect(icon).toBeVisible();
      await icon.hover();
      await expect(page.getByTestId('ghost-line')).toContainText('client-card restore who');
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
