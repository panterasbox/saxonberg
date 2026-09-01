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
const LANE = '/world/terminus/hinkley-hills/lane';
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
