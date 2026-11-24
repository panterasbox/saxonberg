import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand, commandInput } from './helpers';

/**
 * ⭐⭐ **The which build's live walk** — the card (its requirements' drive
 * steps 12–16), the half the wire drive cannot see (review question B3).
 *
 * The wire tier (`packages/wire/tests/which.dirty.wire.test.ts`) asserts the
 * replies. This is a real Chromium against the real client: the `which`
 * card appears beside the reply, shows more as it widens, follows the
 * player when pinned, and a verb click TYPES the verb — nothing is sent.
 *
 * Stood in the testbed (`SAXONBERG_TEST_WORLD=1`).
 */

const PLAZA = '/world/testbed/location/plaza';

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`. */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 40_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  return (await transcript(page)).slice(before.length);
}

/** The `which` card's body, as a person reads it. */
async function whichCard(page: Page, matching: RegExp, timeout = 30_000): Promise<string> {
  let text = '';
  await expect
    .poll(
      async () => {
        const body = page.getByTestId('which-body').last();
        text = (await body.count()) > 0 ? await body.innerText() : '';
        return text;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return text;
}

test.describe('the which build, in a browser', () => {
  test('⭐⭐ the which card: matches the reply, widens, follows when pinned, a click types', async ({ browser }) => {
    test.setTimeout(240_000);
    // A desktop-sized window: a narrow one shows the card column as titles.
    const a = await openWorldAs(browser, 'which-walk', {
      startLocation: PLAZA,
      contextOptions: { viewport: { width: 1920, height: 1080 } },
    });
    const page = a.page;

    // 12 — the card appears beside the reply, its verbs the reply's. Pinned
    // at once: a flowing card is displaced to the Recent trail when the
    // column has no room, and pinned is how a player keeps it (and live).
    const reply = await sayAwaiting(page, 'which', /and the usual:/);
    await sayAwaiting(page, 'client-card pin which', /./);
    const card = await whichCard(page, /the usual/);
    expect(reply).toMatch(/What you can type here/);
    expect(card).not.toMatch(/\bbuy\b/);

    // 13 — wider shows more: the place, then help's line.
    await sayAwaiting(page, 'east', /./);
    await sayAwaiting(page, 'which', /the counter here/);
    await whichCard(page, /\bbuy\b/);
    // The card's own width, as the client lays it out.
    const size = async (): Promise<string | null> =>
      page.getByTestId('which-body').last().locator('xpath=ancestor::*[@data-card-size][1]').getAttribute('data-card-size');
    for (let i = 0; i < 4 && (await size()) !== 'unit'; i++) {
      await sayAwaiting(page, 'client-card shrink which', /./);
    }
    expect(await size()).toBe('unit');
    const unit = await whichCard(page, /counter/);
    expect(unit).not.toMatch(/the counter here/);
    await sayAwaiting(page, 'client-card grow which', /./);
    expect(await size()).toBe('medium');
    await whichCard(page, /the counter here/);
    // `full` is the stage: the card covers the terminal, so read the card.
    await runCommand(page, 'client-card grow which');
    await expect.poll(size, { timeout: 20_000 }).toBe('full');
    await expect(page.getByTestId('which-help-buy').last()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Buy something').or(page.getByTestId('which-help-buy')).first()).toBeVisible();
    await runCommand(page, 'client-card shrink which');
    await expect.poll(size, { timeout: 20_000 }).toBe('medium');

    // 14 — pinned (since step 12), it follows: out of the shop `buy` goes, back in it returns.
    await sayAwaiting(page, 'west', /./);
    await expect.poll(async () => (await whichCard(page, /./)).includes('buy'), { timeout: 30_000 }).toBe(false);
    await sayAwaiting(page, 'east', /./);
    await whichCard(page, /\bbuy\b/);

    // 15 — a verb click types it and sends nothing; a source click narrows.
    const before = await transcript(page);
    await page.getByTestId('which-verb-buy').last().click();
    await expect(commandInput(page)).toHaveValue('buy ');
    expect((await transcript(page)).length).toBe(before.length);
    await commandInput(page).fill('');
    await page.getByTestId('which-source').first().click();
    await expect(page.getByTestId('which-everything').last()).toBeVisible({ timeout: 20_000 });

    // 16 — the usual row opens; `which ~` shows the words with meanings.
    await page.getByTestId('which-everything').last().click();
    const usual = page.getByTestId('which-usual').last();
    await usual.locator('summary').click();
    await expect(usual).toContainText('look');
    await sayAwaiting(page, 'which ~', /~here/);
    await expect(page.getByTestId('which-relations').last()).toContainText('the place you stand in', { timeout: 20_000 });

    await a.close();
  });
});
