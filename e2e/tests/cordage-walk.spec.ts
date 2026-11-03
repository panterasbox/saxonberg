import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The cordage build's live walk** — the half the wire drive cannot see.
 *
 * The wire tier (`packages/wire/tests/cordage.dirty.wire.test.ts`) asserts
 * the ENVELOPE. This is a real Chromium against the real client, so it sees
 * that **the forms a person types parse** at the binder (each new verb's arg
 * gate — `tie … to … with …`, `cut … at …`, `splice … to …`, `twist … --yarns`,
 * `turn jack`, `belay <person>`) and that **the card renders the rope** in
 * words: its length, fiber, thickness, what it holds and how it was laid.
 *
 * Goods are handed through the test seam (`/auth/test-hand`) — the walk is
 * about the verbs and the words, not the shopping.
 */

const WALK = '/world/terminus/wharfside/ropewalk/location/walk';
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

/** The inspection cards' bodies, newest last. */
async function cards(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h3')].map((h) => {
      const box = h.closest('article,section,div[class*=card],div[class*=Card]') ?? h.parentElement;
      return box ? (box as HTMLElement).innerText : '';
    }),
  );
}

/** Re-look until a card matches. */
async function lookFor(page: Page, what: string, matching: RegExp, timeout = 30_000): Promise<string> {
  let body = '';
  await expect
    .poll(
      async () => {
        await runCommand(page, `look ${what}`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
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

/** The walk is open to the sky (cordage D28): bring the clock to daytime. */
async function daytime(): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL, timeout: 300_000 });
  try {
    const now = ((await (await ctx.post('/auth/test-clock', { data: {} })).json()) as { now: number }).now;
    const t = now % 86_400;
    if (t >= 8 * 3600 && t <= 14 * 3600) return;
    let hours = Math.ceil(((9 * 3600 - t + 86_400) % 86_400) / 3600);
    for (; hours > 0; hours -= 5) {
      await ctx.post('/auth/test-clock', { data: { advance: `${Math.min(5, hours)} hours` } });
    }
  } finally {
    await ctx.dispose();
  }
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the cordage build, in a browser', () => {
  test('⭐⭐ twist, the rope in words, the crew, cut/coil/splice, tie/untie, belay — every new form parses', async ({ browser }) => {
    test.setTimeout(900_000);
    await daytime();
    const w = await openWorldAs(browser, 'cordage-walk', { startLocation: WALK });
    const { page, handle } = w;
    try {
      for (let i = 0; i < 4; i++) await hand(handle, '/trade/cordage/thing/hemp-yarn');
      await hand(handle, '/trade/cordage/thing/rigging-knife');

      // ⚠ The counter's coils and painters share the keyword: a player names
      // their own rope through the inventory (`me:i:rope`).

      // ── The walk itself, by daylight or not, and its jack ──
      // `look` renders to the card; the transcript carries only the notice.
      expect(await lookFor(page, '', /the ropewalk[\s\S]*a rope jack/)).toMatch(/the ropekeeper/);

      // ── twist: yarn → strand (the form `twist yarn --yarns n --length m`) ──
      for (let i = 0; i < 3; i++) {
        // Laying is real time: wait for the strand to be finished, not begun.
        const t = await sayAwaiting(page, 'twist yarn --yarns 10 --length 3', /twisted into one strand|don't understand|cannot|need/i, 240_000);
        expect(t, 'twist yarn').not.toMatch(NOT_UNDERSTOOD);
        expect(t, 'twist yarn').toMatch(/twisted into one strand/);
      }
      expect(await lookFor(page, 'me:i:strand:[1]', /meters of hemp strand/)).toMatch(/hockles|wanders|evenly/);

      // ── strands → rope; the card tells length, fiber, thickness, strength, the lay ──
      await sayAwaiting(page, 'twist strands', /close up into a rope/i, 240_000);
      const rope = await lookFor(page, 'me:i:rope', /meters of hemp rope, about \d+ mm thick; it would hold/, 240_000);
      expect(rope).toMatch(/hockles|wanders|evenly/);
      expect(await sayAwaiting(page, 'analyze lay me:i:rope', /laid from \w+ yarn/)).not.toMatch(NOT_UNDERSTOOD);

      // ── the crew: take the wheel, or find the keeper has it ──
      const turned = await sayAwaiting(page, 'turn jack', /crank|already has the wheel/i);
      if (/crank/.test(turned)) await sayAwaiting(page, 'turn back jack', /let go/i);

      // ── cut … at …, coil, splice … to … ──
      await sayAwaiting(page, 'cut me:i:rope at 1 m', /knife goes through|measure off/i, 120_000);
      await sayAwaiting(page, 'coil me:i:rope:[1]', /coil/i, 120_000);
      expect(await sayAwaiting(page, 'splice me:i:rope:[1] to me:i:rope:[2]', /one rope now|untie|same rope|splice/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── tie … to … with …, untie ──
      const tied = await sayAwaiting(page, 'tie me:i:rope to counter with clove hitch', /tie|tied|clove hitch|not here/i);
      expect(tied).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, 'untie me:i:rope', /untie|not tied/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── belay <person>: the form parses and the refusal says what lifts it ──
      const belay = await sayAwaiting(page, 'belay ropekeeper', /not tied on|hold the rope|holding no rope|belay whom/i);
      expect(belay).not.toMatch(NOT_UNDERSTOOD);
    } finally {
      await w.close();
    }
  });
});
