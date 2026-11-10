import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, openWorldAsFounder, runCommand } from './helpers';

/**
 * ⭐⭐ **The controller-liquidity live walk** — the half the wire drive cannot
 * see (review question B3).
 *
 * The wire drive (`packages/wire/tests/controller-liquidity.dirty.wire.test.ts`)
 * asserts the ENVELOPE. This is a real Chromium against the real client, so
 * it reads what a person reads over the player-facing steps (4–9, 11–12):
 * the quote hint as a sentence with a form you can type back; `help` for the
 * three representatives; the nested cockpit forms; `look here` on the river
 * against `look me:e`; `eat … --top`; a `values:` refusal; a duration taken
 * in its written forms; and the replaced `harvest` controller's own words
 * (step 1's re-point through the CMS, as !527's step 16).
 *
 * ⚠ One test per concern, each with its own mint. Screenshots land in
 * `test-results/controller-liquidity-walk/`.
 */

const SQUARE = '/world/terminus/market/square';
const STORE = '/world/terminus/general-store/shop-floor';
const SMITHY = '/world/terminus/hearthworks/location/smithy';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const REALTY = '/world/terminus/realty/office';
const TERMINUS = '/world/terminus';
const LOUNGE = '/world/lounge';
const ORANGE = '/trade/farming/thing/orange';
const BAG = '/trade/papermaking/thing/bag';
const HARVEST_VIEW = '/platform/cmd/inventory/harvest';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const SHOTS = 'test-results/controller-liquidity-walk';

const SEATED = { wizard: true, committees: [TERMINUS, LOUNGE] };

/** Words a person should never have to read. */
const GARBLED = /undefined|\[object Object\]|\bNaN\b/;

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

/** Hand `template` to the character; returns its stuffId. */
async function hand(handle: string, template: string, data?: Record<string, unknown>): Promise<string> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  try {
    const res = await ctx.post('/auth/test-hand', { data: data ? { handle, template, data } : { handle, template } });
    const text = await res.text();
    expect(res.ok(), `hand ${template}: ${text}`).toBe(true);
    return (JSON.parse(text) as { id: string }).id;
  } finally {
    await ctx.dispose();
  }
}

test.describe('controller liquidity, in a browser', () => {
  test('⭐ 6 · the quote hint is a sentence, and the form it names can be typed back', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-quote', { startLocation: STORE });
    const { page } = w;
    try {
      const said = await sayAwaiting(page, 'buy padded gambeson', /quote a name with a space in it/);
      expect(said).toMatch(/buy "padded gambeson"/);
      expect(said).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/06-quote-hint.png`, fullPage: true });
      // Typed back as printed, the line binds (money is another matter).
      const back = await sayAwaiting(page, 'buy "padded gambeson"', /gambeson/i);
      expect(back, 'no hint the second time').not.toMatch(/quote a name with a space in it/);
      // `say` still takes a whole sentence.
      await sayAwaiting(page, 'say a coat of many layers', /a coat of many layers/);
    } finally {
      await w.close();
    }
  });

  test('⭐ 8 · `help` lists the new forms of notify, draught and dry', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-help', { startLocation: SQUARE });
    const { page } = w;
    try {
      const notify = await sayAwaiting(page, 'help notify', /notify set/);
      expect(notify).toMatch(/notify move/);
      expect(notify).toMatch(/notify show/);
      // ⚠ Wait on the page itself, not the echoed line.
      const draught = await sayAwaiting(page, 'help draught', /banked/);
      expect(draught).toMatch(/wide/);
      const dry = await sayAwaiting(page, 'help dry', /dry <target> with <cloth>/);
      expect(dry, 'the usage line keeps its <…> through the renderer').not.toMatch(/&lt;|&gt;/);
      expect(dry).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/08-help.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 7 · a `values:` word refused with its list; a duration in its written forms', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-values', { startLocation: SMITHY });
    const { page } = w;
    try {
      const bad = await sayAwaiting(page, 'draught forge medium', /is not one of/);
      expect(bad).toMatch(/wide/);
      expect(bad).toMatch(/banked/);
      await page.screenshot({ path: `${SHOTS}/07-values.png`, fullPage: true });
      const notDur = await sayAwaiting(page, 'press publish walk --expires 10', /is not a duration/);
      expect(notDur).toMatch(/90s, 15m, 2h/);
      const dur = await sayAwaiting(page, 'press publish walk --expires 2 hours', /./);
      expect(dur, 'two words are one duration').not.toMatch(/is not a duration/);
    } finally {
      await w.close();
    }
  });

  test('⭐ 9 · a layout named `list` is saved and recalled', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-layout', { startLocation: SQUARE });
    const { page } = w;
    try {
      await runCommand(page, 'cockpit layout save list');
      await expect.poll(async () => transcript(page), { timeout: 30_000 }).toMatch(/list/);
      const recalled = await sayAwaiting(page, 'cockpit layout recall list', /list/);
      expect(recalled).not.toMatch(/unknown|not a layout|no such/i);
      await page.screenshot({ path: `${SHOTS}/09-layout.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 4 · `eat orange --top` has none at hand; plain `eat orange` finds it in the bag', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-eat', { startLocation: SQUARE, ...SEATED });
    const { page, handle } = w;
    try {
      const bag = await hand(handle, BAG);
      const orange = await hand(handle, ORANGE);
      await sayAwaiting(page, `put #${orange} in #${bag}`, /You put/i);
      const top = await sayAwaiting(page, 'eat orange --top', /./);
      expect(top).not.toMatch(/You eat|You start eating/i);
      await sayAwaiting(page, 'eat orange', /orange/i);
      await page.screenshot({ path: `${SHOTS}/04-eat.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 5 · in a canoe on the river, `look here` reads the water and `look me:e` the canoe', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'cliq-river', { startLocation: PUT_IN, ...SEATED });
    const { page } = w;
    try {
      await sayAwaiting(page, 'go canoe', /canoe/i);
      await sayAwaiting(page, 'launch', /floats/i);
      const here = await sayAwaiting(page, 'look here', /./);
      const boat = await sayAwaiting(page, 'look me:e', /canoe/i);
      expect(here).not.toEqual(boat);
      expect(here).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/05-look-here.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐ 1 · a re-pointed `harvest` view speaks in the replacement\'s words', async ({ browser }) => {
    test.setTimeout(300_000);
    const gov = await openWorldAsFounder(browser, { startLocation: SQUARE });
    const install = async (controller: string): Promise<void> => {
      const api = gov.context.request;
      const { token } = (await (await api.get(`${SERVER_URL}/api/cms/csrf`)).json()) as { token: string };
      const read = (await (
        await api.get(`${SERVER_URL}/api/cms/read?backend=document&path=${encodeURIComponent(HARVEST_VIEW)}`)
      ).json()) as { content?: string; body?: string };
      const data = JSON.parse(read.content ?? read.body ?? '') as Record<string, unknown>;
      const res = await api.post(`${SERVER_URL}/api/cms/write`, {
        headers: { 'content-type': 'application/json', 'X-CMS-CSRF': token },
        data: { backend: 'document', path: HARVEST_VIEW, body: JSON.stringify({ ...data, controller }) },
      });
      expect(res.status(), `the CMS took the view: ${await res.text()}`).toBe(200);
    };
    // Installed BEFORE the player enters: a session reads its views as it enters.
    await install('/platform/idea/cmd/inventory/HarvestWordedController');
    const w = await openWorldAs(browser, 'cliq-worded', { startLocation: SQUARE });
    try {
      // The square keeps other runs' pots: the binder may ask which first —
      // take the first chip; the worded refusal (or harvest) follows.
      const WORDS = /The harvest will not go that way \(|The harvest comes in|You set to/;
      // Let the session settle before the first act (a prompt sent in the
      // first moments of a page reached no chip bar once).
      await sayAwaiting(w.page, 'look', /market square/i);
      const before = await transcript(w.page);
      await runCommand(w.page, 'harvest');
      const prompt = w.page.getByPlaceholder('Click a choice above, or Esc to return to commands');
      await expect
        .poll(
          async () => {
            if (await prompt.isVisible()) {
              await w.page.locator('button:not([data-stuff-id]):not([aria-label]):not([title])', { hasText: /pot|bed|field/i }).first().click();
            }
            return (await transcript(w.page)).slice(before.length);
          },
          { timeout: 60_000 },
        )
        .toMatch(WORDS);
      const said = (await transcript(w.page)).slice(before.length);
      expect(said).not.toMatch(GARBLED);
      await w.page.screenshot({ path: `${SHOTS}/01-worded.png`, fullPage: true });
    } finally {
      await install('/platform/idea/cmd/inventory/HarvestController').catch(() => undefined);
      await w.close();
      await gov.close();
    }
  });
  test('⭐ 11–12 · a refused purchase reads plainly; an introduction is heard by the room', async ({ browser }) => {
    test.setTimeout(240_000);
    const a = await openWorldAs(browser, 'cliq-intro-a', { startLocation: REALTY });
    const b = await openWorldAs(browser, 'cliq-intro-b', { startLocation: REALTY });
    try {
      const refused = await sayAwaiting(a.page, 'title buy nosuchlot', /./);
      expect(refused).not.toMatch(GARBLED);
      expect(refused, 'no money moved, and it says why').not.toMatch(/you buy|is yours/i);
      const before = await transcript(b.page);
      await sayAwaiting(a.page, 'introduce', /introduce/i);
      await expect.poll(async () => (await transcript(b.page)).slice(before.length), { timeout: 30_000 }).toMatch(/introduce/i);
      await b.page.screenshot({ path: `${SHOTS}/12-introduce.png`, fullPage: true });
    } finally {
      await a.close();
      await b.close();
    }
  });
});
