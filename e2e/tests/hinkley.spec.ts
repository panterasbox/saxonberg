import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil } from './helpers';

/**
 * Hinkley Hills — the farm, driven through a real browser.
 *
 * The unit suite proves the model; this proves a PLAYER can reach it.
 * Build-3's three questions, asked live:
 *
 *   1. **Is the class composed?** — the yard is a `TitledRoom`, so its
 *      `populates:` must actually lay the bed and standpipe down.
 *   2. **Is the verb contributed?** — `title`, `plant`, `water`, `feed`
 *      and `harvest` must be dispatchable by typing them, not just
 *      callable from a controller test.
 *   3. **Is the content in the world?** — the Locality, the lane, the
 *      yard and the crop templates must have survived seeding.
 *
 * Every defect this build shipped past a green suite lived between a
 * passing test and a reachable feature, so these assert on what the
 * player is actually shown.
 */

const REGISTRY = '/domain/terminus/registry/office';
const YARD = '/domain/terminus/hinkley-hills/yard';

test('the suburb is reachable and the lane describes the empty lots', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-reach', {
    startLocation: '/domain/terminus/hinkley-hills/arrival',
    wizard: true,
  });
  try {
    // Q3: is the content in the world at all?
    await sendUntil(
      page,
      'look',
      page.getByText(/Hinkley Hills/i).first()
    );
    // The lane, and the unbuilt lots as prose rather than empty rooms.
    await sendUntil(page, 'west', page.getByText(/Hinkley Lane/i).first());
    await sendUntil(
      page,
      'look at lots',
      page.getByText(/stencilled on stakes|hundred families/i).first()
    );
  } finally {
    await close();
  }
});

test('⭐ BUY A LOT and walk into the yard — populates is not inert', async ({
  browser,
}) => {
  // The whole chain, live: pay → subdivide → transfer → provision → walk
  // in. Q1 is the payoff — the yard's `populates:` only fires through
  // `seedBornWith` on a FIRST provisioning, so a bed in the room proves
  // the class is composed AND the keyed-holder branch ran.
  const { page, close } = await openWorldAs(browser, 'hh-buy', {
    startLocation: REGISTRY,
    wizard: true,
    fundsMinor: 8000,
  });
  try {
    await sendUntil(page, 'title list', page.getByText(/lot-1/i).first());

    await runCommand(page, 'title buy lot 1');
    await expect(
      page.getByText(/is yours|registrar writes the row/i).first()
    ).toBeVisible({ timeout: 20_000 });

    // ⭐ The title is real.
    await sendUntil(page, 'title', page.getByText(/lot-1/i).first());
    await expect(page.getByText(/residential/i).first()).toBeVisible();

    // The room was minted at the LOT's own identity path.
    await sendUntil(
      page,
      'goto /domain/terminus/hinkley-hills/lot-1/yard',
      page.getByText(/yard behind the house/i).first()
    );

    // ⭐ populates fired: the bed and the standpipe are there.
    await expect(page.getByText(/raised garden bed/i).first()).toBeVisible();
    await expect(page.getByText(/standpipe/i).first()).toBeVisible();
  } finally {
    await close();
  }
});

test('⭐ plant a crop on ground you own — the gate PERMITS residential', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'hh-plant', {
    startLocation: REGISTRY,
    wizard: true,
    fundsMinor: 8000,
  });
  try {
    await sendUntil(page, 'title list', page.getByText(/lot-2/i).first());
    await runCommand(page, 'title buy lot 2');
    await expect(
      page.getByText(/is yours|registrar writes the row/i).first()
    ).toBeVisible({ timeout: 20_000 });

    await sendUntil(
      page,
      'goto /domain/terminus/hinkley-hills/lot-2/yard',
      page.getByText(/yard behind the house/i).first()
    );

    // Q2: the cultivation verbs are afforded by the ground.
    await runCommand(page, 'clone /obj/vessel/soil-sack');
    await runCommand(page, 'clone /obj/seed/carrot');
    await sendUntil(page, 'inventory', page.getByText(/carrot seed/i).first());

    await runCommand(page, 'pour sack into bed');
    await page.waitForTimeout(1500);
    await runCommand(page, 'plant seed in bed');
    await page.waitForTimeout(2500);

    // ⭐ NOT refused: residential ground admits a bed.
    await expect(page.getByText(/zoned for/i)).toHaveCount(0);
    await expect(page.getByText(/Nothing may be grown/i)).toHaveCount(0);
    await expect(
      page.getByText(/I don't understand 'plant'/i)
    ).toHaveCount(0);

    // …and the crop is in the ground.
    await sendUntil(page, 'look', page.getByText(/carrot/i).first());

    // `feed` dispatches on the ground too.
    await runCommand(page, 'feed bed');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/I don't understand 'feed'/i)).toHaveCount(0);
  } finally {
    await close();
  }
});

test('⭐ the land-use gate REFUSES a bed on the Registry floor', async ({
  browser,
}) => {
  // The gate biting, live: civic ground admits no cultivation, and the
  // refusal names the use rather than saying "no".
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
  // A fresh character has no money, so this is the reachable path today.
  // It proves the whole chain up to the money leg: parse → resolve the
  // plat book → price it → refuse without minting a parcel row.
  const { page, close } = await openWorldAs(browser, 'hh-broke', {
    startLocation: REGISTRY,
    wizard: true,
  });
  try {
    await sendUntil(page, 'title list', page.getByText(/lot-1/i).first());
    await runCommand(page, 'title buy lot 1');
    await expect(
      page.getByText(/can't cover/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // …and nothing changed hands.
    await sendUntil(
      page,
      'title',
      page.getByText(/You hold no ground/i).first()
    );
  } finally {
    await close();
  }
});
