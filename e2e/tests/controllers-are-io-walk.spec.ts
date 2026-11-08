import { test, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The controllers-are-io live walk** — the half the wire drive cannot
 * see (review question B3).
 *
 * The wire drive (`packages/wire/tests/controllers-are-io.dirty.wire.test.ts`)
 * asserts the ENVELOPE: note kinds, reasons, world state. This is a real
 * Chromium against the real client, so it reads what a person reads: that
 * `wind@me:i:watch` survives the input box, that the other-offer line is a
 * sentence with a form you can type back, that the usage line's `<item>` is
 * not eaten by the renderer, that `help` reads by category, that the card's
 * chip says *answers: dip*, that a greyed offer in the radial says why, and
 * that `l` and `'hello` are the default player aliases the build says they
 * are, until `alias unset l`.
 *
 * Staged the way the wire file stages: the objects are handed through
 * `/auth/test-hand`, and anything a player could not set up in a walk's length
 * (a ripe turnip) is an `eval` from a seated wizard — a seat on the extent, not
 * a credential (wizard-axis D13).
 *
 * ⚠ One test per concern, each with its own mint, so that one red chapter does
 * not hide the others. Screenshots land in
 * `test-results/controllers-are-io-walk/`.
 */

const SQUARE = '/world/terminus/market/square';
const TERMINUS = '/world/terminus';
const LOUNGE = '/world/lounge';
const WATCH = '/world/terminus/general-store/thing/pocket-watch';
const DIP_POT = '/trade/chandlery/thing/dip-pot';
const TABLE = '/stuff/thing/fixture/table';
const SMALL_POT = '/trade/farming/thing/pot/small';
const TURNIP_SEED = '/trade/farming/thing/seed/turnip';
const MUSKET_BALL = '/stuff/thing/arms/musket-ball';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const SHOTS = 'test-results/controllers-are-io-walk';

/** A seated wizard in the square: its `eval` reaches, like the wire's `stager`. */
const SEATED = {
  startLocation: SQUARE,
  wizard: true,
  committees: [TERMINUS, LOUNGE],
};

/** Words a person should never have to read. */
const GARBLED = /undefined|\[object Object\]|\bnull\b|\bNaN\b/;

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

/**
 * Stage or read through a seated `eval`, and hand back its JSON value.
 * ⚠ One EXPRESSION — the command line splits on `;` and pipes on `||`.
 */
async function ev<T = unknown>(page: Page, expr: string): Promise<T> {
  const VALUE = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m;
  const said = await sayAwaiting(
    page,
    `eval --parcel ${TERMINUS} JSON.stringify(${expr})`,
    new RegExp(`${VALUE.source}|\\berror:|sandbox boundary denied`, 'm'),
  );
  expect(said, `eval threw: ${expr}`).not.toMatch(/\berror:|sandbox boundary denied/i);
  return JSON.parse(JSON.parse(VALUE.exec(said)![1]!) as string) as T;
}

/** The prompt the command bar shows while it waits on a chip. */
function chipPrompt(page: Page) {
  return page.getByPlaceholder('Click a choice above, or Esc to return to commands');
}

/**
 * A chip naming `name` in the bar. ⚠ By what it lacks: a card row's EntityName
 * carries `data-stuff-id`, and the slot picker (whose label is the question,
 * and so may name the same thing) an `aria-label` and a `title`.
 */
function chips(page: Page, name: RegExp) {
  return page.locator('button:not([data-stuff-id]):not([aria-label]):not([title])', { hasText: name });
}

test.describe('controllers are IO, in a browser', () => {
  test('⭐⭐ `wind@…`: the scoped forms, the question they ask, the refusal a person can read', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'caio-wind', SEATED);
    const { page, handle } = w;
    try {
      // ── One carried: the MQL scope picks it, and the input box did not eat the `@` ──
      await hand(handle, WATCH);
      await sayAwaiting(page, 'wind@me:i:watch', /You wind/i);

      // ── `say@me` says what `say` says ──
      await sayAwaiting(page, 'say@me hello', /You say, "hello"/);

      // ── Two carried: the scope asks which, on chips, and the chosen one runs ──
      await hand(handle, WATCH);
      await runCommand(page, 'wind@me:i:watch');
      await expect(chipPrompt(page), 'the bar is asking which').toBeVisible({ timeout: 30_000 });
      const offered = chips(page, /watch/i);
      await expect(offered, 'one chip per carried watch').toHaveCount(2);
      await page.screenshot({ path: `${SHOTS}/01-wind-asks-which.png`, fullPage: true });
      let before = await transcript(page);
      await offered.first().click();
      await expect
        .poll(async () => (await transcript(page)).slice(before.length), { timeout: 30_000 })
        .toMatch(/You wind/i);
      await expect(page.getByPlaceholder('Enter command...'), 'and the bar is yours again').toBeVisible();

      // ── The bare name asks too. ⚠ At least two: it searches what you can
      // reach, and the square keeps other runs' watches. ──
      await runCommand(page, 'wind@watch');
      await expect(chipPrompt(page)).toBeVisible({ timeout: 30_000 });
      await expect.poll(() => chips(page, /watch/i).count()).toBeGreaterThanOrEqual(2);
      before = await transcript(page);
      await chips(page, /watch/i).first().click();
      await expect
        .poll(async () => (await transcript(page)).slice(before.length), { timeout: 30_000 })
        .toMatch(/You wind|can't wind/i);
      await expect(page.getByPlaceholder('Enter command...')).toBeVisible();

      // ── A scope that names nothing is a sentence, not a stack trace ──
      const nonsense = await sayAwaiting(page, 'wind@nonsense', /Nothing you can reach answers to 'nonsense'\./);
      expect(nonsense).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/02-wind-nonsense.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ two offers, the first refuses: the reply names the other, and the form it prints works', async ({ browser }) => {
    test.setTimeout(420_000);
    const w = await openWorldAs(browser, 'caio-offer', SEATED);
    const { page, handle } = w;
    try {
      // A word only these two answer to: the square keeps other runs' pots.
      const word = `caiopot${Date.now().toString(36)}`;
      const plantIn = (pot: string): string =>
        `StuffApi.findById('${pot}').getContents().find(c => c.getGrowthStage)`;
      const stage = async (ripe: boolean): Promise<string> => {
        const pot = await hand(handle, SMALL_POT, {
          interiorMaterial: '/stuff/idea/material/bulk/potting-soil',
          interiorAmount: 0.5,
        });
        const seed = await hand(handle, TURNIP_SEED);
        await sayAwaiting(page, `plant #${seed} in #${pot}`, /You press the seed into the soil/);
        await sayAwaiting(page, `drop #${pot}`, /You drop/);
        await ev(page, `(StuffApi.findById('${pot}').addKeyword('${word}'), true)`);
        if (ripe) {
          await ev(page, `((p) => (p.getVigor(), p.growthStage = 'mature', p._worstLimiting = 0.9, p.isHarvestable()))(${plantIn(pot)})`);
        }
        return pot;
      };
      await stage(false);
      const ripe = await stage(true);

      // ⚠ The binder may ask which first (the wire allows one prompt). The chips
      // cannot tell two pots apart, so this takes the first and assumes it is
      // the older, unripe pot; if it is not, the harvest succeeds and the
      // OFFER poll goes red, which is the honest answer.
      const before = await transcript(page);
      await runCommand(page, `harvest ${word}`);
      const OFFER = /also answers\W+harvest\W+harvest@/;
      await expect
        .poll(
          async () => {
            if (await chipPrompt(page).isVisible()) await chips(page, /pot/i).first().click();
            return (await transcript(page)).slice(before.length);
          },
          { timeout: 60_000 },
        )
        .toMatch(OFFER);
      const said = (await transcript(page)).slice(before.length);
      expect(said, 'the refusal itself still reads').toMatch(/isn't ready|nothing ripe/);
      expect(said).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/03-other-offer.png`, fullPage: true });

      // ⭐ Typed back exactly as printed, it takes the ripe pot.
      // Up to its closing backtick when the line kept them, else one token.
      const form =
        /`(harvest@[^`\n]+)`/.exec(said)?.[1] ?? /harvest@("[^"]+"|\S+)/.exec(said)![0].replace(/\.$/, '');
      await runCommand(page, form);
      await expect
        .poll(() => ev<boolean>(page, `!${plantIn(ripe)}`), { timeout: 60_000, intervals: [2_000] })
        .toBe(true);
    } finally {
      await w.close();
    }
  });

  test('⭐ a malformed line gets every shape of the verb, and a retired word gets a plain no', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'caio-shapes', SEATED);
    const { page, handle } = w;
    try {
      await hand(handle, MUSKET_BALL);
      // ⭐ What the wire cannot catch: a `<item>` the renderer took for a tag.
      const usage = await sayAwaiting(page, 'throw ball ann', /known command shape/);
      expect(usage).toMatch(/throw <item>/);
      expect(usage).toMatch(/throw <item> to <recipient>/);
      expect(usage).toMatch(/throw <item> at <target>/);
      expect(usage, 'joined as one line').toMatch(/>\s*·\s*throw/);
      await page.screenshot({ path: `${SHOTS}/04-throw-usage.png`, fullPage: true });

      // `make` is gone: `do` is the word.
      const make = await sayAwaiting(page, 'make martini', /I don't understand 'make'/);
      expect(make).not.toMatch(GARBLED);
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ `help` by category: the index, a category, and a verb that lists who answers it', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'caio-help', { startLocation: SQUARE });
    const { page } = w;
    try {
      // ⚠ The first `help` of a world warms the catalogue, and until it is done
      // it answers no topic to everybody; so it is asked again until it answers.
      let index = '';
      await expect(async () => {
        index = await sayAwaiting(page, 'help', /Verbs, by category:/, 15_000);
      }).toPass({ timeout: 180_000 });
      for (const c of ['banking', 'crafting', 'device', 'retail']) {
        expect(index, `the index names ${c}`).toMatch(new RegExp(`\\b${c}\\b`));
      }
      await page.screenshot({ path: `${SHOTS}/05-help-index.png`, fullPage: true });

      const crafting = await sayAwaiting(page, 'help crafting', /crafting:/);
      for (const v of ['carve', 'dip', 'paint']) {
        expect(crafting, `\`help crafting\` lists ${v}`).toMatch(new RegExp(`\\b${v}\\b`));
      }
      await page.screenshot({ path: `${SHOTS}/06-help-crafting.png`, fullPage: true });

      // ⚠ A topic is a CARD, not a line of scrollback.
      await runCommand(page, 'help dip');
      const topic = page.getByTestId('card-help-topic').last();
      const answersBlock = topic.getByText(/DipPot/).first();
      await expect(answersBlock, 'the topic lists who answers it').toBeVisible({ timeout: 30_000 });
      await answersBlock.scrollIntoViewIfNeeded();
      const dip = await topic.innerText();
      expect(dip).toMatch(/answers/i);
      expect(dip).toMatch(/DipPot/);
      expect(dip).toMatch(/PaintPot/);
      await page.screenshot({ path: `${SHOTS}/06b-help-dip-answers.png`, fullPage: true });
    } finally {
      await w.close();
    }
  });

  test('⭐⭐ the dip pot: the card reads *answers: dip*, and a greyed offer says why', async ({ browser }) => {
    test.setTimeout(300_000);
    const w = await openWorldAs(browser, 'caio-card', SEATED);
    const { page, handle } = w;
    try {
      const pot = await hand(handle, DIP_POT);
      const table = await hand(handle, TABLE);

      // ── The card ──
      // ⚠ Once: every command clears the affordance answer the chip is drawn
      // from, so looking again and again never lets it arrive.
      await runCommand(page, `look #${pot}`);
      const chip = page.getByTestId('card-answers').last();
      await expect(chip).toBeVisible({ timeout: 30_000 });
      await expect(chip).toHaveText(/answers:.*\bdip\b/);
      await chip.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/07-dip-pot-card.png`, fullPage: true });

      // ── The radial opens from a named row. The square's own list is capped
      // and cluttered, so the pot goes on a table of its own, whose card lists it. ──
      await sayAwaiting(page, `drop #${table}`, /You drop/);
      await sayAwaiting(page, `put #${pot} on #${table}`, /You put|You set|You place/);
      await runCommand(page, `look #${table}`);
      const row = page.locator(`button[data-stuff-id="${pot}"]`).last();
      await expect(row, 'the table lists the pot').toBeVisible({ timeout: 30_000 });
      await row.click({ button: 'right' });
      const radial = page.getByTestId('affordance-radial');
      await expect(radial).toBeVisible({ timeout: 30_000 });

      // ── Greyed, and in words: each refusal carries more than its verb ──
      const greyed = radial.locator('button[data-state="disabled"]');
      await expect
        .poll(() => greyed.count(), { timeout: 30_000, message: 'something here is greyed' })
        .toBeGreaterThan(0);
      for (const b of await greyed.all()) {
        await expect(b).toBeDisabled();
        const verb = (await b.getAttribute('data-verb')) ?? '';
        const text = (await b.innerText()).trim();
        const why = text.slice(verb.length).trim();
        expect(why.length, `\`${verb}\` says why: "${text}"`).toBeGreaterThan(0);
        expect(why, `\`${verb}\` says it in words`).not.toMatch(GARBLED);
      }
      // ⭐ And the verb the card says it answers is on offer in its own radial.
      await expect(radial.locator('button[data-verb="dip"]')).toBeEnabled();
      await page.screenshot({ path: `${SHOTS}/08-dip-pot-radial.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await expect(radial).toBeHidden();
    } finally {
      await w.close();
    }
  });

  test('⭐ the default aliases: `l` looks, `\'hello` says, and `alias unset l` takes the word away', async ({ browser }) => {
    test.setTimeout(240_000);
    const w = await openWorldAs(browser, 'caio-alias', { startLocation: SQUARE });
    const { page, handle } = w;
    try {
      await hand(handle, WATCH);

      // ⚠ The list is a padded table, so the columns are whitespace.
      expect(await sayAwaiting(page, 'alias list', /\bl\s+=\s+look/)).toMatch(/\bl\s+=\s+look\s+\[view: look\]/);

      // ── `l` looks: bare, at the place, and with an operand ⇒ a card of its own ──
      // ⚠ The heading, not the card's body: the square's own card can list
      // somebody else's watch under *Here*.
      // ⚠ One MORE than before: arriving already drew the square's card, so a
      // bare "is it visible" passed before `l` had answered.
      const squares = page.locator('h3', { hasText: /market square/i });
      const drawn = await squares.count();
      await runCommand(page, 'l');
      await expect(squares).toHaveCount(drawn + 1, { timeout: 30_000 });
      await runCommand(page, 'l me:i:watch');
      await expect(page.locator('h3', { hasText: /watch/i }).last()).toBeVisible({ timeout: 30_000 });
      expect(await transcript(page)).not.toMatch(/I don't understand 'l'/);

      // ── `'` is `say`, with no space after it ──
      await sayAwaiting(page, "'hello", /You say, "hello"/);

      // ── Unset, it is no word at all, and `look` stands ──
      await sayAwaiting(page, 'alias unset l', /l cleared\./);
      const gone = await sayAwaiting(page, 'l', /I don't understand 'l'/);
      expect(gone).not.toMatch(GARBLED);
      await page.screenshot({ path: `${SHOTS}/09-alias-unset.png`, fullPage: true });
      expect((await sayAwaiting(page, 'alias list', /\bi\s+=\s+inventory/)), 'its neighbors stay').not.toMatch(/\bl\s+=\s+look/);
    } finally {
      await w.close();
    }
  });
});
