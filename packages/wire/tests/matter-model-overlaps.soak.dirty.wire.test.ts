/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run, a review round or `/finalize`).
 * The span twin of `matter-model-overlaps.dirty.wire.test.ts`: the
 * requirements' soak drive, S1–S3 (docs/requirements/matter-model-
 * overlaps-requirements.md § Soak drive; the plan's § The soak drive).
 *
 *  - **S1, a cask over three fills** (`span · staged`; twin of step 5 and
 *    W4's unit): a new oak cask filled, matured, emptied and refilled across
 *    seasons — what it gives falls each fill, what it remembers rises, and
 *    re-firing restores its own share.
 *  - **S2, a curing house's season** (`span · player`; twins of steps 1–2
 *    and W5's blackstrap unit): the refiner strikes, seeds and cures loaves
 *    through his working days; the molasses is struck again, darker each
 *    time, until it is blackstrap and will not grain.
 *  - **S3, green bricks through a wet week** (`span · staged`; twin of step
 *    14 and W7's unit): held moisture follows exposure — the bricks under
 *    the hack cover dry, the rain checks the exposed ones.
 *
 * ⭐ Time moves through `advanceLiving` (jumps of at most four game hours,
 * the people in it fed) — a span walked a day at a time is still a span,
 * which is why this file is `.soak.` (docs/testing.md § The soak lane).
 *
 * ⚠⚠ **Written, not yet run.** The NPC half of S2 needs REAL time: a brain
 * acts on beats, and a clock jump runs no beats (the sugar soak's finding),
 * so the refiner is watched through real working hours and only the nights
 * are jumped.
 */

import { describe as suite, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  hand,
  pinWeather,
  unpinWeather,
  advanceWorldClock,
  advanceLiving,
  worldClockNow,
  isOwnedTestWorld,
} from '../src/harness';

export const DIRTY_REASON =
  'matures, empties and re-fires a cask at Crowsfoot and the Hearthworks ' +
  'smithy, buys raw sugar and lime and boils the Sugar House copper to ' +
  'blackstrap, leaves green bricks on the weathering ground and the hacks, ' +
  'and moves the world clock by months';

/** A day jumped in a world this busy takes minutes of wall time; a season takes hours. */
vi.setConfig({ testTimeout: 14_400_000 });

declareFile({
  file: 'matter-model-overlaps.soak.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'world-seed',
    'ground',
    'terminus',
    'rejection',
    'hearts-delight',
    'hearthworks',
    'trade-sugar',
    'trade-cooking',
    'trade-milling',
    'trade-quarrying',
    'trade-haulage',
    'trade-forestry',
    'trade-distilling',
    'trade-coopering',
    'trade-smithing',
    'trade-fuel',
    'trade-ceramics',
    'trade-shopkeeping',
  ],
  dirtyReason: DIRTY_REASON,
});

const TERMINUS = '/world/terminus';
const HD = '/world/terminus/hearts-delight';
const REJ = '/world/terminus/rejection';
const SEATS = [TERMINUS, HD, REJ, '/world/terminus/hearthworks'];
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';
const CROWSFOOT = '/world/terminus/goods-yards/crowsfoot/location/floor';
const SMITHY = '/world/terminus/hearthworks/location/smithy';
const SH = '/world/terminus/goods-yards/sugar-house';
const BOILING = `${SH}/location/ground/boiling-floor`;
const CURING = `${SH}/location/ground/curing-house`;
const SUGAR_STORE = `${SH}/location/ground/store`;
const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const BF = '/world/terminus/hearts-delight/brickfield/location';
const WEATHERING = `${BF}/weathering-ground`;
const HACKS = `${BF}/hacks`;

const T = {
  cask: '/trade/distilling/thing/cask',
  pail: '/stuff/thing/vessel/pail',
  gasAnalyzer: '/stuff/thing/instrument/gas-analyzer',
  inshave: '/trade/coopering/thing/inshave',
  brick: '/trade/ceramics/thing/brick',
};
const NEW_MAKE = '/trade/distilling/idea/material/new-make';
const ALLUVIAL = '/world/terminus/hearts-delight/idea/material/alluvial-clay';
const TAG = { cask: 'mmosoakcask', exposed: 'mmosoakbrickx', covered: 'mmosoakbrickc' };

const DAY = 86_400;
const HOUR = 3_600;

/* ───────────────────────────── the harness ───────────────────────────── */

const record: string[] = [];
const open = new Map<string, Session>();
const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();
const note = (line: string): void => {
  record.push(line);
};

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function at(handle: string, where: string): Promise<Session> {
  open.get(handle)?.close();
  const s = await Session.open(handle, { startLocation: where, wizard: true, committees: SEATS });
  open.set(handle, s);
  await s.drainProse();
  return s;
}

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  const said = squash(await r.said());
  note(`${s.handle}: ${line} → ${r.status} · ${said.slice(0, 260)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return said;
}

async function act(s: Session, line: string, timeoutMs = 180_000): Promise<{ r: CommandResult; said: string }> {
  await s.drainProse();
  const r = await s.cmd(line);
  let said = squash(await r.said());
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) {
    await s.awaitActivity(started.engagementId, timeoutMs).catch(() => undefined);
    said += ' ' + squash(await s.listen(1_500).catch(() => ''));
  }
  note(`${s.handle}: ${line} → ${r.status} · ${said.slice(0, 260)}`);
  return { r, said };
}

async function examine(s: Session, mql: string): Promise<string> {
  const rows = await s.query(mql, { fields: 'detail' }).catch(() => []);
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return squash(`${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`);
    })
    .join(' | ');
}

function figure(said: string, what: RegExp): number {
  for (const l of said.split(/(?<=OU|%)\s+|\n/)) {
    if (!what.test(l)) continue;
    const m = /(-?\d+(?:\.\d+)?)/.exec(l.replace(what, ''));
    if (m) return Number(m[1]);
  }
  return NaN;
}

async function evalOn(s: Session, extent: string, keyword: string, expr: string): Promise<unknown> {
  const r = await s.cmd(`eval --parcel ${extent} --on ${keyword} return ${expr}`);
  let said = squash(await r.said());
  for (let i = 0; i < 6 && !/: |error|denied/i.test(said); i++) said += ` ${squash(await s.listen(1_000))}`;
  note(`${s.handle}: eval on ${keyword} ${expr.slice(0, 100)} → ${said.slice(0, 260)}`);
  const quoted = /: "(.*)"\s*$/.exec(said);
  if (quoted) return JSON.parse(JSON.parse(`"${quoted[1]}"`) as string);
  const raw = /(\{.*\}|\[.*\])/.exec(said);
  if (raw) return JSON.parse(raw[1]!);
  throw new Error(`eval on ${keyword} gave no JSON: ${said}`);
}

async function newPlayer(tag: string, where: string, funds = 0): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL });
  if (funds > 0) {
    expectOk(await bank.cmd('bank open'));
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      expectOk(await gov.cmd(`reserve override ${funds} to ${handle} "wire: matter-model-overlaps soak"`));
    } finally {
      gov.close();
    }
  }
  const f = await Session.open('founder', { startLocation: BANK_HALL, committees: [REJ] });
  try {
    expectOk(await f.cmd(`clone ${GLOWCAP} --here`));
  } finally {
    f.close();
  }
  await bank.cmd('get 1 glowcap');
  await bank.drainProse();
  bank.close();
  return at(handle, where);
}

async function toHour(hour: number): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % DAY) + DAY) % DAY) / HOUR;
  const ahead = (hour - h + 24) % 24;
  if (ahead < 0.05) return;
  await advanceWorldClock(`${Math.round(ahead * 60)} minutes`);
}

/** The total of what the cask's inside wall remembers, mg/L summed. */
function remembered(aromas: unknown): number {
  return (Array.isArray(aromas) ? aromas : []).reduce((n, a) => n + Number((a as { amount?: unknown }).amount ?? 0), 0);
}

afterAll(async () => {
  await unpinWeather(WEATHERING).catch(() => undefined);
  for (const s of open.values()) s.close();
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`\n── matter-model-overlaps soak record ──\n${record.join('\n')}\n`);
});

beforeAll(async () => {
  await toHour(9);
}, 600_000);

suite.skipIf(!isOwnedTestWorld())('⭐⭐ S1 — a cask over three fills', () => {
  it('S1. [span · staged] a new oak cask filled, matured and refilled three times: what it gives falls each fill, what it remembers rises; re-fired, it gives again', async () => {
    let s = await newPlayer('mmos1', CROWSFOOT);
    await hand(s, T.gasAnalyzer);
    // (staged) A new oak cask, never fired, holding new-make — and two pails
    // of new-make for each refill (the still's run is the distilling drive's).
    const cask = await hand(s, T.cask, {
      keywords: ['cask', 'barrel', TAG.cask],
      interiorMaterial: NEW_MAKE,
      interiorAmount: 20,
    });
    await say(s, `drop #${cask}`);
    const gives: number[] = [];
    const memory: number[] = [];
    for (let fill = 1; fill <= 3; fill++) {
      if (fill > 1) {
        for (let p = 0; p < 2; p++) {
          const pail = await hand(s, T.pail, { interiorMaterial: NEW_MAKE, interiorAmount: 10 });
          await say(s, `pour #${pail} into #${cask}`);
        }
      }
      // A season in the wood.
      await advanceLiving('60 days', [s]);
      s = await at(s.handle, CROWSFOOT);
      const oak = figure(await say(s, `measure aroma #${cask}`), /oak/i);
      const mem = remembered(await evalOn(s, TERMINUS, TAG.cask, `JSON.stringify(this.absorbedAromas('inside'))`));
      gives.push(oak);
      memory.push(mem);
      note(`  [S1] fill ${fill}: oak in the spirit ${oak} OU; the wall remembers ${mem} mg/L`);
      // Emptied for the next fill.
      const poured = await say(s, `pour #${cask} into "slop bucket"`);
      if (!/pour/i.test(poured)) await say(s, `spill #${cask}`);
    }
    expect(gives[1]!, `the second fill took as much oak: ${gives.join(' → ')}`).toBeLessThan(gives[0]!);
    expect(gives[2]!, `the third fill took as much oak: ${gives.join(' → ')}`).toBeLessThan(gives[1]!);
    expect(memory[2]!, `the wall remembered no more: ${memory.join(' → ')}`).toBeGreaterThan(memory[0]!);
    // Re-fired at the smithy: the inshave shaves it back, the fire chars it.
    await say(s, `get #${cask}`);
    s = await at(s.handle, SMITHY);
    await hand(s, T.inshave);
    await say(s, 'stoke charcoal into forge');
    await say(s, 'light forge');
    const refired = await act(s, `repair #${cask}`);
    note(`  [S1] re-fired: ${refired.said}`);
    expect(await examine(s, `#${cask}`), 'the cask was not re-fired').toMatch(/charred/i);
    const pail = await hand(s, T.pail, { interiorMaterial: NEW_MAKE, interiorAmount: 10 });
    await say(s, `drop #${cask}`);
    await say(s, `pour #${pail} into #${cask}`);
    await advanceLiving('30 days', [s]);
    s = await at(s.handle, SMITHY);
    const after = figure(await say(s, `measure aroma #${cask}`), /oak|vanilla|char/i);
    note(`  [S1] after the re-fire: ${after} OU (third fill ${gives[2]})`);
    expect(after, 'the re-fired cask gives no more than a spent one').toBeGreaterThan(gives[2]!);
  });
});

suite.skipIf(!isOwnedTestWorld())('⭐⭐ S2 — a curing house’s season', () => {
  it('S2. [span · player] the refiner strikes, seeds and cures loaves through his working days; the molasses struck again grows darker until it is blackstrap and will not grain', async () => {
    let s = await newPlayer('mmos2', CURING, 400);
    // ── the refiner's days ── watched in real time (a brain acts on beats,
    // and a jump runs none), the nights jumped. Five working days: a strike
    // a shift, each seeded with a piece and left to cure.
    const loavesBefore = (await examine(s, 'here:i')).match(/loaf/gi)?.length ?? 0;
    let seeded = '';
    for (let day = 0; day < 5; day++) {
      await toHour(7);
      const now = await worldClockNow();
      if (((Math.floor(now / DAY) % 7) + 7) % 7 === 6) await advanceWorldClock('24 hours');
      s = await at(s.handle, BOILING);
      // A working window, watched: about sixty real minutes is twelve game hours.
      const heard = await s.listen(60 * 60_000).catch(() => '');
      seeded += ' ' + squash(heard);
      await advanceLiving('12 hours', [s]);
    }
    note(`  [S2] heard at the copper: ${seeded.slice(0, 600)}`);
    // Four days of curing for the last strike.
    await advanceLiving('4 days', [s]);
    s = await at(s.handle, CURING);
    const curing = await examine(s, 'here:i');
    const floor = await examine((s = await at(s.handle, BOILING)), 'here:i');
    const loaves = `${curing} ${floor}`.match(/loaf/gi)?.length ?? 0;
    note(`  [S2] loaves: ${loavesBefore} → ${loaves}`);
    expect(loaves, 'the refiner cured no loaves in five working days').toBeGreaterThan(loavesBefore);
    expect(seeded, 'the refiner never seeded a strike').toMatch(/piece|seed|sugar/i);

    // ── the molasses, struck again ── on his day off, by the player.
    s = await at(s.handle, SUGAR_STORE);
    for (let i = 0; i < 3; i++) await say(s, 'buy block');
    s = await at(s.handle, PROVISIONING);
    await say(s, 'buy quicklime');
    s = await at(s.handle, BOILING);
    const passes: string[] = [];
    for (let pass = 0; pass < 4; pass++) {
      // The pot under the boiling floor's cone into the copper, and boiled.
      await say(s, 'pour pot into copper');
      await say(s, 'stoke coal into arch');
      await say(s, 'light arch');
      await say(s, 'heat copper');
      let looks = '';
      for (let h = 0; h < 12 && !/clouding with grain|thick as tar|burnt/i.test(looks); h++) {
        await advanceLiving('1 hour', [s]);
        looks = await say(s, 'look copper');
      }
      const thread = await say(s, 'analyze boil copper');
      passes.push(`${looks} | ${thread}`);
      if (/thick as tar|blackstrap/i.test(looks)) break;
      await say(s, 'get copper');
      await say(s, 'put cone on pot');
      await say(s, 'pour copper into cone');
      await say(s, 'drop copper');
      await say(s, 'get piece');
      await say(s, 'put piece in cone');
      await advanceLiving('4 days', [s]);
    }
    note(`  [S2] the passes: ${passes.join(' ‖ ')}`);
    expect(passes.join(' '), 'the molasses never came to blackstrap').toMatch(/thick as tar|blackstrap/i);
  });
});

suite.skipIf(!isOwnedTestWorld())('⭐ S3 — green bricks through a wet week', () => {
  it('S3. [span · staged] held moisture follows exposure: the brick under the hack cover dries; the rain checks the exposed one', async () => {
    let s = await newPlayer('mmos3', WEATHERING);
    // (staged) Two green bricks off one clay: one on the open yard, one under the cover.
    const exposed = await hand(s, T.brick, { keywords: ['brick', TAG.exposed], _materialPath: ALLUVIAL });
    await say(s, `drop #${exposed}`);
    s = await at(s.handle, HACKS);
    const covered = await hand(s, T.brick, { keywords: ['brick', TAG.covered], _materialPath: ALLUVIAL });
    await say(s, `put #${covered} on hack`);
    const READ = `JSON.stringify({ moisture: this.getMoisture() })`;
    const read = async (where: string, tag: string): Promise<number> => {
      s = await at(s.handle, where);
      return Number(((await evalOn(s, HD, tag, READ)) as { moisture?: unknown }).moisture ?? NaN);
    };
    const xs: number[] = [await read(WEATHERING, TAG.exposed)];
    const cs: number[] = [await read(HACKS, TAG.covered)];
    // A wet week: rain on days 1, 3 and 5 (pinned), the sky its own between.
    for (let day = 1; day <= 7; day++) {
      if (day % 2 === 1 && day < 7) await pinWeather('rain', WEATHERING);
      try {
        await advanceLiving('24 hours', [s]);
      } finally {
        await unpinWeather(WEATHERING);
      }
      xs.push(await read(WEATHERING, TAG.exposed));
      cs.push(await read(HACKS, TAG.covered));
    }
    note(`  [S3] exposed ${xs.map((x) => x.toFixed(3)).join(' → ')}`);
    note(`  [S3] covered ${cs.map((x) => x.toFixed(3)).join(' → ')}`);
    expect(cs[7]!, 'the brick under the cover did not dry').toBeLessThan(cs[0]!);
    // The rain checks the exposed one: at least one rain day its held water rose.
    const rose = xs.some((x, i) => i > 0 && i % 2 === 1 && x > xs[i - 1]!);
    expect(rose, `the rain never put water back in the exposed brick: ${xs.join(' → ')}`).toBe(true);
    expect(xs[7]!, 'the exposed brick dried as fast as the covered one').toBeGreaterThan(cs[7]!);
  });
});
