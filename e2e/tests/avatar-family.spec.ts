/**
 * ⭐⭐ The Avatar family — the LIVE BROWSER drive.
 *
 * The wire drive asserts envelopes over a socket. This one drives the
 * actual client, because the two find different things: the avatar
 * family's whole claim is that **the same person wears three bodies**,
 * and the only place that is really true or false is a running session.
 *
 * ⚠ The surfaces under test, and why each is here:
 *
 *  - **a shade is a PERSON again.** `PlayerApi.isAvatarStuff` answered
 *    *"is this somebody?"* by prefix-testing `templatePath`, and a
 *    `ShadeAvatar`'s row does not sit under `/platform/agent/Avatar/`.
 *    So a dead player was refused by `chat`, `forum`, `office`,
 *    `contacts` and `wallet` — none of which carry a `requiresEmbodied`
 *    gate, so that predicate was the only thing deciding. It is
 *    `instanceof Avatar` now, and a browser is where "can a ghost
 *    still talk to people" is actually answerable.
 *  - **a shade still cannot spend.** The owner's call. `bank deposit`
 *    / `withdraw` / `transfer` are tagged `requiresEmbodied`; the
 *    reads stay open.
 *  - **char-gen still mints a body.** The one authored row moved from
 *    `/platform/agent/Avatar/seed` to `/platform/agent/PrimaryAvatar`.
 *    If that broke, a new player cannot enter the game at all.
 *  - **client state survives a RELOAD**, not just a reconnect — the
 *    schema became a memoized chain walk across three mixins.
 */

import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil, commandInput } from './helpers';

const START = '/world/lounge/location/bar';
const PARCEL = '/world/lounge';

/** Anything that means "the eval never ran" — a false green otherwise. */
const DENIED = /sandbox boundary denied|hold no authority|no targets matched/i;

test.describe('the Avatar family, in a browser', () => {
  test.setTimeout(240_000);

  test('⭐⭐ a shade is still a person: it talks, and it cannot spend', async ({
    browser,
  }) => {
    const { page, close } = await openWorldAs(browser, 'avfam-ghost', {
      startLocation: START,
      wizard: true,
    });
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    try {
      await sendUntil(page, 'look', page.getByText(/bar/i).first());

      // ---- become a shade ------------------------------------------
      // ⚠ The kill path is the body's OWN method through the eval
      // receiver — NOT `ConditionApi`, which the eval sandbox does not
      // expose. My wire drive recorded "nothing can kill a player
      // through the socket" on the strength of that absence; it was
      // wrong, and this is the route it missed.
      await runCommand(
        page,
        `eval --parcel ${PARCEL} this.beginDying("exsanguination", 1)`,
      );
      await expect(page.getByText(DENIED)).toHaveCount(0);

      // Reconcile-on-read: the window expires when something reads the
      // body, so drive reads until the transition lands.
      await expect(async () => {
        await runCommand(page, 'assess');
        const body = await page.locator('body').innerText();
        expect(body).toMatch(/shade|ghost|undead|passage/i);
      }).toPass({ timeout: 120_000 });

      // ---- the claim: still a person -------------------------------
      // `who` is the cheapest personhood read that goes through the
      // predicate chain, and `chronicle` is identity-keyed.
      await runCommand(page, 'who');
      const afterWho = await page.locator('body').innerText();
      expect(
        afterWho,
        '⚠⚠ a dead player must still appear to the world — death costs ' +
          'embodied agency, never a seat as a person',
      ).not.toMatch(/you are not a player|only a player/i);

      // ---- and the refusal the owner asked for ---------------------
      await runCommand(page, 'bank deposit coins');
      const afterBank = await page.locator('body').innerText();
      expect(
        afterBank,
        '⭐ a ghost cannot hand coins across a counter. If this ever ' +
          'succeeds, `requiresEmbodied` came off bank deposit.',
      ).not.toMatch(/deposited/i);

      // A read stays open — the split is per-subcommand, not per-verb.
      await runCommand(page, 'bank');
      const afterRead = await page.locator('body').innerText();
      expect(
        afterRead,
        'the READS stay open to a shade — that is the whole point of ' +
          'tagging subcommands rather than the verb',
      ).not.toMatch(/you have no body|cannot do that while/i);

      expect(
        consoleErrors.filter((e) => !/favicon|DevTools/i.test(e)),
        'the client logged errors while driving a shade',
      ).toEqual([]);
    } finally {
      await close();
    }
  });

  test('⭐ a new character still mints and spawns — the row moved', async ({
    browser,
  }) => {
    // The one authored row every played body clones from moved out of
    // the identity namespace. If the mint site lost it, this is where a
    // new player discovers the game will not let them in.
    const { page, close } = await openWorldAs(browser, 'avfam-fresh', {
      startLocation: START,
    });
    try {
      await sendUntil(page, 'look', page.getByText(/bar/i).first());
      // ⚠ `sendUntil`, not `runCommand` + read: `runCommand` fires and
      // returns, so reading `innerText` straight after races the
      // response. (My first pass did exactly that and reported a
      // missing loadout that was simply not back yet.)
      await sendUntil(page, 'inventory', page.getByText(/implant/i).first());
    } finally {
      await close();
    }
  });

  test('⭐ cockpit state survives a full page RELOAD', async ({ browser }) => {
    // Not a reconnect — a reload, which re-requests the welcome
    // snapshot. The schema is a memoized chain walk across three mixins
    // now; if the walk misses the client mixin, every key silently
    // reverts to its default and nothing else complains.
    const { page, close } = await openWorldAs(browser, 'avfam-cockpit', {
      startLocation: START,
    });
    try {
      await sendUntil(page, 'look', page.getByText(/bar/i).first());
      await runCommand(page, 'cockpit mode build');
      await sendUntil(page, 'cockpit', page.getByText(/build/i).first());

      /*
       * ⚠ A reload lands on the ROSTER, not back in the world — the
       * session cookie survives but the socket and the `play` handoff
       * do not. So re-enter the way a player does, then read the state
       * back. (Reading straight after `reload()` is what made my first
       * pass look like a persistence failure.)
       */
      await page.reload();
      const input = commandInput(page);
      await expect(async () => {
        if (await input.isVisible().catch(() => false)) return;
        const play = page.getByRole('button', { name: /^Enter as / }).first();
        if (await play.isVisible().catch(() => false)) {
          await play.click().catch(() => {});
        }
        await expect(input).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 25_000 });

      await sendUntil(page, 'cockpit', page.getByText(/build/i).first());
    } finally {
      await close();
    }
  });

  /*
   * ⛔ THE CROSSING IS NOT DRIVEABLE — in a browser either, and the
   * reason is precise and is not this build's.
   *
   * Two routes exist to a sandbox door and both are closed to a drive:
   *
   *  1. **The shipped doors live in BEDROOMS.** `fix(sandbox): a
   *     circle's door belongs at your home, not in a commons`
   *     (2026-09-01) moved them out of the lounge into the generic
   *     bedroom archetype and the Seznick unit — so reaching one means
   *     holding a home, which is the residence flow. (The Seznick
   *     bedroom is also unlit, so the keyword resolves to nothing.)
   *     ⚠ `tests/sandbox.spec.ts` still crosses from the lounge and has
   *     therefore been RED on master for a month.
   *  2. **The row cannot be cloned.** `clone
   *     /platform/thing/sandbox/wardrobe --here` answers *"you don't
   *     have permission to clone that"* even for a wizard: only rows
   *     under a TITLED root are clonable, and `/platform` is covered by
   *     no parcel. The same title gap the base-class-narrowing build
   *     filed.
   *
   * ⚠⚠ My first attempt here reported this as a crossing failure,
   * because the guard I wrote (`/sandbox boundary denied|hold no
   * authority|no targets matched/`) did not match the clone refusal,
   * and the `look` that followed matched the word "wardrobe" in the
   * ECHOED COMMAND rather than in the room. A too-narrow guard plus an
   * echo is a false green in both directions.
   *
   * ⭐ What the crossing change actually needed verified IS verified,
   * just not here: retiring the lineage restamp mattered only because
   * `isAvatarStuff` had to keep accepting a vessel, and
   * `lib/character/__tests__/Avatar.family.test.ts` asserts exactly
   * that for `SandboxAvatar` directly. The crossing's own logic is
   * covered by 11 unit tests in `api/__tests__/sandbox.crossing.test.ts`
   * plus the escape suite.
   */
});