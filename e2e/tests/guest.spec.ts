import { test, expect } from '@playwright/test';
import { commandInput, sendUntil } from './helpers';

/**
 * The anonymous-guest path: a fresh visitor clicks "Play as guest", the
 * server mints an ephemeral guest avatar (`/auth/guest` → WS connect),
 * and the client flips straight to the cockpit — no Google sign-in, no
 * roster. See client-shell.md.
 *
 * Runs as a fresh visitor by overriding the default authed storageState
 * with an empty one.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('an anonymous visitor can play as guest and enter the world', async ({
  page,
}) => {
  await page.goto('/');
  // The start screen, not the cockpit.
  await expect(page.getByText('Sign in with Google')).toBeVisible();

  await page.getByRole('button', { name: 'Play as guest' }).click();

  // The guest mint + WS welcome flips us into the cockpit. Generous
  // timeout: the box may be under load.
  await expect(commandInput(page)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Sign in with Google')).toHaveCount(0);

  // And the guest can actually act in the world.
  await sendUntil(page, 'look', page.getByText(/Obvious exits/i).first());
});
