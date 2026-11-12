import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The load-on-use walk** — the player-facing steps of the load-on-use
 * drive (`packages/wire/tests/load-on-use.dirty.wire.test.ts`), typed into
 * the real client by a real Chromium. Nothing the nine rosters hold stood
 * up at boot; a person reaching each read in turn — a room and its floor,
 * the square's weather, a brine tasted, two governments, a strong drink's
 * signs, a garment's fabric, a dye — meets its row, and nothing on the
 * screen says *not resident*.
 *
 * Goods are handed through the test seam (`/auth/test-hand`).
 */

const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const SQUARE = '/world/terminus/market/square';
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const WARD = '/world/terminus/infirmary/ward';
const TAILOR = '/world/terminus/mayfield-row/tailor/location/shop';
const DYEHOUSE = '/world/terminus/wharfside/dyehouse/location/floor';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const COLD = /not resident|DocumentNotResident|went wrong/i;

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

/** Run `cmd`, wait for a reply matching `reply`; return what it added (never a cold read). */
async function sayAwaiting(page: Page, cmd: string, reply: RegExp, timeout = 60_000): Promise<string> {
  const before = await transcript(page);
  await runCommand(page, cmd);
  await expect
    .poll(async () => (await transcript(page)).slice(before.length), { timeout })
    .toMatch(reply);
  const said = (await transcript(page)).slice(before.length);
  expect(said, cmd).not.toMatch(COLD);
  return said;
}

async function hand(handle: string, template: string, data?: Record<string, unknown>): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: data ? { handle, template, data } : { handle, template } });
    expect(res.ok(), `hand ${template}: ${await res.text()}`).toBe(true);
  } finally {
    await ctx.dispose();
  }
}

/** Bring the day round — a room is read in its own light. */
async function toDaylight(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const said = await sayAwaiting(page, 'look here', /\S/);
    if (!/pitch dark|something/i.test(said)) return;
    await sayAwaiting(page, 'testharness clock advance 2h', /\S/);
  }
}

test('a person reaches every roster this build stopped booting', async ({ browser }) => {
  test.setTimeout(900_000);

  const lobby = await openWorldAs(browser, 'lou-lobby', { startLocation: LOBBY });
  try {
    await toDaylight(lobby.page);
    await sayAwaiting(lobby.page, 'look', /Duncan Hall|lobby/i);
    await sayAwaiting(lobby.page, 'look floor', /floor/i);
    await sayAwaiting(lobby.page, 'government', /City of Terminus/);
    await hand(lobby.handle, '/stuff/thing/items/bowl', {
      interiorMaterial: '/stuff/idea/material/bulk/salt-water',
      interiorAmount: 0.3,
    });
    await sayAwaiting(lobby.page, 'taste me:i:bowl', /salty/);
  } finally {
    await lobby.close();
  }

  const square = await openWorldAs(browser, 'lou-square', { startLocation: SQUARE });
  try {
    await sayAwaiting(square.page, 'look', /square/i);
    await sayAwaiting(square.page, 'analyze weather', /\S{20,}/);
  } finally {
    await square.close();
  }

  const parish = await openWorldAs(browser, 'lou-parish', { startLocation: SAWMILL });
  try {
    await sayAwaiting(parish.page, 'government', /Heart's Delight Parish/);
  } finally {
    await parish.close();
  }

  const ward = await openWorldAs(browser, 'lou-ward', { startLocation: WARD });
  try {
    for (let i = 0; i < 4; i++) {
      await hand(ward.handle, '/trade/distilling/thing/whiskey');
      await sayAwaiting(ward.page, 'open me:i:whiskey', /\S/);
      await sayAwaiting(ward.page, 'drink me:i:whiskey', /\S/);
    }
    await sayAwaiting(ward.page, 'testharness clock advance 1h', /\S/);
    await sayAwaiting(ward.page, 'assess', /You have intoxicated/);
  } finally {
    await ward.close();
  }

  const tailor = await openWorldAs(browser, 'lou-tailor', { startLocation: TAILOR });
  try {
    await hand(tailor.handle, '/trade/tailoring/thing/shirt');
    await sayAwaiting(tailor.page, 'look me:i:shirt', /linen|wool|cotton|silk|fustian|cloth/i);
  } finally {
    await tailor.close();
  }

  const dyer = await openWorldAs(browser, 'lou-dyer', { startLocation: DYEHOUSE });
  try {
    await hand(dyer.handle, '/trade/dyeing/thing/household-vat', {
      interiorMaterial: '/trade/farming/idea/material/madder',
      interiorAmount: 10,
    });
    await hand(dyer.handle, '/trade/textiles/thing/bolt');
    await sayAwaiting(dyer.page, 'dye bolt in pot', /comes up a red that will not hold/, 180_000);
  } finally {
    await dyer.close();
  }
});
