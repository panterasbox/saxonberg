import { test, expect } from '@playwright/test';

/**
 * The un-authenticated path. Overrides the default authed storageState
 * with an empty one, so this runs as a fresh visitor.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('an unauthenticated visitor sees the login screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Sign in with Google')).toBeVisible();
});
