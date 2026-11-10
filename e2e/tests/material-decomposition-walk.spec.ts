import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The material decomposition's live walk** — the half the wire drive
 * cannot see (review question B3): a person types the forms, and the words
 * on the screen are the material's. Nothing a player reads should have
 * changed, except that lye stopped being food.
 *
 * Goods are handed through the test seam (`/auth/test-hand`).
 */

const SQUARE = '/world/terminus/market/square';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect.poll(async () => (await transcript(page)).slice(before.length), { timeout }).toMatch(reply);
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

test.describe('the material decomposition, in a browser', () => {
  test('⭐ gin smells, lye is not a drink, salt is salty, the assay tells an element from a mixture', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'matter-walk', { startLocation: SQUARE });
    const { page, handle } = w;
    try {
      for (const t of [
        '/trade/distilling/thing/gin',
        '/trade/chandlery/thing/lye-flask',
        '/stuff/thing/salt-crystals',
        '/stuff/thing/cutlery/table-fork',
        '/stuff/thing/armor/bronze-breastplate',
      ]) {
        await hand(handle, t);
      }
      const gin = await sayAwaiting(page, 'smell gin', /smell|scent|juniper|spirit/i);
      expect(gin).not.toMatch(NOT_UNDERSTOOD);
      const lye = await sayAwaiting(page, 'drink lye', /lye|drink|can't|burn|caustic/i);
      expect(lye).not.toMatch(/refresh|satisf|delicious/i);
      expect(await sayAwaiting(page, 'taste salt', /salt/i)).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, 'analyze chemistry fork', /Chemistry of/i)).toMatch(/symbol: Fe/);
      expect(await sayAwaiting(page, 'analyze chemistry breastplate', /Chemistry of/i)).not.toMatch(/symbol:/);
    } finally {
      await w.close();
    }
  });

  test('⭐ the wiki lists what burns and what is a metal', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'matter-wiki', { startLocation: SQUARE });
    try {
      expect(await sayAwaiting(w.page, 'wiki read main:material-combustion', /Burning/)).toMatch(/oak/i);
      expect(await sayAwaiting(w.page, 'wiki read main:material-kind-metal', /Metal/)).toMatch(/bronze/i);
    } finally {
      await w.close();
    }
  });
});
