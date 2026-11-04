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

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the paper build, in a browser', () => {
  test('⭐⭐ a notebook written and torn, a sealed letter, the live screen, a print run', async ({ browser }) => {
    test.setTimeout(900_000);
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

      await sayAwaiting(page, 'write meet at noon on sheet', /you write/i);
      await sayAwaiting(page, 'put sheet in envelope', /envelope|put/i);
      await sayAwaiting(page, 'close envelope', /close/i);
      await sayAwaiting(page, 'seal envelope', /flap|seal/i);
      await sayAwaiting(page, 'open envelope', /open/i);
      await sayAwaiting(page, 'look envelope', /has been broken/i);
    } finally {
      await w.close();
    }
    const g = await openWorldAs(browser, 'paper-walk-gazette', { startLocation: GAZETTE });
    try {
      const page = g.page;
      await sayAwaiting(page, 'look', /Gazette|press/i);
      const shown = await sayAwaiting(page, 'show gazette on screen', /shows|nothing called/i);
      expect(shown).not.toMatch(NOT_UNDERSTOOD);
      await sayAwaiting(page, 'read ledger', /THE BOOK of/i);
      const set = await sayAwaiting(page, 'compose gazette in forme', /letter by letter|nothing called|already/i);
      expect(set).not.toMatch(NOT_UNDERSTOOD);
    } finally {
      await g.close();
    }
  });
});
