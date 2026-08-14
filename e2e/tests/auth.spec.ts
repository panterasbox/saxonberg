import { test, expect } from '@playwright/test';

/**
 * The un-authenticated path. Overrides the default authed storageState
 * with an empty one, so this runs as a fresh visitor.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('an unauthenticated visitor sees the front door', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByText('Continue with Google')).toBeVisible();
  // ⚠ The guest terms are load-bearing copy: a guest keeps nothing and
  // there is no conversion path, so nothing here may imply otherwise.
  await expect(page.getByTestId('guest-warning')).toContainText(
    /nothing you make is kept/i,
  );
});
