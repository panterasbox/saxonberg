import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, reenterWorld, runCommand } from './helpers';

/**
 * The phone chrome, driven.
 *
 * ⚠⚠ **This spec is not a nicety; it is where most of this build's
 * claims actually live.** jsdom has no layout and substitutes no
 * `var()`, so *every* geometric and colour claim in the mobile chrome —
 * two rows, safe areas, tap targets, an overlay that does not push the
 * feed, a pull-down that does not scroll the page sideways — is
 * unassertable in the unit suite. The honest-chrome build shipped an
 * add-widget menu that overflowed the viewport by 15px and made the
 * whole page scroll horizontally, with the entire unit suite green. The
 * same is assumed of everything here.
 *
 * The other half is server-authority: `cockpit shelf first` surviving a
 * RELOAD is the only honest test that the order is the server's, since
 * a reload throws away every scrap of client state and asks again.
 */

const PHONE = { width: 390, height: 844 };
/** The narrow case. Nothing may overflow here either. */
const NARROW = { width: 320, height: 640 };

/**
 * ⚠⚠ **`isMobile` is not decoration, and leaving it off hid a real
 * bug through a whole green run.**
 *
 * A bare `viewport` gives a DESKTOP context that happens to be narrow.
 * Only `isMobile` turns on the mobile viewport model — and that model
 * is where a horizontally-overflowing document **widens the initial
 * containing block**, which is what `position: fixed` resolves against.
 * Without it every fixed full-bleed surface measured a tidy 390px and
 * every assertion passed; with it (and on the actual phone this was
 * driven on) the shelf screen computed to 728px with its close button
 * and every row's actions off the right edge, unreachable.
 *
 * So the phone specs run in a phone context, not a narrow desktop one.
 */
const PHONE_CONTEXT = { viewport: PHONE, hasTouch: true, isMobile: true };
const NARROW_CONTEXT = { viewport: NARROW, hasTouch: true, isMobile: true };

/** How far the document can scroll horizontally, in px. */
async function horizontalScroll(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

/**
 * ⚠ **The world LAYOUT still wants to be wider than a phone**, and this
 * build does not redesign it: `WorldLayout` puts a fixed `22rem` rail
 * beside the terminal, ~698px of content at a 390px viewport. The
 * mobile play surface is an explicit **Wave 4** non-goal.
 *
 * What this build DOES do is stop that from widening the *document* —
 * the shell is clamped to the viewport and the rail scrolls inside the
 * content row instead (see `AppContainer` in `App.tsx`). That clamp is
 * not tidiness: under the mobile viewport model an overflowing document
 * widens the initial containing block, and every `position: fixed`
 * chrome surface inherits it. Left alone, the shelf screen rendered at
 * 728px with its actions off-screen.
 *
 * So each surface is checked twice — it must not widen the document
 * beyond the baseline it opened over, and its own box must fit inside
 * the viewport. The second half is the one that catches an ICB
 * expansion, and it is why the baseline comparison alone is not enough.
 */
async function openWithoutOverflow(
  page: Page,
  testId: string,
  open: () => Promise<void>,
): Promise<void> {
  // ⚠ The baseline is measured HERE, immediately before the surface
  // opens — not once at the top of the test. Anything else that widened
  // the page in between (a long command echo in the transcript, say) is
  // not this surface's doing, and charging it here would be an
  // assertion that fails for the wrong reason.
  const baseline = await horizontalScroll(page);
  await open();
  const surface = page.getByTestId(testId);
  await expect(surface).toBeVisible();

  expect(
    await horizontalScroll(page),
    `${testId} widened the document past its baseline`,
  ).toBeLessThanOrEqual(baseline);

  const box = await surface.boundingBox();
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box, `${testId} has no box`).not.toBeNull();
  expect(box!.x, `${testId} starts left of the viewport`).toBeGreaterThanOrEqual(
    -1,
  );
  expect(
    box!.x + box!.width,
    `${testId} runs past the right edge`,
  ).toBeLessThanOrEqual(vw + 1);
}

/** Every glance-line chip's engraved label, in bar order. */
async function glanceLabels(page: Page): Promise<string[]> {
  const labels = await page
    .locator('[data-testid="glance-line"] [data-figure-state]')
    .evaluateAll((els) =>
      els.map((e) => (e.getAttribute('aria-label') ?? '').split(':')[0]!.trim()),
    );
  return labels;
}

test('the bar is two rows, and the glance-line holds three', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobbar', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });
    // ⭐ The desktop bar does not exist here — it is not rendered and
    // hidden, which is what makes the status-bar claim below assertable.
    await expect(page.getByTestId('top-bar')).toHaveCount(0);

    await expect(page.getByTestId('mobile-facts-row')).toBeVisible();
    await expect(page.getByTestId('mobile-glance-row')).toBeVisible();

    // The default shelf is the three wired rows.
    expect(await glanceLabels(page)).toEqual(['PLAY', 'RENOWN', 'SKILL']);

    // ⚠ No status bar: it has no hover to report and would cost the
    // feed a row.
    await expect(page.getByTestId('status-bar')).toHaveCount(0);

    // ⚠ And no notification bell, by any name.
    const barText = (await page.getByTestId('mobile-bar').textContent()) ?? '';
    expect(barText).not.toMatch(/notification|unread/i);

    // ⭐ Two rows means two rows: the glance row sits BELOW the facts
    // row, not beside it. Only a real layout can answer this.
    const facts = await page.getByTestId('mobile-facts-row').boundingBox();
    const glance = await page.getByTestId('mobile-glance-row').boundingBox();
    expect(facts).not.toBeNull();
    expect(glance).not.toBeNull();
    expect(glance!.y).toBeGreaterThanOrEqual(facts!.y + facts!.height - 1);

    // ⚠ The tap-target floor, measured rather than declared.
    expect(glance!.height).toBeGreaterThanOrEqual(44);
    const grab = await page.getByTestId('shelf-grab').boundingBox();
    expect(grab!.width).toBeGreaterThanOrEqual(44);
    expect(grab!.height).toBeGreaterThanOrEqual(44);

    // ⚠ The BAR fits the viewport, even though the Wave-4 layout below
    // it does not (see `expectAddsNoOverflow`).
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    const bar = await page.getByTestId('mobile-bar').boundingBox();
    expect(bar!.x).toBeGreaterThanOrEqual(-1);
    expect(bar!.x + bar!.width).toBeLessThanOrEqual(vw + 1);
  } finally {
    await close();
  }
});

test('the pull-down overlays the feed, and nothing scrolls sideways', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobpull', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    const terminal = page.getByTestId('terminal');
    await expect(terminal).toBeVisible({ timeout: 20_000 });
    const before = await terminal.boundingBox();

    await openWithoutOverflow(page, 'shelf-pulldown', async () => {
      await page.getByTestId('shelf-grab').click();
    });

    // ⭐ OVERLAYS. Pushing the transcript down would reflow everything
    // the player was reading, and closing it would scroll them
    // somewhere they did not ask to be.
    const after = await terminal.boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);

    // The whole shelf, two-up — and it follows a pin.
    const cards = page.locator(
      '[data-testid="pulldown-grid"] [data-figure-state]',
    );
    await expect(cards).toHaveCount(3); // the default shelf
    await runCommand(page, 'cockpit shelf pin coin');
    await expect(cards).toHaveCount(4, { timeout: 15_000 });

    // ⭐ Hatched rows carry their reason as VISIBLE text and no digit —
    // the same claim the desktop shelf makes, at a size where the
    // reason is actually readable.
    await openWithoutOverflow(page, 'shelf-screen', async () => {
      await page.getByTestId('open-shelf-screen').click();
    });
    const coin = page.getByTestId('catalogue-row-coin');
    await expect(coin).toContainText('no subscribable field yet');
    expect(await coin.locator('div').last().textContent()).not.toMatch(/\d/);
  } finally {
    await close();
  }
});

test('neither the pull-down nor the shelf screen overflows at 320px', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobnarrow', {
    contextOptions: NARROW_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });
    // The bar itself fits.
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    const bar = await page.getByTestId('mobile-bar').boundingBox();
    expect(bar!.x + bar!.width).toBeLessThanOrEqual(vw + 1);

    await openWithoutOverflow(page, 'shelf-pulldown', async () => {
      await page.getByTestId('shelf-grab').click();
    });
    await openWithoutOverflow(page, 'shelf-screen', async () => {
      await page.getByTestId('open-shelf-screen').click();
    });
    const baseline = await horizontalScroll(page);
    await page.getByTestId('shelf-screen').getByLabel('Close').click();

    // ⚠ The account dropdown too — it carries the whole Views list on a
    // phone, and it is right-anchored, so an unbounded one overflows
    // LEFTWARD. That is the add-widget failure in the other direction,
    // and equally invisible to jsdom.
    await page
      .locator('[data-testid="mobile-facts-row"] button')
      .last()
      .click();
    const views = page.getByTestId('views-menu');
    await expect(views).toBeVisible();
    expect(await horizontalScroll(page)).toBeLessThanOrEqual(baseline);
    const menu = await views.boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(-1);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(vw + 1);
  } finally {
    await close();
  }
});

/**
 * ⭐⭐ The reorder, end to end and THROUGH A RELOAD.
 *
 * A reload is the only honest test that shelf order is the server's: it
 * throws away every scrap of client state and asks again. It is also
 * the test that catches a YAML view whose positional slots do not match
 * the controller reading them — the controller test calls `execute()`
 * directly and structurally cannot.
 */
test('cockpit shelf first puts a row on the bar, and it survives a reload', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobfirst', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });
    expect(await glanceLabels(page)).toEqual(['PLAY', 'RENOWN', 'SKILL']);

    // `coin` is not on the shelf at all — one command, one intention.
    await runCommand(page, 'cockpit shelf first coin');
    await expect
      .poll(() => glanceLabels(page), { timeout: 15_000 })
      .toEqual(['COIN', 'PLAY', 'RENOWN']);

    await page.reload();
    await reenterWorld(page);
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });
    await expect
      .poll(() => glanceLabels(page), { timeout: 20_000 })
      .toEqual(['COIN', 'PLAY', 'RENOWN']);
  } finally {
    await close();
  }
});

/**
 * ⭐⭐ Tap → the sheet names the command → confirm → **the SERVER's own
 * echo carries the identical string**.
 *
 * The unit test proves the sheet shows and sends the same string. Only
 * this proves the string that reached the server is that one — the
 * interpreter never wrapped it, no bar mode prepended a prefix, and the
 * confirm step did not mangle it in transit.
 */
test('a tap names its command, and the server echoes exactly that', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobsheet', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });

    // An ordinary affordance: a shelf-screen entry, which knows nothing
    // about phones — the interception is at App, not in the component.
    await page.getByTestId('shelf-grab').click();
    await page.getByTestId('open-shelf-screen').click();
    await page
      .getByTestId('catalogue-row-status')
      .getByText('to bar')
      .click();

    // ⚠ The sheet opened and NOTHING was sent yet.
    const sheet = page.getByTestId('command-sheet');
    await expect(sheet).toBeVisible();
    const shown =
      (await page.getByTestId('command-sheet-command').textContent()) ?? '';
    expect(shown).toBe('cockpit shelf first status');

    await page.getByTestId('command-sheet-send').click();
    await expect(sheet).toHaveCount(0);

    // ⭐ The server's own echo of the line it received.
    await expect(page.getByTestId('terminal')).toContainText(shown, {
      timeout: 15_000,
    });
    await expect
      .poll(() => glanceLabels(page), { timeout: 15_000 })
      .toEqual(['STATUS', 'PLAY', 'RENOWN']);
  } finally {
    await close();
  }
});

/**
 * ⭐ The dropped state, driven by actually killing the socket.
 */
test('a dead socket claims the first row, counts down, and promises nothing', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobdrop', {
    contextOptions: PHONE_CONTEXT,
    // ⚠ Keep a handle on every socket the page opens.
    //
    // ⚠⚠ `context.setOffline(true)` alone does NOT do this — measured:
    // CDP's offline emulation leaves an already-open WebSocket up, and
    // `connection.link` sits at `connected` indefinitely. So offline
    // mode is used for what it IS good for (making the reconnect
    // attempts fail, which is what keeps the row on screen) while the
    // drop itself is a real `close()` on the real socket. The
    // alternative was a debug hook on the product, and a test-only
    // capability added to the app is the thing the antipattern doc
    // names first.
    onContext: async (context) => {
      await context.addInitScript(() => {
        const Original = window.WebSocket;
        const opened: WebSocket[] = [];
        (window as unknown as { __sockets: WebSocket[] }).__sockets = opened;
        window.WebSocket = new Proxy(Original, {
          construct(target, args: [string, (string | string[])?]) {
            const ws = new target(...args);
            opened.push(ws);
            return ws;
          },
        });
      });
    },
  });
  try {
    await expect(page.getByTestId('mobile-facts-row')).toBeVisible({
      timeout: 20_000,
    });

    // Offline FIRST, so the reconnect the close triggers cannot
    // immediately succeed and heal the state we came to look at.
    await page.context().setOffline(true);
    await page.evaluate(() => {
      const sockets = (window as unknown as { __sockets: WebSocket[] })
        .__sockets;
      for (const ws of sockets) ws.close();
    });

    const dropped = page.getByTestId('dropped-row');
    await expect(dropped).toBeVisible({ timeout: 20_000 });
    // ⭐ It claims the WHOLE first row.
    await expect(page.getByTestId('mobile-facts-row')).toHaveCount(0);

    // ⭐ The honest sentence, in place of a fabricated held-count.
    await expect(page.getByTestId('dropped-truth')).toContainText(
      /will not arrive/i,
    );

    // ⭐⭐ And NO held count, by any name.
    const text = (await dropped.textContent()) ?? '';
    expect(text).not.toMatch(/held|queued|saved|buffered/i);

    // The countdown is live: it must actually change.
    const retry = dropped.locator('[aria-label^="retry in:"]');
    await expect(retry).toBeVisible();
    const first = await retry.getAttribute('aria-label');
    await expect
      .poll(() => retry.getAttribute('aria-label'), { timeout: 15_000 })
      .not.toBe(first);

    await page.context().setOffline(false);
  } finally {
    await close();
  }
});

/**
 * ⭐ Round trip: a real number, measured by the heartbeat, within a few
 * seconds of connecting — the figure the previous build hatched with a
 * reason that pointed at a protocol already written.
 */
test('round trip renders a real number shortly after connecting', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobrtt', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });
    await page.getByLabel('Connection status').click();
    const popover = page.getByTestId('connection-popover');
    await expect(popover).toBeVisible();

    const rt = popover.locator('[aria-label^="round trip:"]');
    await expect(rt).toHaveAttribute('data-figure-state', 'live', {
      timeout: 20_000,
    });
    // A real measurement: some number of milliseconds, never a zero
    // standing in for "unmeasured".
    const label = (await rt.getAttribute('aria-label')) ?? '';
    const ms = Number(/(\d+)\s*ms/.exec(label)?.[1]);
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBeGreaterThan(0);

    // ⚠ And frames-behind is STILL hatched — its reason names something
    // genuinely missing, unlike the one this build retired.
    const fb = popover.locator('[aria-label^="frames behind:"]');
    await expect(fb).toHaveAttribute('data-figure-state', 'unwired');
    expect(await fb.textContent()).not.toMatch(/\d/);
  } finally {
    await close();
  }
});

/**
 * ⭐ The safe areas, both halves.
 *
 * ⚠ **Headless Chromium has no notch to emulate** — there is no CDP
 * knob that makes `env(safe-area-inset-top)` return a non-zero length —
 * so "the padding measures 62px" is not a claim any test in this suite
 * can make, and pretending otherwise with an injected custom property
 * would assert the injection rather than the chrome. What IS assertable
 * is the pair of facts that actually regress, and they regress
 * SEPARATELY:
 *
 *   1. the bar's rule really references the inset, and
 *   2. `viewport-fit=cover` is present, without which (1) resolves to
 *      zero forever and looks implemented.
 *
 * Either one alone passes while the feature is dead. That is the whole
 * reason the meta tag was a decision in this build rather than a
 * detail.
 */
test('the bar consumes the safe-area inset, and the viewport enables it', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'mobsafe', {
    contextOptions: PHONE_CONTEXT,
  });
  try {
    await expect(page.getByTestId('mobile-bar')).toBeVisible({
      timeout: 20_000,
    });

    // (1) The authored rule, read back out of the live stylesheet —
    // styled-components injects it, so this is the shipped CSS and not
    // the source file.
    const referencesInset = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        for (const rule of Array.from(rules)) {
          if (/padding-top:\s*env\(safe-area-inset-top/.test(rule.cssText)) {
            return true;
          }
        }
      }
      return false;
    });
    expect(referencesInset).toBe(true);

    // (2) The attribute without which (1) is dead CSS that looks alive.
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(viewportMeta).toContain('viewport-fit=cover');

    // And the inset resolves to a real length (0px with no notch)
    // rather than dropping the declaration as invalid.
    const paddingTop = await page
      .getByTestId('mobile-bar')
      .evaluate((el) => getComputedStyle(el).paddingTop);
    expect(paddingTop).toMatch(/^\d+(\.\d+)?px$/);
  } finally {
    await close();
  }
});
