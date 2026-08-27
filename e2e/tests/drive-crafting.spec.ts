/**
 * LIVE DRIVE (untracked) — walk the crafting-branches build in the real
 * client. Two serial scenes, one fresh avatar each (the per-test
 * isolation rule): the smithy loop (deed gate → ignite/pump →
 * heat/hammer/quench → earned forge → analyze → carried-affordance
 * sharpen → repair no-op → salvage) and the cookhouse loop (by-hand
 * stew → nutrition label → the spent pantry → order the roast off the
 * open chest). Each spawns directly at its venue: the Hearthworks is
 * authored teleport-only (no inbound exits), and rooms hydrate on
 * entry. Screenshots land in SNAP_DIR.
 *
 *   E2E_SERVER_URL=http://localhost:2110 E2E_CLIENT_URL=http://localhost:5273 \
 *   SNAP_DIR=/tmp/snaps npx playwright test tests/drive-crafting.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { openWorldAs, runCommand, sendUntil } from './helpers';

const SNAP = process.env.SNAP_DIR ?? '/tmp/craft-snaps';
let n = 0;

function makeDrivers(page: Page) {
  const snap = async (name: string) => {
    n += 1;
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${SNAP}/${String(n).padStart(2, '0')}-${name}.png`,
    });
  };
  const see = async (cmd: string, pattern: RegExp, timeout = 15_000) => {
    await runCommand(page, cmd);
    await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
  };
  return { snap, see };
}

test.describe.configure({ mode: 'serial' });

test('the smithy: forge → analyze → sharpen → repair → salvage', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'craft-smith', {
    startLocation: '/world/hearthworks/smithy',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(
      page,
      'look',
      page.getByText(/soot-blackened smithy/i).first(),
    );
    await snap('smithy-look');

    await see('menu', /Belt Knife/i);
    await snap('smithy-menu');

    // The knowledge ladder's gate: the wiki gives steps, not competence.
    await see('forge knife', /haven't learned to forge/i);
    await snap('forge-gated');

    // Light the forge, work the bellows (1300 K → 2080 K).
    await runCommand(page, 'ignite forge');
    await page.waitForTimeout(500);
    await see('pump forge', /roars up white-hot/i);
    await snap('forge-roaring');

    // The by-hand path: heat → hammer → quench (the workpiece is the buffer).
    await see('heat ingot', /takes the heat/i);
    await see('hammer ingot', /taking shape/i);
    await snap('hammering');
    await see('quench ingot', /worked out how to forge/i);
    await snap('quench-learned');

    // The shorthand is earned now — forge the second knife from the spare.
    await see('forge knife', /You forge/i);
    await snap('forge-earned');

    await see('analyze weapon knife', /Playstyle of/i);
    await expect(page.getByText(/edge keen/i).first()).toBeVisible();
    await snap('analyze-weapon');

    // The sharpen ritual is a carried affordance: unafforded, the verb
    // doesn't even parse; pick up the smithy's stone and it lights up.
    await see('sharpen knife', /don't understand 'sharpen'/i);
    await see('get whetstone', /You (take|get|pick up)/i);
    await see('sharpen knife', /long slow strokes/i);
    await expect(page.getByText(/keen again/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await snap('sharpened');
    // Nothing to repair on a fresh blade — the honest no-op.
    await see('repair knife', /already sound/i);
    await snap('maintenance-gates');

    // The entropy sink: the forged knife melts down to less than it took.
    await see('salvage knife', /mostly loses/i);
    await see('find lump', /salvaged lump of iron/i);
    await snap('salvaged');
  } finally {
    await snap('smithy-final');
    await close();
  }
});

test('the cookhouse: by-hand stew → nutrition → the spent pantry → the roast', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'craft-cook', {
    startLocation: '/world/hearthworks/cookhouse',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(
      page,
      'look',
      page.getByText(/warm with woodsmoke/i).first(),
    );
    await snap('cookhouse-look');
    await see('menu', /Hearty Stew/i);
    await snap('cookhouse-menu');

    await runCommand(page, 'ignite hearth');
    await page.waitForTimeout(500);

    // The table's working stock, cooked by hand (the chest keeps the
    // dear cuts — the craft GATHER reaches into it; hands don't yet).
    await see('add vegetables to pot', /You add/i);
    await see('add vegetables to pot', /You add/i);
    await see('add stew-meat to pot', /You add/i);
    await runCommand(page, 'stir pot');
    await page.waitForTimeout(800);
    await see('heat pot', /takes the heat/i);
    await snap('pot-heated');
    await see('plate pot into dish', /worked out how to cook/i);
    await snap('stew-plated');

    // The honest macros on the plate (resolved by what it HOLDS — the
    // bulk material-keyword path; bare `look dish` offers the two-dish
    // which-target prompt).
    await see('look stew', /Nutrition:/i);
    await snap('nutrition-label');

    // The pantry is spent — the served stew declines on stock, honestly…
    await see('order stew', /isn't enough|no one on hand/i);
    // …but the fine roast's prime cut still sits in the open chest, and
    // the maker's gather walk reaches it (the open-container rung, live).
    await see('order roast', /set down in front of you/i);
    await snap('roast-served');
  } finally {
    await snap('cookhouse-final');
    await close();
  }
});

test('the general store: the machine — a data-only tool variant, live', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'craft-shopper', {
    startLocation: '/world/terminus/general-store/shop-floor',
  });
  const { snap, see } = makeDrivers(page);
  try {
    await sendUntil(
      page,
      'look',
      page.getByText(/plank counter/i).first(),
    );
    await snap('store-look');

    // The machine is on the shelf, priced — the seed-only variant is a
    // real, minted stock instance (class: ToolItem, one spec entry).
    await see('look counter', /sewing-machine \(18\)/i);
    await snap('store-counter');

    // No instrument in reach → no repair surface at all (shelf stock
    // sits INSIDE the counter — shop goods don't leak affordances).
    await see('repair jerkin', /don't understand 'repair'/i);

    // The honest funds gate: a fresh test arrival carries no stipend
    // (enroll grants it), so the buy declines on coverage — which also
    // proves the machine RESOLVES as purchasable stock. The carried-
    // affordance live beat rides the smithy scene (the whetstone and
    // anvil are table-fed rows now); the machine's own buy→carry→
    // repair loop is unit-covered against this seed
    // (sewing-machine.acceptance.test.ts).
    await see('buy sewing-machine', /can't cover/i);
    await snap('store-funds-gate');
  } finally {
    await snap('store-final');
    await close();
  }
});
