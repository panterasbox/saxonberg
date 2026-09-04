/**
 * LIVE DRIVE (textiles, the downstream half) — the verbs that come
 * AFTER the field, driven on a player's own path.
 *
 * The full walk (`drive-textiles.spec.ts`) proves seed → sheaf → pit and
 * spends most of its twenty minutes watering. This one starts where a
 * customer starts: **buy the cloth.** The mill consigns rather than
 * retails (that is the producer-annex design), so a bolt reaches the
 * Terminus general store's consignment shelf and the dyer and the tailor
 * work on what you carry in.
 *
 * ⚠⚠ `clone` is NOT a way to supply an input here, and the refusal is
 * the system working: "you don't have permission to clone that". Cloning
 * is titled content-write over the path, and the WIZARD axis is
 * code-trust (eval, reload) — a wizard holds no title over
 * `/trade/farming` and should not. So every input below is bought.
 *
 * ⚠ Three tests over ONE character, not one long test: a stall in the
 * dyehouse must not cost the tailor its evidence, and the character
 * carries its goods between them.
 *
 *   E2E_SERVER_URL=http://localhost:2010 npx playwright test \
 *     --config=playwright.drive.config.ts tests/drive-textiles-downstream.spec.ts
 */

import { test, type Page, type Browser } from '@playwright/test';
import { mintSession, enterWorld, commandInput, openWorldAsFounder } from './helpers';

const HALL = '/world/terminus/terminal/location/hall';
const BANK = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const DYEHOUSE = '/trade/dyeing/location/dyehouse';
const TAILOR = '/trade/tailoring/location/shop';

/** One character across all three legs, so its goods travel with it. */
const HANDLE = 'tex-down';

const FINDINGS: string[] = [];
function note(s: string) {
  FINDINGS.push(s);
  console.log(`\n★ ${s}`);
}
function report(label: string) {
  console.log(`\n════════ ${label} ════════`);
  FINDINGS.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}. ${f}`));
  console.log('═'.repeat(44) + '\n');
  FINDINGS.length = 0;
}

/** What the world SAID — the terminal delta. `look` is not here. */
async function cmd(page: Page, c: string, ms = 2600): Promise<string> {
  const input = commandInput(page);
  const term = () =>
    page.locator('[data-testid="terminal"]').innerText().catch(() => '');
  const before = await term();
  await input.fill(c);
  await input.press('Enter');
  await page.waitForTimeout(ms);
  const after = await term();
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const delta = after.slice(Math.max(0, i - 10));
  console.log(
    `──── ${c}\n     ${delta.split('\n').filter((l) => l.trim()).slice(-3).join(' | ').slice(-260)}`,
  );
  return delta;
}

/** What the CARD shows — the right column, where `look` renders. */
async function card(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => '');
}

/** The first command after entry can be swallowed while the socket settles. */
async function settle(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    if (/carrying|You are/i.test(await cmd(page, 'inventory', 2200))) return;
    await page.waitForTimeout(1500);
  }
  note('⚠ the session never answered `inventory`');
}

function refused(said: string): boolean {
  return /don't understand|isn't|can't|cannot|doesn't|Nothing happens|what\?|is empty|no one|never/i.test(
    said,
  );
}

/** Open the character at `where`. */
async function at(browser: Browser, where: string) {
  const s = await mintSession({
    handle: HANDLE,
    withCharacter: true,
    startLocation: where,
  });
  const { context, page } = await enterWorld(browser, s.state);
  await page.waitForTimeout(2500);
  await settle(page);
  return { page, close: () => context.close() };
}

test.describe.configure({ retries: 0 });

test('⭐ the customer buys cloth — the mill consigns, it does not retail', async ({
  browser,
}) => {
  test.setTimeout(900_000);

  // ── the stake: the founder's `reserve issue`, handed over on the floor.
  // ⚠ NOT in the banking hall — the till swallows a drop there and
  // `get` is vetoed ("The till is secured").
  {
    const gov = await openWorldAsFounder(browser, { startLocation: HALL });
    await gov.page.waitForTimeout(2000);
    await cmd(gov.page, 'reserve issue 4000', 3000);
    await cmd(gov.page, 'drop coins', 3000);
    await gov.close();
  }
  {
    const w = await at(browser, HALL);
    await cmd(w.page, 'get coins', 3000);
    await w.close();
  }
  {
    const w = await at(browser, BANK);
    await cmd(w.page, 'bank open', 2800);
    await cmd(w.page, 'bank deposit coins', 3000);
    const bal = await cmd(w.page, 'bank', 2600);
    note(`banked: ${/balance is \d+/i.exec(bal)?.[0] ?? 'NOTHING'}`);
    await w.close();
  }

  // ── the shelf. The weaver's `consigns` brain runs on a 120 s cadence,
  // so a young world may not have carried cloth over yet — wait for it.
  {
    const w = await at(browser, STORE);
    let bought = '';
    for (let round = 0; round < 10; round++) {
      await cmd(w.page, 'look shelf', 3000);
      const shelf = await card(w.page);
      if (/bolt|cloth|linen/i.test(shelf)) {
        note('⭐ cloth reaches the general store — the producer annex works end to end');
        for (const attempt of ['buy bolt', 'buy cloth', 'buy linen']) {
          bought = await cmd(w.page, attempt, 3600);
          if (!refused(bought)) break;
        }
        if (!refused(bought)) {
          note(`⭐⭐ a player BUYS the mill's cloth: ${bought.split('\n').slice(-1)[0]}`);
          break;
        }
      }
      await w.page.waitForTimeout(20_000);
    }
    if (refused(bought) || bought === '') {
      note('⚠⚠ no cloth on the store shelf — the mill has not consigned any');
      console.log('SHELF CARD: ' + (await card(w.page)).slice(-900));
    }
    await cmd(w.page, 'inventory', 2600);
    await w.close();
  }
  report('BUYING CLOTH');
});

test('⭐ the dyehouse — two chemistries, and the refusal that proves it', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const w = await at(browser, DYEHOUSE);

  const inv = await cmd(w.page, 'inventory', 2600);
  const hasCloth = /bolt|cloth|linen/i.test(inv);
  if (!hasCloth) note('⚠ no cloth in hand — the dye leg runs on refusals only');

  await cmd(w.page, 'look', 2600);
  await cmd(w.page, 'look vat', 2600);
  console.log('VAT CARD: ' + (await card(w.page)).slice(-600));

  const mord = await cmd(w.page, 'mordant bolt with alum', 3600);
  if (!refused(mord)) note('⭐ MORDANT takes on the cloth — the first of the two baths');
  else note(`mordant said: ${mord.split('\n').slice(-1)[0]}`);

  // ⚠⚠ THE REFUSAL THAT IS THE WHOLE DESIGN: alum before a VAT dye is
  // refused, never silently ignored.
  const vat = await cmd(w.page, 'dye bolt in woad-vat', 3800);
  if (/wants the cloth bare|alum is wasted|has been mordanted/i.test(vat)) {
    note('⭐⭐ the mordant-on-a-VAT-dye REFUSAL fires live — dyeing is TWO chemistries');
  } else {
    note(`dye-in-woad said: ${vat.split('\n').slice(-1)[0]}`);
  }

  const dyed = await cmd(w.page, 'dye bolt', 3800);
  note(`dye said: ${dyed.split('\n').slice(-1)[0]}`);

  // The counter path: the dyehouse is a walk-in SERVICE with prices.
  const svc = await cmd(w.page, 'buy piece-dye', 3400);
  note(`buy piece-dye: ${svc.split('\n').slice(-1)[0]}`);

  report('THE DYEHOUSE');
  await w.close();
});

test('⭐ the tailor — measure, cut, sew, wear', async ({ browser }) => {
  test.setTimeout(900_000);
  const w = await at(browser, TAILOR);

  await cmd(w.page, 'look book', 2600);

  const measured = await cmd(w.page, 'measure customer me', 3600);
  if (!refused(measured)) note('⭐ MEASURE CUSTOMER writes the body into the shop book');
  else note(`measure customer said: ${measured.split('\n').slice(-1)[0]}`);

  const cut = await cmd(w.page, 'cut bolt --for me', 5200);
  if (!refused(cut) && /pieces/i.test(cut)) {
    note('⭐ CUT stamps the pieces to a BODY — fit is bought before the garment exists');
  } else {
    note(`cut said: ${cut.split('\n').slice(-1)[0]}`);
  }

  const sewn = await cmd(w.page, 'sew pieces', 5200);
  if (!refused(sewn)) note('⭐ SEW closes the pieces into a garment');
  else note(`sew said: ${sewn.split('\n').slice(-1)[0]}`);

  console.log('INVENTORY: ' + (await cmd(w.page, 'inventory', 2600)).split('\n').slice(-8).join(' | '));

  // ⭐ Bare `equip` — the whole kit, innermost-first. `wear <thing>` is
  // still its own verb for one precise garment; this is the orchestrator.
  const worn = await cmd(w.page, 'equip', 3600);
  if (!refused(worn)) note('⭐ EQUIP takes the made garment onto the body');
  else note(`equip said: ${worn.split('\n').slice(-1)[0]}`);

  await cmd(w.page, 'look me', 3200);
  const self = await card(w.page);
  if (/\bWORN\b|wearing/i.test(self)) {
    note('⭐ A1: the `worn` projection renders on the wearer');
    console.log('SELF CARD: ' + self.slice(-700));
  } else {
    note('⚠ no worn projection on the self card');
  }

  await cmd(w.page, 'equip sets', 2800);
  report('THE TAILOR');
  await w.close();
});
