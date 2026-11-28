import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, openWorldAsFounder, runCommand } from './helpers';

/**
 * ⭐⭐ **The call-security pass's live walk** — the half the wire drive cannot
 * see (review question B3).
 *
 * The wire drive (`packages/wire/tests/call-security-pass.wire.test.ts`)
 * asserts the envelopes. This is a real Chromium against the real client: an
 * honest player's gate still opens; and the realtor's purchase is asked of the
 * buyer in the ENGINE's words, on the buyer's own prompt — answered no, then
 * yes, typed into the command bar the way a person answers it.
 */

const PUMP_HOUSE = '/world/terminus/wharfside/pumphouse/place/house';
const REALTY = '/world/terminus/realty/office';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return what it added. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect.poll(async () => (await transcript(page)).slice(before.length), { timeout }).toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

/** Walk the realtor's tree to the engine's question; return the page text from there. */
async function toTheQuestion(page: Page): Promise<void> {
  // Ricky leads; a person answers by tapping the choice chip.
  await sayAwaiting(page, 'talk to agent', /Looking, or buying\?/);
  await page.getByText(/^\d+\. I'd like to buy a lot\.?$/).first().click();
  // "Which lot?" — the first lot on the books.
  await page.getByText(/^1\. .*lot-\d+/).first().click({ timeout: 30_000 });
  // ⭐ The question is the ENGINE's, worded from the command itself.
  await expect(page.getByText(/would have you run `?title buy [^`]+`?\. Let them\?/).first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('the call-security pass, in a browser', () => {
  test.describe.configure({ mode: 'serial' });

  test('⭐ an honest gate still opens — the thumb-turn inside the pump house', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'cs-walk-house', { startLocation: PUMP_HOUSE });
    try {
      const said = await sayAwaiting(w.page, 'unlock out', /unlock|already unlocked/i);
      expect(said).not.toMatch(/can't act for/i);
      await runCommand(w.page, 'lock out');
    } finally {
      await w.close();
    }
  });

  test("⭐⭐ the realtor's purchase is asked of the buyer: no buys nothing, yes buys the lot", async ({ browser }) => {
    test.setTimeout(600_000);
    // A fresh buyer with money of their own (the wire drive's method): an
    // account at Goodkin, and the Governor's override into it.
    const bank = await openWorldAs(browser, 'cs-walk-buyer', { startLocation: BANK_HALL });
    const handle = bank.handle;
    await sayAwaiting(bank.page, 'bank open', /account/i);
    await bank.close();
    const gov = await openWorldAsFounder(browser, { startLocation: BANK_HALL });
    await sayAwaiting(gov.page, `reserve override 20000 to ${handle} "e2e: call-security walk"`, /mints 20000/);
    await gov.close();

    const { page, close } = await openWorldAs(browser, 'cs-walk-buyer', { startLocation: REALTY, handle });
    try {
      // No.
      await toTheQuestion(page);
      const beforeNo = await transcript(page);
      await page.getByText(/^No$/).last().click();
      await expect
        .poll(async () => (await transcript(page)).slice(beforeNo.length), { timeout: 30_000 })
        .toMatch(/No hurry/);
      expect((await transcript(page)).slice(beforeNo.length)).not.toMatch(/is yours/);
      // The conversation is still open — take its way out before asking again.
      await page.getByText(/^\d+\. Thanks\.$/).first().click({ timeout: 30_000 });
      await expect(page.getByPlaceholder('Enter command...')).toBeVisible({ timeout: 30_000 });

      // Yes.
      await toTheQuestion(page);
      const beforeYes = await transcript(page);
      await page.getByText(/^Yes$/).last().click();
      await expect
        .poll(async () => (await transcript(page)).slice(beforeYes.length), { timeout: 60_000 })
        .toMatch(/is yours/);
    } finally {
      await close();
    }
  });

  test("⭐ a buyer who says yes and can't pay is TOLD — the consented command reports to their client", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, close } = await openWorldAs(browser, 'cs-walk-broke', { startLocation: REALTY });
    try {
      await toTheQuestion(page);
      const before = await transcript(page);
      await page.getByText(/^Yes$/).last().click();
      await expect
        .poll(async () => (await transcript(page)).slice(before.length), { timeout: 60_000 })
        .toMatch(/can't cover|haven't the|not enough|can't pay|afford/i);
      expect((await transcript(page)).slice(before.length)).not.toMatch(/is yours/);
    } finally {
      await close();
    }
  });
});
