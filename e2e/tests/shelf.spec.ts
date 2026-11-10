import { test, expect } from '@playwright/test';
import { openWorldAs, reenterWorld, runCommand } from './helpers';

/**
 * > AC: *the shelf renders nine rows … the other six render the
 * > not-wired state — `╌╌`, hatched ground, dashed border — each with
 * > its reason, and a test asserts no digit appears in any of them* …
 * > *`client-shelf pin <row>` / `unpin <row>` persist to
 * > `cockpit.shelf` and survive a reconnect.*
 *
 * ⚠ **The nine (ten since `body`) is the CATALOGUE, not the default shelf.** The AC was
 * written against a nine-row default, which was reversed on review:
 * never default-pin a widget that does not do anything yet. So these
 * specs pin the hatched rows explicitly where they need them — which is
 * also the path a real player takes.
 *
 * ⭐ This spec exists because the unit suite **structurally cannot**
 * check two of the things that matter most.
 *
 * jsdom does not substitute `var()`, so every jsdom assertion about the
 * hatched ground is an assertion about a *reference string*, not about
 * a painted pixel. And a controller test calls `execute()` directly,
 * skipping the command binder entirely — so it cannot catch a YAML view
 * whose positional slots do not match the controller that reads them.
 * Both are only observable against a real browser and a real server.
 *
 * The third thing it covers is the one a player would actually notice:
 * that pinning is **server-authoritative**. A reload is the honest test
 * — it throws away every scrap of client state and asks the server what
 * the shelf is.
 */

/** Every figure group in the top bar, whatever its state. */
function shelfGroups(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="shelf"] [data-figure-state]');
}

/**
 * Send a shelf command and wait for the bar to hold `count` rows,
 * RE-SENDING if it did not land — the first command after a world entry
 * can be dropped while the socket settles (see `sendUntil`). Pin and
 * unpin are idempotent, so a duplicate send changes nothing.
 */
async function shelfCommand(
  page: import('@playwright/test').Page,
  cmd: string,
  count: number,
): Promise<void> {
  await expect(async () => {
    await runCommand(page, cmd);
    await expect(shelfGroups(page)).toHaveCount(count, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

/** The rows the default shelf leaves off: the five hatched, and MAKE. */
const OFF_DEFAULT = ['make', 'coin', 'status', 'time', 'online', 'docket'];

test('the shelf is honest, and its rows are hatched for real', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'shelf');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    const groups = shelfGroups(page);
    // ⭐ The DEFAULT is the four wired rows — never a bar of dead
    // widgets on first login (`body` joined the default the day it
    // started answering: nutrition-fitness W8, de748bb51). The hatched
    // five live in the widget menu until a player pins one. (MAKE went
    // live with the account roll-up, 5b53647fd, so it is no longer one of
    // them — the six this spec once pinned are five and a live row.)
    await expect(groups).toHaveCount(4, { timeout: 20_000 });
    await expect(
      page.locator('[data-testid="shelf"] [data-figure-state="unwired"]'),
    ).toHaveCount(0);

    // Pin the rest and the hatched five behave exactly as documented.
    for (const [i, row] of OFF_DEFAULT.entries()) {
      await shelfCommand(page, `client-shelf pin ${row}`, 5 + i);
    }
    await expect(groups).toHaveCount(10, { timeout: 20_000 });
    await expect(
      page.locator('[data-testid="shelf"] [data-figure-state="unwired"]'),
    ).toHaveCount(5);

    // ⭐ No digit inside ANY hatched row — the assertion that catches
    // somebody "helpfully" printing a guess where the server has none.
    const unwiredText = await page
      .locator('[data-testid="shelf"] [data-figure-state="unwired"]')
      .allTextContents();
    for (const text of unwiredText) {
      expect(text, `a hatched row printed a digit: ${text}`).not.toMatch(/\d/);
    }

    // ⭐⭐ The hatch is REAL — a resolved dashed border and a hatched
    // ground, not a `var(--sx-…)` string. This is the half of the
    // honesty convention that only a browser can see: in jsdom the
    // dashed border would read as the literal reference and pass
    // against a component that painted nothing at all.
    const firstUnwired = page
      .locator('[data-testid="shelf"] [data-figure-state="unwired"]')
      .first();
    await expect(firstUnwired).toHaveCSS('border-style', 'dashed');
    const hatchBg = await firstUnwired.evaluate(
      (el) => getComputedStyle(el).backgroundImage,
    );
    expect(hatchBg, 'the hatched ground did not resolve').toContain(
      'gradient',
    );

    // Each hatched row carries its reason in its accessible name — the
    // 30px chip has no room for a visible line, so this IS the reason
    // for a screen reader, and it must be in words.
    const label = await firstUnwired.getAttribute('aria-label');
    expect(label).toMatch(/not wired — .+/);
  } finally {
    await close();
  }
});

test('pinning is a real command, and the SERVER owns the answer', async ({
  browser,
}) => {
  // A full reload + re-entry is two world entries in one test.
  test.slow();
  const { page, close } = await openWorldAs(browser, 'shelf-pin');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    const groups = shelfGroups(page);
    await expect(groups).toHaveCount(4, { timeout: 20_000 });

    // ⚠ Through the real binder: `client-shelf unpin renown` has to
    // tokenize into two positional slots and reach the controller. A
    // controller test cannot catch a YAML/controller slot mismatch.
    await shelfCommand(page, 'client-shelf unpin renown', 3);

    // ⭐ THE assertion. A reload discards every scrap of client state —
    // a new socket, a fresh store, no memory of the command — and asks
    // the server what the shelf is. If pinning had been a local toggle
    // this comes back four.
    await page.reload();
    await reenterWorld(page);
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    await expect(groups).toHaveCount(3, { timeout: 20_000 });

    await shelfCommand(page, 'client-shelf pin renown', 4);

    // An unknown row refuses in the machine voice, NAMING the known set
    // — a refusal that says only "no" leaves a closed vocabulary a
    // guessing game. (Since controller-liquidity W7b the set is the
    // view's `values:` list, so the BINDER refuses it, naming them.)
    await runCommand(page, 'client-shelf pin nonesuch');
    const transcript = page.getByTestId('terminal');
    await expect(transcript).toContainText("'nonesuch' is not one of", {
      timeout: 10_000,
    });
    await expect(transcript).toContainText('docket', { timeout: 10_000 });
    // …and nothing changed.
    await expect(groups).toHaveCount(4);

    // ⭐ Identity and connection cannot be unpinned, from the direction
    // a player would actually attack it: they are not rows at all.
    await runCommand(page, 'client-shelf unpin identity');
    await expect(transcript).toContainText("'identity' is not one of", {
      timeout: 10_000,
    });
    await expect(page.getByLabel('Connection status')).toBeVisible();
  } finally {
    await close();
  }
});

test('the shelf WRAPS rather than scrolling at a narrow width', async ({
  browser,
}) => {
  /*
   * ⚠ Nothing the player pinned may be out of sight. A horizontally
   * scrolling shelf hides figures behind a gesture, which is the same
   * failure as not rendering them — and it is invisible to jsdom, which
   * has no layout at all.
   */
  const { page, close } = await openWorldAs(browser, 'shelf-wrap');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    // Pin everything — wrapping only matters with a full shelf, and the
    // default four fit on one row at any width worth testing.
    for (const [i, row] of OFF_DEFAULT.entries()) {
      await shelfCommand(page, `client-shelf pin ${row}`, 5 + i);
    }
    await expect(shelfGroups(page)).toHaveCount(10, { timeout: 20_000 });

    await page.setViewportSize({ width: 900, height: 800 });

    const shelf = page.getByTestId('shelf');
    // Nothing is clipped horizontally: the content fits the box because
    // it wrapped, rather than overflowing it.
    const overflow = await shelf.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    }));
    expect(overflow.overflowX).not.toBe('scroll');
    expect(overflow.overflowX).not.toBe('auto');
    expect(
      overflow.scrollWidth,
      'the shelf overflowed horizontally instead of wrapping',
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // And the whole page does not scroll sideways either.
    const bodyOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(
      bodyOverflow.clientWidth + 1,
    );

    // Every pinned row is still on screen — the actual claim.
    await expect(shelfGroups(page)).toHaveCount(10);
    for (let i = 0; i < 10; i++) {
      await expect(shelfGroups(page).nth(i)).toBeVisible();
    }
  } finally {
    await close();
  }
});

test('the ＋ widget menu stays inside the viewport at both widths', async ({
  browser,
}) => {
  /*
   * ⚠ This assertion exists because the drive found the defect and the
   * suite could not. Left-anchored, the menu hung 15px past the right
   * edge at 1440 and made the whole PAGE scroll sideways — the `＋
   * widget` button is the last item in the rack, so it always sits near
   * the right end. jsdom has no layout; only a real browser can see it.
   */
  const { page, close } = await openWorldAs(browser, 'shelf-menu');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    await expect(shelfGroups(page)).toHaveCount(4, { timeout: 20_000 });

    for (const width of [1440, 900]) {
      await page.setViewportSize({ width, height: 800 });
      await page.getByLabel('Add or remove a shelf widget').click();
      const menu = page.getByTestId('shelf-menu');
      await expect(menu).toBeVisible();

      const box = await menu.boundingBox();
      expect(box, `${width}: no menu box`).not.toBeNull();
      expect(box!.x, `${width}: menu overflows the LEFT edge`).toBeGreaterThanOrEqual(0);
      expect(
        box!.x + box!.width,
        `${width}: menu overflows the RIGHT edge`,
      ).toBeLessThanOrEqual(width);

      // …and the page itself never gains a horizontal scroll.
      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        doc.scrollWidth,
        `${width}: the open menu made the page scroll sideways`,
      ).toBeLessThanOrEqual(doc.clientWidth + 1);

      await page.getByLabel('Add or remove a shelf widget').click();
    }
  } finally {
    await close();
  }
});
