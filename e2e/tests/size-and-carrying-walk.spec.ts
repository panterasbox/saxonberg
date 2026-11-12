import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The size-and-carrying live walk** — the half the wire drive cannot see.
 *
 * The wire drive (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`)
 * asserts the ENVELOPE. This is a real Chromium against the real client, over
 * the drive's player-facing steps, reading what a person reads:
 *
 * - two mugs off Dave's back-bar go to the two hands (step 1);
 * - the inventory reads its tiers and the burden in words (step 2), and a mug
 *   put in a pocket is refused by its size while a key goes in (step 3);
 * - the walk from the treeline to the Old Steading, and the low door that
 *   wants `stoop` (step 9);
 * - another person: what they hold, their outer layer — never what is in
 *   their inner pocket (steps 12–13).
 *
 * Goods a person would buy are handed through the test seam
 * (`/auth/test-hand`) — the walk is about the carrying and the words, not the
 * shopping. Screenshots land in `test-results/size-and-carrying-walk/`.
 */

const BAR = '/world/lounge/location/bar';
const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const YARD = '/world/newbie-wilds/steading/yard';
const COAT = '/trade/tailoring/thing/coat';
const KEY = '/stuff/thing/Key';
const SWORD = '/stuff/thing/arms/sword';
const SHEET = '/platform/thing/sheet';
const LETTER = { shortDescription: 'letter', keywords: ['letter', 'paper', 'sheet'] };
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const SHOTS = process.env.SC_WALK_SHOTS ?? 'test-results/size-and-carrying-walk';

/** Words a person should never have to read. */
const GARBLED = /undefined|\[object Object\]|\bNaN\b/;
const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;
const DARK = /pitch dark|too dark to see/i;

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return what it added. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
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

/** Re-look until a card matches; return its body. */
async function lookFor(page: Page, what: string, matching: RegExp, timeout = 30_000): Promise<string> {
  let body = '';
  await expect
    .poll(
      async () => {
        await runCommand(page, what ? `look ${what}` : 'look');
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

/** Hand `template` to the character; returns its stuffId. */
async function hand(handle: string, template: string, data?: Record<string, unknown>): Promise<string> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: data ? { handle, template, data } : { handle, template } });
    const text = await res.text();
    expect(res.ok(), `hand ${template}: ${text}`).toBe(true);
    return (JSON.parse(text) as { id: string }).id;
  } finally {
    await ctx.dispose();
  }
}

/** The steading is open to the sky: bring the clock to daytime. */
async function daytime(): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL, timeout: 300_000 });
  try {
    const now = ((await (await ctx.post('/auth/test-clock', { data: {} })).json()) as { now: number }).now;
    const t = now % 86_400;
    if (t >= 8 * 3600 && t <= 14 * 3600) return;
    let hours = Math.ceil(((9 * 3600 - t + 86_400) % 86_400) / 3600);
    for (; hours > 0; hours -= 5) {
      await ctx.post('/auth/test-clock', { data: { advance: `${Math.min(5, hours)} hours` } });
    }
  } finally {
    await ctx.dispose();
  }
}

test.describe('size and carrying, in a browser', () => {
  test('⭐ 1–3 · two mugs to two hands; the inventory\'s tiers in words; a pocket takes a key and refuses a mug', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'sc-walk-bar', { startLocation: BAR });
    const { page, handle } = w;
    try {
      // A coat on first (step 3's pockets).
      await hand(handle, COAT);
      // ⚠ Putting on a coat takes time: wait for it to be on, not begun.
      await sayAwaiting(page, 'wear coat', /You put on a linen coat/i, 120_000);

      // Step 1: the back-bar's three mugs. ⚠ `get mug` takes every mug it
      // names (`get`'s targets are plural): one to each hand, and the third
      // is refused in words — the wall, met in one command.
      const got = await sayAwaiting(page, 'get mug', /hands are full|can't|don't see|which/i);
      expect(got, 'get mug').not.toMatch(NOT_UNDERSTOOD);
      expect(got.match(/You pick up a mug/g)?.length, 'a mug to each hand').toBe(2);
      expect(got, 'the third is refused, the two counted').toMatch(/Your hands are full — both mugs — and another mug won't fit in your pockets/);
      expect(got).not.toMatch(GARBLED);
      // A key handed to full hands goes to a pocket (hands first, D11).
      await hand(handle, KEY);

      // Step 2: the tiers and the burden, in words.
      const tiers = await sayAwaiting(page, 'inventory', /In hand:/);
      expect(tiers, 'both mugs in hand').toMatch(/In hand: (two mugs|a mug and a mug|[^\n]*mug[^\n]*mug)/i);
      expect(tiers).toMatch(/Worn:/);
      expect(tiers, 'the burden in words').toMatch(/light|a fair load|well laden|heavily burdened|more than you can bear/i);
      expect(tiers).not.toMatch(GARBLED);
      expect(tiers, 'no article inside a possessive').not.toMatch(/your an? /i);
      await page.screenshot({ path: `${SHOTS}/02-inventory.png`, fullPage: true });
      // A look at yourself: worn, held, and carried — a body is not a box.
      const self = await sayAwaiting(page, 'look me', /Holding:/);
      expect(self).toMatch(/Wearing:[^\n]*linen coat/);
      expect(self).toMatch(/Holding: a mug and a mug/);
      expect(self, 'a body carries; it is not "in it"').not.toMatch(/In it:/);
      expect(self).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/02-look-me.png`, fullPage: true });

      // Step 3: the coat's pocket takes a key and refuses a mug by its size.
      const which = await sayAwaiting(page, 'put key in coat', /Which|pocket/i);
      expect(which, 'four pockets: which one, by name').toMatch(/inner pocket/i);
      await sayAwaiting(page, 'put key in "inner pocket"', /inner pocket/i);
      const mug = await sayAwaiting(page, 'put mug in "left pocket"', /too big|won't fit|will not fit|doesn't fit/i);
      expect(mug).not.toMatch(GARBLED);
      const after = await sayAwaiting(page, 'inventory', /In hand:/);
      expect(after).toMatch(/inner pocket: a key/i);
      await page.screenshot({ path: `${SHOTS}/03-pocket.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 9 · the walk to the Old Steading; its low door wants a stoop, and the cottage is not dark by day', async ({ browser }) => {
    test.setTimeout(300_000);
    await daytime();
    const w = await openWorldAs(browser, 'sc-walk-steading', { startLocation: TREELINE });
    const { page } = w;
    try {
      expect(await sayAwaiting(page, 'go northwest', /steading|yard|you (go|walk|head)|northwest/i)).not.toMatch(NOT_UNDERSTOOD);
      const yard = await lookFor(page, '', /steading|yard/i);
      expect(yard, 'the yard by day').not.toMatch(DARK);
      const low = await sayAwaiting(page, 'go east', /stoop/i);
      expect(low, 'the refusal names the form to type').toMatch(/stoop east/i);
      await sayAwaiting(page, 'stoop east', /cottage|stoop/i);
      const cottage = await lookFor(page, '', /cottage/i);
      expect(cottage, 'the roofless cottage by day').not.toMatch(DARK);
      expect(cottage).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/09-cottage.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 12–13 · another person: what they hold and wear — never the letter in their inner pocket', async ({ browser }) => {
    test.setTimeout(300_000);
    await daytime();
    const bearer = await openWorldAs(browser, 'sc-walk-bearer', { startLocation: YARD });
    const viewer = await openWorldAs(browser, 'sc-walk-viewer', { startLocation: YARD });
    try {
      const b = bearer.page;
      await hand(bearer.handle, COAT);
      await sayAwaiting(b, 'wear coat', /You put on a linen coat/i, 120_000);
      await hand(bearer.handle, SHEET, LETTER);
      await sayAwaiting(b, 'put letter in "inner pocket"', /inner pocket/i);
      await hand(bearer.handle, SWORD);
      const mine = await sayAwaiting(b, 'inventory', /In hand:/);
      expect(mine, 'the bearer knows the letter is there').toMatch(/letter/i);

      const v = viewer.page;
      const room = await lookFor(v, '', /yard/i);
      expect(room).not.toMatch(DARK);
      // ⚠ The yard is busy with earlier walkers ("a human, a human, …"): a
      // player names this one by clicking them, which sends their `#id` —
      // read off the link the bearer's own `query me` draws.
      await sayAwaiting(b, 'query me', /You see/);
      const id = await b.evaluate(() => {
        const links = [...document.querySelectorAll('[data-testid="terminal"] [data-stuff-id]')];
        return links[links.length - 1]?.getAttribute('data-stuff-id') ?? '';
      });
      expect(id, "the bearer's id on their own link").not.toBe('');
      const seen = await sayAwaiting(v, `i #${id}`, /linen coat|arming sword|don't see/i);
      expect(seen).not.toMatch(NOT_UNDERSTOOD);
      expect(seen, 'what they hold').toMatch(/arming sword/i);
      expect(seen, 'their outer layer').toMatch(/linen coat/i);
      expect(seen, 'never the letter').not.toMatch(/letter|sheet of paper/i);
      expect(seen).not.toMatch(GARBLED);
      const card = await lookFor(v, `#${id}`, /linen coat|arming sword/i);
      expect(card, 'never the letter, on the card').not.toMatch(/letter|sheet of paper/i);
      expect(card).not.toMatch(GARBLED);
      await v.screenshot({ path: `${SHOTS}/12-another-person.png`, fullPage: true });
    } finally {
      await bearer.close();
      await viewer.close();
    }
  });
});
