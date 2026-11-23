import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The naming overhaul's live walk** — the half the wire drive cannot
 * see: a person TYPES the new forms into the real client and they parse at
 * the binder — the anchors (`me:~`, `~here`, `here`, `~friends:<them>`,
 * `@<id>`), the relation spelling of `notify`, and the one naming rule
 * (`buy loaves`, `party adopt the vanguard`, a duration that will not do).
 *
 * The wire drive (`packages/wire/tests/naming-overhaul.dirty.wire.test.ts`)
 * asserts the envelopes; this asserts what the terminal shows.
 */

const SQUARE = '/world/terminus/market/square';
const BAKERY = '/world/terminus/market/bakery';
const PUT_IN = '/world/terminus/rejection/put-in/landing';

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

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command|Too many words/i;

test.describe('the naming overhaul, in a browser', () => {
  test('⭐⭐ the anchors and the one naming rule parse as a person types them', async ({ browser }) => {
    test.setTimeout(900_000);
    const w = await openWorldAs(browser, 'naming-walk', { startLocation: SQUARE });
    const { page } = w;
    try {
      // ── Anchors: what I can be asked for; here is a place ──
      const rel = await sayAwaiting(page, 'query me:~', /~here[\s\S]*~inventory|don't understand/i);
      expect(rel).not.toMatch(NOT_UNDERSTOOD);
      expect(rel).toMatch(/~reachable/);
      expect(await sayAwaiting(page, 'look here', /square|market|\w+/i)).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, 'query ~here', /square|market|\w+/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── who shows the @<id> a person can type ──
      const who = await sayAwaiting(page, 'who', /Online/i);
      expect(who).toMatch(/@\S+/);

      // ── notify speaks relations; a private ref is refused with the spelling ──
      expect(await sayAwaiting(page, 'notify set ~friends --login show', /rule for ~friends/i)).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, 'notify set friends --login show', /relation of yours|~friends/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── help search is a search, unchanged ──
      expect(await sayAwaiting(page, 'help search harb', /harbor/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── the one naming rule: a party's formation, with the article ──
      await sayAwaiting(page, 'party form walkers', /party|captain/i);
      const adopt = await sayAwaiting(page, 'party adopt the vanguard', /vanguard|formation/i);
      expect(adopt).not.toMatch(NOT_UNDERSTOOD);
      expect(adopt).not.toMatch(/no formation called/i);
    } finally {
      await w.close();
    }
  });

  test('⭐ a counter and a put-in: `buy loaves` names the bread; a duration that will not do is refused in words', async ({ browser }) => {
    test.setTimeout(600_000);
    const bake = await openWorldAs(browser, 'naming-bake', { startLocation: BAKERY });
    try {
      const loaves = await sayAwaiting(bake.page, 'buy loaves', /loaf|can't cover|afford|funds|zorkmid|isn't for sale/i);
      expect(loaves).not.toMatch(NOT_UNDERSTOOD);
      expect(loaves).not.toMatch(/isn't for sale here/i);
    } finally {
      await bake.close();
    }
    const put = await openWorldAs(browser, 'naming-rent', { startLocation: PUT_IN });
    try {
      const soon = await sayAwaiting(put.page, 'rent canoe for soon', /length of time/i);
      expect(soon).toMatch(/'soon' is not a length of time this takes/);
      const minutes = await sayAwaiting(put.page, 'rent canoe for 90 minutes', /length of time/i);
      expect(minutes).toMatch(/whole days/);
    } finally {
      await put.close();
    }
  });
});
