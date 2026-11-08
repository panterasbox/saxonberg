import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The smell and taste walk** — the half the wire drive cannot see: a real
 * Chromium against the real client, typing what a person types. The tannery by
 * nose, the channel by instrument, the refusals in words, and a taste that says
 * how it went.
 */

const YARD = '/world/terminus/wharfside/tannery/location/yard';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';

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

test('a person can smell the world and taste what is in reach', async ({ browser }) => {
  test.setTimeout(600_000);
  const yard = await openWorldAs(browser, 'vocab-yard', { startLocation: YARD });
  const air = await sayAwaiting(yard.page, 'smell', /The air smells/);
  expect(air).toMatch(/of (tannin|hide)/);
  expect(air.replace(/\bsmell\b/, '')).not.toMatch(/\d/);
  await sayAwaiting(yard.page, 'smell tanpit', /tanpit smells/i);
  await sayAwaiting(yard.page, 'analyze aroma', /You pick out/);
  await sayAwaiting(yard.page, 'readings aroma', /gas analyzer/);
  await sayAwaiting(yard.page, 'taste', /something in reach to taste/);
  await sayAwaiting(yard.page, 'taste floor', /can't taste/);

  const lobby = await openWorldAs(browser, 'vocab-lobby', { startLocation: LOBBY });
  await sayAwaiting(lobby.page, 'measure aroma with gas', /OU|finds nothing/);

  const kitchen = await openWorldAs(browser, 'vocab-kitchen', { startLocation: COOKHOUSE });
  await sayAwaiting(kitchen.page, 'smell', /The air smells|don't perceive/);
});
