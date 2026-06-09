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

// TODO: enable once the cockpit has stable selectors and the E2E run
// boots against a deterministic seeded world. This is the high-value
// path — it exercises a full command round-trip over the WebSocket.
test.fixme('typing a command echoes into the terminal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox').fill('look');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/.+/)).toBeVisible();
});
