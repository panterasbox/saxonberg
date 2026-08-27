import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil, enterWorld } from './helpers';

/**
 * Sandbox (the holodeck) — the player-visible crossing, end to end
 * through the real client.
 *
 * Every test spawns in `/world/lounge/wire-alcove`: a singleton
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

const ALCOVE = '/world/lounge/wire-alcove';

/** The location pane's heading — where the player IS, right now. */
function whereHeading(page: import('@playwright/test').Page, name: RegExp) {
  return page.getByRole('heading', { name });
}
const ALCOVE_HEADING = /wire alcove/i;

/** The most recent `who` header count, or null if none is on screen. */
async function onlineCount(
  page: import('@playwright/test').Page
): Promise<number | null> {
  const text = await page.locator('body').innerText();
  const all = [...text.matchAll(/Online — (\d+)/g)];
  const last = all[all.length - 1];
  return last ? Number(last[1]) : null;
}
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
        'clone /platform/thing/sandbox/wardrobe --here',
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

  test('the rulebook is readable from inside a circle', async ({ browser }) => {
    // A sweep of the ordinary verb surface from inside, because the
    // ones that broke were not the exciting ones: `help` (the topic
    // index), `spells`, `recipes`, `studio`, `competence`,
    // `government`, `committee`. Each reads a seeded reference
    // catalogue — a field-resident singleton — so each simply died,
    // and a player standing in their own circle could not read the
    // rulebook.
    //
    // The assertion is deliberately blunt: run them and require that
    // NOTHING threw. A per-verb assertion on output would drift with
    // the content; "no controller blew up" is the invariant that
    // actually regressed.
    const { page, close } = await openWorldAs(browser, 'wire-rulebook', {
      startLocation: ALCOVE,
      wizard: true,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      for (const verb of [
        'help',
        'spells',
        'recipes',
        'studio',
        'competence',
        'government',
        'committee',
        'score',
        'chronicle',
        'standing',
      ]) {
        await runCommand(page, verb);
      }
      // Give the last one a beat to land, then assert on the whole
      // session's scrollback.
      await sendUntil(page, 'look', whereHeading(page, CIRCLE_HEADING));
      await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
      await expect(page.getByText(/sandbox boundary denied/i)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('a wardrobe inside a circle refuses, in prose', async ({ browser }) => {
    // Cloning a wardrobe inside your own circle and walking into it is
    // the obvious thing to try. The recursion has always been refused
    // — `SandboxApi.enter` guards it — but the guard THREW, so the
    // player met "Something went wrong in GoController" instead of a
    // closed door. A refusal is content, not a crash.
    const { page, close } = await openWorldAs(browser, 'wire-nested', {
      startLocation: ALCOVE,
      wizard: true,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));
      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      await sendUntil(
        page,
        'clone /platform/thing/sandbox/wardrobe --here',
        page.getByText(/cloned/i).first()
      );
      await runCommand(page, 'go wardrobe');

      // Still in the circle, and no stack trace reached the player.
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible();
      await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('you are still yourself after a round trip', async ({ browser }) => {
    // The vessel reports the REAL playerId (the identity thread), and
    // the registry that maps playerId → body deleted by id alone. So
    // every vessel reaped — on exit, on respawn, on session close —
    // evicted its player's actual body from the registry. After one
    // round trip you were gone from `who`, from presence, from `tell`'s
    // `online` scope; the next connection then found no live avatar,
    // materialized a SECOND one, and collided on the persistence spine.
    //
    // Two round trips, because the first exit is what breaks it and the
    // second proves it is not a one-shot.
    const traveller = await openWorldAs(browser, 'wire-round-a', {
      startLocation: ALCOVE,
    });
    const watcher = await openWorldAs(browser, 'wire-round-b', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(
        traveller.page,
        'look',
        whereHeading(traveller.page, ALCOVE_HEADING)
      );
      await sendUntil(
        watcher.page,
        'look',
        whereHeading(watcher.page, ALCOVE_HEADING)
      );

      // Baseline count, from the watcher's side.
      let before: number | null = null;
      await expect(async () => {
        await runCommand(watcher.page, 'who');
        before = await onlineCount(watcher.page);
        expect(before).not.toBeNull();
      }).toPass({ timeout: 20_000 });

      for (let trip = 0; trip < 2; trip++) {
        await runCommand(traveller.page, 'go wardrobe');
        await expect(
          whereHeading(traveller.page, CIRCLE_HEADING)
        ).toBeVisible({ timeout: 20_000 });
        await runCommand(traveller.page, 'go out');
        await expect(
          whereHeading(traveller.page, ALCOVE_HEADING)
        ).toBeVisible({ timeout: 20_000 });
      }

      // The roster COUNT must not drop. Asserted as a delta rather
      // than an absolute, because this room accumulates the bodies of
      // every other spec in the run (their sockets close, but the
      // avatars linger until the grace window and the residency sweep
      // reap them) — "exactly 2" was never going to hold.
      //
      // The regression is precisely a decrement: the traveller
      // unregistered themselves by walking home.
      await expect(async () => {
        await runCommand(watcher.page, 'who');
        const now = await onlineCount(watcher.page);
        expect(now).not.toBeNull();
        expect(now!).toBeGreaterThanOrEqual(before!);
      }).toPass({ timeout: 20_000 });
    } finally {
      await traveller.close();
      await watcher.close();
    }
  });

  test('your shell crosses with you', async ({ browser }) => {
    // The vessel is a baseline body, and "baseline" was taken too
    // literally: layout, theme, settings and aliases all live on the
    // avatar, none of them forked, so stepping into your own circle
    // handed you a stranger's defaults. The CMS "Test in holodeck"
    // button made it obvious — it crossed you correctly and dumped you
    // out of the builder layout you were working in.
    //
    // These are the player's SHELL: how they like to look at the game
    // and how they like to type. Not world state, and not a reason to
    // reset because you walked through a door. Fork-only — a
    // preference changed inside a circle still discards with it.
    const { page, close } = await openWorldAs(browser, 'wire-shell', {
      startLocation: ALCOVE,
    });
    try {
      await sendUntil(page, 'look', whereHeading(page, ALCOVE_HEADING));

      // A custom alias is the cheapest durable marker of "my shell".
      await sendUntil(
        page,
        'alias set zz look',
        page.getByText(/zz/).first()
      );

      await runCommand(page, 'go wardrobe');
      await expect(whereHeading(page, CIRCLE_HEADING)).toBeVisible({
        timeout: 20_000,
      });

      // It came with us: the alias resolves INSIDE the circle, which
      // it cannot do if the vessel got default aliases.
      await sendUntil(page, 'zz', whereHeading(page, CIRCLE_HEADING));
      await expect(page.getByText(/I don't understand 'zz'/i)).toHaveCount(0);
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
