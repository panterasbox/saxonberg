import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The boundary build's live walk** — the half the wire drive cannot see
 * (review question B3).
 *
 * The wire drive (`packages/wire/tests/boundary.dirty.wire.test.ts`) asserts
 * the envelope and the prose. This is a real Chromium against the real
 * client, so it sees what a PERSON sees of one door with two sides: the
 * navigator's arm for a locked way says so and a window's arm is not a way
 * to walk; the room card's exit chips carry the way's state; `look`'s exits
 * line agrees with both; and the words a person types (`open doors`, `look
 * west`, `go west`) parse and answer without a prompt.
 */

const BANK = '/world/terminus/wharfside/bank';
const HUT = '/world/terminus/rejection/location/glaziers-hut';
const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const PUMP_DOOR = '/world/terminus/wharfside/thing/pump-house-door';
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

/** Close up the spaces a rendered inline tag leaves: `( the oak door , locked)`. */
function squash(t: string): string {
  return t.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ ([,)])/g, '$1');
}

async function stage(path: string, method: string, ...args: unknown[]): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-stage', { data: { path, method, args } });
    expect(res.ok(), `stage ${method}: ${await res.text()}`).toBe(true);
  } finally {
    await ctx.dispose();
  }
}

/** Bring the day round — a door is seen in its room's light. */
async function toDaylight(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const said = await sayAwaiting(page, 'look here', /\S/);
    if (!/pitch dark|something/i.test(said)) return;
    await sayAwaiting(page, 'testharness clock advance 2h', /\S/);
  }
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the boundary build, in a browser', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    // Leave the shipped door as it was: shut and locked.
    await stage(PUMP_DOOR, 'setOpen', false).catch(() => undefined);
    await stage(PUMP_DOOR, 'setLocked', true).catch(() => undefined);
  });

  test('⭐⭐ the pump-house door: every screen says locked, and opening it changes them all', async ({ browser }) => {
    test.setTimeout(600_000);
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
    const w = await openWorldAs(browser, 'boundary-walk-bank', { startLocation: BANK });
    const { page } = w;
    try {
      await toDaylight(page);
      // `look`'s exits line.
      const looked = squash(await sayAwaiting(page, 'look here', /Obvious exits/));
      expect(looked).toMatch(/pumphouse \(the pump-house door, locked\)/i);
      // ⚠ The room card's exit chips are hidden while the navigator is
      // docked (it IS the exits view then), so the navigator is the card a
      // person reads here; the chips' wording is the client suite's.
      // The navigator's arm says it in its title.
      await sayAwaiting(page, 'map', /\S/);
      const arm = page.getByTestId('nav-exit-pumphouse');
      await expect(arm).toHaveAttribute('title', /through the pump-house door \(locked\)/i, { timeout: 30_000 });
      // The words parse and refuse on the bolt.
      const refused = await sayAwaiting(page, 'go pumphouse', /locked/i);
      expect(refused).not.toMatch(NOT_UNDERSTOOD);
      // One object: unlocked and opened (staged — the free side is inside),
      // every screen follows.
      await stage(PUMP_DOOR, 'setLocked', false);
      await stage(PUMP_DOOR, 'setOpen', true);
      const after = squash(await sayAwaiting(page, 'look here', /Obvious exits/));
      expect(after).toMatch(/pumphouse \(the pump-house door, open\)/i);
      await expect(arm).toHaveAttribute('title', /through the pump-house door(?! \()/i, { timeout: 30_000 });
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ the hut window: shows the hillside, is never a way to walk, and asks nothing', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'boundary-walk-hut', { startLocation: HUT });
    const { page } = w;
    try {
      await toDaylight(page);
      const looked = squash(await sayAwaiting(page, 'look here', /Obvious exits/));
      expect(looked).toMatch(/west \(the west window\)/i);
      expect(looked).not.toMatch(/pitch dark/i);
      // `look west` answers at once — no "which do you mean" between the way
      // and its window (the drive's finding).
      const west = await sayAwaiting(page, 'look west', /through the west window|which/i);
      expect(west).toMatch(/A way west, through the west window/i);
      expect(west).not.toMatch(/which (target|one)/i);
      const refused = await sayAwaiting(page, 'go west', /not a way through/i);
      expect(refused).not.toMatch(NOT_UNDERSTOOD);
      // The navigator's arm for the window does not walk.
      await sayAwaiting(page, 'map', /\S/);
      await expect(page.getByTestId('nav-exit-west')).toBeDisabled({ timeout: 30_000 });
    } finally {
      await w.close();
    }
  });

  test('⭐ Duncan Hall: the front doors by name or by way, and through them', async ({ browser }) => {
    test.setTimeout(600_000);
    const w = await openWorldAs(browser, 'boundary-walk-lobby', { startLocation: HALL_LOBBY });
    const { page } = w;
    try {
      await toDaylight(page);
      const byName = await sayAwaiting(page, 'look doors', /paneled|door/i);
      expect(byName).not.toMatch(NOT_UNDERSTOOD);
      const byWay = await sayAwaiting(page, 'look south', /A way south/i);
      expect(squash(byWay)).toMatch(/A way south, through the front doors \((open|closed)\)/i);
      const opened = await sayAwaiting(page, 'open doors', /open/i);
      expect(opened).not.toMatch(NOT_UNDERSTOOD);
      const went = await sayAwaiting(page, 'go south', /leave|arrive|south/i);
      expect(went).not.toMatch(/closed|locked|not a way/i);
    } finally {
      await w.close();
    }
  });
});
