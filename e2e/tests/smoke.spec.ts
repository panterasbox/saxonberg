import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * Smoke tests — prove the harness works end to end: the test-auth seam,
 * the stack boot, and the client rendering the cockpit + a full command
 * round-trip.
 *
 * Per-test isolation
 * ------------------
 * Each test mints its OWN fresh with-character avatar (`openWorldAs`)
 * rather than sharing one. Sharing raced on the server's linkdead grace:
 * a just-closed session lingers, so the next browser to play the same
 * avatar gets displaced back to the roster. Fresh-per-test removes the
 * race and lets the file run fully parallel. See `helpers.ts`.
 */

test('an authenticated visitor lands in the cockpit', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'smoke-cockpit');
  try {
    // The cockpit exposes a command input; the front door does not.
    await expect(page.getByPlaceholder('Enter command...')).toBeVisible();
    // ⚠ Test id, not provider copy — an absence check written against
    // copy passes vacuously the moment the copy changes.
    await expect(page.getByTestId('start-screen')).toHaveCount(0);
  } finally {
    await close();
  }
});

/**
 * Full command round-trip: client → command bus → WebSocket → server →
 * rendered frame. A fresh test avatar spawns in the lounge (the Avatar
 * seed pins `startLocation: /domain/lounge/warren`, which resolves to the
 * lounge Warren's host room), so `look` presents that room. We assert on
 * the room's stable identity label (its shortDescription) rather than its
 * flavor prose, which churns.
 */
test('a `look` command round-trips and renders the spawn room', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'smoke-look');
  try {
    await sendUntil(page, 'look', page.getByText(/the lounge/i).first());
  } finally {
    await close();
  }
});
