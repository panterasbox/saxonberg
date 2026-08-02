import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil } from './helpers';

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
 */

const REGISTRY = '/domain/terminus/registry/office';
const LANE = '/domain/terminus/hinkley-hills/lane';

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

/** A lot nobody has taken — nothing must open onto it. */
const UNSOLD_LOT = 'lot-5';

test('the suburb is reachable and the lane describes the empty lots', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-reach', {
    startLocation: '/domain/terminus/hinkley-hills/arrival',
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
    startLocation: '/domain/terminus/terminal/departure-gate-a',
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
    // `domain/terminus/hinkley-hills/__tests__`.
    await expect(page.getByText(/raised garden bed/i).first()).toBeVisible();
    await expect(page.getByText(/standpipe/i).first()).toBeVisible();

    // So bring our own, the way the wizard brings the soil and the seed.
    await runCommand(page, 'clone /obj/vessel/watering-can');
    await runCommand(page, 'clone /obj/vessel/soil-sack');
    await runCommand(page, 'clone /obj/seed/carrot');
    await sendUntil(page, 'inventory', page.getByText(/carrot seed/i).first());

    await runCommand(page, 'pour sack into bed');
    await page.waitForTimeout(1500);

    // ⭐ NOT refused: residential ground admits a bed.
    await sendUntil(
      page,
      'plant seed in bed',
      page.getByText(/press the seed into the soil/i).first()
    );
    await expect(page.getByText(/zoned for/i)).toHaveCount(0);
    await expect(page.getByText(/Nothing may be grown/i)).toHaveCount(0);

    // ⭐ Water reaches the soil, through the standpipe and the can.
    await runCommand(page, 'fill can from standpipe');
    await page.waitForTimeout(1500);
    await sendUntil(
      page,
      'water bed',
      page.getByText(/tip the clear water into the soil/i).first()
    );

    // `feed` dispatches on the ground too (refusing for want of compost
    // is the right answer, not a parse failure).
    await runCommand(page, 'feed bed');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/I don't understand 'feed'/i)).toHaveCount(0);

    // …and the way back out is the lane.
    await runCommand(page, 'south');
    await page.waitForTimeout(2500);
    await sendUntil(page, 'look', page.getByText(/Hinkley Lane/i).first());
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
