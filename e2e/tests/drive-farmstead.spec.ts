/**
 * LIVE DRIVE — the campus farm, end to end, in the real client.
 *
 * ⭐ **The acceptance criterion is a driven session, not a suite.** This
 * is the order a person would actually do it in:
 *
 *   pick the tools up out of the yard · walk out to the home field ·
 *   read the ground three ways · try to drain it and be told not to ·
 *   try to lime it and be told not to · put a scythe in the ley · turn a
 *   furrow by hand · look for the herd
 *
 * ⭐⭐ **The ground is the point.** The university's field carries an
 * AUTHORED `GroundCharacter` — a pin on the home field's own spot, which
 * says *this ground was improved*. So the readings should agree with the
 * row and not with the procedural layer underneath it, and the two
 * improvement verbs should REFUSE, in the words that teach why. That
 * chain — row → zone citation → hydrator → `lookupField` → the fold →
 * four separate verbs — is exactly what a unit test cannot walk.
 *
 * ⚠ **One character, one scene, deliberately.** The yard holds ONE spade,
 * ONE scythe, ONE kit and ONE plough, they are takeable, and nothing puts
 * them back — so a second character arriving after the first has an empty
 * yard and cannot farm at all. That is a real fact about the shipped farm
 * (reported, not papered over); splitting this drive across characters
 * would only hide it behind a harness failure.
 *
 *   E2E_SERVER_URL=http://localhost:2020 E2E_CLIENT_URL=http://localhost:5183 \
 *   SNAP_DIR=/tmp/farm-snaps npx playwright test tests/drive-farmstead.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { openWorldAs, runCommand, sendUntil } from './helpers';

const SNAP = process.env.SNAP_DIR ?? '/tmp/farm-snaps';
const YARD = '/world/eternal/campus-farm/location/yard';
let n = 0;

function makeDrivers(page: Page) {
  const snap = async (name: string) => {
    n += 1;
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${SNAP}/${String(n).padStart(2, '0')}-${name}.png`,
    });
  };
  const see = async (cmd: string, pattern: RegExp, timeout = 25_000) => {
    await runCommand(page, cmd);
    await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
  };
  return { snap, see };
}

test('the campus farm, end to end', async ({ browser }) => {
  test.setTimeout(1_200_000);
  mkdirSync(SNAP, { recursive: true });
  const { page, close } = await openWorldAs(browser, 'farmhand', {
    startLocation: YARD,
  });
  const { snap, see } = makeDrivers(page);
  try {
    // ---------- the yard ----------
    await sendUntil(page, 'look', page.getByText(/trodden mud/i).first());
    await snap('yard');

    // ⭐ The tools are PROPS in the yard, not stock in a shop. A teaching
    // farm hands you the spade; the economics of buying one is a
    // different lesson and belongs somewhere else.
    // ⚠ Asserted on the INVENTORY, not on the pickup echo. "You pick up
    // something" is the same sentence four times over (everything in a
    // room renders generically), so a `see` on the echo matches the line
    // the PREVIOUS get produced and a failed pickup passes silently. The
    // inventory is the only honest witness.
    await runCommand(page, 'get spade');
    await runCommand(page, 'get kit');
    await runCommand(page, 'get scythe');
    await see('inventory', /spade/i);
    await expect(page.getByText(/scythe/i).first()).toBeVisible();
    await expect(page.getByText(/soil test kit/i).first()).toBeVisible();
    await snap('tooled-up');

    // ⚠⚠ **The light check is not ceremony.** A room that authors no
    // ambient light is PITCH BLACK forever — a biome makes a place
    // SkyExposed, which is what the soil's sky edge and the weather read,
    // but it hands the room no lux. This farm shipped that way: `analyze
    // sky` said *"daylight over the university farmyard, sun altitude
    // 47°"* while `analyze light` said *"0 lux, contributing sources:
    // none"*, every object in the yard rendered as "something", and `get
    // spade` answered *"you don't see any 'spade' here"* at midday.
    //
    // ⚠ After the spade, because the spade is what AFFORDS `measure` —
    // which was the other half of the same finding.
    await see('measure light', /: [1-9][0-9]* lux/i);
    await snap('there-is-daylight');

    // ⭐ And the farm knows where it is. Without a zone `address:` it
    // resolved NO covering Locality, so the soil field was seeded off the
    // EMPTY STRING — the Ferrow orebody's bug, repeated.
    await see('analyze address', /terminus\/city\/campus/i);
    await snap('address');

    // ---------- out to the field ----------
    await runCommand(page, 'go field');
    await sendUntil(page, 'look', page.getByText(/clover ley/i).first());
    await snap('home-field');

    // ---------- ⭐⭐ the three readings ----------
    // The pin says loam. The procedural layer under it says something
    // else. If this reads anything but loam, the authored model is not
    // reaching the verb and the citation is broken again.
    await see('measure texture', /loam/i);
    await snap('texture');

    // pH 6.6 ± the band your eye earns — the pin's own figure.
    await see('measure acidity', /pH \d\.\d/i);
    await snap('acidity');

    // ⭐ Per-viewer, and a BELIEF: the card is a record of your sampling,
    // not of the world, and it says how many more spadefuls it wants.
    await see('analyze soil', /spadeful/i);
    await snap('analyze');

    // ---------- ⭐⭐ the two refusals that TEACH ----------
    // The pin drains at 0.62 and sits at pH 6.6, so both improvement
    // verbs decline — and the decline IS the lesson, because lime on
    // sweet ground is money in a ditch.
    await see('ditch', /sheds its own water|already off this ground/i);
    await snap('ditch-refused');

    await see('lime', /sweet enough|money in a ditch/i);
    await snap('lime-refused');

    // ---------- the sward ----------
    // ⭐⭐ Hay and grazing are the SAME draw on the same grass; what makes
    // one of them hay is that the mouth was somewhere else.
    //
    // ⚠ On day one it refuses, correctly: the ley is *"short and even,
    // still coming"*, below the residual a scythe can cut to, and a sward
    // cut into its crowns will not come again. Right answer, right words
    // — and also a real fact about the shipped farm, that the signature
    // act of a hay meadow is not available the hour you arrive.
    await see('mow', /nothing on it worth a scythe|first swathe/i);
    await snap('mow');

    // ---------- the plough ----------
    // ⭐ No beast in the traces, so the share goes in about half as far as
    // it ought to. Draught power is BODY MASS and nobody wrote the ratio
    // down: an ox is worth about ten of you because that is what the two
    // animals weigh.
    // ⚠ The plough is fetched now rather than with the hand tools: it is
    // a heavy implement and the yard is where it lives.
    await runCommand(page, 'go yard');
    await page.waitForTimeout(1200);
    await runCommand(page, 'get plough');
    await see('inventory', /plough/i);
    await runCommand(page, 'go field');
    await page.waitForTimeout(1500);
    await see('plough', /traces over your shoulders|turned and clean|want a plough/i);
    await snap('ploughing');

    // ---------- ⚠ the herd ----------
    // A PROBE rather than an assertion. `draft` is the entry point to the
    // whole ranching half, and if the answer is anything other than the
    // act working, the finding is that the half cannot be entered.
    await runCommand(page, 'draft 0');
    await page.waitForTimeout(2500);
    await snap('draft');
  } finally {
    await snap('final');
    await close();
  }
});
