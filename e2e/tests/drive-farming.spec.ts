/**
 * LIVE DRIVE (checkpoint A, farming Stage A) — the suburban-garden
 * invariant driven end to end, FARM-FREE (D0): a resident buys a MINT
 * seed at the general store, plants it in their own yard's bed, keeps it
 * watered across the whole growth run, PICKS the ripe flush off the
 * living clump (the fruit cycle, live), consigns the take at the farmers
 * market, and a second character buys a sprig somebody grew.
 *
 * ⚠ MINT, not the plan's lime example: the same polycarp code path
 * (cycle fields, set/fill/ripe, ground-targeted pick), chosen because
 * the clock compression has a ceiling — above ~10000× the game-time
 * schedulers starve the event loop and login never answers (measured:
 * test-login 80s+ at 40000×) — and under that ceiling a lime's 265
 * game-day season is an hour of wall-clock. Mint's ~50-day cycle fits.
 *
 * Operator notes:
 *  - The world clock runs at an elevated scale for this drive (set in
 *    `world_state` before boot — scratchpad/clock-scale.mjs); ~30 real
 *    seconds ≈ a fortnight, so the care loop below is the real cadence
 *    the design asks for, compressed.
 *  - Funding is the work-drive scaffold: the founder's `reserve issue`
 *    (the one conserved faucet) handed over as coin on the floor.
 *  - Sessions re-home via test-login's `startLocation` (the
 *    rehomeCharacter seam) — hinkley⇄town has no walkable link and the
 *    TPA credential is scan-to-register, both by design.
 *
 *   E2E_SERVER_URL=http://localhost:2010 npx playwright test tests/drive-farming.spec.ts
 */

import { test, expect, type Page, type Browser } from '@playwright/test';
import {
  mintSession,
  enterWorld,
  commandInput,
  openWorldAsFounder,
  uniqueHandle,
} from './helpers';

const HALL = '/world/terminus/terminal/hall';
const LANE = '/world/terminus/hinkley-hills/lane';
const MARKET = '/world/terminus/market/square';
const SOLD_LOT = 'lot-1';

/** Type a command, wait, and return the new text it produced. */
async function cmd(page: Page, c: string, ms = 2400): Promise<string> {
  const input = commandInput(page);
  // A long run can hit a reconnect blip: the client falls back to the
  // roster and the input vanishes. Walk the resilient re-entry
  // (helpers' reenterWorld shape) rather than failing on a 5s check.
  if (!(await input.isVisible().catch(() => false))) {
    // First: the roster walk. If the WS is STUCK (no input, no roster —
    // observed under the compressed clock's event-loop stalls), a full
    // page reload resets the transport and lands on the roster.
    let reloaded = false;
    await expect(async () => {
      if (await input.isVisible().catch(() => false)) return;
      const play = page.getByRole('button', { name: /^Enter as / }).first();
      const hasPlay = await play.isVisible().catch(() => false);
      if (hasPlay) {
        await play.click().catch(() => {});
      } else if (!reloaded) {
        reloaded = true;
        await page.reload().catch(() => {});
        await page.waitForTimeout(3_000);
      }
      await expect(input).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 240_000 });
  }
  // Diff the TRANSCRIPT only (data-testid="terminal") — body-wide diffs
  // drown in sidebar counters and pinned cards.
  const read = () =>
    page
      .locator('[data-testid="terminal"]')
      .innerText()
      .catch(() => '');
  const before = await read();
  await expect(input).toBeVisible();
  await input.fill(c);
  await input.press('Enter');
  await page.waitForTimeout(ms);
  const after = await read();
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const delta = after.slice(Math.max(0, i - 10));
  // Log the delta's TAIL — the response text lands at the transcript's
  // bottom, and the sidebar counters shift the diff prefix to the top of
  // the page, so the head is always old scrollback.
  console.log(
    `\n──── ${c}\n${delta.split('\n').filter((l) => l.trim()).slice(-12).join('\n')}`,
  );
  return delta;
}

async function fundHere(
  browser: Browser,
  where: string,
  marker: RegExp,
  amount: number,
): Promise<void> {
  // A FRESH founder's first creation can land off-target (observed once:
  // woke at the lounge despite startLocation); the rehome path for an
  // EXISTING character is reliable (TestHooks logs it), so one
  // close-and-reopen fixes it.
  for (let attempt = 0; attempt < 2; attempt++) {
    const gov = await openWorldAsFounder(browser, { startLocation: where });
    try {
      await gov.page.waitForTimeout(1500);
      // Retry the marker read — a look's response can lag several
      // seconds while the world is still warming after a boot.
      let here = '';
      let seen = false;
      for (let i = 0; i < 5 && !seen; i++) {
        here = await cmd(gov.page, 'look', 3000);
        seen = marker.test(here);
        if (!seen) await gov.page.waitForTimeout(2500);
      }
      if (!seen) {
        if (attempt === 0) continue; // reopen — the second rehome lands
        throw new Error(`founder never reached ${where}: ${here.slice(0, 120)}`);
      }
      await cmd(gov.page, `reserve issue ${amount}`, 2600);
      await cmd(gov.page, 'drop coins', 2600);
      return;
    } finally {
      await gov.close();
    }
  }
}

/**
 * A re-login's rehome can lose to the avatar's durable provisioning
 * startLocation (observed: woke at the station hall). The market is
 * walkable from there, so verify and walk rather than trust the wake.
 */
async function ensureAtMarket(page: Page): Promise<void> {
  const here = await cmd(page, 'look', 2400);
  if (/trestle|farmers market square/i.test(here)) return;
  if (/station hall/i.test(here)) {
    for (const step of ['north', 'north', 'west', 'southwest']) {
      await cmd(page, step, 2200);
    }
    const now = await cmd(page, 'look', 2400);
    if (!/trestle|farmers market/i.test(now)) {
      throw new Error(`walked from the hall but not at the market: ${now.slice(0, 120)}`);
    }
    return;
  }
  throw new Error(`woke somewhere unwalkable to the market: ${here.slice(0, 160)}`);
}

/** Re-look until the pattern shows — a move's prose can outrun a single
 * capture window under the compressed clock. */
async function seeUntil(page: Page, pattern: RegExp, tries = 4): Promise<string> {
  let last = '';
  for (let i = 0; i < tries; i++) {
    last = await cmd(page, 'look', 3000);
    if (pattern.test(last)) return last;
    await page.waitForTimeout(2500);
  }
  throw new Error(`never saw ${pattern}: ${last.slice(-160)}`);
}

/** Run `probe` until its own delta matches — for asserts on stable state
 * (inventory, a look) whose single delta can miss the prose window. */
async function untilMatch(
  page: Page,
  probe: string,
  pattern: RegExp,
  tries = 4,
): Promise<string> {
  let last = '';
  for (let i = 0; i < tries; i++) {
    last = await cmd(page, probe, 2800);
    if (pattern.test(last)) return last;
    await page.waitForTimeout(2200);
  }
  throw new Error(`${probe}: never matched ${pattern}: …${last.slice(-140)}`);
}

test.describe.configure({ retries: 0 });

test('⭐ checkpoint A — the suburban garden feeds the farmers market', async ({
  browser,
}) => {
  test.setTimeout(1_500_000);
  const handle = uniqueHandle('farm-grower');

  // ── P1: town — fund, bank, buy the seed, see the market ──
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: HALL,
      wizard: true, // observation only: mid-drive eval witnesses
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await fundHere(browser, HALL, /noticeboard|hall/i, 5200); // a lot costs 4000
    await cmd(page, 'get coins', 2600);
    for (const step of ['north', 'north', 'west', 'west']) {
      await cmd(page, step, 2200);
    }
    await cmd(page, 'bank open', 2600);
    await cmd(page, 'bank deposit coins', 2600);
    const bal = await cmd(page, 'bank', 2200);
    expect(bal.match(/balance is (\d+)/i), 'a funded balance').toBeTruthy();

    // The general store: the lime seed off the new gardening line, plus
    // provisions for the long season.
    await cmd(page, 'east', 2200);
    await cmd(page, 'north', 2200);
    await cmd(page, 'buy mint', 3000);
    await cmd(page, 'buy sack', 3000); // a fresh bed arrives EMPTY — the pour-the-soil trap
    await cmd(page, 'buy waterskin', 3000);
    await cmd(page, 'buy rations', 3000);
    // FAIL FAST on the kit — via a RETRYING inventory read (a single
    // command's delta can miss its own prose window under the
    // compressed clock; the inventory is stable state).
    let kitOk = false;
    for (let i = 0; i < 4 && !kitOk; i++) {
      const inv = await cmd(page, 'inventory', 2600);
      kitOk = /mint seed/i.test(inv);
      if (!kitOk) await page.waitForTimeout(2000);
    }
    expect(kitOk, 'the mint seed is in hand').toBe(true);

    // The market square is a real place off the avenue (the A6 content).
    await cmd(page, 'south', 2200);
    await cmd(page, 'southwest', 2600);
    await seeUntil(page, /market|trestle|stall/i);
    await context.close();
  }

  // ── P1.5: the registry — buy a FRESH lot (a clean yard per run; the
  // shared lot-1 yard accumulates strays whose shared keywords raise
  // "which target?" prompts that swallow the next commands) ──
  let lot = '';
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: '/world/terminus/registry/office',
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await cmd(page, 'title list', 3000);
    const text = await page.evaluate(() => document.body.innerText);
    for (const line of text.split('\n')) {
      const m = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
      if (!m) continue;
      const [, leaf, rest] = m;
      if (leaf === 'lot-1' || leaf === 'lot-5' || /sold/i.test(rest!)) continue;
      lot = leaf!;
      break;
    }
    expect(lot, 'an unsold lot on the plat book').toBeTruthy();
    await cmd(page, `title buy ${lot}`, 4000);
    // The title is stable state — read it back until it shows.
    await untilMatch(page, 'title', new RegExp(lot, 'i'));
    await context.close();
  }

  // ── P2: the yard — plant, and keep it watered through the run ──
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: LANE,
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await cmd(page, `go ${lot}`, 3500);
    await seeUntil(page, /yard behind the house/i);

    await cmd(page, 'fill waterskin from standpipe', 2600);
    // The bed ships with CAPACITY but no soil (the hinkley spec's own
    // flow pours before planting) — 'bed' is unambiguous in this fresh
    // yard, unlike the pot keywords that sank the earlier attempts.
    await cmd(page, 'pour sack into bed', 3000);
    const POTSTATE =
      "eval const ps = StuffApi.findAllByTemplatePath('/trade/farming/thing/pot/large'); return 'POTSTATE=' + ps.map((p) => [p.getSoilVolume(), p.getPlant() ? 'planted' : 'bare', MixinApi.isContainable(p) && p.getContainer() ? p.getContainer().getPresentation() : 'nowhere'].join('/')).join('|')";
    void POTSTATE;
    await cmd(page, 'plant seed in bed', 3500);
    // The strong gate: the augmenter's seedling line rides the PLANT's
    // look, and post-plant the seed is consumed so 'mint' uniquely names
    // the live plant in this fresh yard. A refusal can't fake it.
    await untilMatch(page, 'look mint', /seedling/i);

    // The care loop — the whole design in one loop: attention is the
    // input. ~30 real seconds ≈ a fortnight at the drive scale, so this
    // is water-every-fortnight for a full orchard run.
    let picked = '';
    for (let round = 0; round < 42; round++) {
      await cmd(page, 'fill waterskin from standpipe', 1400);
      await cmd(page, 'water bed', 1400);
      if (round % 6 === 3) {
        await cmd(page, 'eat rations', 1200);
        await cmd(page, 'drink from waterskin', 1200);
      }
      if (round % 5 === 2) await cmd(page, 'look bed', 1400);
      if (round >= 16) {
        const attempt = await cmd(page, 'pick bed', 2000);
        // The polycarp pick's OWN prose — "…and it keeps its place" —
        // never the scrollback's "you pick up something" (the innerText
        // delta can re-include old transcript when sidebar counters
        // shift the common prefix).
        if (/keeps its place/i.test(attempt)) {
          picked = attempt;
          break;
        }
      }
      await page.waitForTimeout(26_000);
    }
    expect(picked, 'the clump came ripe and gave its flush').toMatch(
      /keeps its place/i,
    );
    await untilMatch(page, 'inventory', /sprig of mint/i); // the produce, not the seed
    await context.close();
  }

  // ── P3: the farmers market — the grower consigns the take ──
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: MARKET,
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await ensureAtMarket(page);
    await cmd(page, 'consign mint --ask 3', 3200);
    await cmd(page, 'consign mint --ask 3', 3200);
    await cmd(page, 'consign mint --ask 3', 3200);
    // Stable-state gate: the stall now HOLDS sprigs (look shows custody).
    await untilMatch(page, 'look stall', /sprig of mint|mint/i);
    await context.close();
  }

  // ── P4: a second character buys a lime somebody grew ──
  {
    const s = await mintSession({
      handle: uniqueHandle('farm-buyer'),
      withCharacter: true,
      startLocation: MARKET,
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await ensureAtMarket(page);
    await fundHere(browser, MARKET, /market|trestle|stall/i, 100);
    await cmd(page, 'get coins', 2600);
    // To Goodkin for an account, and back to the square.
    await cmd(page, 'northeast', 2200);
    await cmd(page, 'west', 2200);
    await cmd(page, 'bank open', 2600);
    await cmd(page, 'bank deposit coins', 2600);
    await cmd(page, 'east', 2200);
    await cmd(page, 'southwest', 2200);
    await cmd(page, 'buy mint', 3200);
    await untilMatch(page, 'inventory', /sprig of mint/i);
    await context.close();
  }
});
