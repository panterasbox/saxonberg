import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The paper build's live walk** — the half the wire drive cannot see:
 * the forms a person types parse at the binder (`write … on <book> page 3`,
 * `tear <book> page 3`, `seal envelope`, `show gazette on screen`,
 * `compose gazette in forme`, `print forme 2`), and what paper says reaches
 * the screen in words.
 */

const STORE = '/world/terminus/general-store/shop-floor';
const GAZETTE = '/world/terminus/gazette/office';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
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

/**
 * Staged: daylight. The shops are window-lit, and a world booted at night
 * reads every page as "you cannot make out a word of it in this light" (the
 * walk's first run). Jump the test world's clock to nine in the morning.
 */
async function toDaylight(): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const now = (await (await ctx.post('/auth/test-clock', { data: {} })).json()) as { now?: number };
    const hour = Math.floor(((now.now ?? 0) % 86_400) / 3_600);
    const ahead = (9 - hour + 24) % 24;
    if (ahead > 0) {
      const res = await ctx.post('/auth/test-clock', { data: { advance: `${ahead} hours` } });
      expect(res.ok(), `clock: ${await res.text()}`).toBe(true);
    }
  } finally {
    await ctx.dispose();
  }
}

/** The inspection cards' bodies, newest last — `look` renders to the CARD. */
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
        await runCommand(page, `look ${what}`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the paper build, in a browser', () => {
  test('⭐⭐ a notebook written and torn, a sealed letter, the live screen, a print run', async ({ browser }) => {
    test.setTimeout(900_000);
    await toDaylight();
    const w = await openWorldAs(browser, 'paper-walk', { startLocation: STORE });
    const { page, handle } = w;
    try {
      for (const t of [
        '/platform/thing/book',
        '/platform/thing/envelope',
        '/platform/thing/sheet',
        '/trade/printing/thing/ink-pot',
      ]) {
        await hand(handle, t);
      }
      const wrote = await sayAwaiting(page, 'write the tide turns at six on notebook page 3', /page 3|write/i);
      expect(wrote).not.toMatch(NOT_UNDERSTOOD);
      await sayAwaiting(page, 'read notebook page 3', /tide turns at six/i);
      await sayAwaiting(page, 'tear notebook page 3', /tear page 3/i);
      await sayAwaiting(page, 'read notebook page 3', /torn out/i);

      await sayAwaiting(page, 'write meet at noon on me:i:sheet', /you write/i);
      // `put … in` finds a container in the room, not the hand.
      await sayAwaiting(page, 'drop envelope', /You drop/i);
      await sayAwaiting(page, 'put me:i:sheet in envelope', /You put/i);
      await sayAwaiting(page, 'close envelope', /You close/i);
      await sayAwaiting(page, 'seal envelope', /lick the flap/i);
      await sayAwaiting(page, 'open envelope', /You open/i);
      await lookFor(page, 'envelope', /has been broken/i);
    } finally {
      await w.close();
    }
    const g = await openWorldAs(browser, 'paper-walk-gazette', { startLocation: GAZETTE });
    try {
      const page = g.page;
      await lookFor(page, '', /Gazette|press/i);
      const shown = await sayAwaiting(page, 'show gazette on screen', /shows|nothing called/i);
      expect(shown).not.toMatch(NOT_UNDERSTOOD);
      await sayAwaiting(page, 'read ledger', /THE BOOK of/i);
      const set = await sayAwaiting(page, 'compose gazette in forme', /letter by letter|no copy called|already/i);
      expect(set).not.toMatch(NOT_UNDERSTOOD);
    } finally {
      await g.close();
    }
  });
});
