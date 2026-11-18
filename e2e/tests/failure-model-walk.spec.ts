import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The failure model's live walk** — the half the wire drive cannot see
 * (review question B3).
 *
 * The wire drive (`packages/wire/tests/failure-model.dirty.wire.test.ts`)
 * asserts the envelope and the prose. This is a real Chromium against the
 * real client: a refusal's sentence as a person reads it, ONCE; a script's
 * stop line once; a misspelled reason's corrected line as a link that runs
 * when tapped; a refusal thrown deep in the bank reading like any other; a
 * pack's own reason handled by its path.
 */

const BANK = '/world/terminus/wharfside/bank';
const PUMP_DOOR = '/world/terminus/wharfside/thing/pump-house-door';
const RIDE = '/world/terminus/rejection/hanging-wood/ride';
const BILLHOOK = '/trade/forestry/thing/billhook';
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

function squash(t: string): string {
  return t.replace(/\s+/g, ' ').replace(/ ([.,)])/g, '$1');
}

async function post(path: string, data: unknown): Promise<unknown> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post(path, { data });
    expect(res.ok(), `${path}: ${await res.text()}`).toBe(true);
    return res.json().catch(() => null);
  } finally {
    await ctx.dispose();
  }
}

const stage = (path: string, method: string, ...args: unknown[]): Promise<unknown> =>
  post('/auth/test-stage', { path, method, args });

const count = (text: string, re: RegExp): number => (text.match(new RegExp(re, 'g')) ?? []).length;

test.describe('the failure model, in a browser', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    await stage(PUMP_DOOR, 'setOpen', false).catch(() => undefined);
    await stage(PUMP_DOOR, 'setLocked', true).catch(() => undefined);
  });

  test('⭐⭐ a locked door, a script that stops, and a misspelled reason whose fix is a link', async ({ browser }) => {
    test.setTimeout(600_000);
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
    const w = await openWorldAs(browser, 'fm-walk-bank', { startLocation: BANK });
    const { page } = w;
    try {
      // 1. The row's sentence, once.
      const refused = squash(await sayAwaiting(page, 'open pumphouse', /lock holds/i));
      expect(refused).toMatch(/The lock holds — the pump-house door won't open\./);
      expect(count(refused, /lock holds/)).toBe(1);

      // 2. A script stops at its first refusal: one line, naming the line.
      // `def` answers nothing; give it a beat to land.
      await runCommand(page, 'def fmwalk { open pumphouse; go pumphouse }');
      await page.waitForTimeout(1_500);
      const stopped = squash(await sayAwaiting(page, 'do fmwalk', /script stopped/i));
      expect(stopped).toMatch(/The script stopped at .?open pumphouse.?: The lock holds — the pump-house door won't open\./);
      expect(count(stopped, /lock holds/)).toBe(1);
      expect(stopped).not.toMatch(/You leave|You arrive/);

      // 5. A misspelled reason: refused at parse, the fixed line a LINK.
      const bad = 'def fmwalkbad { try { open pumphouse } on lockd { say no } }';
      const parsed = squash(await sayAwaiting(page, bad, /no reason 'lockd'/));
      expect(parsed).toMatch(/the nearest is 'locked'\. Did you mean def fmwalkbad/);
      expect(parsed).not.toMatch(/\?\./);
      // The corrected line is a tappable command (`mudcmd:`), titled with what it sends.
      const link = page.getByTitle(/Click to send: def fmwalkbad \{ try \{ open pumphouse \} on locked/).last();
      await expect(link).toBeVisible({ timeout: 30_000 });
      const before = await transcript(page);
      await link.click();
      // Tapped, the corrected line runs: it defines the script, with no refusal.
      await expect
        .poll(async () => (await transcript(page)).slice(before.length), { timeout: 30_000 })
        .toMatch(/fmwalkbad|on locked/);
      const after = (await transcript(page)).slice(before.length);
      expect(after).not.toMatch(/no reason 'lockd'/);
    } finally {
      await w.close();
    }
  });

  test('⭐ a refusal thrown deep in the bank reads like any other, and `on *` handles it', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'fm-walk-payer', { startLocation: BANK });
    const { page } = w;
    try {
      const short = squash(await sayAwaiting(page, 'pay fisher 100000 --cash', /coin/i));
      expect(short).toMatch(/You haven't the coin for 100000/);
      expect(short).not.toMatch(/BankingLogic|settle|Error|went wrong/);
      const handled = squash(await sayAwaiting(page, 'try { pay fisher 100000 --cash } on * { say Short today. }', /Short today/));
      expect(handled).not.toMatch(/script stopped/i);
    } finally {
      await w.close();
    }
  });

  test('⭐ a pack’s own reason, worded by its row and handled by its path', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'fm-walk-forest', { startLocation: RIDE });
    const { page, handle } = w;
    try {
      await post('/auth/test-hand', { handle, template: BILLHOOK });
      const wrong = squash(await sayAwaiting(page, 'fell oak with billhook', /will not take an oak/));
      expect(count(wrong, /will not take an oak/)).toBe(1);
      const handled = squash(
        await sayAwaiting(page, 'try { fell oak with billhook } on /trade/forestry/reasons/wrong-tool { say Wrong tool. }', /Wrong tool/),
      );
      expect(handled).not.toMatch(/will not take an oak/);
    } finally {
      await w.close();
    }
  });
});
