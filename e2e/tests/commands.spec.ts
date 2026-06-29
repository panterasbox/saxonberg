import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * Command round-trips: client → command bus → WebSocket → server →
 * rendered frame. Each test mints its own fresh avatar (`openWorldAs`)
 * and asserts on STABLE output — the actor's own echoed line or a room's
 * identity label — never on the room's occupant list, which accumulates
 * leftover test avatars in a persistent DB.
 *
 * A fresh avatar spawns in the lounge (Avatar seed pins
 * `startLocation: /domain/lounge/warren`), which exits north to Dave's
 * Bar.
 */

test('`say` echoes the spoken line back to the speaker', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'cmd-say');
  try {
    await runCommand(page, 'say Hello there');
    await expect(
      page.getByText(/You say, "Hello there"/i).first()
    ).toBeVisible();
  } finally {
    await close();
  }
});

test('`smile` renders the emote back to the actor', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'cmd-smile');
  try {
    await runCommand(page, 'smile');
    await expect(page.getByText(/You smile\./i).first()).toBeVisible();
  } finally {
    await close();
  }
});

test('`inventory` reports an empty pack for a fresh avatar', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'cmd-inv');
  try {
    await runCommand(page, 'inventory');
    await expect(
      page.getByText(/You are not carrying anything/i).first()
    ).toBeVisible();
  } finally {
    await close();
  }
});

test('movement north traverses the exit into Dave\'s Bar', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'cmd-move');
  try {
    // Confirm we start in the lounge.
    await runCommand(page, 'look');
    await expect(page.getByText(/the lounge/i).first()).toBeVisible();

    // The lounge exits north to Dave's Bar; arriving auto-looks, so the
    // new room's identity label renders.
    await runCommand(page, 'north');
    await expect(page.getByText(/Dave's Bar/i).first()).toBeVisible();
  } finally {
    await close();
  }
});

test('an unrecognized verb returns a parse error', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'cmd-bad');
  try {
    await runCommand(page, 'blarghnonsense');
    await expect(
      page.getByText(/I don't understand 'blarghnonsense'/i).first()
    ).toBeVisible();
  } finally {
    await close();
  }
});
