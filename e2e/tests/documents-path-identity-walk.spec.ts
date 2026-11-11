import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The documents walk** — the player-facing steps of the documents
 * path-identity drive, typed into the real client by a real Chromium: the
 * vocabularies this build moved into the document tree, reached the way a
 * person reaches them. A tannery by nose, two emotes by word, a bedroom
 * surveyed, a concept looked up, a government read, a formation adopted —
 * none of it loaded at startup, all of it there when typed.
 */

const YARD = '/world/terminus/wharfside/tannery/location/yard';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';

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

test('a person reaches every moved vocabulary by typing its word', async ({ browser }) => {
  test.setTimeout(600_000);

  const yard = await openWorldAs(browser, 'docs-yard', { startLocation: YARD });
  const air = await sayAwaiting(yard.page, 'smell', /The air smells/);
  expect(air).toMatch(/of (tannin|hide)/);

  const lobby = await openWorldAs(browser, 'docs-lobby', { startLocation: LOBBY });
  await sayAwaiting(lobby.page, 'smile', /You smile/);
  await sayAwaiting(lobby.page, 'agree', /You agree/);
  await sayAwaiting(lobby.page, 'help extraction', /bran|endosperm|germ/i);
  await sayAwaiting(lobby.page, 'government', /City of Terminus/);
  await sayAwaiting(lobby.page, 'party form wardens', /You form/i);
  await sayAwaiting(lobby.page, 'party adopt vanguard', /adopts the vanguard formation/i);
  await sayAwaiting(lobby.page, 'party disband', /disband/i);
  await sayAwaiting(lobby.page, 'competence', /Competence|not yet practiced/i);

  const dorm = await openWorldAs(browser, 'docs-dorm', { startLocation: DORM });
  await sayAwaiting(dorm.page, 'survey', /a bedroom: (yes|not quite)/);
});
