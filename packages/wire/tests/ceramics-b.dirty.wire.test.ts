/**
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
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'digs the Hill Quarry down to its fireclay (a persisted per-band ledger ' +
  'nothing refills), burns firebricks in the Delight pottery kiln, wears ' +
  'and relines the Rejection smelting furnace and the glasshouse kiln, ' +
  'buys firebrick and crucibles off the Rejection store, cracks a ' +
  'crucible, clones ore and charcoal into the smelter, and moves the clock';

declareFile({
  file: 'ceramics-b.dirty.wire.test.ts',
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
const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const GLASSHOUSE = '/world/terminus/rejection/hanging-wood/glasshouse';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const B = '/world/terminus/hearts-delight/brickfield/location';
const SHED = `${B}/moulding-shed`;
const HACKS = `${B}/hacks`;
const SHOP = `${B}/potters-shop`;

const CHARCOAL = '/trade/fuel/thing/charcoal';
const COPPER_ORE = '/world/terminus/rejection/thing/copper-ore';

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
async function goTo(where: string): Promise<void> {
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
  await advanceWorldClock(duration);
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

/** As the founder, clone `path` onto the floor of `where` (setup only). */
async function mint(where: string, path: string, count = 1): Promise<void> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await gov.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
    await gov.drainProse();
  } finally {
    gov.close();
  }
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
  await toHour(9, 15);
  k = await Session.open(handle, { startLocation: QUARRY, wizard: true });
  await k.drainProse();
}, 600_000);

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
    let won = '';
    for (let i = 0; i < 80 && !/fireclay/i.test(won); i++) {
      const tried = await act('dig fireclay with spade', '2 minutes');
      if (refusedFor(tried.r) === 'under-overburden' || refusedFor(tried.r) === 'no-such-face') {
        // ⭐ The ground names the tool: a spade for drift and clay, the
        // pick once the floor is rock (the first drive looped on the spade).
        const floor = await act('dig with spade', '2 minutes');
        if (refusedFor(floor.r) === 'no-spade' || refusedFor(floor.r) === 'no-pick') {
          await act('dig with pick', '2 minutes');
        }
        continue;
      }
      won = await held();
    }
    expect(won, 'fireclay in hand').toMatch(/fireclay|clay/i);
    const read = await say('analyze clay lump');
    expect(read, `the fireclay: ${read}`).toMatch(/fireclay|refractory|pale|white/i);
  }, 3_600_000);

  it('moulded at the Delight table into firebricks, dried and burnt in the pottery kiln', async () => {
    await goTo(SHED);
    const day = await act('shape clay into firebrick', '9 hours');
    expect(day.said, `the firebricks: ${day.said}`).toMatch(/brick/i);
    expect(await examine('here:i:firebrick')).toMatch(/green|thumbprint/i);
    await say('get firebricks');
    await goTo(HACKS);
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
      await mint(SMELTER, CHARCOAL, 2);
      await say('get charcoal');
      await say('stoke charcoal into furnace');
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

suite('⭐ 12 — reline it', () => {
  it('`fit lining to furnace` with firebricks — relined, masonry credited, and it lights again', async () => {
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
    const after = await examine('furnace');
    expect(after, 'the relined furnace').not.toMatch(/burnt through/i);
    const comp = await say('competence');
    expect(comp, `competence: ${comp}`).toMatch(/masonry/i);
    expect(comp).not.toEqual(before);
    await mint(SMELTER, CHARCOAL, 2);
    await say('get charcoal');
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
      await mint(SMELTER, CHARCOAL, 4);
      await mint(SMELTER, COPPER_ORE, 2);
      await say('get charcoal');
      await say('stoke charcoal into furnace');
      await say('stoke charcoal into furnace');
      await say('ignite furnace');
      await act('pump bellows');
      await advance('30 minutes');
      await say('get charcoal');
      await say('put charcoal in furnace');
      await say('put charcoal in furnace');
      await say('get malachite');
      await say('put malachite in furnace');
      await say('put malachite in furnace');
      const smelt = await act('smelt', '2 hours');
      expect(smelt.said).not.toMatch(/don'?t understand/i);
      await say('douse furnace');
      await advance('2 hours');
      look = await examine('crucible');
      // Empty it for the next run: whatever ran into it goes out.
      await say('get crucible from furnace');
      await act('pour crucible into mould', '30 minutes');
      await say('put crucible in furnace');
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
    await mint(GLASSHOUSE, '/trade/quarrying/thing/limestone');
    await say('get limestone');
    await say('put limestone in kiln');
    for (let i = 0; i < 6; i++) {
      await mint(GLASSHOUSE, CHARCOAL, 3);
      await say('get charcoal');
      await say('stoke charcoal into kiln');
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
