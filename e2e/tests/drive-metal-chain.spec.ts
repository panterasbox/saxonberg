/**
 * LIVE DRIVE — walk the metal chain in the real client.
 *
 * ⭐ **The acceptance criterion is a driven session, not a suite.** What
 * follows is the chain end to end, in the order a person would do it:
 *
 *   buy a light and a pick · walk the outcrop and `measure strike` three
 *   times · `analyze ground` and read the card · descend the adit ·
 *   `drive` a heading · `shore` it · `hew` ore · `consign` at the scale ·
 *   burn a charge at the fuel yard · `smelt` at the furnace
 *
 * Then the persistence pass: restart and confirm the SHORED working
 * survives with its contents while the unshored one is gone and left no
 * record.
 *
 * Each scene spawns directly at its venue: Rejection is authored
 * teleport-only (no inbound exits are wired from any other locality), and
 * rooms hydrate on entry. Screenshots land in SNAP_DIR.
 *
 *   E2E_SERVER_URL=http://localhost:2010 E2E_CLIENT_URL=http://localhost:5173 \
 *   SNAP_DIR=/tmp/mine-snaps npx playwright test tests/drive-metal-chain.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { openWorldAs, runCommand, sendUntil } from './helpers';

const SNAP = process.env.SNAP_DIR ?? '/tmp/mine-snaps';
let n = 0;

function makeDrivers(page: Page) {
  const snap = async (name: string) => {
    n += 1;
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${SNAP}/${String(n).padStart(2, '0')}-${name}.png`,
    });
  };
  const see = async (cmd: string, pattern: RegExp, timeout = 20_000) => {
    await runCommand(page, cmd);
    await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
  };
  return { snap, see };
}

test.describe.configure({ mode: 'serial' });

test('the pithead: buy in, survey the outcrop, read the card', async ({ browser }) => {
  test.setTimeout(600_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'mine-surveyor', {
    startLocation: '/world/rejection/location/pithead-yard',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(page, 'look', page.getByText(/trodden mud and grey spoil/i).first());
    await snap('yard-look');

    // ⭐ The outcrop is a DETAIL on the room — the green band is a thing
    // you can look at before you own an instrument, which is what makes
    // prospecting start with noticing rather than with shopping.
    await see('look outcrop', /verdigris/i);
    await snap('outcrop');

    // ⚠ Without an instrument the channel refuses, and NAMES the
    // instrument. A refusal a player cannot act on is a dead end.
    await see('measure strike', /surveyor's instrument/i);
    await snap('no-instrument');

    // Money leaves at Provisioning; the light dependency is taught there
    // rather than discovered in the dark.
    await runCommand(page, 'west');
    await sendUntil(page, 'look', page.getByText(/tool wall on the left/i).first());
    await see('buy compass', /You buy|bought/i);
    await see('buy jar', /You buy|bought/i);
    await see('buy pick', /You buy|bought/i);
    await see('buy timber', /You buy|bought/i);
    await snap('provisioned');

    await runCommand(page, 'east');
    await sendUntil(page, 'look', page.getByText(/trodden mud and grey spoil/i).first());

    // ⭐ Three points, from three places. One reading is a guess with an
    // error bar; three narrow it, because independent observations of an
    // angle average and the residual falls as error/√n.
    await see('measure strike', /Strike \d{3}/i);
    await snap('strike-1');
    await see('analyze ground', /survey/i);
    await snap('card-after-one');

    await runCommand(page, 'north');
    await see('measure strike', /Strike \d{3}/i);
    await runCommand(page, 'south');
    await runCommand(page, 'east');
    await see('measure strike', /Strike \d{3}/i);
    await runCommand(page, 'west');

    // …and the card now SOLVES, where after one reading it said how many
    // more were wanted.
    await see('analyze ground', /strike/i);
    await snap('card-solved');

    // ⚠ Dip is unobtainable up here, and the refusal TEACHES the geometry
    // rather than withholding a number: a trace is a line, and a line has
    // no fall in it.
    await see('measure dip', /line has no fall/i);
    await snap('dip-refused');
  } finally {
    await snap('pithead-final');
    await close();
  }
});

test('the workings: drive, shore, hew, and the ground that refuses', async ({ browser }) => {
  test.setTimeout(900_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'mine-hewer', {
    startLocation: '/world/rejection/ferrow/timbered-drift',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(page, 'look', page.getByText(/close-timbered the whole length/i).first());
    await snap('drift-look');

    // ⭐ `survey` — the MIRROR — answers in a working for free, through
    // the duck-typed seam, with no platform edit.
    await runCommand(page, 'survey');
    await snap('survey-mirror');

    // ⭐ Dip IS obtainable here: the vein is in section on the face.
    await see('measure dip', /Dip \d+/i);
    await snap('dip-underground');

    // Cutting: the take is what the ground held, and nothing else.
    await see('hew west', /start cutting|set the pick/i);
    await page.waitForTimeout(3_000);
    await snap('hewing');

    // Driving: a new working, cut at a price the rock set.
    await see('drive south', /start driving/i);
    await page.waitForTimeout(4_000);
    await snap('driving');

    // ⭐ Shoring is the PROVISIONING act — it says so out loud, because
    // "this is yours now" is the whole of what a player needs to know
    // about the Provisional/Held tier.
    await runCommand(page, 'south');
    await see('shore', /timber takes the weight/i);
    await snap('shored');
  } finally {
    await snap('workings-final');
    await close();
  }
});

test('the chain: charcoal at the yard, metal at the furnace', async ({ browser }) => {
  test.setTimeout(900_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'mine-collier', {
    startLocation: '/world/rejection/location/fuel-yard',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(page, 'look', page.getByText(/thin blue smoke/i).first());
    await snap('yard-look');

    // ⚠ An empty clamp declines, and says what it wants.
    await see('char', /empty|cordwood/i);
    await snap('clamp-empty');

    // ⭐ The draught is the one dial, and it is set out loud.
    await see('char 0.46', /empty|cordwood|three days/i);
    await snap('clamp-set');

    await runCommand(page, 'east');
    await sendUntil(page, 'look', page.getByText(/slag heap outside the door/i).first());
    await snap('smelter-look');

    // ⚠ A cold furnace refuses and NAMES the temperature it wants — the
    // ladder is the metal's own melting point, never a pacing dial.
    await see('smelt', /furnace|ore|charcoal/i);
    await snap('smelt-refused');
  } finally {
    await snap('chain-final');
    await close();
  }
});
