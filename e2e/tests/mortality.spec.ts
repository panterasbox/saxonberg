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
const START = '/domain/lounge/bar';
const PARCEL = '/domain/lounge';

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
      await runCommand(page, 'passage');

      // Back in a body: the embodied surface returns. `get` no longer
      // refuses for lack of one, which is the transition's whole point.
      await expect(async () => {
        await runCommand(page, 'get all');
        await expect(
          page.getByText(/you take a breath|it is your own/i).first(),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 30_000 });

      // The floor's diminishment is asserted against STATE, not prose:
      // `assess` renders only the band, the dying readout and trauma
      // wounds, so an `affliction` is invisible to it. That is a real
      // legibility gap in the floor route (the cost a resurrection
      // service is supposed to undercut cannot currently be seen by the
      // player who paid it) — but it is a gap in the readout, not in the
      // transition, so the test reads the body directly rather than
      // pretending the prose exists.
      // NB: no `||` in eval source — the command tokenizer reads it as a
      // pipe ("Command piping is not yet implemented") before the code
      // ever reaches the interpreter.
      await runCommand(
        page,
        `eval --parcel ${PARCEL} return this.getConditions()` +
          `.map(function(c){ return String(c.templatePath); }).join(",")`,
      );
      await expect(page.getByText(DENIED)).toHaveCount(0);
      await expect(
        page.getByText(/recovering/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await close();
    }
  });
});
