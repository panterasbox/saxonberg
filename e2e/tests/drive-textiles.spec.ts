/**
 * LIVE DRIVE (textiles, Stage A + Stage B) — the whole chain in one
 * browser session: seed → plant → sheaf → retting pit → scutch → spin →
 * weave → bolt → mordant → dye → measure → cut → sew → WEAR, plus the
 * Stage-A kernel surfaces the chain exists to feed (the `worn`
 * projection, the covering stack, derived clo, the fit refusal).
 *
 * Operator notes:
 *  - The world clock runs at 8000× (set in `world_state` before boot —
 *    scratchpad/clock-scale.mjs), so a game-day is ~11 real seconds:
 *    flax's 90-day season is ~16 minutes and retting's fortnight ~2.5.
 *  - Funding is the work-drive scaffold: the founder's `reserve issue`
 *    (the one conserved faucet) handed over as coin on the floor.
 *  - Wizard is OBSERVATION ONLY (mid-drive `eval` witnesses). Nothing
 *    in the chain is performed with wizard authority.
 *
 *   E2E_SERVER_URL=http://localhost:2010 npx playwright test tests/drive-textiles.spec.ts
 */

import { test, expect, type Page, type Browser } from '@playwright/test';
import {
  mintSession,
  enterWorld,
  commandInput,
  openWorldAsFounder,
  uniqueHandle,
} from './helpers';

const HALL = '/world/terminus/terminal/location/hall';
const BANK = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const LANE = '/world/terminus/hinkley-hills/location/lane';
const MILL = '/trade/textiles/location/mill';
const DYEHOUSE = '/trade/dyeing/location/dyehouse';
const TAILOR = '/trade/tailoring/location/shop';

/** Everything the drive learns, printed as one block at the end. */
const FINDINGS: string[] = [];
function note(s: string) {
  FINDINGS.push(s);
  console.log(`\n★ FINDING: ${s}`);
}

/** Type a command, wait, and return the new transcript text it produced. */
async function cmd(page: Page, c: string, ms = 2400): Promise<string> {
  const input = commandInput(page);
  if (!(await input.isVisible().catch(() => false))) {
    let reloaded = false;
    await expect(async () => {
      if (await input.isVisible().catch(() => false)) return;
      const play = page.getByRole('button', { name: /^Enter as / }).first();
      if (await play.isVisible().catch(() => false)) {
        await play.click().catch(() => {});
      } else if (!reloaded) {
        reloaded = true;
        await page.reload().catch(() => {});
        await page.waitForTimeout(3_000);
      }
      await expect(input).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 240_000 });
  }
  // ⚠⚠ Read the WHOLE SURFACE, not the transcript.
  //
  // `look` (and every inspection) does not print prose into the
  // terminal at all — it pushes an INSPECTION CARD into the right
  // column, EXITS / HERE / INTERFACES and all. A drive that diffs
  // `[data-testid="terminal"]` therefore sees `look` produce literally
  // nothing, with no error and no note, and every subsequent assertion
  // about a room reads as a dead world. That cost this drive three
  // runs, and it is a harness bug rather than a product one — the card
  // surface is the shipped design (docs/subsystems/card-surface.md).
  const readTerm = () =>
    page.locator('[data-testid="terminal"]').innerText().catch(() => '');
  const readBody = () =>
    page.evaluate(() => document.body.innerText).catch(() => '');
  const before = await readTerm();
  await expect(input).toBeVisible();
  await input.fill(c);
  await input.press('Enter');
  await page.waitForTimeout(ms);
  const after = await readTerm();
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const termDelta = after.slice(Math.max(0, i - 10));
  const body = await readBody();
  void body;
  console.log(
    `\n──── ${c}\n${termDelta.split('\n').filter((l) => l.trim()).slice(-10).join('\n')}`,
  );
  return termDelta;
}

/**
 * What the CARD shows — the right column, where `look` renders.
 *
 * ⚠⚠ Keep this separate from what `cmd` returns. An earlier revision
 * folded the whole page body into every command's result so that room
 * checks would pass, and it turned the drive into a liar: `scutch
 * sheaf` answered "Scutch what?" while the drive reported "scutch
 * yields LINE + TOW + SHIVE", because the words `line` and `tow` were
 * sitting in the card furniture. An outcome assertion reads what the
 * world SAID; a room assertion reads what the card SHOWS.
 */
async function card(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => '');
}

/** `look`, then assert against the CARD. */
async function lookFor(
  page: Page,
  pattern: RegExp,
  what = 'look',
  tries = 5,
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await cmd(page, what, 2600);
    if (pattern.test(await card(page))) return true;
    await page.waitForTimeout(1800);
  }
  return false;
}

/** Run `probe` until its own delta matches — a single delta can miss the
 *  prose window under the compressed clock. */
async function untilMatch(
  page: Page,
  probe: string,
  pattern: RegExp,
  tries = 4,
  ms = 2600,
): Promise<string> {
  let last = '';
  for (let i = 0; i < tries; i++) {
    last = await cmd(page, probe, ms);
    if (pattern.test(last)) return last;
    await page.waitForTimeout(1800);
  }
  return last;
}

async function fundPlayer(
  browser: Browser,
  where: string,
  marker: RegExp,
  handle: string,
  amount: number,
): Promise<boolean> {
  /*
   * ⚠⚠ GIVE, do not DROP.
   *
   * The work-drive scaffold everywhere else is `reserve issue` then
   * `drop coins` for the player to `get`. Do that in the BANKING HALL
   * and the coins land in the TILL, whose `canRemoveContainable` then
   * vetoes the pickup — "The till is secured — withdraw through the
   * teller." The money is issued, conserved, and unreachable. Correct
   * behaviour for a bank and a trap for a drive, so the handover is
   * person-to-person and happens somewhere with no till in it.
   */
  for (let attempt = 0; attempt < 2; attempt++) {
    const gov = await openWorldAsFounder(browser, { startLocation: where });
    try {
      await gov.page.waitForTimeout(1500);
      // ⚠ `look` renders to the CARD, so the room check must read the
      // card. Testing it against cmd()'s terminal delta can never match
      // and silently reports "the founder never reached the hall".
      const seen = await lookFor(gov.page, marker);
      if (!seen) {
        if (attempt === 0) continue;
        return false;
      }
      await cmd(gov.page, `reserve issue ${amount}`, 2600);
      /*
       * ⚠ `give coins to <handle>` does NOT work: the handle is the
       * ACCOUNT's, and the avatar in the room answers to its character
       * name, so the founder is told "You don't see any
       * 'e2e-tex-…' here." Dropping on the floor is the scaffold that
       * actually works — it just must not be done in the banking hall,
       * where the till swallows it (see the note above).
       */
      void handle;
      await cmd(gov.page, 'drop coins', 2800);
      return true;
    } finally {
      await gov.close();
    }
  }
  return false;
}

test.describe.configure({ retries: 0 });

test('⭐ the textile chain — flax in the ground to a coat on a back', async ({
  browser,
}) => {
  test.setTimeout(3_000_000);
  const handle = uniqueHandle('tex');

  // ══ P1: the terminal hall — the founder hands the stake over ══
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: HALL,
      wizard: true, // observation only
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    const ok = await fundPlayer(browser, HALL, /hall|noticeboard|terminal|concourse/i, handle, 6000);
    if (!ok) note('\u26a0 the founder never reached the hall to fund the run');
    await cmd(page, 'get coins', 2600);
    const held = await untilMatch(page, 'inventory', /zorkmid|coin|piece/i);
    if (!/zorkmid|coin|piece/i.test(held)) note('\u26a0 the stake never reached the player');
    await context.close();
  }

  // ══ P1a: the counting house — bank it ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: BANK });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    await cmd(page, 'bank open', 2600);
    await cmd(page, 'bank deposit coins', 2600);
    const bal = await untilMatch(page, 'bank', /balance is \d+/i);
    const m = /balance is (\d+)/i.exec(bal);
    note(`banked balance: ${m ? m[1] : 'UNKNOWN'} zorkmids`);
    await context.close();
  }

  // ══ P1b: the general store ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: STORE });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    await untilMatch(page, 'look', /store|shop|counter/i);
    // ⭐ The chain's FIRST shipped row: flax is a farming seed on the
    // general store's gardening line, not a textiles row.
    await cmd(page, 'buy flax', 3000);
    await cmd(page, 'buy weld', 3000); // the dyestuff half
    await cmd(page, 'buy sack', 3000);
    await cmd(page, 'buy waterskin', 3000);
    await cmd(page, 'buy rations', 3000);
    const inv = await untilMatch(page, 'inventory', /flax seed/i);
    if (/flax seed/i.test(inv)) note('flax seed buys off the general store gardening line');
    else note('⚠ flax seed did NOT reach inventory from `buy flax`');
    await context.close();
  }

  // ══ P1.5: the registry — a fresh lot so the yard is clean ══
  let lot = '';
  // ⭐ The gate's SIDE is per-lot and the registrar tells you which:
  // lot-2's is south, lot-3's is northwest. A drive that hard-codes a
  // direction works exactly once, on whichever lot happened to be next.
  let gateDir = '';
  {
    const s = await mintSession({
      handle,
      withCharacter: true,
      startLocation: '/world/terminus/registry/office',
    });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    await cmd(page, 'title list', 3000);
    const text = await page.evaluate(() => document.body.innerText);
    for (const line of text.split('\n')) {
      const m = /^\s*(lot-\d+)\s+—\s+(.*)$/.exec(line);
      if (!m) continue;
      const [, leaf, rest] = m;
      if (leaf === 'lot-1' || leaf === 'lot-5' || /sold/i.test(rest!)) continue;
      lot = leaf!;
      break;
    }
    expect(lot, 'an unsold lot on the plat book').toBeTruthy();
    /*
     * ⚠ The registrar's line can land AFTER a 4 s capture window (the
     * purchase writes a parcel row, grants a group and cuts a key), so
     * read the deed sentence out of the settled transcript rather than
     * out of one command's delta.
     */
    await cmd(page, `title buy ${lot}`, 6000);
    await page.waitForTimeout(2500);
    const settled = await page
      .locator('[data-testid="terminal"]')
      .innerText()
      .catch(() => '');
    gateDir = (/gate is on the ([a-z]+) side/i.exec(settled)?.[1] ?? '').toLowerCase();
    note(`bought ${lot}; the registrar says the gate is on the ${gateDir || 'UNSTATED'} side`);
    await untilMatch(page, 'title', new RegExp(lot, 'i'));
    await context.close();
  }

  // ══ P2: the yard — plant flax, keep it watered, take the SHEAF ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: LANE });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2000);
    // ⚠ The lot gate is a WALK, and its SIDE is per-lot — the registrar
    // says which. `go <lot>` answers "You can't walk that way".
    /*
     * ⭐ The gate's SIDE is per lot — lot-2's is south, lot-3's was
     * northwest — so the deed names it. Walk that first, then sweep the
     * compass: a drive that hard-codes one direction works exactly
     * once, on whichever lot happened to be next in the plat book.
     */
    let inYard = false;
    const tries = [
      gateDir,
      'south',
      'southwest',
      'southeast',
      'northwest',
      'northeast',
      'north',
      'east',
      'west',
    ].filter((d, i, a) => d && a.indexOf(d) === i);
    for (const step of tries) {
      await cmd(page, step, 3000);
      if (/yard behind the house/i.test(await card(page))) { inYard = true; break; }
    }
    if (!inYard) inYard = await lookFor(page, /yard behind the house/i);
    if (!inYard) {
      note('⚠⚠ never reached the yard — the growing half of the drive cannot run');
      throw new Error('the yard was unreachable; the drive cannot plant');
    }
    note('the lot gate opens for the titleholder — the registrar names the side');

    /*
     * ⚠⚠ `water` is afforded by a WATERING CAN and by nothing else
     * (`WateringCan` is the only class contributing
     * `platform/cmd/bulk/water.yaml`). A waterskin fills and drinks but
     * does not water, and the refusal is the flat "I don't understand
     * 'water'" of an unafforded verb — so an earlier run of this drive
     * watered nothing 166 times, the crop stayed water-limited at
     * `young` for a whole season, and the failure surfaced only as "no
     * flax sheaf". The yard ships a can in its props; pick it up.
     */
    await cmd(page, 'get can', 2600);
    await cmd(page, 'fill can from standpipe', 2600);
    await cmd(page, 'pour sack into bed', 3000);
    const planted = await cmd(page, 'plant flax in bed', 3500);
    if (/press the seed|will grow here/i.test(planted)) {
      note('flax goes into the bed — the chain starts in the ground');
    } else {
      note(`⚠ planting did not take: ${planted.split('\n').slice(-1)[0]}`);
    }

    /*
     * The care loop. Flax matures at 90 game-days ≈ 16 real minutes at
     * the drive scale, so this is water-every-few-days for a whole
     * season — the design's actual cadence, compressed.
     *
     * ⚠ Judge ripeness off `look bed`, never `look flax`: `flax` is a
     * crop word and the yard has a wild stand of it along the fence.
     */
    let sheafed = false;
    for (let round = 0; round < 340 && !sheafed; round++) {
      await cmd(page, 'fill can from standpipe', 800);
      await cmd(page, 'water bed', 800);
      if (round % 16 === 4) {
        await cmd(page, 'eat rations', 900);
        await cmd(page, 'fill waterskin from standpipe', 800);
        await cmd(page, 'drink from waterskin', 900);
      }
      if (round % 8 === 3) {
        await cmd(page, 'look bed', 1500);
        const shown = await card(page);
        if (/ripe|ready|mature|full|seed head|harvest|in flower|blue/i.test(shown)) {
          const got = await cmd(page, 'harvest flax', 3000);
          if (/sheaf/i.test(got)) { sheafed = true; break; }
        }
      }
    }
    if (!sheafed) {
      const got = await cmd(page, 'harvest flax', 3000);
      sheafed = /sheaf/i.test(got);
    }
    const bag = await untilMatch(page, 'inventory', /sheaf/i);
    if (/sheaf/i.test(bag)) note('⭐ a flax SHEAF comes off the living plant — the chain has its input');
    else note('⚠ no flax sheaf after the season — the chain starts empty');
    await context.close();
  }

  // ══ P3: the mill — ret, scutch, spin, weave ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: MILL, wizard: true });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    if (await lookFor(page, /mill|shed|loom|wheel/i)) {
      note('the Wharfside mill floor stands up with its props and cast');
    }

    /*
     * ⚠⚠ The pit is a VAT, not a box. `put sheaf in pit` answers "a
     * retting pit isn't a place" — the sheaf is a GradedReceptacle
     * holding 6 L of flax-straw BULK, and the pit is Bulkable, so the
     * transfer is the shipped `pour`. That is the design working (zero
     * new verbs for preparation), not a gap.
     */
    const poured = await cmd(page, 'pour sheaf into pit', 3500);
    if (/pour/i.test(poured) && !/isn't|can't|don't/i.test(poured)) {
      note('⭐ the straw goes into the pit with the shipped `pour` — preparation ships ZERO verbs');
    } else {
      note(`⚠ the straw would not go into the pit: ${poured.split('\n').slice(-1)[0]}`);
    }

    // Judge the moment. Retting is ~14 game-days ≈ 2.5 real minutes.
    let retted = false;
    for (let round = 0; round < 45 && !retted; round++) {
      await page.waitForTimeout(3500);
      await cmd(page, 'look pit', 1600);
      const shown = await card(page);
      if (/ready|retted|slipp|linen|done/i.test(shown)) retted = true;
    }
    if (retted) note('⭐ the retting pit runs its own clock — the act is judging the moment');
    else note('⚠ the pit never reported ready in the window driven');

    const filled = await cmd(page, 'fill sheaf from pit', 3000);
    console.log(`recover: ${filled.split('\n').slice(-1)[0]}`);

    const sc = await cmd(page, 'scutch sheaf', 4500);
    if (/line|tow|shive/i.test(sc) && !/Scutch what/i.test(sc)) {
      note('⭐ scutch yields LINE + TOW + SHIVE — the byproducts are real objects');
    } else {
      note(`⚠ scutch: ${sc.split('\n').slice(-1)[0]}`);
    }
    const sp = await cmd(page, 'spin line', 4500);
    if (/yarn/i.test(sp) && !/Spin what/i.test(sp)) note('spin turns line into yarn');
    else note(`⚠ spin: ${sp.split('\n').slice(-1)[0]}`);
    const wv = await cmd(page, 'weave yarn', 4500);
    if (/bolt|cloth/i.test(wv) && !/Weave what/i.test(wv)) note('⭐ weave turns yarn into a BOLT of cloth');
    else note(`⚠ weave: ${wv.split('\n').slice(-1)[0]}`);
    await cmd(page, 'inventory', 2600);
    await context.close();
  }

  // ══ P4: the dyehouse — two chemistries, and the refusal that proves it ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: DYEHOUSE, wizard: true });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    if (await lookFor(page, /dyehouse|copper|vat|coppers/i)) {
      note('the dyehouse stands up with both vats and the dyer');
    }
    await cmd(page, 'look vat', 2400);
    await cmd(page, 'look woad-vat', 2400);
    const mord = await cmd(page, 'mordant bolt with alum', 3200);
    console.log(`mordant: ${mord.split('\n').slice(-1)[0]}`);
    // ⚠⚠ THE REFUSAL THAT IS THE WHOLE DESIGN.
    const vatRefusal = await cmd(page, 'dye bolt in woad-vat', 3400);
    if (/wants the cloth bare|alum is wasted|has been mordanted/i.test(vatRefusal)) {
      note('⭐⭐ the mordant-on-a-VAT-dye REFUSAL fires live — dyeing is two chemistries');
    } else {
      note(`dye-in-vat said: ${vatRefusal.split('\n').slice(-1)[0]}`);
    }
    const dyed = await cmd(page, 'dye bolt', 3400);
    note(`dye said: ${dyed.split('\n').slice(-1)[0]}`);
    await context.close();
  }

  // ══ P5: the tailor — measure, cut, sew ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: TAILOR, wizard: true });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);
    if (await lookFor(page, /tailor|cutting table|mirror/i)) {
      note('the tailor shop stands up with the table and the book');
    }
    await cmd(page, 'look book', 2400);
    const measured = await cmd(page, 'measure customer me', 3200);
    note(`measure customer: ${measured.split('\n').slice(-1)[0]}`);
    const cut = await cmd(page, 'cut bolt --for me', 4500);
    if (/pieces/i.test(cut) && !/Cut what/i.test(cut)) {
      note('⭐ cut stamps the pieces to a BODY — fit is bought before the garment exists');
    } else {
      note(`⚠ cut: ${cut.split('\n').slice(-1)[0]}`);
    }
    const sewn = await cmd(page, 'sew pieces', 4500);
    note(`sew: ${sewn.split('\n').slice(-1)[0]}`);
    await cmd(page, 'inventory', 2800);
    await context.close();
  }

  // ══ P6: the Stage-A kernel surfaces the chain exists to feed ══
  {
    const s = await mintSession({ handle, withCharacter: true, startLocation: TAILOR, wizard: true });
    const { context, page } = await enterWorld(browser, s.state);
    await page.waitForTimeout(2500);

    const worn = await cmd(page, 'wear all', 3400);
    note(`wear all: ${worn.split('\n').slice(-1)[0]}`);
    // ⭐ A1: `worn` is a PROJECTION — it renders on the wearer's card,
    // and the same garment leaves `contents`.
    if (await lookFor(page, /WORN|wearing/i, 'look me')) {
      note('⭐ A1: the `worn` projection renders on the wearer, outermost-first');
    } else {
      note('⚠ A1: no worn projection on the self card');
    }
    await cmd(page, 'inventory', 2800);

    // ⭐ A5/A6: derived insulation off the live worn stack.
    const derived = await cmd(
      page,
      "eval const w = this.wornStack ? this.wornStack() : []; return 'WORN=' + w.length + ' INSULATION=' + (this.bodyInsulation ? this.bodyInsulation().toFixed(3) : 'n/a')",
      3400,
    );
    const m = /WORN=(\d+) INSULATION=([\d.]+|n\/a)/.exec(derived);
    if (m) note(`⭐ A5: ${m[1]} worn layer(s); DERIVED insulation ${m[2]} — no authored clo anywhere`);
    else note(`A5 read: ${derived.split('\n').slice(-1)[0]}`);

    await cmd(page, 'wear sets', 2800);
    await context.close();
  }

  console.log(`\n\n════════ TEXTILES DRIVE — FINDINGS ════════`);
  FINDINGS.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}. ${f}`));
  console.log(`═══════════════════════════════════════════\n`);
});
