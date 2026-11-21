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
const BOILING = `${SH}/location/ground/boiling-floor`;
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const CROWSFOOT = '/world/terminus/goods-yards/crowsfoot/location/floor';
const POTTERS_SHOP = '/world/terminus/hearts-delight/brickfield/location/potters-shop';
const CREAMERY = '/world/terminus/hearts-delight/creamery/location/floor';
const CHANDLERY = '/world/terminus/wharfside/chandlery/location/floor';

/* ───────────────────────────── rows ───────────────────────────── */

const T = {
  glowcap: '/world/terminus/rejection/thing/glowcap-jar',
  cone: '/trade/sugar/thing/cone',
  pail: '/stuff/thing/vessel/pail',
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
        const added = (await transcript(page)).slice(before.length);
        const fresh = (await cards(page)).filter((c) => !oldCards.has(c));
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
      const held = await sayAwaiting(page, `analyze boil #${cone}`, /holding more than it can keep|It is |cannot|nothing to/i);
      expect(held, 'analyze boil').not.toMatch(NOT_UNDERSTOOD);
      expect(held).toMatch(/holding more than it can keep, and nothing has started it/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/01-held.png', fullPage: true });

      // The pinch of sugar: the floor's piece, put in.
      expect(await sayAwaiting(page, 'get piece', /You (get|pick|take)|don't see/i)).toMatch(/You (get|pick|take)/i);
      expect(await sayAwaiting(page, `put piece in #${cone}`, /You put|cannot|can't/i)).toMatch(/You put/i);
      await advance(handle, 30 * 60);

      const started = await sayAwaiting(page, `analyze boil #${cone}`, /It is |holding|grain|set|cannot/i);
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
        interiorPayload: { dissolvedSolidsKgPerL: 0.37 },
      });
      await sayAwaiting(page, `drop #${crock}`, /You drop|You set|You put/i);
      await advance(handle, HOUR);
      // Nothing has set on its own.
      expect(await sayAwaiting(page, 'look crystals', /don't see|no crystals|nothing|crystals/i)).toMatch(/don't see|no crystals|nothing/i);

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
      for (const id of [a, b, c]) await sayAwaiting(page, `drop #${id}`, /You drop|You set|You put/i);

      // Emptied (into the slop bucket), B washed, all three filled with water.
      for (const id of [a, b]) {
        const poured = await sayAwaiting(page, `pour #${id} into "slop bucket"`, /You pour|cannot|can't|don't see/i);
        if (!/You pour/i.test(poured)) await sayAwaiting(page, `spill #${id}`, /spill|pour|empty/i);
      }
      expect(await sayAwaiting(page, `fill #${a} from standpipe`, /You fill|cannot|can't/i)).toMatch(/You fill/i);
      expect(await sayAwaiting(page, `wash #${b}`, /wash|scrub|rinse|cannot|can't/i, 180_000)).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, `fill #${b} from standpipe`, /You fill|cannot|can't/i)).toMatch(/You fill/i);
      expect(await sayAwaiting(page, `fill #${c} from standpipe`, /You fill|cannot|can't/i)).toMatch(/You fill/i);
      await advance(handle, 3 * HOUR);

      // ⭐ The smell line names the spirit in water from a whiskey cask.
      const smelt = await sayAwaiting(page, `smell #${a}`, /smell|scent|nothing/i);
      const nosed = await sayAwaiting(page, `analyze aroma #${a}`, /aroma|spirit|alcohol|whisk|nothing|cannot/i);
      expect(`${smelt}\n${nosed}`, 'the water in the whiskey cask').toMatch(/spirit|alcohol|whisk/i);
      // Less once washed; the pitched cask gives nothing.
      const figA = figure(await sayAwaiting(page, `measure aroma #${a}`, /OU|nothing|no /i), /spirit|alcohol|whisk/i);
      const figB = figure(await sayAwaiting(page, `measure aroma #${b}`, /OU|nothing|no /i), /spirit|alcohol|whisk/i);
      expect(figA, 'the unwashed cask gave no measurable spirit').toBeGreaterThan(0);
      expect(Number.isFinite(figB) ? figB : 0, 'washed, the cask gave as much').toBeLessThan(figA);
      expect(await sayAwaiting(page, `analyze aroma #${c}`, /aroma|smell|nothing|cannot|\./i)).not.toMatch(/beer|ale\b|spirit|alcohol/i);
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
      await sayAwaiting(page, `drop #${d}`, /You drop|You set|You put/i);
      const condition = await sayAwaiting(page, `analyze condition #${d}`, /It is |work|cannot/i);
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
      const crockRead = await sayAwaiting(page, 'measure aroma "butter crock"', /OU|nothing|no |cannot/i);
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
      const churnRead = await sayAwaiting(page, 'measure aroma churn', /OU|nothing|no |cannot/i);
      const first = figure(churnRead, /cream/i);
      expect(first, `no cream in the fresh milk in the churn: ${churnRead}`).toBeGreaterThan(0);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/10-churn.png', fullPage: true });

      // Emptied, washed, refilled: less.
      await sayAwaiting(page, `pour churn into #${milkA}`, /You pour|empty/i);
      expect(await sayAwaiting(page, 'wash churn', /wash|scrub|rinse|cannot|can't/i, 180_000)).not.toMatch(NOT_UNDERSTOOD);
      const milkB = await hand(handle, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
      await sayAwaiting(page, `pour #${milkB} into churn`, /You pour/i);
      await advance(handle, 2 * HOUR);
      const second = figure(await sayAwaiting(page, 'measure aroma churn', /OU|nothing|no |cannot/i), /cream/i);
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
      await hand(handle, T.gasAnalyzer);
      // (staged, as in the wire drive) A bone-dry green jug of stoneware clay.
      const jug = await hand(handle, T.ceramicJug, { keywords: ['jug', 'pot', 'mmowalkjug'], _materialPath: M.clay, _moisture: 0 });
      expect(await sayAwaiting(page, `put #${jug} in kiln`, /You put|cannot|can't/i)).toMatch(/You put/i);
      expect(await sayAwaiting(page, 'get 1 salt', /You (get|pick|take)|don't see/i)).toMatch(/You (get|pick|take)/i);
      expect(await sayAwaiting(page, 'put salt in kiln', /You put|cannot|can't/i)).toMatch(/You put/i);
      for (let i = 0; i < 6; i++) {
        await sayAwaiting(page, 'get 1 charcoal', /You (get|pick|take)|don't see/i);
        await sayAwaiting(page, 'stoke charcoal into kiln', /stoke|feed|put|cannot|can't/i);
      }
      await sayAwaiting(page, 'light kiln', /light|catch|kindle|cannot|can't/i);
      expect(await sayAwaiting(page, 'fire kiln for 10 hours', /fire|firing|cannot|can't/i)).not.toMatch(NOT_UNDERSTOOD);
      await advance(handle, 6 * HOUR);

      // ⭐ The salt, smelled in the shop (and named by the analyzer).
      const nosed = await sayAwaiting(page, 'smell', /smell|scent|air|nothing/i);
      const air = await sayAwaiting(page, 'analyze atmosphere', /air|atmosphere|gas|nothing|cannot/i);
      expect(`${nosed}\n${air}`, 'the salted shop').toMatch(/salt|fume/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/12-salt-smelled.png', fullPage: true });

      await advance(handle, 3.5 * HOUR);
      await sayAwaiting(page, 'douse kiln', /douse|out|cannot|can't/i);
      await advance(handle, 4 * HOUR);
      await sayAwaiting(page, `get #${jug} from kiln`, /You (get|take)|cannot|can't|too hot/i);
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
      await afterHours(handle);
      await hand(handle, T.hygrometer);
      const dry = figure(await sayAwaiting(page, 'measure humidity', /%|humid|cannot/i), /humid|%/i);
      // Plain water in the copper, an arch fire under it.
      await sayAwaiting(page, 'pour butt into copper --amount 20L', /You pour|cannot|can't/i);
      for (let i = 0; i < 3; i++) await sayAwaiting(page, 'stoke coal into arch', /stoke|feed|put|cannot|can't/i);
      await sayAwaiting(page, 'light arch', /light|catch|kindle|cannot|can't/i);
      expect(await sayAwaiting(page, 'heat copper', /heat|fire|cannot|can't/i)).not.toMatch(NOT_UNDERSTOOD);
      await advance(handle, 2 * HOUR);
      const steamy = figure(await sayAwaiting(page, 'measure humidity', /%|humid|cannot/i), /humid|%/i);
      expect(steamy, `the boiling floor's humidity: ${dry} → ${steamy}`).toBeGreaterThan(dry);
      // ⭐ The steam, in `smell`.
      expect(await sayAwaiting(page, 'smell', /damp|steam|wet|smell|nothing/i)).toMatch(/damp|steam|wet/i);
      await page.screenshot({ path: 'test-results/matter-model-overlaps-walk/13-steam.png', fullPage: true });

      // (staged) A retort with nothing on its pipe, handed where she stands.
      await hand(handle, T.retort);
      await hand(handle, T.charcoal);
      await hand(handle, T.cordwood);
      await sayAwaiting(page, 'stoke charcoal into retort', /stoke|feed|put|cannot|can't/i);
      await sayAwaiting(page, 'light retort', /light|catch|kindle|cannot|can't/i);
      await sayAwaiting(page, 'put cordwood in retort', /You put|cannot|can't/i);
      expect(await sayAwaiting(page, 'fire in retort for 3 hours', /fire|firing|cannot|can't/i)).not.toMatch(NOT_UNDERSTOOD);
      await advance(handle, 3 * HOUR);
      // ⭐ The fumes, in `smell` (or named by the analyzer's atmosphere read).
      const fouled = await sayAwaiting(page, 'smell', /smell|scent|air|nothing/i);
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
      await sayAwaiting(page, `drop #${heap}`, /You drop|You set|You put/i);
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
