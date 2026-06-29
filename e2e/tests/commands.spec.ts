import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * Command round-trips: client → command bus → WebSocket → server →
 * rendered frame. Each test mints its own fresh avatar (`openWorldAs`)
 * and asserts on STABLE output — the actor's own echoed line or a room's
 * identity label — never on the room's occupant list, which accumulates
 * leftover test avatars in a persistent DB.
 *
 * `sendUntil` re-sends the command if the expected output doesn't land:
 * the first command right after world-entry can be dropped while the
 * WebSocket session is still settling.
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
    await sendUntil(
      page,
      'say Hello there',
      page.getByText(/You say, "Hello there"/i).first()
    );
  } finally {
    await close();
  }
});

test('`smile` renders the emote back to the actor', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'cmd-smile');
  try {
    await sendUntil(page, 'smile', page.getByText(/You smile\./i).first());
  } finally {
    await close();
  }
});

test('`inventory` reports an empty pack for a fresh avatar', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'cmd-inv');
  try {
    await sendUntil(
      page,
      'inventory',
      page.getByText(/You are not carrying anything/i).first()
    );
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
    await sendUntil(page, 'look', page.getByText(/the lounge/i).first());

    // The lounge exits north to Dave's Bar; arriving auto-looks, so the
    // new room's identity label renders.
    await sendUntil(page, 'north', page.getByText(/Dave's Bar/i).first());
  } finally {
    await close();
  }
});

test('an unrecognized verb returns a parse error', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'cmd-bad');
  try {
    await sendUntil(
      page,
      'blarghnonsense',
      page.getByText(/I don't understand 'blarghnonsense'/i).first()
    );
  } finally {
    await close();
  }
});
