/**
 * The dying arc, driven end-to-end through the client: open the dying
 * window, run the clock out, become a shade, act as one, and come back
 * through `passage`.
 *
 * This spec exists because the arc's parts were each unit-tested and the
 * whole had never once run. Its assertions are therefore deliberately
 * about STATE, not about the client still rendering: an earlier draft
 * "passed" while both of its `eval`s were being refused by the sandbox
 * boundary, because all it checked was that a screenshot came out and
 * the command input was still visible. Every step here asserts the
 * transition it claims — and asserts that the eval that drives it was
 * not denied.
 */

import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil, commandInput } from './helpers';

/** A room with a stable path, so the jurisdiction is deterministic. */
const START = '/world/lounge/bar';
const PARCEL = '/world/lounge';

/** Anything that means "the eval never ran". */
const DENIED = /sandbox boundary denied|hold no authority|no targets matched/i;

test.describe('mortality — the dying arc', () => {
  // The arc spans a real dying clock plus two polled transitions; the
  // suite default (30s) is for single-command specs.
  test.setTimeout(240_000);

  test('die, become a shade, act as one, and come back', async ({
    browser,
  }) => {
    const { page, close } = await openWorldAs(browser, 'mortal', {
      startLocation: START,
      wizard: true,
    });
    try {
      // ---- alive ----------------------------------------------------
      await sendUntil(page, 'look', page.getByText(/bar/i).first());

      // ---- the dying window opens ------------------------------------
      // A generous window (game-seconds; the clock runs 12x) so the
      // dying state is observable before the clock takes it.
      await runCommand(
        page,
        `eval --parcel ${PARCEL} this.beginDying("exsanguination", 240)`,
      );
      // The eval must have LANDED. This is the assertion the false-green
      // draft was missing.
      await expect(page.getByText(DENIED)).toHaveCount(0);

      // `assess` must now say so — the state actually changed.
      await sendUntil(page, 'assess', page.getByText(/are dying/i).first());
      await expect(page.getByText(/exsanguination/i).first()).toBeVisible();

      // ---- the clock runs out ----------------------------------------
      // Reconcile-on-read: the window only expires when something reads
      // the body, so drive reads until the transition lands.
      //
      // The probe is `get`, not `assess`. `assess` reports the same
      // "unhurt" for a shade as for a healthy body (a shade's vitals are
      // a clean baseline), so it cannot tell the two apart — an earlier
      // draft polled it and would have hung forever on a WORKING arc.
      // `get` is `requiresEmbodied`, so its refusal is a direct read of
      // the thing under test: whether this player still has a body.
      await expect(async () => {
        await runCommand(page, 'assess');
        await runCommand(page, 'get all');
        await expect(
          page.getByText(/passes through/i).first(),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 90_000 });

      // ---- being a shade ---------------------------------------------
      // The platform half still works: a dead player is still a person.
      await sendUntil(page, 'say still here', page.getByText(/still here/i).first());

      // A shade can still walk the commons — movement is not embodied.
      await runCommand(page, 'look');
      await expect(commandInput(page)).toBeVisible();

      // ---- coming back ------------------------------------------------
      // How many times `get` has already reached its controller. The
      // death poll ran `get all` while still alive-but-dying, so that
      // line is ALREADY in the scrollback — an assertion that it is
      // merely present would pass without re-embodiment ever happening.
      // The transcript only grows, so the honest signal is a NEW one.
      const gotBefore = await page.getByText(/don't see any/i).count();

      await runCommand(page, 'passage');

      // Back in a body: the embodied surface returns, which is the
      // transition's whole point.
      //
      // A NEW "don't see any" means `get` reached its controller again —
      // the verb running and finding nothing, which `requiresEmbodied`
      // was refusing a moment ago. Two weaker probes were tried and
      // rejected: passage's own "you take a breath" line is printed
      // before this loop starts, and the ABSENCE of "passes through" is
      // unassertable because the shade's refusals stay up the transcript.
      await expect(async () => {
        await runCommand(page, 'get all');
        expect(
          await page.getByText(/don't see any/i).count(),
        ).toBeGreaterThan(gotBefore);
      }).toPass({ timeout: 30_000 });

      // The floor charged us something, and the player can SEE it. This
      // ran against `eval` until the sweep, because `assess` rendered only
      // the band, the dying readout and trauma wounds — so the price of
      // dying was invisible to the person who had just paid it. Asserting
      // the prose is the point: a resurrection service has nothing to
      // undercut if nobody can tell they were diminished.
      await sendUntil(page, 'assess', page.getByText(/recovering/i).first());
    } finally {
      await close();
    }
  });
});
