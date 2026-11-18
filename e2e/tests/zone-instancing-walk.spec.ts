import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { openWorldAs, openWorldAsFounder, sendUntil } from './helpers';

/**
 * ⭐⭐ **The zone-instancing build's live walk** — the stations the build
 * changed for a PLAYER, typed into the real client.
 *
 * Every copy of a place a warren makes is a zone of its own now: a Hinkley
 * house is a copy of the house zone named for its lot, and the Hesper's
 * rooms are a copy her warren stands. The wire drive asserts the zones; this
 * walk asserts that a person typing the ordinary words still gets through
 * the ordinary doors, and that nothing on the way says *"Something went
 * wrong"* — the class the drive found twice (the tidal mud at the estuary
 * mouth; a water place cloned onto its zone row).
 *
 * Run against a FRESH world (a lot is bought): `E2E_SERVER_URL` /
 * `E2E_CLIENT_URL` at a server started with `AUTH_MODE=test
 * SAXONBERG_TEST_WORLD=1` and its Vite client. Each command's reply goes to
 * `ZONE_WALK_OUT/transcript.txt` and each station is screenshotted.
 */

const OUT = process.env.ZONE_WALK_OUT ?? 'test-results/zone-instancing-walk';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const REGISTRY = '/world/terminus/registry/office';
const LANE = '/world/terminus/hinkley-hills/location/lane';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const DAY = 86_400;
const BROKEN = /Something went wrong|was read but is not resident|joins a copy, never the row/;

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

let shot = 0;
async function snap(page: Page, name: string): Promise<void> {
  shot += 1;
  await page.screenshot({ path: `${OUT}/${String(shot).padStart(2, '0')}-${name}.png`, fullPage: true });
}

/** Type `cmd`; log and return what it added to the transcript. */
async function say(page: Page, cmd: string, settleMs = 2_500): Promise<string> {
  const before = await transcript(page);
  const input = page.getByPlaceholder(/Enter command/).first();
  await input.fill(cmd);
  await input.press('Enter');
  await page.waitForTimeout(settleMs);
  const added = (await transcript(page)).slice(before.length).trim();
  appendFileSync(`${OUT}/transcript.txt`, `\n>>> ${cmd}\n${added}\n`);
  expect(added, `'${cmd}' broke`).not.toMatch(BROKEN);
  return added;
}

/** The direction of the way whose name matches `named`, read off a room's exits line. */
function wayTo(said: string, named: RegExp): string | null {
  const line = /Obvious exits:(.*)/.exec(said)?.[1] ?? '';
  for (const m of line.matchAll(/(\w+)(?: \(([^)]*)\))?/g)) {
    if (m[2] && named.test(m[2])) return m[1]!;
  }
  return null;
}

const OPPOSITE: Record<string, string> = {
  north: 'south', south: 'north', east: 'west', west: 'east',
  northwest: 'southeast', southeast: 'northwest', northeast: 'southwest', southwest: 'northeast',
};

/** Daylight on the lane (the clock's test route): an unlit lane at night shows no gates. */
async function daylight(): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const now = ((await (await ctx.post('/auth/test-clock', { data: {} })).json()) as { now: number }).now;
    const h = (((now % DAY) + DAY) % DAY) / 3600;
    if (h >= 8 && h < 16) return;
    const ahead = (10 - h + 24) % 24;
    await ctx.post('/auth/test-clock', { data: { advance: `${Math.round(ahead * 60)} minutes` } });
  } finally {
    await ctx.dispose();
  }
}

/** A lot nobody has bought yet, read off the plat window. */
async function availableLot(page: Page): Promise<string> {
  await sendUntil(page, 'title list', page.getByText(/lot-\d/i).first());
  for (const line of (await page.locator('body').innerText()).split('\n')) {
    const m = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
    if (m && !/sold/i.test(m[2]!)) return m[1]!;
  }
  throw new Error('availableLot: nothing on offer');
}

test.describe.serial('zone instancing, in a browser', () => {
  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/transcript.txt`, `zone-instancing walk ${new Date().toISOString()}\n`);
  });

  test('⭐ a Hinkley house: bought, walked from the lane, and out the front door again', async ({ browser }) => {
    test.setTimeout(600_000);
    // A fresh world: the founder opens an account before the reserve can fund it.
    const bank = await openWorldAsFounder(browser, { startLocation: BANK_HALL });
    try {
      await sendUntil(bank.page, 'bank open', bank.page.getByText(/You open an account|already have an account/i).first());
      await sendUntil(bank.page, 'reserve override 6000 to founder "zone walk"', bank.page.getByText(/on your override/i).first());
    } finally {
      await bank.close();
    }
    const buy = await openWorldAsFounder(browser, { startLocation: REGISTRY });
    let side = '';
    try {
      const lot = await availableLot(buy.page);
      await sendUntil(buy.page, `title buy ${lot}`, buy.page.getByText(/is yours|registrar writes the row/i).first());
      // The sale says which side of the lane its gate hangs on.
      side = /gate is on the (\w+) side/i.exec(await buy.page.locator('body').innerText())?.[1] ?? '';
      expect(side, 'the sale names the gate side').not.toBe('');
    } finally {
      await buy.close();
    }
    await daylight();

    const { page, close } = await openWorldAsFounder(browser, { startLocation: LANE });
    try {
      await say(page, 'look');
      await snap(page, 'lane');
      // The lane is walked in reaches; the lot's gate is one of the gates on
      // its side. Try each reach's gate on that side: a yard whose door opens
      // for the buyer's key is ours (the drive's `intoHall`, typed).
      // ⭐ The lane's first reach carries four lots (north, south, northwest,
      // southwest); a reach beyond stands only when its frontage sells.
      const yard = await say(page, `go ${side}`, 3_500);
      expect(yard, `through the ${side} gate into the yard`).toMatch(/yard behind the house/i);
      await snap(page, 'yard');
      // The kitchen door, wherever the (possibly mirrored) plan puts it.
      const doorDir = wayTo(yard, /\bdoor\b/i);
      const gateDir = wayTo(yard, /\bgate\b/i);
      expect(doorDir, 'the yard names its door').toBeTruthy();
      expect(gateDir, 'the yard names its gate').toBeTruthy();
      expect(await say(page, `go ${doorDir}`, 3_500), 'the buyer\'s key opens the door').toMatch(/\bhall\b/i);
      // ⭐ In the house — its own zone, a copy named for the lot.
      await snap(page, 'hall');
      for (const [there, back] of [['east', 'west'], ['west', 'east'], ['north', 'south']] as const) {
        const room = await say(page, `go ${there}`);
        if (/can't walk that way|no way/i.test(room)) continue;
        await say(page, 'look');
        await snap(page, `hall-${there}`);
        await say(page, `go ${back}`);
      }
      // ⭐ Out the way we came, through the yard and the gate, onto the lane:
      // no refusal at the copy's edge (D6 — the zones that stand).
      expect(await say(page, `go ${OPPOSITE[doorDir!]}`, 3_000)).toMatch(/yard behind the house/i);
      const out = await say(page, `go ${gateDir}`, 3_500);
      expect(out, 'back on the lane').toMatch(/Hinkley Lane/i);
      await say(page, 'look');
      await snap(page, 'lane-again');
    } finally {
      await close();
    }
  });

  test('⭐ the Hesper: aboard from the estuary mouth, below and back, ashore', async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, close } = await openWorldAs(browser, 'ziw', { startLocation: MOUTH });
    try {
      await say(page, 'look');
      await snap(page, 'mouth');
      // ⭐ Her rooms are a copy her warren stands (D12): the way aboard is
      // named for her, and her deck is HER deck.
      expect(await say(page, 'go hesper', 4_000)).toMatch(/Hesper's deck/i);
      await snap(page, 'deck');
      expect(await say(page, 'go down', 3_000)).toMatch(/hold/i);
      await snap(page, 'hold');
      expect(await say(page, 'go up', 3_000)).toMatch(/Hesper's deck/i);
      expect(await say(page, 'go ashore', 4_000)).toMatch(/estuary/i);
      await snap(page, 'ashore');
      expect(await transcript(page)).not.toMatch(BROKEN);
    } finally {
      await close();
    }
  });
});
