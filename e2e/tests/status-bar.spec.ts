import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * > AC: *hovering an affordance previews its verbatim command in the
 * > status bar* … *⚠ verified by **driving a browser**, not by the
 * > suite alone: hover a clickable identity tag, read the status bar,
 * > click, and confirm the command sent is the command previewed.*
 *
 * ⭐ **The claim under test is an equality, not two behaviours.** § 3.5:
 * *every click sends a command, and the interface shows which.* A test
 * that checked "hover shows something" and "click sends something"
 * separately would pass against an interface that showed one string and
 * sent another — which is the exact failure the axiom exists to rule
 * out, and the one that would discredit every other honest surface in
 * the build.
 *
 * ⚠ The SENT half is read from the server's own **input-echo frame**,
 * not from a client-side spy. The point is that the server received
 * what the bar promised; a spy on the client would only prove the
 * client told itself the truth.
 */

test('preview equals send, verbatim, through the server', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'status-bar');
  try {
    const transcript = page.getByTestId('terminal');
    await expect(transcript).toBeVisible({ timeout: 20_000 });

    // `look` reliably produces a room description carrying clickable
    // identity tags — the affordance kind the AC names.
    const affordance = page.locator('[title^="Click to send: "]').first();
    await sendUntil(page, 'look', affordance);

    // ⭐ Ground truth for what a click WILL send, read off the
    // affordance itself rather than reconstructed by the test.
    const title = (await affordance.getAttribute('title')) ?? '';
    const expected = title
      .replace(/^Click to send: /, '')
      .replace(/ · shift-click to copy$/, '');
    expect(expected.length, 'no command on the affordance').toBeGreaterThan(0);

    // 1. HOVER → the status bar shows it, verbatim.
    await affordance.hover();
    const ghost = page.getByTestId('ghost-line');
    await expect(ghost).toContainText(expected, { timeout: 5_000 });
    // …and the bar says what a click would do.
    await expect(page.getByTestId('status-bar-action')).toHaveText(
      'click to send',
      { timeout: 5_000 },
    );

    // 2. CLICK → the SERVER echoes the command it actually received.
    await affordance.click();
    await expect(transcript).toContainText(expected, { timeout: 10_000 });

    // 3. LEAVE → the bar restores to its teaching hint.
    await page.mouse.move(0, 0);
    await expect(ghost).toContainText(/hover a highlighted word/i, {
      timeout: 5_000,
    });
    await expect(page.getByTestId('status-bar-action')).toHaveText('', {
      timeout: 5_000,
    });
  } finally {
    await close();
  }
});

test('there is exactly ONE status bar on screen', async ({ browser }) => {
  /*
   * ⚠ Two surfaces showing what a click would send is worse than none,
   * because they can disagree — and a disagreement here does not merely
   * look wrong, it discredits the one claim the surface exists to make.
   * The unit suite guards the STRUCTURAL version (exactly one module
   * reads `ghostPreview`); this is the rendered version, which also
   * catches a component mounted twice.
   */
  const { page, close } = await openWorldAs(browser, 'status-bar-one');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('status-bar')).toHaveCount(1);
    await expect(page.getByTestId('ghost-line')).toHaveCount(1);
  } finally {
    await close();
  }
});

test('the shelf previews and sends the SAME string', async ({ browser }) => {
  /*
   * The shelf's own affordances are held to the axiom they advertise:
   * pinning is a command, so the menu entry must preview exactly what
   * it sends — and the server must echo exactly that.
   */
  const { page, close } = await openWorldAs(browser, 'status-bar-shelf');
  try {
    await expect(page.getByTestId('terminal')).toBeVisible({
      timeout: 20_000,
    });
    await page.getByLabel('Add or remove a shelf widget').click();
    const menu = page.getByTestId('shelf-menu');
    await expect(menu).toBeVisible();

    const entry = menu.locator('[data-command]').first();
    const command = (await entry.getAttribute('data-command')) ?? '';
    expect(command).toMatch(/^cockpit shelf (pin|unpin) /);

    await entry.hover();
    await expect(page.getByTestId('ghost-line')).toContainText(command, {
      timeout: 5_000,
    });

    await entry.click();
    await expect(page.getByTestId('terminal')).toContainText(command, {
      timeout: 10_000,
    });
  } finally {
    await close();
  }
});
