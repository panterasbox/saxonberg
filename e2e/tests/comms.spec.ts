import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * Acoustic-speech round-trips beyond the basic `say` smoke (see
 * commands.spec.ts). Each mints its own fresh avatar and asserts on the
 * actor's OWN echoed line — never the room's occupant list, which
 * accumulates leftover avatars in a persistent DB — so these are immune
 * to lounge-population churn. `sendUntil` re-sends if the first command
 * is dropped while the WebSocket session is still settling.
 *
 * A fresh avatar is unrecognized even to itself, so it sees its own
 * identity as "a human" (the default belief-store presentation) — that's
 * what the whisper reception line reads as.
 */

test('`whisper` to self echoes both the spoken aside and its reception', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'comms-whisper');
  try {
    // `whisper <target> <words>` — directing it at `me` is a self-loop
    // that exercises both the speak side and the receive side in one
    // session: the actor both whispers and is whispered to.
    await sendUntil(
      page,
      'whisper me a secret',
      page.getByText(/You whisper to .*, "a secret"/i).first()
    );
    await expect(
      page.getByText(/whispers to you, "a secret"/i).first()
    ).toBeVisible();
  } finally {
    await close();
  }
});

test('`shout` echoes the shouted line back to the shouter', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'comms-shout');
  try {
    await sendUntil(
      page,
      'shout hello there',
      page.getByText(/You shout, "hello there"/i).first()
    );
  } finally {
    await close();
  }
});

test('`emote` renders a freeform action back to the actor', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'comms-emote');
  try {
    // The freeform `emote <action>` composes "You <action>." back to the
    // actor (distinct from the canned `smile` covered in commands.spec).
    await sendUntil(
      page,
      'emote tips an imaginary hat',
      page.getByText(/You tips an imaginary hat\./i).first()
    );
  } finally {
    await close();
  }
});
