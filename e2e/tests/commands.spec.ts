import { test } from '@playwright/test';
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
 * `startLocation: /world/lounge/idea/warren`), which exits north to Dave's
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

test('`inventory` lists a fresh avatar\'s born-with implant', async ({
  browser,
}) => {
  // A fresh avatar carries only its born-with cranial aether implant
  // (installed via the default loadout — it's on your person, so it
  // lists under inventory). Nothing else is carried; the aspiration
  // outfit is WORN, not carried, and the credential apps are
  // aether-hosted, not container contents.
  const { page, close } = await openWorldAs(browser, 'cmd-inv');
  try {
    await sendUntil(
      page,
      'inventory',
      page.getByText(/You are carrying:.*aether implant/i).first()
    );
  } finally {
    await close();
  }
});

test('movement traverses an exit into the adjoining room', async ({
  browser,
}) => {
  // Spawn directly in Dave's Bar (a stable singleton) so the traversal is
  // deterministic regardless of lounge-Warren budding: the bar always
  // exits `south` to the lounge. This tests the movement mechanic
  // (command → traverse → arrival auto-look) without depending on the
  // pollutable Warren topology.
  const { page, close } = await openWorldAs(browser, 'cmd-move', {
    startLocation: '/world/lounge/location/bar',
  });
  try {
    // Confirm we start in Dave's Bar (its long description is unique —
    // "…citrus peel and old wood…").
    await sendUntil(page, 'look', page.getByText(/citrus peel/i).first());

    // Go south to the lounge; arriving auto-looks, so the lounge's room
    // identity ("the lounge") renders.
    await sendUntil(page, 'south', page.getByText(/the lounge/i).first());
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
