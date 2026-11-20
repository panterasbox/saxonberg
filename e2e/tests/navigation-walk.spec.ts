import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { openWorldAs, runCommand, tipText } from './helpers';

/**
 * ⭐⭐ **The navigation card's browser walk** — what a person sees
 * (requirements § The drive; the knowledge behind it is the wire drive,
 * `packages/wire/tests/navigation.dirty.wire.test.ts`).
 *
 * Every step is `instant`. A real Chromium against the real client. Every
 * assertion names a mark by test id and a state by attribute
 * (`data-tier`, `data-state`, `data-shape`), never "the map is visible".
 * Tooltips are read by FOCUS (`tipText`): the card column moves, and a
 * hover races it.
 *
 * ⚠ The Delve is pitch black past its mouth: the walker clones the general
 * store's torch (a seat over Terminus, the row's title) — a staged prop;
 * every assertion is about what the player's own acts drew.
 */

const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const BANK = '/world/terminus/wharfside/bank';
const YARD = '/world/newbie-wilds/steading/yard';
const SEEP = '/world/terminus/rejection/location/seep-hollow';
const GALLERY = '/world/terminus/rejection/hush/gallery';
const DECK = '/world/terminus/hesper/deck';
const TORCH = '/world/terminus/general-store/thing/torch';

const card = (page: Page): Locator => page.getByTestId('nav-card');
const places = (page: Page): Locator => page.getByTestId('nav-map').getByTestId('nav-place');

async function openCard(page: Page): Promise<void> {
  await runCommand(page, 'map');
  await expect(card(page)).toBeVisible({ timeout: 30_000 });
}

/** Open a section the card may have folded to fit. */
async function openSection(page: Page, name: string): Promise<Locator> {
  const sec = page.getByTestId(`nav-section-${name}`);
  await expect(sec).toBeVisible({ timeout: 30_000 });
  if ((await sec.getAttribute('data-open')) !== 'true') {
    await page.getByTestId(`nav-section-${name}-toggle`).click();
  }
  await expect(sec).toHaveAttribute('data-open', 'true');
  return sec;
}

/** Where you stand, by the zone section's coordinates line. */
async function coords(page: Page): Promise<string> {
  await openSection(page, 'zone');
  return (await page.getByTestId('nav-coords').innerText()).replace(/\s+/g, ' ').trim();
}

test.describe('navigation card — the zone map, the ways, the sections', () => {
  test('1–10 · the Delve: drawn from your own walk, the map is how you move', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, close } = await openWorldAs(browser, 'navcard', {
      startLocation: TREELINE,
      committees: ['/world/terminus'],
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await runCommand(page, `clone ${TORCH}`);
      await runCommand(page, 'light me:i:torch');
      await openCard(page);

      // 1 · into the Delve: the vestibule is a walked place.
      await runCommand(page, 'north');
      await expect(places(page).first()).toHaveAttribute('data-tier', 'walked', { timeout: 30_000 });
      await expect(page.getByTestId('nav-here')).toHaveCount(1);

      // 2 · a look: the ways out are openings — the frontier marks them.
      await runCommand(page, 'look');
      await expect(page.getByTestId('nav-frontier').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-testid="nav-edge"][data-shape="opening"][data-dir="north"]')).toHaveCount(1);

      // 3 · the opening north of you is how you move: a click is `go north`.
      const before = await coords(page);
      await page.locator('[data-testid="nav-edge"][data-shape="opening"][data-dir="north"]').click();
      await expect.poll(() => coords(page), { timeout: 30_000 }).not.toBe(before);
      await expect(places(page)).toHaveCount(2, { timeout: 30_000 });
      // Back is now a link between two walked places.
      await expect(page.locator('[data-testid="nav-edge"][data-shape="link"]').first()).toBeVisible();

      // 5 · on into corridor-2: the pit (its trap, or a search and a climb
      // on a world where it has sprung) — and the level control appears.
      await runCommand(page, 'north');
      await expect(page.getByTestId('nav-coords')).toContainText(/y: 2/, { timeout: 30_000 });
      if (!(await page.getByTestId('nav-coords').innerText()).includes('z: -1')) {
        await runCommand(page, 'search');
        const down = page.getByTestId('nav-exit-down');
        await expect(down).toHaveAttribute('data-state', 'mode', { timeout: 60_000 });
        await expect(down).toHaveAttribute('data-mode', 'climb');
        // Its tooltip says what would work.
        expect(await tipText(page, down)).toMatch(/climb down/);
        await runCommand(page, 'climb down');
      }
      await expect(page.getByTestId('nav-coords')).toContainText(/z: -1/, { timeout: 30_000 });
      await expect(page.getByTestId('nav-levels')).toBeVisible();
      await expect(page.getByTestId('nav-level-0')).toBeVisible();
      await expect(page.getByTestId('nav-level--1')).toHaveAttribute('data-yours', 'true');

      // 8 · a place further off: a click draws the route; nobody moves.
      await page.getByTestId('nav-level-0').click();
      await page.getByTestId('nav-zoom-whole').click();
      const here = await coords(page);
      const vestibule = places(page).first();
      await vestibule.click();
      await expect(page.getByTestId('nav-route-leg').first()).toBeVisible({ timeout: 30_000 });
      expect(await coords(page)).toBe(here);
      await page.getByTestId('nav-me').click();

      // 7 · up, back to corridor-1, and search: the hidden way is found by searching.
      await runCommand(page, 'up');
      await runCommand(page, 'south');
      await expect(page.getByTestId('nav-coords')).toContainText(/y: 1/, { timeout: 30_000 });
      await runCommand(page, 'search');
      await expect(page.locator('[data-testid="nav-edge"][data-dir="northeast"][data-found="searched"]')).toHaveCount(1, { timeout: 60_000 });

      // 10 · every way says where it leads: the preview strip and the tooltip.
      const south = page.getByTestId('nav-exit-south');
      await south.focus();
      await expect(page.getByTestId('nav-preview')).toContainText(/south/);
      expect(await tipText(page, south)).toMatch(/south/);
      // A mark has a tooltip with how you know it.
      expect(await tipText(page, places(page).first())).toMatch(/walked/);

      // 9 · the zone section: who keeps it; the place section: what your map holds.
      await openSection(page, 'zone');
      await expect(page.getByTestId('nav-jurisdiction')).toBeVisible();
      await openSection(page, 'place');
      await expect(page.getByTestId('nav-place-known')).toContainText(/walked/);

      // 21 · the status bar's outdoors.
      await expect(page.getByTestId('status-bar')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('11–12 · a locked door listed by its name, its menu; a way not for you as you stand', async ({ browser }) => {
    test.setTimeout(240_000);
    const { page, close } = await openWorldAs(browser, 'navdoor', {
      startLocation: BANK,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await openCard(page);
      // 11 · the bank's pump-house door: a named way, locked, with its door's menu.
      const pump = page.getByTestId('nav-exit-pumphouse');
      await expect(pump).toHaveAttribute('data-state', 'locked', { timeout: 30_000 });
      await expect(pump).toHaveAttribute('data-boundary', 'true');
      await pump.click({ button: 'right' });
      await expect(page.getByTestId('radial-overlay')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('[data-verb="unlock"]')).toHaveCount(1, { timeout: 15_000 });
      await page.keyboard.press('Escape');

      // 21 · the status bar's outdoors; 24 · the crumbs are your own.
      await expect(page.getByTestId('status-outdoors')).toBeVisible({ timeout: 30_000 });
      await openSection(page, 'world');
      const crumbs = page.getByTestId('nav-crumb');
      await expect(crumbs.filter({ hasText: 'Terminus City' })).toHaveCount(1, { timeout: 30_000 });
      const said = await tipText(page, crumbs.filter({ hasText: 'Terminus City' }));
      expect(said).toMatch(/visitor|resident/);
    } finally {
      await close();
    }

    // 12 · the steading's low door: not for you as you stand — trying says why.
    const yard = await openWorldAs(browser, 'navlow', {
      startLocation: YARD,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await openCard(yard.page);
      const east = yard.page.getByTestId('nav-exit-east');
      await expect(east).toHaveAttribute('data-state', /refuses|mode/, { timeout: 30_000 });
      expect(await tipText(yard.page, east)).toMatch(/stoop|low|crawl/i);
    } finally {
      await yard.close();
    }
  });

  test('14, 22, 23 · a track at whole zone; the Hesper aboard; the Hush has no map yet', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, close } = await openWorldAs(browser, 'navtrack', {
      startLocation: SEEP,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await openCard(page);
      await runCommand(page, 'look');
      // 14 · walk a track, and its two ends are a long dashed link.
      await runCommand(page, 'northeast');
      await page.getByTestId('nav-zoom-whole').click();
      await expect(page.locator('[data-testid="nav-edge"][data-shape="track"]').first()).toBeVisible({ timeout: 60_000 });
    } finally {
      await close();
    }

    const deck = await openWorldAs(browser, 'navdeck', { startLocation: DECK });
    try {
      await openCard(deck.page);
      // 22 · aboard: the structure is her.
      await expect(deck.page.getByTestId('nav-section-structure-summary')).toContainText(/Hesper/i, { timeout: 30_000 });
    } finally {
      await deck.close();
    }

    const hush = await openWorldAs(browser, 'navhush', { startLocation: GALLERY });
    try {
      await openCard(hush.page);
      // 23 · a space that is not a grid: no map for it yet, said plainly.
      await expect(hush.page.getByTestId('nav-no-map')).toBeVisible({ timeout: 30_000 });
    } finally {
      await hush.close();
    }
  });

  test('17, 19, 25 · two players two maps; fold, fill, remember; 22 rem at 2048 px', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, context, close, handle } = await openWorldAs(browser, 'navfold', {
      startLocation: BANK,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await openCard(page);
      // 25 · the panel is 22 rem; at 2048 px (2560 at 125%) two card columns remain.
      const width = await page.getByTestId('mode-panel').evaluate((el) => el.getBoundingClientRect().width);
      expect(Math.round(width / 16)).toBe(22);

      // 19 · fill: with the height there, the card opens sections itself …
      await expect(page.locator('[data-testid^="nav-section-"][data-open="true"]').first()).toBeVisible({ timeout: 30_000 });
      // … and folds the last it opened when the window shrinks.
      const openTall = await page.locator('[data-testid^="nav-section-"][data-open="true"]').count();
      await page.setViewportSize({ width: 2048, height: 560 });
      await expect.poll(() => page.locator('[data-testid^="nav-section-"][data-open="true"]').count(), { timeout: 30_000 }).toBeLessThan(openTall);
      await page.setViewportSize({ width: 2048, height: 1100 });

      // A section set by hand is remembered across a reload.
      const you = page.getByTestId('nav-section-you');
      const was = await you.getAttribute('data-open');
      await page.getByTestId('nav-section-you-toggle').click();
      const now = was === 'true' ? 'false' : 'true';
      await expect(you).toHaveAttribute('data-open', now);
      await expect(you).toHaveAttribute('data-set', 'true');
      await page.reload();
      await openCard(page);
      await expect(page.getByTestId('nav-section-you')).toHaveAttribute('data-open', now, { timeout: 30_000 });
      void context;
      void handle;
    } finally {
      await close();
    }

    // 17 · another player who has never been here holds none of it.
    const other = await openWorldAs(browser, 'navother', {
      startLocation: TREELINE,
      contextOptions: { viewport: { width: 2048, height: 1100 } },
    });
    try {
      await openCard(other.page);
      await openSection(other.page, 'world');
      await expect(other.page.getByTestId('nav-crumb').filter({ hasText: 'Terminus City' })).toHaveCount(0);
    } finally {
      await other.close();
    }
  });
});
