import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The matter-model-overlaps build's live walk** — the half the wire
 * drive cannot see.
 *
 * The blocking drive (`packages/wire/tests/matter-model-overlaps.dirty.wire.test.ts`)
 * asserts STATE off the world: liters by the projection, payload stamps by
 * `eval`. This is a real Chromium against the real client, and every step
 * asserts a sentence a person READS on the page (plan § The browser walk):
 *
 *   1.  the boil reading's hold line — *holding more than it can keep, and
 *       nothing has started it* — and the crop that appears once seeded;
 *   4.  the cooled brine that sets nothing until stirred, then crystals;
 *   5.  the smell of whiskey in water from a whiskey cask (less once washed);
 *   6.  the taste verdict on the distiller's batch while `analyze condition`
 *       reads the cooper's work;
 *   10. the glazed butter crock giving no cream back, the oak churn giving it;
 *   12. the salt thrown in the kiln, smelled in the shop;
 *   13. the steam and the retort's fumes in `smell`;
 *   15. the puddle of lye on the room's line after `pour <pail> onto <heap>`.
 *
 * Staging is the e2e precedents' (cordage, paint, size-and-carrying):
 * goods through `/auth/test-hand` (with the `data` overlay the wire drive's
 * `hand` sends — the same route), the clock through `/auth/test-clock` in
 * jumps of a few hours, the body kept fed through `/auth/test-nourish` (what
 * the wire harness's `advanceLiving` does), and Discipline evidence through
 * the test-world `practice` verb. ⚠ The clock route and `practice` need the
 * server booted as a TEST WORLD (`SAXONBERG_TEST_WORLD=1`, `AUTH_MODE=test`).
 *
 * ⚠⚠ **Written, not yet run.** Where the browser cannot stage what the wire
 * drive stages — the boil itself (step 1's copper climbing to the strike is
 * a half-day of stoking the wire drive does), a funded bank account (the
 * ash is handed, not bought), the cooper as a second player (the cask's
 * maker is the wire drive's `eval` read) — the step says so at the place.
 */

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

/* ───────────────────────────── places ───────────────────────────── */

const SH = '/world/terminus/goods-yards/sugar-house';
const BOILING = `${SH}/place/ground/boiling-floor`;
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const CROWSFOOT = '/world/terminus/goods-yards/crowsfoot/place/floor';
const POTTERS_SHOP = '/world/terminus/hearts-delight/brickfield/place/potters-shop';
const CREAMERY = '/world/terminus/hearts-delight/creamery/place/floor';
const CHANDLERY = '/world/terminus/wharfside/chandlery/place/floor';

/* ───────────────────────────── rows ───────────────────────────── */

const T = {
  glowcap: '/world/terminus/rejection/thing/glowcap-jar',
  cone: '/trade/sugar/thing/cone',
  coal: '/trade/quarrying/thing/coal',
  saltCrystals: '/stuff/thing/salt-crystals',
  sugarPiece: '/trade/sugar/thing/sugar-piece',
  pail: '/stuff/thing/vessel/pail',
  waterskin: '/world/terminus/general-store/thing/waterskin',
  distillingCask: '/trade/distilling/thing/cask',
  brewingCask: '/trade/brewing/thing/cask',
  crock: '/trade/ceramics/thing/crock',
  ceramicJug: '/trade/ceramics/thing/jug',
  dairyJug: '/trade/dairying/thing/jug',
  retort: '/trade/fuel/thing/retort',
  charcoal: '/trade/fuel/thing/charcoal',
  cordwood: '/trade/forestry/thing/cordwood',
  woodAsh: '/trade/fuel/thing/wood-ash',
  gasAnalyzer: '/stuff/thing/instrument/gas-analyzer',
  hygrometer: '/stuff/thing/instrument/hygrometer',
};

const M = {
  strike: '/trade/sugar/idea/material/strike',
  whiskey: '/trade/distilling/idea/material/whiskey',
  water: '/stuff/idea/material/bulk/water',
  saltWater: '/stuff/idea/material/bulk/salt-water',
  cream: '/trade/dairying/idea/material/cream',
  milk: '/stuff/idea/material/food/milk',
  stoneware: '/stuff/idea/material/ceramic/stoneware',
  clay: '/stuff/idea/material/earth/clay',
  leadGlaze: '/stuff/idea/material/glaze/lead',
};

const SPIRIT_AROMA = '/base-library/aromas/alcohol/spirit';
const BEER_AROMA = '/base-library/aromas/alcohol/beer';
/** The distiller of record at Crowsfoot — the batch's maker (step 6). */
const DISTILLER = '/world/terminus/goods-yards/crowsfoot/agent/hand';

const DAY = 86_400;
const HOUR = 3_600;

/* ───────────────────────────── the page ───────────────────────────── */

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** The inspection cards' bodies, newest last. */
async function cards(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h3')].map((h) => {
      const box = h.closest('article,section,div[class*=card],div[class*=Card]') ?? h.parentElement;
      return box ? (box as HTMLElement).innerText : '';
    }),
  );
}

/**
 * Run `cmd`, wait until the page shows a reply matching `reply` — in the
 * transcript's new lines OR in a card that was not on the page before (a
 * reading may render to either) — and return everything new.
 */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  const oldCards = new Set(await cards(page));
  await runCommand(page, cmd);
  let seen = '';
  await expect
    .poll(
      async () => {
        // ⚠ Without the echoed command line: `> stir #crock` matched /stir/ and
        // `> look crystals` matched /crystals/ before the reply came (the
        // first run of the walk).
        const added = (await transcript(page))
          .slice(before.length)
          .split('\n')
          .filter((l) => l.trim() !== `> ${cmd}`)
          .join('\n');
        // ⚠ …and without the ROOM's card, which re-renders whenever anyone
        // comes or goes: "a working one now" answered /work/ and "no" in its
        // prose answered /no / before the reading arrived (the walk's runs).
        const fresh = (await cards(page)).filter((c) => !oldCards.has(c) && !/\nHere\n/.test(c));
        seen = [added, ...fresh].join('\n');
        return seen;
      },
      { timeout },
    )
    .toMatch(reply);
  return seen;
}

/** Re-look (unquoted, so `#id` and `me:i:…` bind) until a card matches. */
async function lookFor(page: Page, what: string, matching: RegExp, timeout = 30_000): Promise<string> {
  let body = '';
  await expect
    .poll(
      async () => {
        await runCommand(page, what === '' ? 'look' : `look ${what}`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

/** The first figure a measured line names for `what` (a gas analyzer's OU, a hygrometer's %). */
function figure(said: string, what: RegExp): number {
  for (const l of said.split(/(?<=OU|%)\s+|\n/)) {
    if (!what.test(l)) continue;
    const m = /(-?\d+(?:\.\d+)?)/.exec(l.replace(what, ''));
    if (m) return Number(m[1]);
  }
  return NaN;
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

/* ───────────────────────────── the seams ───────────────────────────── */

async function post(route: string, data: Record<string, unknown>): Promise<unknown> {
  const ctx = await request.newContext({ baseURL: SERVER_URL, timeout: 300_000 });
  try {
    const res = await ctx.post(route, { data });
    const text = await res.text();
    expect(res.ok(), `${route}: ${text}`).toBe(true);
    return text === '' ? {} : (JSON.parse(text) as unknown);
  } finally {
    await ctx.dispose();
  }
}

/** Hand a thing (optionally with the wire drive's `data` overlay); its id, for `#id`. */
async function hand(handle: string, template: string, data?: Record<string, unknown>): Promise<string> {
  const body = (await post('/auth/test-hand', data ? { handle, template, data } : { handle, template })) as { id?: string };
  expect(typeof body.id, `hand ${template} gave no id`).toBe('string');
  return body.id!;
}

async function clockNow(): Promise<number> {
  return ((await post('/auth/test-clock', {})) as { now: number }).now;
}

/** Move the clock `seconds` on, fed, in jumps of at most six hours. */
async function advance(handle: string, seconds: number): Promise<void> {
  for (let left = Math.round(seconds); left > 0; ) {
    const step = Math.min(left, 6 * HOUR);
    await post('/auth/test-nourish', { handle });
    await post('/auth/test-clock', { advance: `${Math.max(1, Math.round(step / 60))} minutes` });
    left -= step;
  }
}

/** On to the next `hour` o'clock (fractional allowed). */
async function toHour(handle: string, hour: number): Promise<void> {
  const h = ((((await clockNow()) % DAY) + DAY) % DAY) / HOUR;
  const ahead = (hour - h + 24) % 24;
  if (ahead >= 0.05) await advance(handle, ahead * HOUR);
}

/** Between 08:00 and 16:00, else on to 09:00 — names read by daylight. */
async function daylight(handle: string): Promise<void> {
  const h = ((((await clockNow()) % DAY) + DAY) % DAY) / HOUR;
  if (h < 8 || h >= 16) await toHour(handle, 9);
}

/**
 * After the house's hours (18:30–05:00), else on to 18:30 — the refiner at
 * the copper and the potter at the kiln work 06–18, and a checkpoint must
 * read what the PLAYER did, never a race with an NPC (the wire drive's rule).
 */
async function afterHours(handle: string): Promise<void> {
  const h = ((((await clockNow()) % DAY) + DAY) % DAY) / HOUR;
  if (h >= 18.4 || h < 5) return;
  await toHour(handle, 18.5);
}

/** A walker at `where`, carrying a light (the copper and kiln are worked after dark). */
async function walker(browser: import('@playwright/test').Browser, prefix: string, where: string) {
  const w = await openWorldAs(browser, prefix, { startLocation: where });
  await hand(w.handle, T.glowcap);
  return w;
}

/* ───────────────────────────── the walk ───────────────────────────── */

// One clock for the whole world: the steps move it, so they run in order.
test.describe.configure({ mode: 'serial' });

test.describe('the matter-model-overlaps build, in a browser', () => {
  test('1. ⭐⭐ the strike holds — the boil reading says nothing has started it — and a piece of sugar sets it', async ({ browser }) => {
    test.setTimeout(1_200_000);
    const w = await walker(browser, 'mmo-boil', BOILING);
    const { page, handle } = w;
    try {
      await afterHours(handle);
      // ⚠ STAGED, where the wire drive plays it: boiling the liquor through
      // syrup to the strike is a half-day of stoking and reading the copper
      // that the blocking drive walks command by command. The browser's
      // question is the SENTENCE, so the cone is handed holding a tempered,
      // skimmed strike past saturation — the state the boil leaves it in —
      // and nothing has started it (no `nucleated`).
      const cone = await hand(handle, T.cone, {
        keywords: ['cone', 'sugar cone', 'mould', 'mmowalkcone'],
        interiorMaterial: M.strike,
        interiorAmount: 6,
        interiorPayload: { dissolvedSolidsKgPerL: 1.3, purity: 0.92, grade: 'fine' },
      });
      const set = await sayAwaiting(page, `put #${cone} on pot`, /You put|You set|don't see|cannot|can't/i);
      if (!/You put|You set/i.test(set)) await sayAwaiting(page, `drop #${cone}`, /You drop|You set|You put/i);
      await advance(handle, 2 * HOUR);

      // ⭐ The hold line, on the page.
      const held = await sayAwaiting(page, `analyze boil #${cone}`, /holding more than it can keep|drop of|reads \d|cannot|nothing to/i);
      expect(held, 'analyze boil').not.toMatch(NOT_UNDERSTOOD);
      expect(held).toMatch(/holding more than it can keep, and nothing has started it/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/01-held.png', fullPage: true });

      // The pinch of sugar, handed (the floor's own piece is gone once a walk
      // has used it — the first runs found it so on a reused world).
      const piece = await hand(handle, T.sugarPiece);
      expect(await sayAwaiting(page, `put #${piece} in #${cone}`, /You put|cannot|can't/i)).toMatch(/You put/i);
      await advance(handle, 30 * 60);

      // Seeded and setting, what is left to draw is the liquor between the grain
      // (the first run read "thin and watery": the wait now takes any reading).
      const started = await sayAwaiting(page, `analyze boil #${cone}`, /holding|grain|drop of|reads \d|cannot/i);
      expect(started, 'seeded, it still says nothing has started it').not.toMatch(/nothing has started it/i);
      // ⭐ The crop appears: the cone's card names the loaf it is setting into.
      expect(await lookFor(page, `#${cone}`, /loaf|setting|\bset\b/i)).toMatch(/loaf|setting|\bset\b/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/01-seeded.png', fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('4. ⭐ salt waits for its edge: cooled brine in a crock sets nothing until it is stirred', async ({ browser }) => {
    test.setTimeout(900_000);
    const w = await walker(browser, 'mmo-salt', MOUTH);
    const { page, handle } = w;
    try {
      await daylight(handle);
      // Staged as the wire drive stages it (step 4's crock half is staged
      // there too): no brine a player takes off the pan in a day is near
      // saturation, so the crock is handed it — glazed stoneware, 0.37 kg/L.
      const crock = await hand(handle, T.crock, {
        keywords: ['crock', 'pot', 'mmowalkbrine'],
        _materialPath: M.stoneware,
        coats: {
          inside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
          outside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
        },
        interiorMaterial: M.saltWater,
        interiorAmount: 3,
        // 0.34, the wire drive's figure: the row saturates at 0.317 and holds
        // to 1.1× — 0.37 starts on its own, as D14 says.
        interiorPayload: { dissolvedSolidsKgPerL: 0.34 },
      });
      await sayAwaiting(page, `drop #${crock}`, /You drop|You set|You put|don.t have/i);
      await advance(handle, HOUR);
      // Nothing has set on its own: the crock's own reading says so. (⚠ Not
      // `look crystals`: the open pans at the mouth leave crusts of their own
      // — the first run of the walk found one there before the crock.)
      const held = await sayAwaiting(page, `analyze boil #${crock}`, /holding more than it can keep|drop of|reads \d|cannot|nothing to/i);
      expect(held, 'the cooled brine, unstirred').toMatch(/nothing has started it/i);

      const stirred = await sayAwaiting(page, `stir #${crock}`, /stir|cannot|can't/i, 120_000);
      expect(stirred).not.toMatch(NOT_UNDERSTOOD);
      await advance(handle, 20 * 60);
      // ⭐ The crop appears beside the crock.
      expect(await lookFor(page, 'crystals', /crystal/i)).toMatch(/salt|crystal/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/04-crystals.png', fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('5–6. ⭐⭐ a cask remembers whiskey; the contents read as the distiller’s, the cask as the cooper’s work', async ({ browser }) => {
    test.setTimeout(1_200_000);
    const w = await walker(browser, 'mmo-cask', CROWSFOOT);
    const { page, handle } = w;
    try {
      await daylight(handle);
      // A nose that can name a spirit (an aroma word bands by its row's
      // discipline, `distilling`) and an appraiser's eye (`analyze condition`).
      for (let i = 0; i < 16; i++) await sayAwaiting(page, 'practice distilling hard success', /practi|record|deed/i);
      for (let i = 0; i < 16; i++) await sayAwaiting(page, 'practice appraisal hard success', /practi|record|deed/i);
      await hand(handle, T.gasAnalyzer);

      // ── 5. Two casks that have held whiskey and a pitched ale cask ──
      // (staged, as in the wire drive: the walls hold what a whiskey fill leaves)
      const memory = { inside: [{ type: SPIRIT_AROMA, amount: 60 }] };
      const a = await hand(handle, T.distillingCask, {
        keywords: ['cask', 'barrel', 'mmowalkcaska'],
        absorbed: memory,
        interiorMaterial: M.whiskey,
        interiorAmount: 2,
      });
      const b = await hand(handle, T.distillingCask, {
        keywords: ['cask', 'barrel', 'mmowalkcaskb'],
        absorbed: memory,
        interiorMaterial: M.whiskey,
        interiorAmount: 2,
      });
      const c = await hand(handle, T.brewingCask, {
        keywords: ['cask', 'barrel', 'mmowalkcaskc'],
        absorbed: { inside: [{ type: BEER_AROMA, amount: 60 }] },
      });
      // A handed cask too big for the hands is set down where she stands
      // ("you don't have" it — it is on the floor already).
      for (const id of [a, b, c]) await sayAwaiting(page, `drop #${id}`, /You drop|You set|You put|don.t have/i);

      // Emptied (into the slop bucket), B washed, all three filled with water.
      for (const id of [a, b]) {
        const poured = await sayAwaiting(page, `pour #${id} into "slop bucket"`, /You pour|cannot|can.t|don.t see|full/i);
        if (!/You pour/i.test(poured)) await sayAwaiting(page, `spill #${id}`, /spill|pour|empty/i);
      }
      // ⚠ Crowsfoot's standpipe draws nothing (no premises supply — the wire
      // drive's run 5, and this walk's first run: "an iron standpipe doesn't
      // hold liquid"), so the water comes in a pail, and the wash water in a
      // waterskin, as the wire drive hands them.
      const pailOfWater = async (): Promise<string> => {
        await runCommand(page, 'drop pail');
        return hand(handle, T.pail, { keywords: ['pail', 'bucket'], interiorMaterial: M.water, interiorAmount: 8 });
      };
      expect(await sayAwaiting(page, `pour #${await pailOfWater()} into #${a}`, /You pour|cannot|can't/i)).toMatch(/You pour/i);
      await runCommand(page, 'drop pail');
      await hand(handle, T.waterskin, { interiorMaterial: M.water, interiorAmount: 2 });
      await runCommand(page, 'open waterskin');
      expect(await sayAwaiting(page, `wash #${b}`, /wash|scrub|rinse|cannot|can't/i, 180_000)).not.toMatch(/no water here|not something you can wash/i);
      await runCommand(page, 'drop waterskin');
      expect(await sayAwaiting(page, `pour #${await pailOfWater()} into #${b}`, /You pour|cannot|can't/i)).toMatch(/You pour/i);
      expect(await sayAwaiting(page, `pour #${await pailOfWater()} into #${c}`, /You pour|cannot|can't/i)).toMatch(/You pour/i);
      await runCommand(page, 'drop pail');
      await advance(handle, 3 * HOUR);

      // ⭐ The smell line names the spirit in water from a whiskey cask.
      const smelt = await sayAwaiting(page, `smell #${a}`, /smell|scent|nothing/i);
      const nosed = await sayAwaiting(page, `analyze aroma #${a}`, /You pick out|anything you could name|cannot/i);
      expect(`${smelt}\n${nosed}`, 'the water in the whiskey cask').toMatch(/spirit|alcohol|whisk/i);
      // Less once washed; the pitched cask gives nothing.
      const readA = await sayAwaiting(page, `measure aroma #${a}`, /\d OU|finds nothing|anything you could name|cannot/i);
      const readB = await sayAwaiting(page, `measure aroma #${b}`, /\d OU|finds nothing|anything you could name|cannot/i);
      const figA = figure(readA, /spirit|alcohol|whisk/i);
      const figB = figure(readB, /spirit|alcohol|whisk/i);
      expect(figA, `the unwashed cask gave no measurable spirit: ${readA}`).toBeGreaterThan(0);
      expect(Number.isFinite(figB) ? figB : 0, `washed, the cask gave as much: ${readA} | ${readB}`).toBeLessThan(figA);
      expect(await sayAwaiting(page, `analyze aroma #${c}`, /You pick out|anything you could name|cannot/i)).not.toMatch(/beer|ale\b|spirit|alcohol/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/05-cask.png', fullPage: true });

      // ── 6. FINE cooper's work holding a distiller's POOR batch ──
      // ⚠ The cask's maker is not staged as a second player here: the wire
      // drive mints the cooper and reads `getMaker()` back by `eval`, and W0
      // found no `look` line that names a cask's maker. What a person reads
      // is the split itself — condition on the vessel, taste on the batch.
      const d = await hand(handle, T.distillingCask, {
        keywords: ['cask', 'barrel', 'mmowalkcaskd'],
        gradeBand: 'fine',
        interiorMaterial: M.whiskey,
        interiorAmount: 5,
        interiorPayload: { grade: 'poor', maker: DISTILLER },
      });
      await sayAwaiting(page, `drop #${d}`, /You drop|You set|You put|don.t have/i);
      const condition = await sayAwaiting(page, `analyze condition #${d}`, /work|made|cannot/i);
      expect(condition).toMatch(/it is fine work/i);
      expect(condition).not.toMatch(/poor work/i);
      const tasted = await sayAwaiting(page, `taste #${d}`, /tastes|making of it|cannot|can't/i);
      expect(tasted).toMatch(/The making of it reads poor/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/06-verdict.png', fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('10. ⭐ the glazed butter crock gives no cream back; the oak churn does, and less once washed', async ({ browser }) => {
    test.setTimeout(1_200_000);
    const w = await walker(browser, 'mmo-dairy', CREAMERY);
    const { page, handle } = w;
    try {
      await daylight(handle);
      await hand(handle, T.gasAnalyzer);
      // The cream is handed (setup), as in the wire drive.
      const creamC = await hand(handle, T.dairyJug, { interiorMaterial: M.cream, interiorAmount: 1.5 });
      expect(await sayAwaiting(page, `pour #${creamC} into "butter crock"`, /You pour|cannot|can't/i)).toMatch(/You pour/i);
      await advance(handle, 8 * HOUR);
      await sayAwaiting(page, `pour "butter crock" into #${creamC}`, /You pour|cannot|can't|empty/i);
      const milkC = await hand(handle, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
      await sayAwaiting(page, `pour #${milkC} into "butter crock"`, /You pour/i);
      await advance(handle, 2 * HOUR);
      // ⭐ Glazed ware remembers nothing.
      const crockRead = await sayAwaiting(page, 'measure aroma "butter crock"', /\d OU|finds nothing|anything you could name|cannot/i);
      const glazed = figure(crockRead, /cream/i);
      expect(Number.isFinite(glazed) ? glazed : 0, `the glazed crock gave back cream: ${crockRead}`).toBe(0);

      // The oak churn: cream, emptied, fresh milk.
      const cream = await hand(handle, T.dairyJug, { interiorMaterial: M.cream, interiorAmount: 1.5 });
      await sayAwaiting(page, `pour #${cream} into churn`, /You pour/i);
      await advance(handle, 8 * HOUR);
      await sayAwaiting(page, `pour churn into #${cream}`, /You pour|empty/i);
      const milkA = await hand(handle, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
      await sayAwaiting(page, `pour #${milkA} into churn`, /You pour/i);
      await advance(handle, 2 * HOUR);
      const churnRead = await sayAwaiting(page, 'measure aroma churn', /\d OU|finds nothing|anything you could name|cannot/i);
      const first = figure(churnRead, /cream/i);
      expect(first, `no cream in the fresh milk in the churn: ${churnRead}`).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/10-churn.png', fullPage: true });

      // Emptied, washed, refilled: less.
      await sayAwaiting(page, `pour churn into #${milkA}`, /You pour|empty/i);
      expect(await sayAwaiting(page, 'wash churn', /wash|scrub|rinse|cannot|can't/i, 180_000)).not.toMatch(NOT_UNDERSTOOD);
      const milkB = await hand(handle, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
      await sayAwaiting(page, `pour #${milkB} into churn`, /You pour/i);
      await advance(handle, 2 * HOUR);
      const second = figure(await sayAwaiting(page, 'measure aroma churn', /\d OU|finds nothing|anything you could name|cannot/i), /cream/i);
      expect(Number.isFinite(second) ? second : 0, 'washed, the churn gave as much cream').toBeLessThan(first);
    } finally {
      await w.close();
    }
  });

  test('12. ⭐⭐ salt thrown into the kiln at heat is smelled in the shop, and the jug comes out salt-glazed', async ({ browser }) => {
    test.setTimeout(1_800_000);
    const w = await walker(browser, 'mmo-kiln', POTTERS_SHOP);
    const { page, handle } = w;
    try {
      // After the potter's hours: she douses a lit kiln of a player's ware.
      await afterHours(handle);
      // A nose that can NAME a salt fume (the aroma row bands by `pottery`).
      for (let i = 0; i < 16; i++) await sayAwaiting(page, 'practice pottery hard success', /practi|record|deed/i);
      // (staged, as in the wire drive) A bone-dry green jug of stoneware clay.
      const jug = await hand(handle, T.ceramicJug, { keywords: ['jug', 'pot', 'mmowalkjug'], _materialPath: M.clay, dryness: 1 });
      // The glowcap set down to light the shop, and the jug into the hand (a
      // full pair sets a handed thing down — the walk's first run: "you don't
      // have a jug").
      await runCommand(page, 'drop jar');
      await sayAwaiting(page, `get #${jug}`, /You (get|pick|take)|already|Nothing picked up|don.t see/i);
      expect(await sayAwaiting(page, `put #${jug} in kiln`, /You put|cannot|can't/i)).toMatch(/You put/i);
      // The salt HANDED too (the shop keeps three, and a walked world runs out).
      const salt = await hand(handle, T.saltCrystals);
      expect(await sayAwaiting(page, `put #${salt} in kiln`, /You put|cannot|can't/i)).toMatch(/You put/i);
      // The fuel HANDED: the shop's own charcoal is the potter's, and a world
      // walked more than once runs out of it (the walk's runs).
      for (let i = 0; i < 6; i++) {
        await hand(handle, T.charcoal);
        await sayAwaiting(page, 'stoke charcoal into kiln', /You lay|stoke|feed|put|cannot|can.t/i);
      }
      await sayAwaiting(page, 'light kiln', /light|catch|kindle|cannot|can't/i);
      // At a WIDE draught for eight hours, inside the potter's night (the
      // wire drive's run 4 fired to earthenware at the default draught).
      expect(await sayAwaiting(page, 'fire kiln --draught wide for 8 hours', /fire|firing|seal|settle|hold it|cannot|can.t/i)).not.toMatch(NOT_UNDERSTOOD);
      // Smelled within the hour: the salt goes to vapor minutes into the
      // firing and is aired out of the shop over the hours (the drive's run 2).
      await advance(handle, HOUR);
      await hand(handle, T.gasAnalyzer);

      // ⭐ The salt, smelled in the shop (and named by the analyzer).
      const nosed = await sayAwaiting(page, 'smell here', /The air smells|Obvious exits|smell anything/i);
      const measured = await sayAwaiting(page, 'measure aroma', /\d OU|finds nothing|anything you could name|cannot/i);
      expect(`${nosed}\n${measured}`, 'the salted shop').toMatch(/salt|fume/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/12-salt-smelled.png', fullPage: true });

      await advance(handle, 6.5 * HOUR);
      await sayAwaiting(page, 'douse kiln', /douse|out|cannot|can't/i);
      await advance(handle, 2 * HOUR);
      await runCommand(page, 'drop analyzer');
      await sayAwaiting(page, `get #${jug} from kiln`, /You (get|pick|take)|cannot|can't|too hot/i);
      // The jug out of the salted kiln: salt-glazed stoneware, in words.
      expect(await lookFor(page, `#${jug}`, /salt/i, 60_000)).toMatch(/stoneware|glaz/i);
    } finally {
      await w.close();
    }
  });

  test('13. ⭐ steam off a boiling copper and a retort’s fumes reach the nose', async ({ browser }) => {
    test.setTimeout(1_800_000);
    const w = await walker(browser, 'mmo-steam', BOILING);
    const { page, handle } = w;
    try {
      // From 18:30, not merely "after hours": the boil and the retort take
      // six hours, and a step begun at 04:00 met the refiner back at 06:00.
      await toHour(handle, 18.5);
      // The glowcap set down to light the floor: the copper wants a free hand
      // (the walk's first fresh run: "Your hands are full").
      await runCommand(page, 'drop jar');
      // Plain water in the copper (what the refiner left in it spilled
      // first), and the copper SET ON the arch — `heat <pot>` is retired (the
      // wire drive's run 1).
      await sayAwaiting(page, 'get copper', /You (get|pick|take)|cannot|can't/i);
      await sayAwaiting(page, 'spill copper', /spill|empty|nothing|cannot|can't/i);
      expect(await sayAwaiting(page, 'put copper on arch', /You put|You set|cannot|can't/i)).not.toMatch(NOT_UNDERSTOOD);
      // The hygrometer after the copper: the copper takes both hands.
      await hand(handle, T.hygrometer);
      const dry = figure(await sayAwaiting(page, 'measure humidity', /%|humid|cannot/i), /humid|%/i);
      await sayAwaiting(page, 'pour butt into copper --amount 20L', /You pour|cannot|can't/i);
      // The coal HANDED, a lump at a time: the floor's heap is the refiner's,
      // and a walked world runs out of it (the walk's runs: "You don't see
      // any 'coal' here").
      const stokeCoal = async (): Promise<void> => {
        await hand(handle, T.coal);
        // A full firebox takes no more ("There is no room in it for that").
        await sayAwaiting(page, 'stoke coal into arch', /You lay|stoke|feed|put|no room|cannot|can.t/i);
        await runCommand(page, 'drop coal');
      };
      for (let i = 0; i < 3; i++) await stokeCoal();
      await sayAwaiting(page, 'light arch', /light|catch|kindle|cannot|can't/i);
      // Kept in, as the wire drive keeps it: three lumps burn out inside the hour.
      for (let i = 0; i < 4; i++) {
        await advance(handle, 30 * 60);
        for (let j = 0; j < 2; j++) await stokeCoal();
        await sayAwaiting(page, 'light arch', /light|catch|kindle|already|cannot|can't/i);
      }
      const steamy = figure(await sayAwaiting(page, 'measure humidity', /%|humid|cannot/i), /humid|%/i);
      expect(steamy, `the boiling floor's humidity: ${dry} → ${steamy}`).toBeGreaterThan(dry);
      // ⭐ A nose two hours in a smell has stopped hearing it (`Olfactory`'s
      // adaptation); the body walking IN to a steamy room notices. Out to the
      // curing house for twenty minutes, and back.
      await sayAwaiting(page, 'go north', /Obvious exits|cannot|can't/i);
      await advance(handle, 20 * 60);
      await sayAwaiting(page, 'go south', /Obvious exits|cannot|can't/i);
      // ⭐ The steam, in `smell here` (a bare `smell` takes the last thing named).
      // …and `analyze aroma`, which names every note the nose has: a bare
      // `smell here` from an untrained nose tells only the loudest (the walk's
      // run: "strongly of smoke from a sugar arch"), as the wire drive found.
      const steamNose = await sayAwaiting(page, 'smell here', /The air smells|Obvious exits|smell anything/i);
      const steamNotes = await sayAwaiting(page, 'analyze aroma', /You pick out|anything you could name|cannot/i);
      expect(`${steamNose}\n${steamNotes}`, 'the steam, smelled').toMatch(/damp|steam|wet/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/13-steam.png', fullPage: true });

      // (staged) A retort with nothing on its pipe, handed where she stands;
      // the hygrometer set down first, so its charge and its fuel go into her
      // two hands (the walk's run: "You don't have any 'cordwood'").
      await runCommand(page, 'drop hygrometer');
      await hand(handle, T.retort);
      await hand(handle, T.charcoal);
      const cordwood = await hand(handle, T.cordwood);
      await sayAwaiting(page, 'stoke charcoal into retort', /You lay|stoke|feed|put|cannot|can.t/i);
      await sayAwaiting(page, 'light retort', /light|catch|kindle|cannot|can't/i);
      // Into the hand first: a handed length a full pair cannot take is set
      // down where she stands (the walk's runs).
      await sayAwaiting(page, `get #${cordwood}`, /You (get|pick|take)|Nothing picked up|cannot|can't/i);
      await sayAwaiting(page, `put #${cordwood} in retort`, /You put|cannot|can't/i);
      expect(await sayAwaiting(page, 'fire in retort for 3 hours', /fire|firing|seal|settle|hold it|cannot|can.t/i)).not.toMatch(NOT_UNDERSTOOD);
      // Out for the last twenty minutes of the firing and back — a nose three
      // hours in the fumes has stopped hearing them — with an analyzer and a
      // reader trained to name what is in the air (the wire drive's run 9).
      await advance(handle, 160 * 60);
      await sayAwaiting(page, 'go north', /Obvious exits|cannot|can't/i);
      await advance(handle, 20 * 60);
      await sayAwaiting(page, 'go south', /Obvious exits|cannot|can't/i);
      await hand(handle, T.gasAnalyzer);
      for (let i = 0; i < 16; i++) await sayAwaiting(page, 'practice awareness hard success', /practi|record|deed/i);
      // ⭐ The fumes, in `smell here` (or named by the analyzer's atmosphere read).
      const fouled = await sayAwaiting(page, 'smell here', /The air smells|Obvious exits|smell anything/i);
      const air = await sayAwaiting(page, 'analyze atmosphere', /air|atmosphere|gas|nothing|cannot/i);
      expect(`${fouled}\n${air}`, 'the retort’s fumes').toMatch(/smoke|tar|acrid|creosote|pitch|gas/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/13-fumes.png', fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('15. ⭐⭐ ash heaped on the floor and watered pools its lye on the floor — the room says so', async ({ browser }) => {
    test.setTimeout(1_200_000);
    const w = await walker(browser, 'mmo-ash', CHANDLERY);
    const { page, handle } = w;
    try {
      await daylight(handle);
      // ⚠ The ash is HANDED, not bought: the wire drive funds a bank
      // account with `reserve override` and buys at the counter; the walk's
      // question is the puddle on the room's line, not the shopping.
      const heap = await hand(handle, T.woodAsh);
      await sayAwaiting(page, `drop #${heap}`, /You drop|You set|You put|don.t have/i);
      const pail = await hand(handle, T.pail, { keywords: ['pail', 'bucket', 'mmowalkpail'] });
      expect(await sayAwaiting(page, `fill #${pail} from butt`, /You fill|cannot|can't/i)).toMatch(/You fill/i);
      const watered = await sayAwaiting(page, `pour #${pail} onto #${heap}`, /You pour|soak|cannot|can't|nothing to/i);
      expect(watered, 'pour onto the heap').not.toMatch(NOT_UNDERSTOOD);
      expect(watered).not.toMatch(/can'?t|cannot|nothing to/i);
      await advance(handle, 12 * HOUR);
      await daylight(handle);

      // ⭐ The puddle of lye: on the room's line, else on its floor's.
      const PUDDLE = /puddle of[^.]*(lye|slippery|faintly yellow)/i;
      let room = '';
      try {
        room = await lookFor(page, '', PUDDLE, 20_000);
      } catch {
        room = await lookFor(page, 'floor', PUDDLE, 20_000);
      }
      expect(room).toMatch(PUDDLE);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/15-lye.png', fullPage: true });
    } finally {
      await w.close();
    }
  });
});
