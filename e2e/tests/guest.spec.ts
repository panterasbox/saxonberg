import { test, expect } from '@playwright/test';
import { commandInput, sendUntil } from './helpers';

/**
 * The anonymous-guest path: a fresh visitor clicks "Look around as a guest", the
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
  // The front door, not the cockpit. ⚠ Asserted on the test id, not on
  // provider copy — a copy change must not silently turn a presence
  // check into a vacuous one (this line read "Sign in with Google"
  // after the button became "Continue with Google").
  await expect(page.getByTestId('start-screen')).toBeVisible();

  await page.getByRole('button', { name: 'Look around as a guest' }).click();

  // The guest mint + WS welcome flips us into the cockpit. Generous
  // timeout: the box may be under load.
  await expect(commandInput(page)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId('start-screen')).toHaveCount(0);

  // And the guest can actually act in the world.
  await sendUntil(page, 'look', page.getByText(/Obvious exits/i).first());
});
