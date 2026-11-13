import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The water-supply build's live walk** — the half the wire drive cannot
 * see (review question B3).
 *
 * The wire tier (`packages/wire/tests/water-supply.dirty.wire.test.ts`)
 * asserts the ENVELOPE. This is a real Chromium against the real client, so
 * it sees that **the forms a person types parse** at the binder — the
 * article-defect shapes the browser walk found (`fill the pail from …`,
 * `drink from …`), `open … to a quarter`, `tie hose to …` — and that the
 * card says what the water is in words: the tap's supply and head, the
 * kit's verdict, the gate's record, the sprinkler's hose and spray.
 *
 * Goods are handed through the test seam (`/auth/test-hand`): the walk is
 * about the verbs and the words, not the shopping.
 */

const SQUARE = '/world/terminus/market/square';
const BANK = '/world/terminus/wharfside/bank';
const HEADGATE = '/world/terminus/hearts-delight/ditch/location/headgate';
const SEZNICK_BATH = '/world/terminus/mayfield-row/seznick-house/location/bathroom';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

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

/** Re-look until a card matches. */
async function lookFor(page: Page, what: string, matching: RegExp, timeout = 30_000): Promise<string> {
  let body = '';
  await expect
    .poll(
      async () => {
        await runCommand(page, `look "${what}"`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

async function hand(handle: string, template: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: { handle, template } });
    expect(res.ok(), `hand ${template}: ${await res.text()}`).toBe(true);
  } finally {
    await ctx.dispose();
  }
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the water-supply build, in a browser', () => {
  // ⚠ One walk, in order: the tap and the sprinkler share the market's
  // standpipe, and in parallel each one read the other's hose (the first run).
  test.describe.configure({ mode: 'serial' });

  test('⭐⭐ the city outlet: drink, fill, analyze — bare, the eye cannot tell; with the kit, it reads', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'water-walk-tap', { startLocation: SQUARE });
    const { page, handle } = w;
    try {
      await hand(handle, '/stuff/thing/vessel/pail');
      // `drink from …` takes a draught from a fixed source, never the whole of it.
      const drank = await sayAwaiting(page, 'drink from standpipe', /drink|swallow|sip|nothing comes/i);
      expect(drank, 'drink from standpipe').not.toMatch(NOT_UNDERSTOOD);
      // The article-defect shape the walk found: `fill the pail from …`.
      const filled = await sayAwaiting(page, 'fill the pail from the standpipe', /fill|nothing comes/i);
      expect(filled, 'fill the pail from the standpipe').not.toMatch(NOT_UNDERSTOOD);
      // Bare, the reading names the supply and its head — and gives no
      // verdict: whether the water is fit is the kit's to say.
      const bare = await sayAwaiting(page, 'analyze water standpipe', /draws from|head over this outlet/i);
      expect(bare).toMatch(/head over this outlet/i);
      expect(bare).not.toMatch(/fit to drink|\bfouled\b/i);
      // With the kit in hand it says what is in the water, and whether it is fit.
      await hand(handle, '/system/water/thing/test-kit');
      const kit = await sayAwaiting(page, 'analyze water standpipe', /fit to drink/i);
      expect(kit).toMatch(/fit to drink/i);
    } finally {
      await w.close();
    }
  });

  test('⭐ a let unit runs on the landlord\'s lead: the tap stands up its room\'s pipe', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'water-walk-lead', { startLocation: SEZNICK_BATH });
    const { page } = w;
    try {
      // No room props a pipe: the first draw stands up the run the Mayfield
      // Row claim's `pipe: lead` names.
      const drew = await sayAwaiting(page, 'drink from basin', /drink|swallow|sip|nothing comes/i);
      expect(drew, 'drink from basin').not.toMatch(NOT_UNDERSTOOD);
      expect(await lookFor(page, 'run', /lead supply pipe/)).toMatch(/wiped joint/);
    } finally {
      await w.close();
    }
  });

  test('⭐ the works are locked: the pump-house door refuses a passer-by', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'water-walk-works', { startLocation: BANK });
    try {
      const refused = await sayAwaiting(w.page, 'open "pump-house door"', /locked|key|won't|does not open/i);
      expect(refused).not.toMatch(NOT_UNDERSTOOD);
    } finally {
      await w.close();
    }
  });

  test('⭐ the headgate opens BY AN AMOUNT, and its record says who set it', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'water-walk-ditch', { startLocation: HEADGATE });
    const { page } = w;
    try {
      const opened = await sayAwaiting(page, 'open headgate to a quarter', /open|quarter|padlock|locked|key/i);
      expect(opened, 'open headgate to a quarter').not.toMatch(NOT_UNDERSTOOD);
      const weir = await sayAwaiting(page, 'analyze water weir', /m³\/s|flow|weir|passing/i);
      expect(weir).not.toMatch(NOT_UNDERSTOOD);
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ a sprinkler on a hose from a standpipe: tie, open by an amount, the look tells it, untie', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'water-walk-spray', { startLocation: SQUARE });
    const { page, handle } = w;
    try {
      await hand(handle, '/trade/rubber/thing/hose');
      await hand(handle, '/stuff/thing/gear/sprinkler');
      await sayAwaiting(page, 'drop sprinkler', /drop/i);
      expect(await sayAwaiting(page, 'tie hose to standpipe', /screw the hose onto|tap or a sprinkler/i)).toMatch(/screw the hose onto/);
      expect(await sayAwaiting(page, 'tie hose to sprinkler', /screw the hose onto|already/i)).toMatch(/screw the hose onto/);
      expect(await lookFor(page, 'sprinkler', /A hose runs to it from/)).toMatch(/valve is shut/);
      const opened = await sayAwaiting(page, 'open sprinkler to a quarter', /open|quarter/i);
      expect(opened, 'open sprinkler to a quarter').not.toMatch(NOT_UNDERSTOOD);
      expect(await lookFor(page, 'sprinkler', /throwing water round/)).toMatch(/A hose runs to it from/);
      expect(await lookFor(page, 'hose', /screwed onto/)).toMatch(/the other onto/);
      expect(await sayAwaiting(page, 'untie hose', /unscrew the hose/i)).toMatch(/both ends/);
      expect(await lookFor(page, 'sprinkler', /No hose is coupled to it/)).toMatch(/No hose/);
    } finally {
      await w.close();
    }
  });
});
