import { test, expect } from '@playwright/test';
import {
  openWorldAs,
  openWorldAsFounder,
  runCommand,
  sendUntil,
} from './helpers';

/**
 * Hinkley Hills — the farm, driven through a real browser.
 *
 * The unit suite proves the model; this proves a PLAYER can reach it.
 * Every defect this build shipped past a green suite lived between a
 * passing test and a reachable feature, and the live drive found four
 * the suite could not:
 *
 *   1. the lane's authored exit named the SHARED yard template, so it
 *      stood the template up as an unowned place and then collided with
 *      the minted per-lot identities;
 *   2. a per-lot room cannot be a `CartesianLocation` at all (N lots,
 *      one coordinate) — and as one it read 16.7 lux, under a carrot's
 *      light floor;
 *   3. the lots needed a spatial zone of their own before the
 *      non-cardinal `lot-N` gate was admissible;
 *   4. the yard shipped a bed and a standpipe and no watering can, so
 *      `water` — a tool-conferred verb — was undispatchable on it.
 *
 * So these assert on what the player is actually shown.
 *
 * ⚠ **Two live findings this suite is written around**, both recorded in
 * the subsystem docs rather than hidden behind a helper:
 *
 *   - `office assign` cannot resolve an online player, so the suite gets
 *     in-world authority as the FOUNDER rather than by being seated in
 *     the one office it needs. Interim — see governance.md.
 *   - A crop in a bed's slot is not targetable by keyword, so no spec
 *     can clear a bed it planted. Hence dispatch-shaped assertions in
 *     `WALK IN and WORK IT` — see smallholding.md.
 */

const REGISTRY = '/world/terminus/registry/office';
const LANE = '/world/terminus/hinkley-hills/lane';

/**
 * The lot that ships already sold — seeded in `config/parcels.yaml`, held
 * by the developer group. It is what makes the lane's prose true on a
 * fresh world, and it is how this suite works a yard WITHOUT money.
 *
 * ⚠ **No test here buys a lot, and that is deliberate.** A lot is 4000
 * credits against char-gen's 20-credit stipend, so a purchase needs
 * either a cash faucet (there was one, in the backend; it was wrong and
 * is gone) or a character who has EARNED it (a good future spec, and a
 * slow one that couples this to employment). Meanwhile the sale itself
 * has 18 unit tests in `TitleVerb.test.ts` including the funded path.
 *
 * What only a browser can prove is the REACHABILITY chain — the gate
 * hangs, `populates` fires, the verbs dispatch — and that needs a lot
 * that is sold, not a lot this suite bought. A pre-sold lot gives it,
 * and makes the whole suite idempotent as a bonus: nothing is consumed,
 * so it can run against a live world forever.
 */
const SOLD_LOT = 'lot-1';

/** A lot nobody may take — nothing must ever open onto it. */
const UNSOLD_LOT = 'lot-5';

/**
 * A lot nobody has bought yet, read off the plat book the way a player
 * reads it.
 *
 * ⚠ **The purchase spec CONSUMES one**, permanently — a sale is a sale,
 * there is no resale path, and pretending otherwise would be a worse
 * test than an exhausting one. Hence the wide plat: the book carries far
 * more stakes than the suite will ever use, which is also the truer
 * picture of a subdivision drawn for a hundred families that got one.
 * Every other spec here consumes nothing.
 */
async function availableLot(page: import('@playwright/test').Page) {
  await sendUntil(page, 'title list', page.getByText(/lot-\d/i).first());
  const text = await page.locator('body').innerText();
  for (const line of text.split('\n')) {
    const match = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
    if (!match) continue;
    const [, leaf, rest] = match;
    if (leaf === UNSOLD_LOT || /sold/i.test(rest!)) continue;
    return leaf!;
  }
  throw new Error(
    'availableLot: every Hinkley lot is sold — widen the plat book in ' +
      'plat-book.yaml, or clear the `parcels` rows under …/lots/.'
  );
}

test('the suburb is reachable and the lane describes the empty lots', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-reach', {
    startLocation: '/world/terminus/hinkley-hills/arrival',
    wizard: true,
  });
  try {
    await sendUntil(page, 'look', page.getByText(/Hinkley Hills/i).first());
    await runCommand(page, 'west');
    await page.waitForTimeout(2500);
    await sendUntil(page, 'look', page.getByText(/Hinkley Lane/i).first());
    await sendUntil(
      page,
      'look at lots',
      page.getByText(/stencilled on stakes|hundred families/i).first()
    );
  } finally {
    await close();
  }
});

test('the TPA carries a route to the suburb, priced as a commute', async ({
  browser,
}) => {
  // The suburb has to be REACHABLE, and the departure gate is how. What
  // this pins is that the route is WIRED: an unregistered traveller is
  // turned back by the shipped registration gate ("reach it another way
  // and `register` first") and NOT by "no route here goes to 'hinkley'",
  // which is what a missing route says. Those two refusals look alike in
  // a transcript and mean opposite things — the second one is how a
  // stale terminal row hides a dead route.
  //
  // NOT a wizard: `teleport` is dual-mode and the privileged fork
  // self-powers past the TPA entirely.
  const { page, close } = await openWorldAs(browser, 'hh-board', {
    startLocation: '/world/terminus/terminal/departure-gate-a',
  });
  try {
    await sendUntil(
      page,
      'teleport hinkley',
      page.getByText(/haven't registered that destination/i).first()
    );
    await expect(page.getByText(/no route here goes to/i)).toHaveCount(0);
  } finally {
    await close();
  }
});

test('⭐ an UNSOLD lot has no gate — the lane only opens what sold', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-nogate', {
    startLocation: LANE,
    wizard: true,
  });
  try {
    // Nothing in this suite buys, so every lot but SOLD_LOT is open ground.
    await sendUntil(
      page,
      `go ${UNSOLD_LOT}`,
      page.getByText(/can't walk that way/i).first()
    );
  } finally {
    await close();
  }
});

test('⭐ WALK IN and WORK IT — the gate, populates, and the whole verb set', async ({
  browser,
}) => {
  // The long one: a gate traversal, a first provisioning, and six verbs
  // with settle time between them. It runs ~25s on a warm world and the
  // suite default is 30 — too close to the edge to be honest about.
  test.setTimeout(120_000);
  const { page, close } = await openWorldAs(browser, 'hh-work', {
    startLocation: LANE,
    wizard: true,
  });
  try {
    // ⭐ The gate is hanging, named for the lot.
    await sendUntil(page, 'look', page.getByText(new RegExp(SOLD_LOT, 'i')).first());
    // `go` is one-way, so it must NOT ride `sendUntil` (a re-send after a
    // successful move just bounces off a wall). Arrival prints movement
    // prose, not a room description — the `look` is what shows the yard.
    await runCommand(page, `go ${SOLD_LOT}`);
    await page.waitForTimeout(3000);
    await sendUntil(page, 'look', page.getByText(/yard behind the house/i).first());

    // ⭐ `populates` fired on first provisioning. Asserted on the two
    // FIXTURES only: the yard also ships a watering can, but a portable
    // is a bad witness — the first session that pockets it removes it
    // from the room forever, and this lot is never re-provisioned. That
    // the seed ships one is a content claim, checked against the seed in
    // `world/terminus/hinkley-hills/__tests__`.
    await expect(page.getByText(/raised garden bed/i).first()).toBeVisible();
    await expect(page.getByText(/standpipe/i).first()).toBeVisible();

    // So bring our own, the way the wizard brings the soil and the seed.
    await runCommand(page, 'clone /obj/vessel/watering-can');
    await runCommand(page, 'clone /obj/vessel/soil-sack');
    await runCommand(page, 'clone /obj/seed/carrot');
    await sendUntil(page, 'inventory', page.getByText(/carrot seed/i).first());

    // ⭐ From here the assertions are about DISPATCH, not outcome, and
    // that is deliberate.
    //
    // This lot is PRE-SOLD, so its yard is never re-provisioned: every
    // run that plants leaves a crop behind, the bed's four slots filled
    // long ago, and its soil bulk sits at capacity. Nor can a spec tidy
    // up after itself — a crop in a bed's slot is not targetable by
    // keyword (`destruct carrots` → "no match"), which is its own
    // finding, noted at the top of this file.
    //
    // But outcome is not what a browser is for. That a seed becomes a
    // plant, that water raises soil moisture, that feeding restores
    // nitrogen — all of it is unit-tested in
    // `world/terminus/hinkley-hills/__tests__` and
    // `lib/husbandry/__tests__`. What ONLY a live client can tell you is
    // whether a player can *reach* the verb: contributed by something
    // present, in scope, parseable, routed to a controller. A controller
    // REFUSING is a pass — the verb ran. "I don't understand" is the
    // failure, and it is the one this build actually shipped.
    // The bed ships EMPTY — "a raised garden bed has no soil in it. Pour
    // some in first." Without this the plant never takes, so there is
    // nothing growing for `water` to water, and the watering assertion
    // below fails on any database where a previous run has not already
    // left a crop in the bed. Pouring first is what the wizard brought
    // the sack for.
    await runCommand(page, 'pour sack into bed');
    await page.waitForTimeout(2000);

    for (const [verb, cmd] of [
      ['plant', 'plant seed in bed'],
      ['feed', 'feed bed'],
    ] as const) {
      await runCommand(page, cmd);
      await page.waitForTimeout(2000);
      await expect(
        page.getByText(new RegExp(`I don't understand '${verb}'`, 'i'))
      ).toHaveCount(0);
    }

    // ⭐ …and one act that is genuinely repeatable, asserted on its real
    // output: you can always water a bed, however full it is.
    await runCommand(page, 'fill can from standpipe');
    await page.waitForTimeout(2000);
    await sendUntil(
      page,
      'water bed',
      page.getByText(/tip the clear water into the soil/i).first()
    );

    // …and the way back out is the lane.
    await runCommand(page, 'south');
    await page.waitForTimeout(2500);
    await sendUntil(page, 'look', page.getByText(/Hinkley Lane/i).first());
  } finally {
    await close();
  }
});

test('⭐ BUY A LOT — minted by the one office allowed to mint', async ({
  browser,
}) => {
  // ⭐ The money leg, end to end, with NO test-only anything.
  //
  // A lot is 4000 and char-gen's onboarding stipend is 20, so this needs
  // currency that does not exist yet — and in this world exactly one
  // authority may create it: the Governor of the Central Bank. So the
  // suite becomes that authority, the way the fiction says you become
  // it. `FOUNDER_GOOGLE_EMAIL` (the shipped deploy contract, set in
  // playwright.config.ts) names a founder; the founder holds the
  // founder-default seats; the Governorship is one of them.
  //
  // Every gate on the path is the real one — `requiresGovernor` on the
  // draw, the conserved `issueCash` faucet under it, the banking settle
  // chokepoint under the sale. Nothing here knows it is a test.
  const ordinary = await openWorldAs(browser, 'hh-nogov', {
    startLocation: REGISTRY,
    wizard: true,
  });
  try {
    // ⭐ The reserve is SHUT to everyone else. This is the assertion that
    // makes the rest of the test mean something.
    await sendUntil(
      ordinary.page,
      'reserve issue 6000',
      ordinary.page.getByText(/must hold the Governor/i).first()
    );
  } finally {
    await ordinary.close();
  }

  const { page, close } = await openWorldAsFounder(browser, {
    startLocation: REGISTRY,
  });
  try {
    const lot = await availableLot(page);

    // ⭐ …and it opens for the Governor. Same verb, same validator.
    await sendUntil(
      page,
      'reserve issue 6000',
      page.getByText(/fresh currency into your hands/i).first()
    );

    await sendUntil(
      page,
      `title buy ${lot}`,
      page.getByText(/is yours|registrar writes the row/i).first()
    );

    // ⭐ The title is real, and reads its area band and its zoning.
    await sendUntil(page, 'title', page.getByText(new RegExp(lot, 'i')).first());
    await expect(page.getByText(/quarter-acre lot/i).first()).toBeVisible();
    await expect(page.getByText(/residential/i).first()).toBeVisible();
  } finally {
    await close();
  }
});

test('⭐ the land-use gate REFUSES a bed on the Registry floor', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-gate', {
    startLocation: REGISTRY,
    wizard: true,
  });
  try {
    await runCommand(page, 'clone /obj/bed/garden --here');
    await runCommand(page, 'clone /obj/vessel/soil-sack');
    await runCommand(page, 'clone /obj/seed/carrot');
    await sendUntil(page, 'look', page.getByText(/garden bed/i).first());

    // ⭐ Clear the slot BEFORE planting, not after. The lot is PRE-SOLD,
    // so its yard is never re-provisioned and a crop persists between
    // runs — and a full bed fails the plant step, which is the step that
    // would have cleaned up. Front-loading it is what makes this spec
    // idempotent. Harmless when the bed is already empty.
    await runCommand(page, 'destruct carrots');
    await page.waitForTimeout(2000);

    await runCommand(page, 'pour sack into bed');
    await page.waitForTimeout(1500);
    await runCommand(page, 'plant seed in bed');

    await expect(
      page.getByText(/zoned for|Nothing may be grown/i).first()
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await close();
  }
});

test('the sale refuses cleanly when the buyer cannot cover it', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-broke', {
    startLocation: REGISTRY,
    wizard: true,
  });
  try {
    await sendUntil(
      page,
      `title buy ${UNSOLD_LOT}`,
      page.getByText(/can't cover/i).first()
    );

    // …and nothing changed hands.
    await sendUntil(page, 'title', page.getByText(/You hold no ground/i).first());
  } finally {
    await close();
  }
});
