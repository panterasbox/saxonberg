import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil, enterWorld } from './helpers';

/**
 * Sandbox (the holodeck) — the player-visible crossing, end to end
 * through the real client.
 *
 * Every test spawns in `/domain/lounge/wire-alcove`: a singleton
 * side-room whose `populates:` puts a public, UNOWNED wardrobe in it
 * each boot. An ordinary avatar standing next to that door is the whole
 * setup — character creation IS the circle grant (`selfHomeOwnerOf`),
 * so there is nothing to provision, and an unowned door opens onto
 * whoever walks through it (the public-booth rule), which is why
 * several tests can share the room without colliding.
 *
 * The door's exit is named `wardrobe`, so you walk it the ordinary way:
 * `go wardrobe` in, `go out` back.
 *
 * Assertions target the **location pane heading**, never the message
 * feed: the feed is append-only scrollback, so a room name from three
 * commands ago is still on screen and a "did we move?" assertion against
 * it passes without anyone moving. The heading is current state.
 *
 * What these cover that the server suite can't: the crossing as the
 * player experiences it — the socket following the wire body, the room
 * description changing, the field body staying put, and the discard
 * actually discarding across a real session.
 *
 * See docs/subsystems/sandbox.md.
 */

const ALCOVE = '/domain/lounge/wire-alcove';

/** The location pane's heading — where the player IS, right now. */
function whereHeading(page: import('@playwright/test').Page, name: RegExp) {
  return page.getByRole('heading', { name });
}
const ALCOVE_HEADING = /wire alcove/i;
const CIRCLE_HEADING = /circle floor/i;

test.describe('sandbox: the wardrobe crossing', () => {
  // Each crossing is a full session ceremony (mint, fork, park,
  // re-attach every socket) and the two-player case pays for two
  // logins on top. The default 30s is a coin flip on a warm box.
  test.setTimeout(120_000);

  test('walk into the wardrobe and back out again', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'wire-in', {
      startLocation: ALCOVE,
    });
    try {
      // We start in the alcove, beside the door.
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));

      // Step through. Nothing material crosses — this is a projection.
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Inside, we are ourselves: the identity thread holds, so the
      // self-view still names our own character.
      await sendUntil(page, 'look', whereHeading(page, CIRCLE_HEADING));

      // Walk out the way we came.
      await runCommand(page, 'go out');
      await expect(whereHeading(page, ALCOVE_HEADING)).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await close();
    }
  });

  test('clutter made inside a circle does not follow you out', async ({
    browser,
  }) => {
    // A wizard: `clone` is code-trust gated, and cloning is the fastest
    // way to make durable-looking junk inside the circle.
    const { page, close } = await openWorldAs(browser, 'wire-clutter', {
      startLocation: ALCOVE,
      wizard: true,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Conjure something inside the circle. It is circle-born: minted
      // under circle scope, so it dies with the session.
      await sendUntil(
        page,
        'clone /obj/sandbox/wardrobe --here',
        page.getByText(/cloned/i).first()
      );

      await runCommand(page, 'go out');
      await expect(whereHeading(page, ALCOVE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Back in the field: the alcove's contents list holds exactly ONE
      // wardrobe — its own. The circle-born copy never crossed.
      await runCommand(page, 'look');
      await expect(whereHeading(page, ALCOVE_HEADING)).toBeVisible();
      const contents = page.getByRole('list', { name: 'contents' });
      await expect(
        contents.getByRole('button', { name: /wardrobe/i })
      ).toHaveCount(1);
    } finally {
      await close();
    }
  });

  test('a dropped connection resumes inside the circle (grace window)', async ({
    browser,
  }) => {
    const { page, state, close } = await openWorldAs(browser, 'wire-drop', {
      startLocation: ALCOVE,
    });
    let reconnected: { close: () => Promise<void> } | null = null;
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Drop the tab entirely — the socket closes with no leave intent,
      // exactly like a wifi blip.
      await close();

      // Reconnect on the same account, inside the grace window. We land
      // back on the SAME wire body, still in the circle — not at the
      // roster, not back in the field.
      const { context, page: page2 } = await enterWorld(browser, state);
      reconnected = { close: () => context.close() };
      await sendUntil(page2, 'look', whereHeading(page2, CIRCLE_HEADING));

      // And we can still walk out normally.
      await runCommand(page2, 'go out');
      await expect(whereHeading(page2, ALCOVE_HEADING)).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      if (reconnected) await reconnected.close();
    }
  });

  test('a message from the field reaches someone inside a circle', async ({
    browser,
  }) => {
    // A shipped open channel, not `tell <name>`: a DM has to resolve a
    // NAME, and two freshly-minted strangers don't know each other's —
    // that's the recognition system doing its job, and it would make
    // this test about belief rather than about the boundary. A channel
    // routes by subscription, so the only thing under test is whether
    // the frame crosses.
    const inside = await openWorldAs(browser, 'wire-callee', {
      startLocation: ALCOVE,
    });
    const outside = await openWorldAs(browser, 'wire-caller', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(
        inside.page,
        'look',
        whereHeading(inside.page, ALCOVE_HEADING)
      );
      await sendUntil(
        outside.page,
        'look',
        whereHeading(outside.page, ALCOVE_HEADING)
      );
      await runCommand(inside.page, 'chat join global');
      await runCommand(outside.page, 'chat join global');

      await runCommand(inside.page, 'go wardrobe');
      await expect(whereHeading(inside.page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Comms are seamless: the audience is the field identity, and the
      // delivery seam forwards to whatever body that person is wearing.
      await runCommand(outside.page, 'chat global knock knock');

      // The person inside hears it, in the circle.
      await expect(
        inside.page.getByText(/knock knock/i).first()
      ).toBeVisible({ timeout: 20_000 });
      // …and is still standing in the circle, not bounced out by it.
      await expect(whereHeading(inside.page, CIRCLE_HEADING)).toBeVisible();
    } finally {
      await inside.close();
      await outside.close();
    }
  });

  test('the vessel is a working body: it can speak on a channel', async ({
    browser,
  }) => {
    // The crossing mints a baseline body, and "baseline" has to include
    // the ordinary implant floor — not just carried, but SLOTTED, so the
    // augment confers `AetherMixin` and the comms verbs parse.
    //
    // The defect this guards: the vessel was minted before the fork
    // carried its species across, so it had no body plan, so the
    // loadout's `occupy(implant, 'cranial')` threw, was swallowed, and
    // left the implant loose in inventory. The player could RECEIVE a
    // channel message inside their circle and could not send one —
    // "You have no way to send a thought." Inbound-only comms is the
    // failure mode a one-sided test would have missed, so this asserts
    // the outbound half explicitly.
    const { page, close } = await openWorldAs(browser, 'wire-voice', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // The implant travelled (baseline mint, not a copy of your gear).
      await sendUntil(page, 'inventory', page.getByText(/aether implant/i).first());

      // And it WORKS: tuning in is the verb-level ESP gate.
      await sendUntil(
        page,
        'chat join global',
        page.getByText(/tuned in to global/i).first()
      );
      await expect(page.getByText(/no way to send a thought/i)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('who works from inside a circle, and lists the field', async ({
    browser,
  }) => {
    // `who` composes a per-viewer roster ROW for every online person.
    // From inside a circle the viewer is circle-scoped and everyone it
    // describes is field-resident, so the projection reaches across the
    // boundary — and un-apertured it threw, taking the whole verb down
    // (`getDisguise`, then `getEngagements`, then `composeRow`).
    //
    // The assertion is on the COUNT header rather than on names: two
    // strangers don't know each other's names, and this test is about
    // the projection surviving the crossing, not about belief.
    const inside = await openWorldAs(browser, 'wire-who-in', {
      startLocation: ALCOVE,
    });
    const outside = await openWorldAs(browser, 'wire-who-out', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(
        outside.page,
        'look',
        whereHeading(outside.page, ALCOVE_HEADING)
      );
      await sendUntil(
        inside.page,
        'look',
        whereHeading(inside.page, ALCOVE_HEADING)
      );
      await runCommand(inside.page, 'go wardrobe');
      await expect(whereHeading(inside.page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      await sendUntil(
        inside.page,
        'who',
        inside.page.getByText(/^Online — \d+/m).first()
      );
      // No controller blow-up, and the parked body still counts as
      // online — stepping into your circle must not delete you from the
      // world's view of who is playing.
      await expect(inside.page.getByText(/Something went wrong/i)).toHaveCount(
        0
      );
      await expect(
        inside.page.getByText(/^Online — 0\b/m)
      ).toHaveCount(0);
    } finally {
      await inside.close();
      await outside.close();
    }
  });

  test('a message OUT of a circle reaches the field, exactly once', async ({
    browser,
  }) => {
    // The outbound half of the seam, plus the duplicate-delivery bug
    // that only appears once the audience is the field identity while
    // the speaker is a vessel: `a === speaker` stops meaning "the same
    // person", so the sender received their own line twice — once as
    // "You", once as a stranger. Exclusion is by identity path now.
    const inside = await openWorldAs(browser, 'wire-out-in', {
      startLocation: ALCOVE,
    });
    const outside = await openWorldAs(browser, 'wire-out-out', {
      startLocation: ALCOVE,
    });
    const PHRASE = 'circleside broadcast marker';
    try {
      await sendUntil(
        inside.page,
        'look',
        whereHeading(inside.page, ALCOVE_HEADING)
      );
      await sendUntil(
        outside.page,
        'look',
        whereHeading(outside.page, ALCOVE_HEADING)
      );
      await sendUntil(
        inside.page,
        'chat join global',
        inside.page.getByText(/tuned in to global/i).first()
      );
      await sendUntil(
        outside.page,
        'chat join global',
        outside.page.getByText(/tuned in to global/i).first()
      );

      await runCommand(inside.page, 'go wardrobe');
      await expect(whereHeading(inside.page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // Sent ONCE — deliberately not `sendUntil`, because a re-send
      // would manufacture the very duplicate this test rules out.
      await runCommand(inside.page, `chat global ${PHRASE}`);

      // Match the DELIVERED line (`[Global] …`), not the bare phrase:
      // the scrollback also carries the command echo the player typed,
      // which contains the phrase too and would make every count 2.
      const delivered = new RegExp(`\\[Global\\].*${PHRASE}`, 'i');

      // It got out of the circle, once.
      await expect(outside.page.getByText(delivered).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(outside.page.getByText(delivered)).toHaveCount(1);

      // …and the sender heard it exactly once, as themselves — not a
      // second time as a stranger, which is what an object-identity
      // self-exclusion produced once the speaker became a vessel.
      await expect(inside.page.getByText(delivered)).toHaveCount(1);
    } finally {
      await inside.close();
      await outside.close();
    }
  });

  test('the field body stays put: present, but unreachable', async ({
    browser,
  }) => {
    // Decision P made visible. Nothing material crosses, so the person
    // who steps onto the wire leaves their body standing exactly where
    // it was — the room still lists them. That is the whole reason
    // `who` and `tell` keep working: the field body is the stable
    // identity everyone addresses while the vessel does the carrying.
    const inside = await openWorldAs(browser, 'wire-parked-in', {
      startLocation: ALCOVE,
    });
    const watcher = await openWorldAs(browser, 'wire-parked-out', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(
        inside.page,
        'look',
        whereHeading(inside.page, ALCOVE_HEADING)
      );
      // The watcher can see one other person in the room to start with.
      const contents = watcher.page.getByRole('list', { name: 'contents' });
      await sendUntil(watcher.page, 'look', contents.getByRole('button').first());
      const before = await contents.getByRole('button').count();

      await runCommand(inside.page, 'go wardrobe');
      await expect(whereHeading(inside.page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // The alcove's population is UNCHANGED — the body did not leave.
      await runCommand(watcher.page, 'look');
      await expect(contents.getByRole('button')).toHaveCount(before);
    } finally {
      await inside.close();
      await watcher.close();
    }
  });

  test('eval inside a circle runs, quarantined', async ({ browser }) => {
    // `eval` is the sandbox's headline authoring surface and it was
    // dead engine-wide (the controller stamped its scratch through an
    // `ApiOnly`-gated setter). It also has to run QUARANTINED here —
    // your own `/home/<id>` is a wire jurisdiction — which means the
    // scratch is minted circle-scoped, so the mint, the lookup and the
    // run all have to happen inside the same root.
    //
    // `return` is deliberate: the interpreter has no implicit return,
    // so a bare expression evaluates to `undefined`. That is the
    // shipped contract, not a bug — asserting on it here keeps the
    // idiom honest.
    const { page, close } = await openWorldAs(browser, 'wire-eval', {
      startLocation: ALCOVE,
      wizard: true,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      await sendUntil(page, 'eval return 6*7', page.getByText(/: 42\b/).first());

      // Twice in a row: the second `eval` destructs the first scratch,
      // which is now circle-scoped — the case that used to die on the
      // boundary because the mint had happened outside the root.
      await sendUntil(page, 'eval return 8*8', page.getByText(/: 64\b/).first());
      await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('a wizard cannot walk a real body into a circle with goto', async ({
    browser,
  }) => {
    const { page, close } = await openWorldAs(browser, 'wire-goto', {
      startLocation: ALCOVE,
      wizard: true,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      // Even with code trust, direct placement into a circle is refused:
      // the wire-body model IS the containment, and the boundary denies
      // the move. The prose points at the door.
      await runCommand(page, 'goto /home');
      await expect(whereHeading(page, ALCOVE_HEADING)).toBeVisible();
    } finally {
      await close();
    }
  });
});
