import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The wizard-axis cleanup's live walk** — the half the wire drive
 * cannot see (review question B3).
 *
 * The wire drive (`packages/wire/tests/wizard-axis.dirty.wire.test.ts`)
 * asserts the envelope. This is a real Chromium against the real client:
 *
 *  - ⭐ a newcomer is moved in by Katie through the choice wheel a person
 *    clicks — the path that was dead twice before this build (the views'
 *    wizard validator refused her own dispatch, and behind it she did not
 *    afford the verb to herself);
 *  - the raw desk verb typed by somebody with no seat is refused in words
 *    that name the seat (the refusal is the progression UI);
 *  - reading source is open (`git status`), and `config` names the Prime
 *    Minister to whoever is not one.
 */

const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';

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

test.describe('wizard-axis walk', () => {
  test('⭐ Katie moves a newcomer in — the wheel, clicked', async ({ browser }) => {
    test.setTimeout(240_000);
    const { page, close } = await openWorldAs(browser, 'wzwalk', { startLocation: LOBBY });
    try {
      // The lobby is unlit at night: bring the clock round to daylight.
      for (let i = 0; i < 12; i++) {
        // A lit room answers `look` on the CARD, a dark one in the
        // terminal — so read the terminal a moment after asking.
        const before = await transcript(page);
        await runCommand(page, 'look');
        await page.waitForTimeout(2500);
        if (!/pitch dark/i.test((await transcript(page)).slice(before.length))) break;
        await sayAwaiting(page, 'testharness clock advance 2h', /clock moved/i);
      }
      // A newcomer knows her as "the super" until she has introduced
      // herself, and her maintenance round takes her out of the lobby now
      // and then — ask until the wheel opens.
      const room = page.getByRole('button', { name: /I need a room/i });
      await expect(async () => {
        await runCommand(page, (await room.count()) ? 'look' : 'talk super');
        if (!(await room.isVisible())) await runCommand(page, 'talk katie');
        await expect(room).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 90_000 });
      await room.click();
      await page.getByRole('button', { name: /Mining/i }).click({ timeout: 30_000 });
      await expect(page.getByText(/You're sorted/i).first()).toBeVisible({ timeout: 30_000 });

      // The raw desk verb, typed by somebody with no seat, says whose act it is.
      await sayAwaiting(page, 'provision me', /college's staff|hall's committee/i);
    } finally {
      await close();
    }
  });

  test('reading is open; the dials name their seat', async ({ browser }) => {
    test.setTimeout(120_000);
    const { page, close } = await openWorldAs(browser, 'wzread', { wizard: true });
    try {
      await sayAwaiting(page, 'git status', /branch|clean|dirty|modified/i);
      await sayAwaiting(page, 'config combat.poise.openingTicks 3', /Prime Minister/i);
    } finally {
      await close();
    }
  });
});
