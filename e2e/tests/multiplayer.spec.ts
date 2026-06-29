import { test, expect } from '@playwright/test';
import { mintSession, enterWorld, sendUntil, commandInput } from './helpers';

/**
 * Multiplayer message routing: two avatars in the same room, one speaks,
 * the other hears it. Exercises the sensor/messaging path across two
 * independent client sessions — the heart of a multiplayer platform.
 *
 * Co-location matters: the lounge is an elastic Warren that buds per
 * occupant, so two fresh avatars spawn in DIFFERENT host rooms and never
 * share one. So both walk north into Dave's Bar — an ordinary single
 * room — which guarantees they're together before anyone speaks. The
 * assertion keys on the STABLE spoken content ("Greetings everyone"),
 * not the speaker's rendered label, which depends on the listener's
 * recognition state.
 *
 * Two full world-entries plus a round-trip is heavy, so the timeout is
 * raised well above the default.
 */
test('a spoken line reaches another avatar in the same room', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const [a, b] = await Promise.all([
    mintSession({ withCharacter: true }),
    mintSession({ withCharacter: true }),
  ]);

  const speaker = await enterWorld(browser, a.state);
  const listener = await enterWorld(browser, b.state);
  try {
    // Walk both into Dave's Bar (north of the lounge) so they share one
    // room — the lounge is a budding Warren, but Dave's Bar is a single
    // persistent singleton, so co-location there is guaranteed.
    //
    // Wait on the live location HEADING, not body text: the lounge's own
    // prose ("the warm light of Dave's Bar") and the post-arrival
    // scrollback both contain "Dave's Bar", so a `getByText` match is
    // satisfied before the move lands. Keying on the level-2 location
    // heading means `sendUntil` only returns once the page is actually in
    // the bar — which also serializes the two moves, so the listener's
    // `north` runs after the first-ever lazy `GoController` clone has
    // finished (concurrent first-moves otherwise race that clone).
    const barHeading = (page: typeof speaker.page) =>
      page.getByRole('heading', { name: /Dave's Bar/i });
    await sendUntil(speaker.page, 'north', barHeading(speaker.page));
    await sendUntil(listener.page, 'north', barHeading(listener.page));

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
