/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). The span twin of
 * `ceramics-b.dirty.wire.test.ts`, split by the soak-harness census per
 * the ceramics soak-split census (testing.md § The soak lane) (2026-10-30). It carries the
 * blocking drive's flow and keeps the spans in place — firebrick dries for weeks (7-day steps) before it burns, the reline needs those firebricks, and the keeper relines a kiln left two days.
 *
 * ⭐⭐ **Ceramics, part B — firebrick, linings and crucibles**, driven end
 * to end against the real socket (the ceramics requirements' drive, steps
 * 10–14; the model is docs/subsystems/ceramics.md § The clamp, the kiln,
 * linings and crucibles, and fire.md § Linings).
 *
 * The drive in one sentence: *dig down through the Hill Quarry to the
 * coal's seat-earth and win fireclay, mould it into firebricks at the
 * Delight table and burn them in the pottery's kiln; fire Rejection's
 * smelting furnace until its lining thins, its heat drops and at last it
 * refuses to light; reline it with firebrick and be credited masonry; run
 * one crucible through melt after melt until it reads worn and cracks; and
 * leave the glasshouse kiln worn and come back to find its keeper has
 * bought firebrick and relined it with nobody watching.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD and a STATE changed,
 * read back off the world — never only that the verb was not refused.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<this worktree's> npx vitest run
 * tests/ceramics-b.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  advanceLiving,
  toWarmSeason,
  plain,
  dress,
  dressFounder,
  hand,
} from '../src/harness';

export const DIRTY_REASON =
  'digs the Hill Quarry down to its fireclay (a persisted per-band ledger ' +
  'nothing refills), burns firebricks in the Delight pottery kiln, wears ' +
  'and relines the Rejection smelting furnace and the glasshouse kiln, ' +
  'buys firebrick and crucibles off the Rejection store, cracks a ' +
  'crucible, clones ore and charcoal into the smelter, and moves the clock';

declareFile({
  file: 'ceramics-b.soak.dirty.wire.test.ts',
  packs: [
    'trade-ceramics',
    'trade-quarrying',
    'trade-smelting',
    'trade-mining',
    'trade-glass',
    'trade-fuel',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'hearts-delight',
    'rejection',
    'terminus',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const QUARRY = '/world/terminus/rejection/quarry/pit';
const SMELTER = '/world/terminus/rejection/location/smelter';
const PITHEAD = '/world/terminus/rejection/location/pithead-yard';
const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const GLASSHOUSE = '/world/terminus/rejection/hanging-wood/glasshouse';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const B = '/world/terminus/hearts-delight/brickfield/location';
const SHED = `${B}/moulding-shed`;
const HACKS = `${B}/hacks`;
const SHOP = `${B}/potters-shop`;


const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

function rejectedByParser(r: CommandResult): boolean {
  return (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'command-rejected');
}

function refusedFor(r: CommandResult): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

let handle = '';
let k: Session;

/** Move the character by reopening the session where it needs to be. */
let at = '';

async function goTo(where: string): Promise<void> {
  at = where;
  k?.close();
  k = await Session.open(handle, { startLocation: where, wizard: true });
  await k.drainProse();
}

/** Run a line; it must reach a controller. Returns what it said and the result. */
async function run(line: string): Promise<{ said: string; r: CommandResult }> {
  const r = await k.cmd(line);
  const said = squash(plain(await r.said()));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] > ${line} → ${r.status} ${refusedFor(r) ?? ''}\n          ${said.slice(0, 400)}`);
  expect(rejectedByParser(r), `'${line}' never reached a controller: ${said}`).toBe(false);
  await k.drainProse();
  return { said, r };
}

async function say(line: string): Promise<string> {
  return (await run(line)).said;
}

async function advance(duration: string): Promise<void> {
  // Lived time: in day-long jumps, the drive's people fed between them.
  await advanceLiving(duration, [k]);
  const probe = await Session.open('founder', { startLocation: SMELTER, wizard: true }).catch(() => null);
  try {
    const until = Date.now() + 600_000;
    while (probe && Date.now() < until) {
      const ok = await probe
        .query('here', { fields: ['displayName'] })
        .then(() => true)
        .catch(() => false);
      if (ok) break;
    }
  } finally {
    probe?.close();
  }
}

/** A durative act: jump the clock past it and await the engagement. */
async function act(line: string, gameTime?: string): Promise<{ said: string; r: CommandResult }> {
  const out = await run(line);
  const started = (out.r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advance(gameTime);
    await k.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(plain(await k.listen(1_500).catch(() => '')));
  await k.drainProse();
  return { said: `${out.said} ${later}`.trim(), r: out.r };
}

async function examine(keyword: string): Promise<string> {
  const rows = await k.query(keyword, { fields: 'detail' }).catch(() => []);
  const text = rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] examines ${keyword}\n          ${squash(text).slice(0, 500)}`);
  return text;
}

async function held(): Promise<string> {
  const rows = await k.query('me:i', { fields: ['displayName'] }).catch(() => []);
  return rows.map((r) => String((r as { displayName?: unknown }).displayName ?? '')).join(' | ');
}

/** Rest the way a person would: sit out a night on the clock. */
async function rest(): Promise<void> {
  await drink();
  await say('sit');
  await advance('8 hours');
  await say('stand');
}

/**
 * ⭐ Drink at the village well, then come back. A body that works for days
 * and never drinks cannot sweat, and the work's heat kills it: run 16's
 * brickmaker died of hyperthermia at the smelter on the fourth melt. A
 * person drinks, so the drive does, at the pithead yard's hand pump.
 */
let lastDrankS = Number.NEGATIVE_INFINITY;

async function drink(): Promise<void> {
  // Once a game day: every rest drank in run 18 (22 times in one step), and
  // the village pump's leather wore through (`no-packing`) — honestly.
  const { after: nowS } = await advanceWorldClock('0 seconds');
  if (nowS - lastDrankS < 20 * 3600) return;
  lastDrankS = nowS;
  const back = at;
  expect(back, 'drink() needs to know where to come back to').not.toBe('');
  await goTo(PITHEAD);
  await say('get pail');
  await act('pump village well', '1 minute');
  await say('fill pail from well');
  for (let i = 0; i < 2; i++) await say('drink pail --amount 1L');
  await say('drop pail');
  await goTo(back);
}

/**
 * Win `n` of a rock band at the Hill Quarry with the pick, resting when
 * spent, pick it up, and come back to `back`.
 *
 * ⭐ Supplies are WON, not minted. A founder `clone` is refused for any
 * kind whose first live copy stands on ground the founder does not hold
 * (charcoal's is Rejection's fuel yard, held by the town) — and nobody
 * SELLS charcoal: both stocks are props (a fuel-trade finding). So the
 * brickmaker digs the coal and the limestone she passes on the way down
 * to the fireclay, the way a player would.
 */
async function winAtQuarry(band: string, n: number, back: string): Promise<void> {
  await goTo(QUARRY);
  for (let got = 0, tries = 0; got < n && tries < n * 4; tries++) {
    const dug = await act(`dig ${band} with pick`, '2 minutes');
    const why = refusedFor(dug.r);
    // ⭐ Picked up as it is won, one at a time: a bare `get coal` at the end
    // took EVERY lump lying at the face (too heavy to lift), and lumps left
    // out through a night's rest were rained on (`too-wet` to stoke).
    if (why === null) {
      got++;
      await say(`get 1 ${band}`);
    } else if (why === 'too-tired') await rest();
    else break;
  }
  await goTo(back);
}

/**
 * Stand `n` lumps of copper ore at the smelter (setup) and pick them up.
 *
 * ⚠ The ore is SETUP, not the act under test (the crucible's wear is):
 * the Ferrow face is pitch dark and its air comes and goes, and the first
 * runs sent the brickmaker in lampless to suffocate. The founder stands the
 * ore up by `eval` — the town's own kind, which `clone` (the kind's title)
 * rightly refuses an outsider.
 */
async function oreFor(n: number, back: string): Promise<void> {
  // ⚠ Handed to the miner by name (setup). The founder's clone-and-drop
  // landed wherever the founder was resident — not the smelter — and
  // `get malachite` found nothing there (run 26).
  await goTo(back);
  // ⭐ At a Ferrow face's grade: the row authors 0 and `hew` stamps the
  // deposit's figure, so a handed lump with none smelts to slag alone and
  // the crucible never wears (run 31).
  for (let i = 0; i < n; i++) await hand(k, '/world/terminus/rejection/thing/copper-ore', { grade: 0.24 });
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] (ore handed: ${n})`);
}

async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advance(`${Math.ceil(wait / 60) + 1} minutes`);
}

beforeAll(async () => {
  handle = uniqueHandle('liner');
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  bank.close();
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: ceramics drive B"`));
  } finally {
    gov.close();
  }
  // ⭐ Firebricks are moulded wet and dried in the shop: begin in the
  // working season, not wherever A left the year (run 31's froze).
  await toWarmSeason();
  await toHour(9, 15);
  k = await Session.open(handle, { startLocation: QUARRY, wizard: true });
  // ⭐ Dressed for the winter it will work through (run 26's founder died of it).
  await dress(k);
  await dressFounder();
  at = QUARRY; // where a rest's drink comes back to
  await k.drainProse();
}, 3_600_000);

afterAll(() => {
  k?.close();
});

suite('⭐ 10 — make firebrick', () => {
  it('fireclay is won at the Hill Quarry, under the coal', async () => {
    await say('get 1 spade');
    await say('get 1 pick');
    // ⭐ You strip what is over it first: the floor comes down band by band
    // (drift, clay, granite, chalk, limestone, coal) until the coal's
    // seat-earth is uncovered. Bounded.
    // ⚠ The first runs looped on `held()`, but a won lump is "a lump of
    // clay" whatever band it came off, and it went to the TIP — so the
    // loop never saw it and dug on until the body was spent. Now: stop
    // the moment a dig works the fireclay, rest on the clock when tired,
    // and pick the lump up where it fell.
    let dug = false;
    for (let i = 0; i < 120 && !dug; i++) {
      const tried = await act('dig fireclay with spade', '2 minutes');
      const why = refusedFor(tried.r);
      if (why === null) {
        dug = /fireclay/i.test(tried.said);
        continue;
      }
      if (why === 'too-tired') {
        await rest();
        continue;
      }
      if (why !== 'under-overburden' && why !== 'no-such-face') break;
      // ⭐ The ground names the tool: a spade for drift and clay, the pick
      // once the floor is rock.
      const floor = await act('dig with spade', '2 minutes');
      const fr = refusedFor(floor.r);
      if (fr === 'no-spade' || fr === 'no-pick') {
        const struck = await act('dig with pick', '2 minutes');
        if (refusedFor(struck.r) === 'too-tired') await rest();
      } else if (fr === 'too-tired') {
        await rest();
      }
    }
    expect(dug, 'a dig worked the fireclay').toBe(true);
    await say('get clay');
    const won = await held();
    expect(won, 'fireclay in hand').toMatch(/fireclay|clay/i);
    const read = await say('analyze clay lump');
    // ⭐ An untrained hand reads only fat or lean; whether a clay will stand
    // a furnace is a PRACTISED reader's detail (competence resolves detail,
    // never access) — so this drive's fresh character reads the worm.
    expect(read, `the fireclay: ${read}`).toMatch(/fat|lean|worm/i);
  }, 3_600_000);

  it('moulded at the Delight table into firebricks, dried and burnt in the pottery kiln', async () => {
    await goTo(SHED);
    const day = await act('shape clay into firebrick', '9 hours');
    expect(day.said, `the firebricks: ${day.said}`).toMatch(/brick/i);
    expect(await examine('here:i:firebrick')).toMatch(/green|thumbprint/i);
    await say('get firebricks');
    // ⚠ Dried in the potter's shop, warm from the kiln, where the pottery
    // dries its own ware: on the open hacks a late frost burst them wet
    // (run 29 — B begins wherever in the year A left the clock).
    await goTo(SHOP);
    await say('drop firebricks');
    let rows = '';
    for (let week = 0; week < 10 && !/bone-dry/i.test(rows); week++) {
      await advance('7 days');
      rows = await examine('here:i:firebrick');
    }
    expect(rows, 'bone-dry').toMatch(/bone-dry/i);
    await say('get firebricks');
    await goTo(SHOP);
    await say('put firebricks in kiln');
    await say('get charcoal');
    await say('stoke charcoal into kiln');
    const lit = await say('ignite kiln');
    expect(lit).toMatch(/catch|light|burn|alight/i);
    await act('fire kiln for 10 hours', '10 hours');
    await say('douse kiln');
    await advance('12 hours');
    await say('get firebricks from kiln');
    const fired = await examine('me:i:firebrick');
    expect(fired, 'the burnt firebricks').toMatch(/refractory|pale, gritty|fired/i);
    expect(fired).not.toMatch(/thumbprint|bone-dry/i);
  }, 7_200_000);
});

suite('⭐ 11 — wear a lining', () => {
  it('fired again and again, the smelting furnace reads its lining thinning and its heat dropping, and at last will not light', async () => {
    await goTo(SMELTER);
    const first = await examine('furnace');
    // A charge for the chamber — the crucible stands in it.
    await say('get crucible');
    await say('put crucible in furnace');
    let last = first;
    let refused = '';
    for (let firing = 0; firing < 12; firing++) {
      await winAtQuarry('coal', 2, SMELTER);
      await say('stoke coal into furnace');
      const lit = await run('ignite furnace');
      if (refusedFor(lit.r) !== null && /lining/i.test(lit.said)) {
        refused = lit.said;
        break;
      }
      await act('fire furnace for 4 hours', '4 hours');
      await say('douse furnace');
      last = await examine('furnace');
    }
    expect(last, 'the furnace after its firings').not.toEqual(first);
    expect(last, 'the lining reads worn').toMatch(/lining/i);
    expect(refused, 'a burnt-through lining refuses to light').toMatch(/burnt through|reline/i);
  }, 7_200_000);
});

/**
 * Fit firebrick to the furnace until no lining reads worn through, buying
 * more off the Rejection store when the hand runs out. Returns the
 * furnace's read after the last fit.
 */
async function relineWhole(): Promise<string> {
  let after = await examine('furnace');
  for (let more = 0; more < 8 && /worn through|burnt through|worn thin/i.test(after); more++) {
    if (!/firebrick/i.test(await held())) {
      await goTo(PROVISIONING);
      for (let i = 0; i < 8; i++) {
        if (!/you buy/i.test(await say('buy firebrick'))) break;
      }
      await goTo(SMELTER);
    }
    if (!/firebrick/i.test(await held())) break;
    await act('fit lining to furnace', '1 hour');
    after = await examine('furnace');
  }
  return after;
}

suite('⭐ 12 — reline it', () => {
  it('`fit lining to furnace` with firebricks — relined, masonry credited, and it lights again', async () => {
    // By daylight: the store is dark at night, a buyer reads "You buy
    // something", and a read of the hands sees nothing (run 38).
    await toHour(9, 15);
    // Firebrick off the Rejection store: the brickfield's first, an import
    // (dearer, no maker) when the brick stack is bare or the valley unloaded.
    await goTo(PROVISIONING);
    for (let i = 0; i < 8; i++) {
      const bought = await say('buy firebrick');
      if (!/you buy/i.test(bought)) break;
    }
    expect(await held(), 'firebricks bought').toMatch(/firebrick/i);
    await goTo(SMELTER);
    const before = await say('competence');
    const fit = await act('fit lining to furnace', '1 hour');
    expect(refusedFor(fit.r), `fit: ${fit.said}`).toBeNull();
    expect(fit.said).toMatch(/lining|fit/i);
    // ⭐ Reline it WHOLE: one fit takes the firebrick in hand, and step 11
    // wore four of its eight linings through — a part-relined furnace held
    // 1258 K and the copper wanted 1358 (run 34, 13's first graded smelt).
    const after = await relineWhole();
    expect(after, 'the relined furnace').not.toMatch(/burnt through|worn through/i);
    const comp = await say('competence');
    expect(comp, `competence: ${comp}`).toMatch(/masonry/i);
    expect(comp).not.toEqual(before);
    // ⚠ Fuel handed (winning coal left the miner too tired to dig — run
    // 29), and the furnace put OUT first: it was already burning (the
    // smelterman's work), and `ignite` must be what lights it.
    await say('douse furnace');
    await hand(k, '/trade/fuel/thing/charcoal');
    await say('stoke charcoal into furnace');
    const lit = await run('ignite furnace');
    expect(refusedFor(lit.r), `relit: ${lit.said}`).toBeNull();
    await say('douse furnace');
  }, 1_800_000);
});

suite('⭐ 13 — wear a crucible', () => {
  it('melt after melt in one crucible — it reads worn, then cracks; a new one from the store serves', async () => {
    await goTo(SMELTER);
    let look = '';
    for (let melt = 0; melt < 10 && !/crack/i.test(look); melt++) {
      // ⚠ SETUP, by name: the fuel and the ore are handed to the miner one
      // at a time and go straight into the furnace. Winning coal at the
      // quarry each melt left more in hand than a body can lift (runs
      // 24–28), and the smelt is reckoned by MASS — it wants 16 kg of
      // charcoal, which coal never was (B8). What the crucible's WEAR needs
      // is the melts, not the mining (B10 drives that).
      await toHour(9, 15);
      await goTo(SMELTER);
      for (const x of ['coal', 'ore', 'malachite', 'pail', 'firebrick', 'brick', 'clay']) await k.cmd(`drop ${x}`);
      await k.drainProse();
      await drink();
      // ⚠ Charged COLD, then lit and smelted at once: the smelterman keeps
      // the furnace burning, and charcoal put into a drawing chamber catches
      // and burns (ceramics W0) — run 29's 16 kg charge had burned away in
      // the half-hour warm-up and `smelt` found 0 kg.
      await say('douse furnace');
      // ⭐ The melts wear the LINING too, and a worn one holds less heat: by
      // the fifth melt it held 1309 K and the copper wanted 1358 (run 36).
      // A smelterman relines between runs, and so does this one.
      await relineWhole();
      // Anything metal left in the shaft from a melt that did not pour (a
      // frozen lump) comes out first: ore and metal will not charge together.
      for (let i = 0; i < 3; i++) {
        const got = await say('get copper from furnace');
        if (!/pick up/i.test(got)) break;
      }
      await say('drop copper');
      await oreFor(2, SMELTER);
      await say('put malachite in furnace');
      await say('put malachite in furnace');
      for (let i = 0; i < 2; i++) {
        await hand(k, '/trade/fuel/thing/charcoal');
        await say('put charcoal in furnace');
      }
      await hand(k, '/trade/fuel/thing/charcoal');
      await say('stoke charcoal into furnace');
      await say('ignite furnace');
      // ⚠ The bellows is a toggle, and the last melt left it going: a pump
      // that eases it off is pumped again (run 26 smelted cold).
      const pumped = await act('pump bellows');
      if (/ease off/i.test(pumped.said)) await act('pump bellows');
      let smelt = await act('smelt', '5 minutes');
      // A lining worn but not yet through still costs heat: refused too
      // cold, the furnace is relined to the last course and the run tried
      // once more.
      if (refusedFor(smelt.r) === 'too-cold') {
        await say('douse furnace');
        for (let i = 0; i < 8; i++) {
          if (!/firebrick/i.test(await held())) {
            await goTo(PROVISIONING);
            for (let j = 0; j < 8; j++) if (!/you buy/i.test(await say('buy firebrick'))) break;
            await goTo(SMELTER);
          }
          const fit = await act('fit lining to furnace', '1 hour');
          if (refusedFor(fit.r) !== null) break;
        }
        await hand(k, '/trade/fuel/thing/charcoal');
        await say('stoke charcoal into furnace');
        await say('ignite furnace');
        const again = await act('pump bellows');
        if (/ease off/i.test(again.said)) await act('pump bellows');
        smelt = await act('smelt', '5 minutes');
      }
      // The smelt RUNS — a refusal here (no fuel, no ore) is the failure,
      // not four melts on at the crucible (runs 26–28 smelted nothing).
      expect(refusedFor(smelt.r), `the smelt: ${smelt.said}`).toBeNull();
      // eslint-disable-next-line no-console -- the drive's own record: where the melt went
      console.log(`  [drive] melt ${melt + 1}: ${smelt.said.slice(0, 400)}`);
      // ⭐ The run is two minutes (SMELT_MS); jumping two hours past it let
      // the fire burn down and the copper set in the crucible — "nothing to
      // pour" on every melt of run 36.
      // ⭐ Poured off the smelt, while the copper is still MOLTEN: doused
      // and left two hours, it froze, and a crucible is no mould — the metal
      // dropped out as a cast lump in the furnace, the crucible came up
      // empty ("nothing to pour"), and the next charge was ore and metal
      // together (run 35).
      // ⚠ By id: the miner may hold another crucible (bought, or left from
      // 11), and `pour crucible` bound an EMPTY one — "There's nothing to
      // pour" on every melt of runs 36 and 37, while the metal froze in the
      // furnace's own crucible and later melts found no room (no wear).
      const crucibleIds = async (): Promise<string[]> =>
        ((await k.query('me:i:crucible', { fields: ['displayName'] }).catch(() => [])) as { stuffId?: string }[])
          .map((r) => r.stuffId ?? '')
          .filter((x) => x !== '');
      const heldBefore = new Set(await crucibleIds());
      await say('get crucible from furnace');
      const fromFire = (await crucibleIds()).find((id) => !heldBefore.has(id));
      const cr = fromFire ? `#${fromFire}` : 'crucible';
      look = await examine(cr);
      const poured = await act(`pour ${cr} into mould`, '30 minutes');
      // eslint-disable-next-line no-console -- the drive's own record
      console.log(`  [drive] melt ${melt + 1} pour: ${poured.said.slice(0, 200)}`);
      await say(`put ${cr} in furnace`);
      await say('douse furnace');
      if (melt === 3) expect(look, 'after four melts').toMatch(/worn|crack/i);
    }
    expect(look, 'the crucible at last').toMatch(/crack/i);
    // ⭐ The potter's refractory crucible — a new one off the store serves.
    await goTo(PROVISIONING);
    const bought = await say('buy crucible');
    expect(bought).toMatch(/you buy/i);
    expect(await examine('me:i:crucible')).not.toMatch(/crack/i);
  }, 7_200_000);
});

suite('⭐ 14 — the keeper does it', () => {
  it('the glasshouse kiln, worn and left, is relined by its keeper with no player present', async () => {
    // ⚠ The roster tick runs only for a LOADED business: visit the
    // glasshouse first (D20), wear the kiln, then go — and jump time.
    await goTo(GLASSHOUSE);
    await toHour(9, 15);
    const fresh = await examine('kiln');
    // A charge for the chamber — a lump of limestone (it burns to lime, and
    // the kiln does not care what it is holding at heat).
    await winAtQuarry('limestone', 1, GLASSHOUSE);
    await say('put limestone in kiln');
    for (let i = 0; i < 6; i++) {
      await winAtQuarry('coal', 3, GLASSHOUSE);
      await say('stoke coal into kiln');
      const lit = await run('ignite kiln');
      if (refusedFor(lit.r) !== null) break;
      await act('fire kiln for 6 hours', '6 hours');
      await say('douse kiln');
    }
    const worn = await examine('kiln');
    expect(worn, 'the kiln worn').toMatch(/lining/i);
    expect(worn).not.toEqual(fresh);
    // Nobody here now: the character goes to the Delight, and the clock
    // runs through two working days.
    await goTo(SHOP);
    await advance('2 days');
    await goTo(GLASSHOUSE);
    const relined = await examine('kiln');
    expect(relined, 'the keeper relined it').not.toEqual(worn);
    expect(relined).not.toMatch(/burnt through|worn thin/i);
  }, 7_200_000);
});
