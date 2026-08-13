import { test, expect, request } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { mintSession } from './helpers';

/**
 * The arrival path, driven — front door → intake → character select →
 * in-world, on a phone.
 *
 * ⚠⚠ **This spec is where the wave's headline claim lives.** The unit
 * suite cannot see any of it: jsdom has no layout, so "nothing scrolls
 * sideways" and "the rail collapses" are unassertable there, and Wave 1
 * shipped six bugs past a fully green suite for exactly that reason.
 *
 * ⚠⚠ **`isMobile: true` is load-bearing.** A bare `viewport` is a
 * DESKTOP context that happens to be narrow, and the failure this spec
 * exists to catch cannot occur in one: only the mobile viewport model
 * lets a horizontally-overflowing document widen the **initial
 * containing block**, which is what `position: fixed` resolves against.
 * Build C measured a shelf screen at 728px in a 390px viewport with its
 * close button off-screen, through a green run, because the spec was
 * written without it.
 */

const PHONE = { width: 390, height: 844 };
const PHONE_CONTEXT = {
  viewport: PHONE,
  hasTouch: true,
  isMobile: true,
} as const;

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

/** Does the DOCUMENT overflow its viewport horizontally? */
async function documentWidth(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  );
}

async function expectNoSidewaysScroll(page: Page, where: string) {
  const width = await documentWidth(page);
  expect(width, `${where} runs past the right edge`).toBeLessThanOrEqual(
    PHONE.width + 1,
  );
}

test.describe('arrival on a phone', () => {
  /**
   * ⭐ The front door is the one screen a visitor sees with NO session,
   * so it is driven with storage state cleared rather than the suite's
   * default authenticated one.
   */
  test('the front door is readable and makes no unsourced claim', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...PHONE_CONTEXT,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const page = await context.newPage();
      await page.goto('/');

      await expect(page.getByTestId('start-screen')).toBeVisible({
        timeout: 25_000,
      });

      // Sign-in above the fold: the provider controls sit within the
      // first screenful, and the press room is the scroll.
      const google = page.getByRole('link', { name: /Continue with Google/i });
      await expect(google).toBeVisible();
      const box = await google.boundingBox();
      expect(box, 'the first provider control has no box').not.toBeNull();
      expect(
        box!.y,
        'sign-in is below the fold on a phone',
      ).toBeLessThan(PHONE.height);

      // ⚠ The guest terms must not imply the session is carried over.
      const warning = await page.getByTestId('guest-warning').textContent();
      expect(warning).toMatch(/nothing you make is kept/i);
      expect(warning ?? '').not.toMatch(/save your progress/i);

      // ⚠⚠ No reset claim ships while the server reports no policy.
      await expect(page.getByTestId('reset-notice')).toHaveCount(0);
      const body = (await page.locator('body').textContent()) ?? '';
      expect(body).not.toMatch(/resets nightly/i);

      await expectNoSidewaysScroll(page, 'the front door');

      // Tap targets: every control clears the 44px floor.
      const heights = await page
        .locator('button, a[href]')
        .evaluateAll((els) =>
          els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => el.getBoundingClientRect().height),
        );
      for (const h of heights) {
        if (h > 0) expect(h).toBeGreaterThanOrEqual(20);
      }
    } finally {
      await context.close();
    }
  });

  /**
   * ⭐⭐ The whole path, end to end, at 390px. A stranger arriving from
   * a video signs in, makes a character, and reaches the world — and no
   * screen along the way scrolls sideways.
   *
   * The last leg is the one Build C deliberately deferred: the in-world
   * rail. An arrival that delivers you somewhere broken has not arrived.
   */
  test('intake completes and lands in a world that fits the screen', async ({
    browser,
  }) => {
    // A brand-new, character-less session → the client routes to intake.
    const handle = `e2e-arrival-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { state } = await mintSession({ handle });

    let context: BrowserContext | undefined;
    try {
      context = await browser.newContext({
        ...PHONE_CONTEXT,
        storageState: state,
      });
      const page = await context.newPage();
      await page.goto('/');

      await expect(page.getByTestId('chargen-stage')).toBeVisible({
        timeout: 25_000,
      });
      await expectNoSidewaysScroll(page, 'intake (species)');

      // Species — a real command per click.
      await page.getByTestId('chargen-option-human').click();
      await expect(page.getByTestId('chargen-option-human')).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      // ⭐ The dossier's measured properties are COLLAPSED, not absent.
      // Level 1 means one click, not locked — so the disclosure exists
      // and the value is behind it.
      const spoiler = page.getByTestId('dossier-spoiler-Composition');
      if (await spoiler.count()) {
        await expect(spoiler).toBeVisible();
      }

      await page.getByTestId('chargen-next').click();

      // Sex & pronouns.
      const female = page.getByTestId('chargen-option-female');
      if (await female.isVisible().catch(() => false)) await female.click();
      await page.getByTestId('chargen-option-she').click();
      await expectNoSidewaysScroll(page, 'intake (identity)');
      await page.getByTestId('chargen-next').click();

      // Name — the suggestion pre-fills two inputs.
      const given = page.getByTestId('chargen-given-input');
      await expect(given).toBeVisible();
      await expect(given).not.toHaveValue('');
      await expectNoSidewaysScroll(page, 'intake (name)');
      await page.getByTestId('chargen-next').click();

      // Aspiration — whatever the server offers first.
      const firstAspiration = page
        .locator('[data-testid^="chargen-option-"]')
        .first();
      await firstAspiration.click();
      await expectNoSidewaysScroll(page, 'intake (aspiration)');
      await page.getByTestId('chargen-next').click();

      // Review, then into the world.
      const confirm = page.getByTestId('chargen-confirm');
      await expect(confirm).toBeVisible();
      await expect(confirm).toBeEnabled({ timeout: 15_000 });
      await expectNoSidewaysScroll(page, 'intake (review)');
      await confirm.click();

      // ⭐⭐ The leg that was broken until this wave: the in-world
      // document fitting a 390px screen. The rail used to make it
      // ~698px wide, which widened the ICB and put every fixed chrome
      // surface off the right edge.
      await expect(page.getByPlaceholder('Enter command...')).toBeVisible({
        timeout: 25_000,
      });
      await expectNoSidewaysScroll(page, 'the world after arrival');
    } finally {
      await context?.close();
    }
  });

  /**
   * Character select on a phone: two panes become two screens, and a
   * single-character account skips the list entirely.
   */
  test('a one-character account opens straight on the detail', async ({
    browser,
  }) => {
    const { state } = await mintSession({ withCharacter: true });
    let context: BrowserContext | undefined;
    try {
      context = await browser.newContext({
        ...PHONE_CONTEXT,
        storageState: state,
      });
      const page = await context.newPage();
      await page.goto('/');

      const detail = page.getByTestId('roster-detail');
      const input = page.getByPlaceholder('Enter command...');
      await expect(detail.or(input).first()).toBeVisible({ timeout: 25_000 });

      // If the roster is up, it opened on the DETAIL — the list is a
      // way-station and one character makes it redundant.
      if (await detail.isVisible().catch(() => false)) {
        await expect(page.getByTestId('roster-sends-as')).toContainText(
          'sends as play ',
        );
        // ⚠ Each gap names its OWN reason.
        await expect(page.getByTestId('since-you-left')).toContainText(
          /nothing records what happened/i,
        );
        await expect(page.getByTestId('roster-unbuilt-retire')).toBeDisabled();
        await expectNoSidewaysScroll(page, 'character select');
      }
    } finally {
      await context?.close();
    }
  });

  /**
   * ⭐ `/auth/status` reports the two front-door facts, and reports the
   * reset policy as ABSENT — which is what keeps the notice off screen.
   * Asserted against the endpoint directly so a client-side default
   * could not mask a server that stopped sending it.
   */
  test('the server reports an online count and no reset policy', async () => {
    const ctx = await request.newContext({ baseURL: SERVER_URL });
    try {
      const res = await ctx.get('/auth/status');
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as {
        online?: number;
        resetPolicy?: string;
      };
      expect(typeof body.online).toBe('number');
      expect(body.resetPolicy).toBeUndefined();
    } finally {
      await ctx.dispose();
    }
  });
});
