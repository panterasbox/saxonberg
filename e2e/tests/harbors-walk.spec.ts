import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { openWorldAs, openWorldAsFounder } from './helpers';

/**
 * ⭐⭐ **The harbors build's live walk** — the half the wire drive cannot
 * see: the rendered client, as a player types it.
 *
 * ⚠ Not a gate. It is an exploratory walk: every command's reply (what it
 * added to the terminal) is written to a transcript and every station is
 * screenshotted, and a person reads both. It asserts only that the client
 * stayed up. Run it against a FRESH world (the yard sells its two hulls
 * once): `E2E_SERVER_URL`/`E2E_CLIENT_URL` at your own server (started with
 * `AUTH_MODE=test SAXONBERG_TEST_WORLD=1`) and Vite client, and
 * `HARBORS_WALK_OUT` at the directory for the transcript and screenshots.
 */

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const OUT = process.env.HARBORS_WALK_OUT ?? 'test-results/harbors-walk';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const HINKLEY = process.env.HARBORS_WALK_LOT ?? '/world/terminus/hinkley-hills/location/lane';

const INPUT = /Enter command|Type your answer|y \/ n|Type a number|Click a choice/;

async function transcript(page: Page): Promise<string> {
  return page.getByTestId('terminal').innerText();
}

let shot = 0;
async function snap(page: Page, name: string): Promise<void> {
  shot += 1;
  // The card feed reads newest at the BOTTOM and does not follow it: scroll
  // it there, or every screenshot shows the walk's first cards.
  await page
    .getByTestId('card-feed')
    .evaluate((feed) => {
      for (const el of [feed, ...Array.from(feed.querySelectorAll('*'))]) {
        if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
      }
    })
    .catch(() => undefined);
  await page.screenshot({ path: `${OUT}/${String(shot).padStart(2, '0')}-${name}.png`, fullPage: true });
}

/** Type `cmd` into whatever the bar is asking for; log what it added. */
async function say(page: Page, cmd: string, settleMs = 4_000): Promise<string> {
  const before = await transcript(page);
  const input = page.getByPlaceholder(INPUT).first();
  await input.fill(cmd);
  await input.press('Enter');
  await page.waitForTimeout(settleMs);
  const added = (await transcript(page)).slice(before.length).trim();
  appendFileSync(`${OUT}/transcript.txt`, `\n>>> ${cmd}\n${added}\n`);
  return added;
}

async function post(path: string, data: unknown): Promise<string> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post(path, { data });
    return `${res.status()} ${await res.text()}`;
  } finally {
    await ctx.dispose();
  }
}

test.describe('the harbors build, in a browser', () => {
  test('the quay, the Hesper, the yard, the put-in, the chandler', async ({ browser }) => {
    test.setTimeout(3_600_000);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/transcript.txt`, `harbors walk ${new Date().toISOString()}\n`);

    // A funded player: an account opened, money from the reserve.
    let w = await openWorldAs(browser, 'hbw', { startLocation: BANK_HALL });
    let page = w.page;
    const handle = w.handle;
    /** Come back in at `loc` (a login places you; a player has no `goto`). */
    const enter = async (loc: string): Promise<void> => {
      await w.close();
      w = await openWorldAs(browser, 'hbw', { handle, startLocation: loc });
      page = w.page;
      appendFileSync(`${OUT}/transcript.txt`, `\n[logged in at ${loc}]\n`);
    };
    await say(page, 'bank open');
    const f = await openWorldAsFounder(browser, { startLocation: BANK_HALL });
    await say(f.page, `reserve override 8000 to ${handle} "harbors walk"`);
    await f.close();

    // ── The Hesper where she lies at the estuary mouth: aboard, the bilge, the charter ──
    await enter(MOUTH);
    await say(page, 'look');
    await say(page, 'look hesper');
    await say(page, 'look gangway');
    await snap(page, 'mouth');
    await say(page, 'go hesper');
    await say(page, 'look');
    await snap(page, 'deck');
    await say(page, 'measure bilge');
    await say(page, 'pump well', 8_000);
    await snap(page, 'pump-well');
    await say(page, 'go down');
    await say(page, 'charter');
    await snap(page, 'charter');
    await say(page, 'go up');

    // ── A course out to the bar, a hail, and in to the Town Quay ──
    await say(page, 'course bar');
    for (let i = 0; i < 12; i++) {
      await post('/auth/test-clock', { advance: '10 minutes' });
      const c = await say(page, 'course', 2_500);
      if (/not under way/.test(c)) break;
    }
    await snap(page, 'at-the-bar');
    for (let i = 0; i < 14; i++) {
      const h = await say(page, 'hail office', 2_500);
      if (/Berth at/.test(h)) break;
      await post('/auth/test-clock', { advance: '1 hour' });
    }
    await snap(page, 'hail');
    await say(page, 'course town-quay');
    for (let i = 0; i < 14; i++) {
      await post('/auth/test-clock', { advance: '10 minutes' });
      const c = await say(page, 'course', 2_500);
      if (/not under way/.test(c)) break;
    }
    await snap(page, 'back-in');
    await say(page, 'go ashore');

    // ── The Town Quay: the Hesper alongside ──
    await say(page, 'look');
    await snap(page, 'town-quay');
    await say(page, 'look hesper');
    await snap(page, 'look-hesper');
    await say(page, 'look gangway');
    await snap(page, 'look-gangway');
    await say(page, 'go south');
    await say(page, 'pay office');
    await snap(page, 'pay-office');

    // ── The yard: buy a smack and name her in the rendered prompt ──
    await say(page, 'go north');
    await say(page, 'go west');
    await say(page, 'go west');
    await say(page, 'go south');
    await say(page, 'look');
    await say(page, 'look "hull book"');
    await say(page, 'buy smack', 5_000);
    await snap(page, 'naming-prompt');
    const name = `Gannet${Math.random().toString(36).slice(2, 6)}`;
    await say(page, name, 6_000);
    await snap(page, 'bought');
    await say(page, 'go north');
    await say(page, 'look');
    await snap(page, 'yard-quay');
    await say(page, `go ${name.toLowerCase()}`);
    await say(page, 'look');
    await say(page, 'go down');
    await say(page, 'look');
    await snap(page, 'hold');
    await say(page, 'go up');
    await say(page, 'go ashore');
    // From the quay her way is named for her; aboard, it is `ashore`.
    await say(page, `lock "${name.toLowerCase()}"`);
    await snap(page, 'lock-from-quay');
    await say(page, `go ${name.toLowerCase()}`);
    await say(page, 'lock ashore');
    await say(page, 'unlock ashore');
    await say(page, 'go ashore');
    await say(page, 'go east');
    await say(page, 'go east');
    await say(page, 'go south');
    await say(page, 'read register');
    await snap(page, 'register');

    // ── The chandler, southwest of the Town Quay ──
    await say(page, 'go north');
    await say(page, 'look north');
    await say(page, 'go southwest');
    await say(page, 'look');
    await say(page, 'buy "caulker\'s kit"');
    await snap(page, 'chandler');
    await say(page, 'go northeast');
    await say(page, 'go north');
    await say(page, 'look');
    await say(page, 'go south');

    // ── The put-in: a rowboat bought, a canoe hired ──
    await enter(PUT_IN);
    await say(page, 'look');
    await say(page, 'look "hire book"');
    await snap(page, 'put-in');
    await say(page, 'buy rowboat', 5_000);
    await snap(page, 'rowboat');
    await say(page, 'rent canoe for 2 days', 5_000);
    await snap(page, 'canoe');

    // ── Aboard her again: maintain with the kit ──
    await enter('/world/terminus/harbor/yard/quay');
    await say(page, `go ${name.toLowerCase()}`);
    await say(page, 'maintain', 10_000);
    await snap(page, 'maintain');

    // ── A lot: what it answers to (`analyze rooms`; `survey` retired W17) ──
    await enter(HINKLEY);
    await say(page, 'look');
    await say(page, 'analyze rooms', 6_000);
    await snap(page, 'analyze-rooms');

    await expect(page.getByTestId('terminal')).toBeVisible();
    await w.close();
  });
});
