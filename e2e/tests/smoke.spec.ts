import { test, expect } from '@playwright/test';

/**
 * Smoke tests — prove the harness works end to end: the test-auth seam
 * (global-setup), the stack boot, and the client rendering. Selectors
 * are intentionally loose; tighten them as the cockpit UI stabilizes.
 */

test('an authenticated visitor lands in the cockpit', async ({ page }) => {
  await page.goto('/');

  // The cockpit exposes a command input; the login screen does not.
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByText('Login with Google')).toHaveCount(0);
});

/**
 * Full command round-trip: client → command bus → WebSocket → server →
 * rendered frame. The deterministic world comes from the seed system —
 * a fresh test avatar spawns in the lounge (the Avatar seed pins
 * `startLocation: /domain/lounge/warren`, which resolves to the lounge
 * Warren's host room), so `look` presents that room. We assert on the
 * room's stable identity label (its shortDescription) rather than its
 * flavor prose, which churns.
 *
 * Determinism note: re-run-safe because `look` doesn't move the avatar,
 * and the e2e user is idempotent. CI gets a fresh Mongo each run anyway.
 */
test('a `look` command round-trips and renders the spawn room', async ({
  page,
}) => {
  await page.goto('/');

  const input = page.getByRole('textbox');
  await expect(input).toBeVisible();

  await input.fill('look');
  await input.press('Enter');

  // The look response renders into the terminal scrollback. Playwright
  // auto-waits for the WebSocket round-trip to land the text.
  await expect(page.getByText(/the lounge/i).first()).toBeVisible();
});
