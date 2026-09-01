import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import {
  openWorldAs,
  openWorldAsFounder,
  runCommand,
  sendUntil,
} from './helpers';

/**
 * Residences — the Hinkley loop, driven through a real browser
 * (residences wave 5, checkpoint 1; grows through wave 11).
 *
 * The acceptance walk: fund (Governor) → `title buy` a FRESH lot → key
 * in hand → walk the gate → a stranger is refused at the DOOR, not the
 * gate → the owner enters → the house is real rooms furnished from
 * archetype rows → log out in the yard → **restart the server** → log
 * back into the SAME yard, the house intact ((scope, key) re-entry).
 *
 * The restart half runs only under `RESIDENCES_RESTART=1` — drive
 * order: run this spec plain (part A buys + walks + logs out in the
 * yard), restart the server, then run with the flag (part B re-enters).
 * The lot part A bought is handed to part B via `.auth/residences-lot`.
 */

const REGISTRY = '/world/terminus/registry/office';
const LANE = '/world/terminus/hinkley-hills/location/lane';
const LOT_FILE = '.auth/residences-lot';

/** A lot nobody has bought yet, read off the generative plat window. */
async function availableLot(page: import('@playwright/test').Page) {
  await sendUntil(page, 'title list', page.getByText(/lot-\d/i).first());
  const text = await page.locator('body').innerText();
  for (const line of text.split('\n')) {
    const match = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
    if (!match) continue;
    const [, leaf, rest] = match;
    if (/sold/i.test(rest!)) continue;
    return leaf!;
  }
  throw new Error('availableLot: nothing on offer — is the cap reached?');
}

const restartHalf = process.env.RESIDENCES_RESTART === '1';

test.describe.serial('the Hinkley loop', () => {
  test.skip(restartHalf, 'part A ran before the restart');

  test('⭐ BUY a fresh lot; the key lands in hand', async ({ browser }) => {
    test.setTimeout(120_000);
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: REGISTRY,
    });
    try {
      await sendUntil(
        page,
        'reserve issue 6000',
        page.getByText(/fresh currency into your hands/i).first(),
      );
      const lot = await availableLot(page);
      writeFileSync(LOT_FILE, lot);
      await sendUntil(
        page,
        `title buy ${lot}`,
        page.getByText(/is yours|registrar writes the row/i).first(),
      );
      // D7: the sale hands over the key — a physical brass key in hand.
      await sendUntil(page, 'inventory', page.getByText(/brass key/i).first());
    } finally {
      await close();
    }
  });

  test('⭐ the OWNER walks the gate and the locked door opens for the key', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const lot = readFileSync(LOT_FILE, 'utf8').trim();
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: LANE,
    });
    try {
      // The gate hangs, named for the lot; the yard is behind it.
      await sendUntil(page, 'look', page.getByText(new RegExp(lot, 'i')).first());
      await runCommand(page, `go ${lot}`);
      await page.waitForTimeout(3000);
      await sendUntil(
        page,
        'look',
        page.getByText(/yard behind the house/i).first(),
      );

      // ⭐ Through the locked kitchen door — the buyer's key opens it.
      await runCommand(page, 'north');
      await page.waitForTimeout(2500);
      await sendUntil(page, 'look', page.getByText(/short square hall/i).first());

      // The rooms are REAL, furnished from the archetype rows.
      await runCommand(page, 'east');
      await page.waitForTimeout(2000);
      await sendUntil(page, 'look', page.getByText(/farmhouse kitchen/i).first());
      await expect(page.getByText(/range/i).first()).toBeVisible();
      await runCommand(page, 'west');
      await page.waitForTimeout(2000);
      await runCommand(page, 'north');
      await page.waitForTimeout(2000);
      await sendUntil(page, 'look', page.getByText(/bed against the far wall/i).first());
      await runCommand(page, 'east');
      await page.waitForTimeout(2000);
      await sendUntil(page, 'look', page.getByText(/bathroom/i).first());

      // …and back out to the yard, where we LOG OUT (part B re-enters
      // exactly here — the (scope, key) placement acceptance).
      await runCommand(page, 'west');
      await page.waitForTimeout(1500);
      await runCommand(page, 'south'); // bedroom → hall
      await page.waitForTimeout(1500);
      await runCommand(page, 'south'); // hall → yard (the free way out)
      await page.waitForTimeout(1500);
      await sendUntil(page, 'look', page.getByText(/yard behind the house/i).first());
    } finally {
      await close();
    }
  });

  test('⭐ a STRANGER passes the gate but is refused at the door', async ({
    browser,
  }) => {
    const lot = readFileSync(LOT_FILE, 'utf8').trim();
    const { page, close } = await openWorldAs(browser, 'res-stranger', {
      startLocation: LANE,
    });
    try {
      // The fence is fiction — the gate admits anyone…
      await runCommand(page, `go ${lot}`);
      await page.waitForTimeout(3000);
      await sendUntil(
        page,
        'look',
        page.getByText(/yard behind the house/i).first(),
      );
      // …the HOUSE is locked, and their key does not exist.
      await sendUntil(
        page,
        'north',
        page.getByText(/key doesn't fit|door is locked/i).first(),
      );
    } finally {
      await close();
    }
  });
});

test.describe('after the restart', () => {
  test.skip(!restartHalf, 'run with RESIDENCES_RESTART=1 after restarting the server');

  test('⭐ the SAME yard, the house intact — (scope, key) re-entry', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { page, close } = await openWorldAsFounder(browser, {});
    try {
      // No startLocation: the login restores the captured placement —
      // the exact keyed yard we logged out in, stood back up through
      // the institution's admit.
      await sendUntil(
        page,
        'look',
        page.getByText(/yard behind the house/i).first(),
      );
      // The house behind the door survived the restart, fixtures and all.
      await runCommand(page, 'north');
      await page.waitForTimeout(2500);
      await sendUntil(page, 'look', page.getByText(/short square hall/i).first());
      await runCommand(page, 'east');
      await page.waitForTimeout(2000);
      await sendUntil(page, 'look', page.getByText(/farmhouse kitchen/i).first());
      await expect(page.getByText(/range/i).first()).toBeVisible();
    } finally {
      await close();
    }
  });
});

/**
 * ─────────────────────────────────────────────────────────────────
 * Wave 11 — the rest of the ladder, driven.
 *
 * The dorm was already driven (checkpoint 1's dorm smoke); the Hinkley
 * loop is above. What follows is the middle rung (a let unit at Seznick
 * House), the office that fronts every plat book, the operator's
 * capacity dial, and the two reads a home answers.
 *
 * ⚠ **What is deliberately NOT driven here, and why.** The realtor's
 * purchase runs through a `PromptApi.choice` → `confirm` wheel on the
 * BUYER's client. There is no prompt-wheel driver in this harness yet,
 * and inventing one blind would prove the driver rather than the
 * feature — so the wheel is pinned by nine unit cases beside `Realtor`
 * (the actor and the exact command line among them), and what runs here
 * is everything around it: the office is reachable, Ricky opens, and the
 * DESK transacts, which is the venue predicate D14 actually turns on.
 */

const MAYFIELD = '/world/terminus/mayfield-row/street';
const LOBBY = '/world/terminus/mayfield-row/seznick-house/lobby';
const STORE = '/world/terminus/general-store/shop-floor';

test.describe.serial('the apartment loop', () => {
  test.skip(restartHalf, 'part A ran before the restart');

  test('⭐ Walter lets a room: the key, and a unit that is EMPTY', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: LOBBY,
    });
    try {
      // The manager is at his board, and he opens (the player's path to
      // the lease; the raw verb below is the operator surface).
      await sendUntil(page, 'talk walter', page.getByText(/Seznick House/i).first());

      await sendUntil(
        page,
        'lease founder',
        page.getByText(/key|let|unit/i).first(),
      );
      await sendUntil(page, 'inventory', page.getByText(/key/i).first());

      // Up the stair and through the door the key fits.
      await runCommand(page, 'up');
      await page.waitForTimeout(2500);
      await runCommand(page, 'unit-1');
      await page.waitForTimeout(2500);
      await sendUntil(page, 'look', page.getByText(/hall|entry/i).first());

      // ⭐ EMPTY at move-in: built-ins only. The whole build is about
      // what you put in it, so an "unfurnished" that arrives furnished
      // would be the wrong first impression.
      await expect(page.getByText(/armchair|wardrobe|bedstead/i)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test('⭐ buy a sconce, HANG it, and it is on the wall', async ({ browser }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: STORE,
    });
    try {
      await sendUntil(
        page,
        'reserve issue 400',
        page.getByText(/fresh currency into your hands/i).first(),
      );
      await sendUntil(page, 'buy sconce', page.getByText(/sconce/i).first());
      await sendUntil(page, 'inventory', page.getByText(/sconce/i).first());

      // The verb is conferred by the thing in your hands (D11).
      await sendUntil(page, 'hang sconce', page.getByText(/on the wall/i).first());
      // It left the floor and joined the room.
      await sendUntil(page, 'look', page.getByText(/sconce/i).first());
      // …and it comes back down into the same hands.
      await sendUntil(page, 'get sconce', page.getByText(/pick up/i).first());
    } finally {
      await close();
    }
  });
});

test.describe('the realty office', () => {
  test.skip(restartHalf, 'part A ran before the restart');

  test('⭐ the office fronts the plat books, and the DESK transacts', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: MAYFIELD,
    });
    try {
      // The street turns into the shopfront.
      await sendUntil(page, 'look', page.getByText(/MAYFIELD & CO/i).first());
      await runCommand(page, 'realty');
      await page.waitForTimeout(2500);
      await sendUntil(page, 'look', page.getByText(/land agents/i).first());

      // Ricky opens.
      await sendUntil(page, 'talk ricky', page.getByText(/Mayfield and Co/i).first());

      // ⭐ The venue predicate: `title` answers wherever a DEED DESK
      // stands. This is a second records counter and no code knows it.
      await sendUntil(page, 'title list', page.getByText(/lot-\d/i).first());

      // …and the whole transaction lands here, not only at the Registry.
      await sendUntil(
        page,
        'reserve issue 6000',
        page.getByText(/fresh currency into your hands/i).first(),
      );
      const lot = await availableLot(page);
      await sendUntil(
        page,
        `title buy ${lot}`,
        page.getByText(/is yours|registrar writes the row/i).first(),
      );
    } finally {
      await close();
    }
  });
});

test.describe('the reads a home answers', () => {
  test.skip(restartHalf, 'part A ran before the restart');

  test('⭐ `survey` names the archetypes, the shell and the term', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const lot = readFileSync(LOT_FILE, 'utf8').trim();
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: LANE,
    });
    try {
      await runCommand(page, `go ${lot}`);
      await page.waitForTimeout(3000);
      await runCommand(page, 'north');
      await page.waitForTimeout(2500);

      // The whole holding, not the one room — and in BANDS, never a
      // number (the D4 no-gauge rule, driven).
      await sendUntil(
        page,
        'survey',
        page.getByText(/take stock of the place as a whole/i).first(),
      );
      await expect(page.getByText(/a bedroom:/i).first()).toBeVisible();
      await expect(page.getByText(/The fabric of the place is sound/i).first())
        .toBeVisible();
      await expect(page.getByText(/Upkeep here is yours, all of it/i).first())
        .toBeVisible();
    } finally {
      await close();
    }
  });

  test('⭐ the kit confers `maintain`, and a sound house needs nothing', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const lot = readFileSync(LOT_FILE, 'utf8').trim();
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: STORE,
    });
    try {
      await sendUntil(
        page,
        'reserve issue 400',
        page.getByText(/fresh currency into your hands/i).first(),
      );
      await sendUntil(page, 'buy kit', page.getByText(/kit/i).first());
      await sendUntil(page, 'inventory', page.getByText(/kit/i).first());
    } finally {
      await close();
    }

    // …and with the kit in hand the verb runs at the house. A sound
    // shell declines and SPARES the kit — the decline over elapsed game
    // time is pinned in the unit suite, where the clock can be moved.
    const owner = await openWorldAsFounder(browser, { startLocation: LANE });
    try {
      await runCommand(owner.page, `go ${lot}`);
      await owner.page.waitForTimeout(3000);
      await runCommand(owner.page, 'north');
      await owner.page.waitForTimeout(2500);
      await sendUntil(
        owner.page,
        'maintain',
        owner.page.getByText(/nothing that needs doing/i).first(),
      );
    } finally {
      await owner.close();
    }
  });
});

test.describe('the operator dial', () => {
  test.skip(restartHalf, 'part A ran before the restart');

  test('⭐ refuse at cap → raise the dial → the same buy is admitted', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const { page, close } = await openWorldAsFounder(browser, {
      startLocation: REGISTRY,
    });
    try {
      await sendUntil(
        page,
        'reserve issue 6000',
        page.getByText(/fresh currency into your hands/i).first(),
      );
      // Squeeze the plat to nothing: the next lot is now beyond the cap
      // and the book stops offering it — the refusal names the reason.
      await sendUntil(page, 'config set hinkley-hills.lotCap 1', page.getByText(/lotCap/i).first());
      await sendUntil(
        page,
        'title buy lot-40',
        page.getByText(/No such lot/i).first(),
      );

      // Raise it and the same line lands. Nothing was rebuilt; a
      // runtime dial is the whole mechanism (D10).
      await sendUntil(page, 'config set hinkley-hills.lotCap 60', page.getByText(/lotCap/i).first());
      await sendUntil(
        page,
        'title buy lot-40',
        page.getByText(/is yours|registrar writes the row/i).first(),
      );
    } finally {
      await close();
    }
  });
});
