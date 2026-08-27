import { test, expect } from '@playwright/test';
import { mintSession, enterWorld, commandInput, sendUntil } from './helpers';

/**
 * Multiplayer message routing: two avatars in the same room, one speaks,
 * the other hears it. Exercises the sensor/messaging path across two
 * independent client sessions — the heart of a multiplayer platform.
 *
 * Co-location, deterministically
 * ------------------------------
 * The default spawn (the lounge) is an elastic Warren that BUDS under
 * occupant pressure, so two fresh avatars routinely land in different
 * rooms — and under a persistent DB the bud graph degenerates into
 * something no exit-walk can reliably cross. So we sidestep the Warren
 * entirely: both avatars are minted with `startLocation` pinned to Dave's
 * Bar (a stable, non-Warren singleton room — `LoungeWarren.BAR_PATH`),
 * via the test-auth seam's spawn override. They spawn already together,
 * regardless of how polluted the lounge is, so this test is immune to
 * lounge-population churn. The assertion keys on the STABLE spoken content
 * ("Greetings everyone"), not the speaker's rendered label, which depends
 * on the listener's recognition state.
 */
const BAR_PATH = '/world/lounge/location/bar';

test('a spoken line reaches another avatar in the same room', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const [a, b] = await Promise.all([
    mintSession({ withCharacter: true, startLocation: BAR_PATH }),
    mintSession({ withCharacter: true, startLocation: BAR_PATH }),
  ]);

  const speaker = await enterWorld(browser, a.state);
  const listener = await enterWorld(browser, b.state);
  try {
    // Both spawned in Dave's Bar. Confirm each is actually there (the
    // bar's long description is unique — "…citrus peel and old wood…")
    // before the speech round-trip, re-sending `look` if the first one
    // dropped while the WebSocket session was still settling.
    await sendUntil(
      speaker.page,
      'look',
      speaker.page.getByText(/citrus peel/i).first()
    );
    await sendUntil(
      listener.page,
      'look',
      listener.page.getByText(/citrus peel/i).first()
    );

    // Speaker says something distinctive; the listener should receive it.
    await commandInput(speaker.page).fill('say Greetings everyone');
    await commandInput(speaker.page).press('Enter');

    await expect(
      listener.page.getByText(/says, "Greetings everyone"/i).first()
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await Promise.all([speaker.context.close(), listener.context.close()]);
  }
});
