import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { openWorldAs, runCommand, tipText } from './helpers';

/**
 * ⭐⭐ **The tooltips build's browser walk** — what a person sees
 * (requirements § Blocking drive, steps 1–10; step 11 is the wire drive,
 * `packages/wire/tests/tooltips.dirty.wire.test.ts`).
 *
 * Every step is `instant`. A real Chromium against the real client:
 * hover, dwell, lock, nest, the keyboard, and a phone's long press.
 */

const BANK = '/world/terminus/wharfside/bank';
const SQUARE = '/world/terminus/market/square';

/** Bring a target to the middle of its scroller — never under a sticky bar. */
async function center(target: Locator): Promise<void> {
  // Park the pointer first, so nothing slides under it while scrolling.
  await target.page().mouse.move(0, 0);
  await target.evaluate((e) => e.scrollIntoView({ block: 'center' }));
}

/** The tooltip on top of the stack. */
const topTip = (page: Page): Locator => page.getByTestId('tooltip').last();

/** A thing link in the transcript (an identity tag with a subject). */
const thingLink = (page: Page): Locator =>
  page.getByTestId('terminal').locator('[data-tip-link][data-stuff-id]');

async function lookUntilLinks(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await runCommand(page, 'look');
    if ((await thingLink(page).count()) > 0) return;
  }
  await expect(thingLink(page).first()).toBeVisible({ timeout: 20_000 });
}

test.describe('tooltips — one tooltip for the whole client', () => {
  test('1–2, 6, 8 · controls, a thing in the scrollback, its path; a tooltip opens no card', async ({ browser }) => {
    test.setTimeout(240_000);
    const { page, close } = await openWorldAs(browser, 'tipwalk', { startLocation: BANK });
    try {
      await lookUntilLinks(page);

      // 1 · No native hover text anywhere (an iframe's name is not hover text).
      await expect(page.locator('[title]:not(iframe)')).toHaveCount(0);
      const pin = page.getByTestId('card-pin').first();
      await expect(pin).toBeVisible({ timeout: 20_000 });
      const pinTip = await tipText(page, pin);
      expect(pinTip).toMatch(/Pin/);
      expect(pinTip).toMatch(/client-card/);

      // 2 · A thing link: its tooltip names it; the status bar still
      // previews the command; a click opens its card, as before.
      // The transcript scrolls as other people's lines arrive, so a hover
      // can land as the line moves; it is retried until a tooltip opens.
      const link = thingLink(page).last();
      const tip = topTip(page);
      await expect(async () => {
        await center(link);
        await link.hover();
        await expect(tip).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
      await expect(tip.getByTestId('doc-name')).not.toHaveText('', { timeout: 10_000 });
      const command = (await tip.getByTestId('doc-command').innerText()).trim();
      expect(command).toMatch(/^look /);
      await expect(page.getByTestId('ghost-line')).toContainText(command);

      // 6 · The path: collapsed at the default appetite, one click opens it.
      const spoiler = tip.getByTestId('doc-spoiler');
      await expect(spoiler).toHaveAttribute('data-open', 'false');
      await expect(spoiler).toContainText('What is this, really?');
      // Lock it (Shift) so the pointer can travel into it.
      await page.keyboard.press('Shift');
      await expect(tip).toHaveAttribute('data-locked', 'true');
      await spoiler.click();
      await expect(tip.getByTestId('doc-spoiler')).toHaveAttribute('data-open', 'true');
      await expect(tip.getByTestId('doc-spoiler')).toContainText('/');

      // 8 · A tooltip opens no card — no pin, no open button (owner,
      // review). Clicking the thing does that, exactly as before.
      await expect(tip.locator('button')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await link.click();
      await expect(page.getByTestId('inspection-body').first()).toBeVisible({ timeout: 20_000 });


      // 6 · At appetite 2 a path arrives open.
      await runCommand(page, 'settings set spoiler.appetite 2');
      await lookUntilLinks(page);
      await expect(async () => {
        await center(thingLink(page).last());
        await thingLink(page).last().hover();
        await expect(topTip(page).getByTestId('doc-spoiler')).toHaveAttribute('data-open', 'true', { timeout: 3_000 });
      }).toPass({ timeout: 30_000 });
      await page.mouse.move(0, 0);
    } finally {
      await close();
    }
  });

  test('3, 7 · a person in "Here"; a thing you have walked away from', async ({ browser }) => {
    test.setTimeout(240_000);
    const other = await openWorldAs(browser, 'tipother', { startLocation: BANK });
    const { page, close } = await openWorldAs(browser, 'tiphere', { startLocation: BANK });
    try {
      await lookUntilLinks(page);
      // 3 · A chip in the place card's "Here" row describes that person.
      const chip = page.getByTestId('segment-chip').first();
      await expect(chip).toBeVisible({ timeout: 20_000 });
      const said = await tipText(page, chip);
      expect(said.length).toBeGreaterThan(0);

      // 7 · Walk away: the old scrollback link says you can't see it now,
      // never the stale description.
      const stale = thingLink(page).first();
      await runCommand(page, 'north');
      await expect(page.getByTestId('terminal')).toContainText(/square/i, { timeout: 20_000 });
      await center(stale);
      expect(await tipText(page, stale)).toMatch(/can't see that now/i);
    } finally {
      await close();
      await other.close();
    }
  });

  test('4–5 · terms nest (help); a red wiki link is a command, not a term', async ({ browser }) => {
    test.setTimeout(240_000);
    const { page, close } = await openWorldAs(browser, 'tipterms', { startLocation: SQUARE });
    try {
      // 4 · An interface's stripe in a `look` card's gutter is its help
      // term; its "see also" terms nest.
      await runCommand(page, 'look');
      const stripes = page.locator('[data-testid="segment-stripe"][data-stripe-kind="solid"]');
      await expect(stripes.first()).toBeVisible({ timeout: 30_000 });
      let parent: Locator | null = null;
      const n = await stripes.count();
      for (let i = 0; i < n && parent === null; i++) {
        const stripe = stripes.nth(i);
        await center(stripe);
        await stripe.hover();
        const tip = topTip(page);
        await expect(tip).toBeVisible({ timeout: 10_000 });
        await expect(tip.getByTestId('tip-loading')).toHaveCount(0, { timeout: 10_000 });
        if ((await tip.locator('[data-tip-link]').count()) > 0) parent = tip;
        else await page.mouse.move(0, 0);
      }
      expect(parent, 'an interface whose help topic has related terms').not.toBeNull();
      await expect(parent!).toContainText(/help/);
      await page.keyboard.press('Shift');
      await expect(parent!).toHaveAttribute('data-locked', 'true');
      const inner = parent!.locator('[data-tip-link]').first();
      await inner.hover();
      await expect(page.getByTestId('tooltip')).toHaveCount(2, { timeout: 10_000 });
      await page.keyboard.press('Shift');
      await expect(page.getByTestId('tip-crumbs')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('tooltip')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('tooltip')).toHaveCount(0);

      // 5 · A red wiki link (a page not written yet) runs `wiki create`: its
      // tooltip is that command, never a "nothing in the wiki" term.
      await runCommand(page, 'wiki material-kind-gas');
      const red = page.locator('[data-tip-link]', { hasText: 'Mineral' }).first();
      await expect(red).toBeVisible({ timeout: 30_000 });
      await center(red);
      const said = await tipText(page, red);
      expect(said).toMatch(/wiki create/);
      expect(said).not.toMatch(/Nothing in the wiki/);
    } finally {
      await close();
    }
  });

  test('9 · the keyboard: one tab stop for the transcript; focus opens; Esc closes', async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAs(browser, 'tipkeys', { startLocation: BANK });
    try {
      await lookUntilLinks(page);
      await page.getByTestId('terminal').focus();
      await expect(topTip(page)).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press('ArrowUp');
      await expect(topTip(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('tooltip')).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('10 · a phone: a tap still confirms; a long press opens the tooltip sheet', async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAs(browser, 'tipphone', {
      startLocation: BANK,
      contextOptions: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    });
    try {
      await lookUntilLinks(page);
      const link = thingLink(page).last();
      await link.scrollIntoViewIfNeeded();

      // A long press: the tooltip as a bottom sheet — not the line menu.
      const box = (await link.boundingBox())!;
      const at = { clientX: box.x + 4, clientY: box.y + 4, pointerType: 'touch', isPrimary: true, bubbles: true };
      await link.dispatchEvent('pointerdown', at);
      await page.waitForTimeout(700);
      await link.dispatchEvent('pointerup', at);
      await expect(page.getByTestId('tip-sheet')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('command-sheet')).toHaveCount(0);
      await page.getByTestId('tip-scrim').click({ position: { x: 5, y: 5 } });
      await expect(page.getByTestId('tip-sheet')).toHaveCount(0);

      // A tap: the command sheet, as before.
      await link.tap();
      await expect(page.getByTestId('command-sheet')).toBeVisible({ timeout: 10_000 });
    } finally {
      await close();
    }
  });
});
