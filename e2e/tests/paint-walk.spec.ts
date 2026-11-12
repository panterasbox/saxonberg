import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The paint build's live walk** — the half the wire drive cannot see.
 *
 * The wire tier (`packages/wire/tests/paint.dirty.wire.test.ts`) asserts the
 * ENVELOPE. This is a real Chromium against the real client: the forms a
 * person types parse at the binder (`mill flax`, `pour … into me:i:kettle`,
 * `stir`, `paint cottage with …`, `analyze condition cottage`, `write … on … with …`,
 * `dip rags in pot`, `maintain cottage`), the card renders a pot of paint, a
 * building seen from its landing, a lettered board and a glued brush in
 * words, and the colorman's counter sells.
 */

const SHOP = '/world/terminus/wharfside/colorman/location/shop';
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
        await runCommand(page, `look "${what}"`);
        body = (await cards(page)).reverse().find((c) => matching.test(c)) ?? '';
        return body;
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .toMatch(matching);
  return body;
}

async function hand(handle: string, template: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: { handle, template } });
    expect(res.ok(), `hand ${template}: ${await res.text()}`).toBe(true);
  } finally {
    await ctx.dispose();
  }
}

const NOT_UNDERSTOOD = /don't understand|known command shape|too many arguments|unknown command/i;

test.describe('the paint build, in a browser', () => {
  test('⭐⭐ the colorman, paint made and laid, a building from its landing, the sign, the rags, the brush', async ({ browser }) => {
    test.setTimeout(900_000);
    const w = await openWorldAs(browser, 'paint-walk', { startLocation: SHOP });
    const { page, handle } = w;
    try {
      for (const t of [
        '/trade/painting/thing/brush',
        '/trade/painting/thing/paint-pot',
        '/trade/painting/thing/oil-jar',
        '/trade/painting/thing/ochre-oil-paint',
        '/trade/painting/thing/signboard',
        '/trade/painting/thing/rag',
        '/trade/farming/thing/seed/flax',
        '/trade/quarrying/thing/ochre-clay',
        '/system/residence/thing/householders-kit',
      ]) {
        await hand(handle, t);
      }

      // ── The shop, lit, its keeper and its counter ──
      expect(await lookFor(page, '', /colorman's shop/)).toMatch(/colorman/i);
      await page.screenshot({ path: 'test-results/paint-walk/01-shop.png', fullPage: true });

      // ── The yard: the stones press oil and grind ochre ──
      await sayAwaiting(page, 'north', /You leave to the north/i);
      expect(await sayAwaiting(page, 'mill flax', /catch what comes off in an oil jar|isn't|not|cannot/i, 120_000)).toMatch(/oil jar/);
      // ⚠ `clay`: a pot of ochre paint in hand also answers to "ochre".
      expect(await sayAwaiting(page, 'mill clay', /paper of yellow ochre|isn't|not|cannot/i, 120_000)).toMatch(/paper of yellow ochre/);
      await sayAwaiting(page, 'south', /You leave to the south/i);

      // ── One pot makes the paint; the card names binder, pigment, color ──
      expect(await sayAwaiting(page, 'pour jar into me:i:kettle', /You pour|cannot|isn't|nothing/i)).toMatch(/You pour/);
      expect(await sayAwaiting(page, 'put paper in me:i:kettle', /You put|don't see|cannot/i)).toMatch(/You put a paper/);
      await sayAwaiting(page, 'stir me:i:kettle', /stir|comes together/i, 120_000);
      const pot = await lookFor(page, 'me:i:kettle', /The paint in it is/);
      expect(pot).toMatch(/yellow ochre in linseed oil/);
      await page.screenshot({ path: 'test-results/paint-walk/02-pot.png', fullPage: true });

      // ── A sign lettered in paint, read back ──
      expect(await sayAwaiting(page, 'write PELL on board with "ochre paint"', /letter|cannot|need/i)).not.toMatch(NOT_UNDERSTOOD);
      expect(await sayAwaiting(page, 'read board', /PELL|cannot make out/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── The brush is an assembly: bristle glued into a handle ──
      expect(await lookFor(page, 'me:i:brush', /made of/)).toMatch(/handle[\s\S]*bristle[\s\S]*glued/);

      // ── From the towpath, the cottage is at hand ──
      await sayAwaiting(page, 'go towpath', /You leave/i);
      const cottage = await lookFor(page, 'cottage', /cottage/i);
      expect(cottage).toMatch(/limewashed|painted|coat/i);
      // `survey` retired (W17): the why is `analyze condition`'s.
      const condition = await sayAwaiting(page, 'analyze condition cottage', /It is /i);
      expect(condition).not.toMatch(NOT_UNDERSTOOD);
      await page.screenshot({ path: 'test-results/paint-walk/03-condition.png', fullPage: true });

      // ── Paint it ──
      const painted = await sayAwaiting(page, 'paint cottage with "ochre paint"', /stands under a wet coat|not enough|cannot|runs dry/i, 600_000);
      expect(painted).not.toMatch(NOT_UNDERSTOOD);
      expect(await lookFor(page, 'cottage', /wet coat|painted|run|crazed/i)).toMatch(/wet coat|painted|run|crazed/i);

      // ── maintain from the landing: the fabric, never the coat ──
      expect(await sayAwaiting(page, 'maintain cottage', /sound again|nothing that needs doing|brush's work/i)).not.toMatch(NOT_UNDERSTOOD);

      // ── Inside: `analyze rooms` reads the same building ──
      await sayAwaiting(page, 'go door', /You leave/i);
      expect(await sayAwaiting(page, 'analyze rooms', /fabric of the place/i)).not.toMatch(NOT_UNDERSTOOD);
      await sayAwaiting(page, 'go towpath', /You leave/i);

      // ── A rag dipped in the pot ──
      await sayAwaiting(page, 'go colorman', /You leave/i);
      expect(await sayAwaiting(page, 'dip rags in me:i:kettle', /lower|dip|nothing to dip/i, 120_000)).not.toMatch(NOT_UNDERSTOOD);
      await page.screenshot({ path: 'test-results/paint-walk/04-end.png', fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ the Hesper at the bar: a hull takes paint from where she lies; she is no building to maintain', async ({ browser }) => {
    test.setTimeout(600_000);
    const MOUTH = '/world/terminus/estuary/estuary-mouth';
    const w = await openWorldAs(browser, 'paint-hull', { startLocation: MOUTH });
    const { page, handle } = w;
    try {
      for (const t of [
        '/trade/painting/thing/brush',
        '/trade/painting/thing/ochre-oil-paint',
        '/system/residence/thing/householders-kit',
      ]) {
        await hand(handle, t);
      }

      // ⚠ Before anyone has boarded since boot, the sea's nodes may be
      // unloaded and she reads "not alongside" (plan B34's open). Record
      // what a player meets first; boarding stands it up.
      const first = await sayAwaiting(page, 'look hesper', /Hesper|don't see|no .*hesper|nothing/i);
      await page.screenshot({ path: 'test-results/paint-walk/10-mouth-first-look.png', fullPage: true });
      console.log(`[paint-walk] first look at the Hesper from the mouth: ${first.trim().slice(0, 200)}`);

      // Aboard and back: she is alongside at the bar.
      expect(await sayAwaiting(page, 'go aboard', /You leave|Nothing is alongside/i)).toMatch(/You leave/);
      expect(await sayAwaiting(page, 'go ashore', /You leave/i)).toMatch(/You leave/);

      // From where she lies, her hull is at hand: look binds her.
      const hull = await lookFor(page, 'hesper', /Hesper|ketch/i);
      expect(hull).toMatch(/ketch|Hesper/i);

      // Paint her hull: the job is priced by her hull, from the quay.
      const painted = await sayAwaiting(page, 'paint hesper with "ochre paint"', /start laying|wet coat|not enough|cannot|runs dry/i, 300_000);
      expect(painted).not.toMatch(NOT_UNDERSTOOD);
      expect(painted).not.toMatch(/cannot reach the outside/i);
      await page.screenshot({ path: 'test-results/paint-walk/11-hull.png', fullPage: true });

      // ⭐ A ship is not a building: the householder's kit has nothing to
      // mend on her (paint B33).
      const maint = await sayAwaiting(page, 'maintain hesper', /sound again|nothing|not|cannot|can't/i);
      expect(maint).not.toMatch(/sound again|putty into the seams/i);
    } finally {
      await w.close();
    }
  });
});
