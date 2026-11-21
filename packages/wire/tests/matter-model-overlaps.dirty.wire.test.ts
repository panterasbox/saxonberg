/**
 * ⭐⭐ **Matter-model overlaps — the blocking drive** (the requirements'
 * drive, steps 1–16, numbering kept; docs/requirements/matter-model-
 * overlaps-requirements.md § The drive, and the plan's § Test & gate
 * strategy table, which says how each staged step is staged).
 *
 * The drive in one sentence: *a strike boiled in the sugar house holds past
 * saturation until a piece of sugar starts it, sets a loaf and drains its
 * molasses into the pot — or onto the floor once lifted off; maple sets the
 * same way; salt waits for its edge; a cask that held whiskey gives it to
 * water, less once washed, and a pitched one gives nothing; the contents are
 * the distiller's and the cask the cooper's; a poor mold casts poor and a
 * poor bottle leaves its wine fine; a sprung stave drains a cask onto the
 * floor until a new one is fitted; a cracked glazed crock leaks at the
 * crack's rate; the glazed butter crock remembers nothing and the oak churn remembers its cream until a wash spends it; a
 * snag holes a rowboat and a ship, `bail` races the one and `repair` patches
 * both; a salted kiln salt-glazes stoneware and the shop smells it; steam
 * and retort fumes reach the nose and the hygrometer; rain soaks terracotta
 * and runs off glaze; lye goes where the ash lies; and all of it survives a
 * restart.*
 *
 * ⭐ Every step is tagged with its PACE and its CHECK (docs/testing.md § No
 * merge waits on the clock): `instant`, `short` (every clock jump under a
 * game day), `staged` (a state set with the harness tools the plan names —
 * `hand`, `stage`, `stageShip`, `pinWeather`, an `eval` read); `player` means
 * the checkpoint is asserted through player verbs and tools only. No step is
 * `span`: the season twins live in `matter-model-overlaps.soak.dirty`.
 *
 * ⚠ Every checkpoint asserts a STATE read back off the world (a reading, a
 * level by the projection's `bulkAmount`, a `look` line), never only that a
 * verb was understood (the taps lesson).
 *
 * ⚠⚠ **Written, not yet run** (W8). Where a detail could not be determined
 * statically the step DISCOVERS it and records what it found in the drive
 * record printed at the end (`── matter-model-overlaps drive record ──`):
 * the water source at the estuary mouth (4), the choked stretch the Hesper
 * is staged beside (11). Each such place carries a `⚠ DISCOVERED` comment.
 *
 * ⚠ The NPCs who work the same kit — the refiner at the copper (06–18,
 * Mon–Sat) and the potter at the kiln (the same hours) — act on real-time
 * beats. The copper and kiln steps run after 18:00 so a checkpoint reads
 * what the PLAYER did, never a race with an NPC (the sugar drive's rule).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  hand,
  stageShip,
  pinWeather,
  unpinWeather,
  advanceWorldClock,
  advanceLiving,
  worldClockNow,
  restartWorld,
} from '../src/harness';

export const DIRTY_REASON =
  'boils the Sugar House copper and fills its cones and pots, empties and ' +
  'refills casks at Crowsfoot and leaves them leaking on its floor, washes ' +
  'the creamery’s butter crock, fires the potter’s kiln with salt, waters ' +
  'the chandlery’s hopper and heaps ash on its floor, holes and patches a ' +
  'rowboat and the Hesper on the Kestrel and leaves them there, appoints a ' +
  'master to the Hesper, restarts the world, and moves the clock by days';

declareFile({
  file: 'matter-model-overlaps.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'world-seed',
    'ground',
    'terminus',
    'rejection',
    'hearts-delight',
    'water',
    'transport',
    'trade-sugar',
    'trade-cooking',
    'trade-milling',
    'trade-quarrying',
    'trade-haulage',
    'trade-forestry',
    'trade-distilling',
    'trade-coopering',
    'trade-smithing',
    'trade-brewing',
    'trade-winemaking',
    'trade-ceramics',
    'trade-dairying',
    'trade-ranching',
    'trade-fuel',
    'trade-chandlery',
    'trade-potash',
    'trade-shopkeeping',
  ],
  dirtyReason: DIRTY_REASON,
});

/* ───────────────────────────── places ───────────────────────────── */

const TERMINUS = '/world/terminus';
const HD = '/world/terminus/hearts-delight';
const REJ = '/world/terminus/rejection';
/** The committees a staging session sits on — the extents its `eval`s run in. */
const SEATS = [TERMINUS, HD, REJ];

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';
const SH = '/world/terminus/goods-yards/sugar-house';
const BOILING = `${SH}/location/ground/boiling-floor`;
const CURING = `${SH}/location/ground/curing-house`;
const SUGAR_STORE = `${SH}/location/ground/store`;
const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const SUGARBUSH = '/world/terminus/rejection/hanging-wood/sugarbush';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const CROWSFOOT = '/world/terminus/goods-yards/crowsfoot/location/floor';
const BF = '/world/terminus/hearts-delight/brickfield/location';
const POTTERS_SHOP = `${BF}/potters-shop`;
const WEATHERING = `${BF}/weathering-ground`;
const HACKS = `${BF}/hacks`;
const CREAMERY = '/world/terminus/hearts-delight/creamery/location/floor';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const HESPER = '/world/terminus/hesper/structure';
const HESPER_DECK = '/world/terminus/hesper/deck';
const HESPER_CO = '/world/terminus/hesper/idea/outfit';
const KESTREL = '/stuff/idea/Watercourse/kestrel';
const CHANDLERY = '/world/terminus/wharfside/chandlery/location/floor';

/* ───────────────────────────── rows ───────────────────────────── */

const T = {
  cone: '/trade/sugar/thing/cone',
  pail: '/stuff/thing/vessel/pail',
  distillingCask: '/trade/distilling/thing/cask',
  brewingCask: '/trade/brewing/thing/cask',
  stave: '/trade/coopering/thing/stave',
  driver: '/trade/coopering/thing/driver',
  wineBottle: '/trade/winemaking/thing/wine-bottle',
  crock: '/trade/ceramics/thing/crock',
  ceramicJug: '/trade/ceramics/thing/jug',
  plantPot: '/trade/ceramics/thing/plant-pot-small',
  brick: '/trade/ceramics/thing/brick',
  dairyJug: '/trade/dairying/thing/jug',
  rowboat: '/system/transport/thing/rowboat',
  billet: '/trade/forestry/thing/billet',
  billhook: '/trade/forestry/thing/billhook',
  retort: '/trade/fuel/thing/retort',
  charcoal: '/trade/fuel/thing/charcoal',
  cordwood: '/trade/forestry/thing/cordwood',
  gasAnalyzer: '/stuff/thing/instrument/gas-analyzer',
  hygrometer: '/stuff/thing/instrument/hygrometer',
};

const M = {
  strike: '/trade/sugar/idea/material/strike',
  mapleStrike: '/trade/forestry/idea/material/maple-strike',
  whiskey: '/trade/distilling/idea/material/whiskey',
  water: '/stuff/idea/material/bulk/water',
  saltWater: '/stuff/idea/material/bulk/salt-water',
  redWine: '/trade/winemaking/idea/material/red',
  cream: '/trade/dairying/idea/material/cream',
  milk: '/stuff/idea/material/food/milk',
  stoneware: '/stuff/idea/material/ceramic/stoneware',
  terracotta: '/stuff/idea/material/ceramic/terracotta',
  clay: '/stuff/idea/material/earth/clay',
  alluvial: '/world/terminus/hearts-delight/idea/material/alluvial-clay',
  leadGlaze: '/stuff/idea/material/glaze/lead',
  pitch: '/stuff/idea/material/bulk/pitch',
};

/** Aromas, by path — what a whiskey fill leaves in the wall (W4's `absorbed`). */
const SPIRIT_AROMA = '/base-library/aromas/alcohol/spirit';
const BEER_AROMA = '/base-library/aromas/alcohol/beer';
/** The distiller of record at Crowsfoot — Wren Ashby, the hand. */
const DISTILLER = '/world/terminus/goods-yards/crowsfoot/agent/hand';

/** Unique keywords each staged thing carries, so it is found again after the restart. */
const TAG = {
  cone2: 'mmocone2',
  cone3: 'mmocone3',
  cone7: 'mmocone7',
  pail7: 'mmopail7',
  bottle7: 'mmobottle7',
  wine7: 'mmowine7',
  caskA: 'mmocaska',
  caskB: 'mmocaskb',
  caskC: 'mmocaskc',
  caskD: 'mmocaskd',
  caskE: 'mmocaske',
  crack9: 'mmocrock9',
  sound9: 'mmosound9',
  jug12: 'mmojug12',
  glazed14: 'mmoglazed14',
  terra14: 'mmoterra14',
  brick14: 'mmobrick14',
  boat11: 'mmoboat11',
  pail15: 'mmopail15',
  ash15: 'mmoash15',
  brine4: 'mmobrine4',
};

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

/** Open (or re-open) `handle` at `where` — staging-seated, so its `eval`s run in the drive's extents. */
async function at(handle: string, where: string): Promise<Session> {
  open.get(handle)?.close();
  const s = await Session.open(handle, { startLocation: where, wizard: true, committees: SEATS });
  open.set(handle, s);
  await s.drainProse();
  return s;
}

/** The founder, seated where the drive needs it. One founder session at a time. */
async function founder(where: string): Promise<Session> {
  return Session.open('founder', { startLocation: where, committees: SEATS });
}

/** A verb, its words, and what the engine said — recorded. */
async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  const said = squash(await r.said());
  note(`${s.handle}: ${line} → ${r.status} · ${said.slice(0, 260)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return said;
}

/** An engaged act, waited to its end; what was said, and what was heard after. */
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
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  return { r, said };
}

/** What a player reads off a thing in reach — its description with every augmenter's line. */
async function examine(s: Session, mql: string): Promise<string> {
  const rows = await s.query(mql, { fields: 'detail' }).catch(() => []);
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return squash(`${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`);
    })
    .join(' | ');
}

/** The liters a vessel holds — the projection's `bulkAmount` (what the card reads). */
async function liters(s: Session, mql: string): Promise<number> {
  const rows = await s.query(mql, { fields: ['displayName', 'bulkAmount'] }).catch(() => []);
  const v = (rows[0] as { bulkAmount?: { value?: unknown } } | undefined)?.bulkAmount?.value;
  return typeof v === 'number' ? v : NaN;
}

/** The names of what a container holds, by the detail row's `contents`. */
async function holds(s: Session, mql: string): Promise<string> {
  const rows = (await s.query(mql, { fields: 'detail' }).catch(() => [])) as Array<{
    contents?: Array<{ displayName?: unknown }>;
  }>;
  return (rows[0]?.contents ?? []).map((c) => String(c.displayName ?? '')).join(', ');
}

/** The room as the player reads it (`look`), with its floor's puddle line. */
async function lookHere(s: Session): Promise<string> {
  await s.drainProse();
  const room = squash(await s.prose('look here'));
  const floor = await examine(s, 'here:floor');
  return `${room} || ${floor}`;
}

/** The first figure a measured line names for `what` (a gas analyzer's OU, a hygrometer's %). */
function figure(said: string, what: RegExp): number {
  const lines = said.split(/(?<=OU|%)\s+|\n/);
  for (const l of lines) {
    if (!what.test(l)) continue;
    const m = /(-?\d+(?:\.\d+)?)/.exec(l.replace(what, ''));
    if (m) return Number(m[1]);
  }
  return NaN;
}

/** `eval --parcel <extent> --on <keyword>` returning a JSON string, parsed. */
async function evalOn(s: Session, extent: string, keyword: string, expr: string): Promise<unknown> {
  const r = await s.cmd(`eval --parcel ${extent} --on ${keyword} return ${expr}`);
  let said = squash(await r.said());
  for (let i = 0; i < 6 && !/: |error|denied/i.test(said); i++) said += ` ${squash(await s.listen(1_000))}`;
  note(`${s.handle}: eval on ${keyword} ${expr.slice(0, 100)} → ${said.slice(0, 260)}`);
  const quoted = /: "(.*)"\s*$/.exec(said);
  if (quoted) {
    try {
      return JSON.parse(JSON.parse(`"${quoted[1]}"`) as string);
    } catch {
      /* fall through to the raw form */
    }
  }
  const raw = /(\{.*\}|\[.*\])/.exec(said);
  if (raw) {
    try {
      return JSON.parse(raw[1]!);
    } catch {
      /* not JSON */
    }
  }
  throw new Error(`eval on ${keyword} gave no JSON: ${said}`);
}

/** `eval --parcel <extent> <code>` (no subject), returning a JSON string, parsed. */
async function evalIn(s: Session, extent: string, code: string): Promise<unknown> {
  const r = await s.cmd(`eval --parcel ${extent} ${code}`);
  let said = squash(await r.said());
  for (let i = 0; i < 10 && !/: |error|denied/i.test(said); i++) said += ` ${squash(await s.listen(1_000))}`;
  note(`${s.handle}: eval ${code.slice(0, 100)} → ${said.slice(0, 400)}`);
  const quoted = /: "(.*)"\s*$/.exec(said);
  if (quoted) return JSON.parse(JSON.parse(`"${quoted[1]}"`) as string);
  throw new Error(`eval gave no JSON: ${said}`);
}

/** A funded player standing at `where`, carrying a light (the sugar drive's way). */
async function newPlayer(tag: string, where: string, funds = 0): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL });
  if (funds > 0) {
    expectOk(await bank.cmd('bank open'));
    const gov = await founder(BANK_HALL);
    try {
      expectOk(await gov.cmd(`reserve override ${funds} to ${handle} "wire: matter-model-overlaps drive"`));
    } finally {
      gov.close();
    }
  }
  // A glowcap jar: the copper and the kiln are worked after dark.
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

/** Move the clock to the next `hour` o'clock (a lighting jump, under a day). */
async function toHour(hour: number): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % DAY) + DAY) % DAY) / HOUR;
  const ahead = (hour - h + 24) % 24;
  if (ahead < 0.05) return;
  await advanceWorldClock(`${Math.round(ahead * 60)} minutes`);
}

/** Between 08:00 and 16:00, else on to 09:00 — names read by daylight. */
async function daylight(): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % DAY) + DAY) % DAY) / HOUR;
  if (h < 8 || h >= 16) await toHour(9);
}

/** After the house's hours (18:00–05:00), else on to 18:30 — the NPCs have gone home. */
async function afterHours(): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % DAY) + DAY) % DAY) / HOUR;
  if (h >= 18.4 || h < 5) return;
  await toHour(18.5);
}

/** The bracketed kelvin `measure temperature <thing>` reads. */
async function kelvin(s: Session, thing: string): Promise<number> {
  const said = await say(s, `measure temperature ${thing}`);
  const m = /(\d+(?:\.\d+)?)\s*K/.exec(said);
  return m ? Number(m[1]) : NaN;
}

/** A stoke and a light: an arch or a kiln with fire in it. */
async function fire(s: Session, burner: string, fuel: string, lumps: number): Promise<void> {
  for (let i = 0; i < lumps; i++) await say(s, `stoke ${fuel} into ${burner}`);
  await say(s, `light ${burner}`);
}

/* ───────────────────────────── the drive ───────────────────────────── */

let boiler: Session;
let taster: Session;
let cooper: Session;
let cooperPath = '';
let potter: Session;
let dairy: Session;
let boatman: Session;
let salter: Session;
let asher: Session;

/** What step 16 reads back, captured before the restart. */
const before: Record<string, unknown> = {};

beforeAll(async () => {
  // The world boots at midnight; the setup runs by daylight.
  await toHour(9);
  boiler = await newPlayer('mmoboil', SUGAR_STORE, 300);
  taster = await newPlayer('mmotaste', CROWSFOOT);
  // ⭐ The cooper's identity path is the maker the cask carries (step 6).
  const opened = await Session.openAtRoster(uniqueHandle('mmocoop'), {
    startLocation: CROWSFOOT,
    wizard: true,
    committees: SEATS,
  });
  cooper = opened.session;
  await cooper.play(opened.playerId);
  await cooper.drainProse();
  open.set(cooper.handle, cooper);
  cooperPath = `/platform/agent/Avatar/${opened.playerId}`;
  potter = await newPlayer('mmopot', POTTERS_SHOP);
  dairy = await newPlayer('mmodairy', CREAMERY);
  boatman = await newPlayer('mmoboat', PUT_IN);
  salter = await newPlayer('mmosalt', MOUTH);
  asher = await newPlayer('mmoash', CHANDLERY, 200);
}, 1_800_000);

afterAll(async () => {
  await unpinWeather(WEATHERING).catch(() => undefined);
  for (const s of open.values()) s.close();
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`\n── matter-model-overlaps drive record ──\n${record.join('\n')}\n`);
});

suite('⭐⭐ sugar grains by solubility (AC 6, 2)', () => {
  it('1. [short · player] sugar strikes and seeds: boiled through syrup to the strike, struck into a cone on its pot, it HOLDS cold until a pinch of sugar starts it', async () => {
    // Raw sugar off the house's counter, lime from Rejection.
    await buySure(boiler, 'block');
    boiler = await at(boiler.handle, PROVISIONING);
    await buySure(boiler, 'quicklime');
    await afterHours();
    boiler = await at(boiler.handle, BOILING);
    await say(boiler, 'pour butt into copper --amount 25L');
    await say(boiler, 'put block in copper');
    // ⭐ Tempered and skimmed: an untempered liquor is blackstrap and will
    // not grain at all (W5's purity table — once limed and skimmed, fine).
    expect(await say(boiler, 'temper copper with quicklime')).toMatch(/lime goes in|scum/i);
    expect(await say(boiler, 'skim copper into pail')).toMatch(/scum off|runs clear/i);
    await fire(boiler, 'arch', 'coal', 3);
    await say(boiler, 'heat copper');
    // `measure boil` climbs through syrup to strike.
    const climb: number[] = [];
    let stage = '';
    for (let spent = 0; spent < 12 * 60; ) {
      const arch = await say(boiler, 'look arch');
      if (/It is cold/.test(arch)) await fire(boiler, 'arch', 'coal', 1);
      const t = await kelvin(boiler, 'copper');
      climb.push(t);
      const step = Number.isFinite(t) && t >= 385 ? 2 : 15;
      await advanceLiving(`${step} minutes`, [boiler]);
      spent += step;
      stage = await say(boiler, 'measure boil copper');
      const looks = (await say(boiler, 'look copper')).toLowerCase();
      if (/clouding with grain/.test(looks) || /burnt toffee|black and acrid/.test(looks)) break;
    }
    note(`  [1] the boil climbed: ${climb.filter(Number.isFinite).join(' → ')} K; last thread: ${stage}`);
    expect(Math.max(...climb.filter(Number.isFinite)), 'the boil never climbed past water').toBeGreaterThan(380);
    expect(await say(boiler, 'look copper'), 'the copper never reached the strike').toMatch(/clouding with grain/i);
    // Struck off into the cone on its pot, and set down.
    await say(boiler, 'get copper');
    await say(boiler, 'put cone on pot');
    await say(boiler, 'pour copper into cone');
    await say(boiler, 'drop copper');
    // Let it cool, and nobody starts it.
    await advanceLiving('2 hours', [boiler]);
    const held = await say(boiler, 'analyze boil cone');
    expect(held, `the cold, unseeded strike: ${held}`).toMatch(/holding more than it can keep, and nothing has started it/i);
    expect(await holds(boiler, 'cone'), 'a loaf in the unseeded cone').not.toMatch(/loaf/i);
    // ⭐ The pinch of sugar (the floor's piece — D15).
    await say(boiler, 'get piece');
    await say(boiler, 'put piece in cone');
    await advanceLiving('30 minutes', [boiler]);
    const setting = await say(boiler, 'analyze boil cone');
    expect(setting, `seeded, it still says it holds: ${setting}`).not.toMatch(/nothing has started it/i);
    const crop = `${await holds(boiler, 'cone')} ${await examine(boiler, 'cone')}`;
    expect(crop, `seeded, it began to set: ${crop}`).toMatch(/loaf|setting|set/i);
  }, 3_600_000);

  it('2. [staged · staged] the strike drains to molasses: four days on, a loaf in the cone and molasses in the pot; lifted onto the floor, the next drainings pool on the floor', async () => {
    await daylight();
    boiler = await at(boiler.handle, CURING);
    // (staged) A cone of a tempered, nucleated strike — set on its pot, it
    // sets at the first read and starts its four-day drain; the drain's
    // stamps are then put three and a half days back (W5: `liquorDrain*`
    // on the payload). ⚠ The plan's single overlay (a stamp four days back
    // at hand time) cannot stand: the set re-stamps `liquorDrainStampS` to
    // now, and a due stamp written BEFORE the set drains the STRIKE (the
    // drain runs ahead of the set in a read). So: set first, re-stamp after.
    const cone = await hand(boiler, T.cone, {
      keywords: ['cone', 'sugar cone', 'mould', TAG.cone2],
      interiorMaterial: M.strike,
      interiorAmount: 6,
      interiorPayload: { dissolvedSolidsKgPerL: 1.3, purity: 0.92, grade: 'fine', nucleated: true },
    });
    const pots = await idsHere(boiler, 'pot');
    expect(pots.length, 'no curing pot in the curing house').toBeGreaterThan(0);
    const pot = pots[0]!;
    const potBefore = await liters(boiler, `#${pot}`);
    expectOk(await boiler.cmd(`put #${cone} on #${pot}`));
    // The read that sets it.
    await examine(boiler, TAG.cone2);
    const restamp = await evalOn(
      boiler,
      TERMINUS,
      TAG.cone2,
      `(() => { const p = this.getBulkPayload('interior') ?? {}; if (p.liquorDrainDueS === undefined) return JSON.stringify({ unset: true, p }); ` +
        `const back = 3.5 * ${DAY}; this.setBulkPayload('interior', { ...p, liquorDrainStampS: p.liquorDrainStampS - back, liquorDrainDueS: p.liquorDrainDueS - back }); ` +
        `return JSON.stringify({ restamped: true, material: this.getBulkMaterial('interior')?.getName?.() }); })()`,
    );
    note(`  [2] the drain re-stamped: ${JSON.stringify(restamp)}`);
    expect((restamp as { restamped?: boolean }).restamped, `the set never started a drain: ${JSON.stringify(restamp)}`).toBe(true);
    // Four days on: a loaf, and the pot holds molasses — the liquor left over.
    const loaf = `${await holds(boiler, TAG.cone2)} ${await examine(boiler, TAG.cone2)}`;
    expect(loaf, `the cone four days on: ${loaf}`).toMatch(/loaf/i);
    const potNow = await liters(boiler, `#${pot}`);
    const potLooks = await examine(boiler, `#${pot}`);
    note(`  [2] the pot: ${potBefore} L → ${potNow} L · ${potLooks}`);
    expect(potNow, 'nothing drained into the pot').toBeGreaterThan((Number.isFinite(potBefore) ? potBefore : 0) + 3);
    expect(potLooks, 'the pot does not hold molasses').toMatch(/molasses|dark brown and sticky/i);
    // Lifted off the pot onto the floor: the last half-day's drainings pool there.
    await say(boiler, `get #${cone}`);
    await say(boiler, `drop #${cone}`);
    const potLifted = await liters(boiler, `#${pot}`);
    await advanceLiving('6 hours', [boiler]);
    const room = await lookHere(boiler);
    expect(room, `the floor under the lifted cone: ${room}`).toMatch(/puddle of[^.|]*(molasses|dark brown|sticky)/i);
    expect(await liters(boiler, `#${pot}`), 'the pot kept filling with the cone off it').toBeLessThanOrEqual(potLifted + 0.01);
  }, 1_800_000);

  it('3. [staged · staged] maple sugar sets: a maple strike, staged, holds — started, it sets as maple sugar', async () => {
    await daylight();
    boiler = await at(boiler.handle, SUGARBUSH);
    // (staged) A mold of maple strike, on the sugarbush's ground.
    const cone = await hand(boiler, T.cone, {
      keywords: ['cone', 'mould', TAG.cone3],
      interiorMaterial: M.mapleStrike,
      interiorAmount: 5,
      interiorPayload: { dissolvedSolidsKgPerL: 1.4, purity: 0.97 },
    });
    await say(boiler, `drop #${cone}`);
    await advanceLiving('1 hour', [boiler]);
    const held = await say(boiler, `analyze boil #${cone}`);
    expect.soft(held, `the cold maple strike: ${held}`).toMatch(/holding more than it can keep/i);
    // ⚠ Seeded by a STIR, not a piece: no row is a piece of maple sugar
    // (the material exists; nothing is cast of it but a crop). A stir is
    // the same start (D14's `nucleated`) by the player's own hand.
    await act(boiler, `stir #${cone}`);
    await advanceLiving('30 minutes', [boiler]);
    const crop = `${await holds(boiler, `#${cone}`)} ${await examine(boiler, `#${cone}:i`)}`;
    expect(crop, `the stirred maple strike: ${crop}`).toMatch(/maple|tan|fine-grained/i);
  }, 1_200_000);

  it('4. [short · player] salt waits for its edge: the open pan dries; brine cooled in a crock holds past saturation until stirred', async () => {
    await daylight();
    salter = await at(salter.handle, MOUTH);
    // ⚠ DISCOVERED: what a player fills from at the estuary mouth. The
    // wharfside drive's `fill pail from river` is the precedent; the mouth's
    // own word for its water is tried in turn and recorded.
    const pail = await hand(salter, T.pail);
    let filled = '';
    for (const src of ['estuary', 'water', 'sea', 'river', 'tide', 'channel']) {
      filled = await say(salter, `fill #${pail} from ${src}`);
      if (/you fill/i.test(filled)) {
        note(`  [4] ⚠ DISCOVERED: the mouth's water answers to '${src}'`);
        break;
      }
    }
    expect(filled, `no water a pail fills from at the mouth: ${filled}`).toMatch(/you fill/i);
    const pans = await idsHere(salter, 'pan');
    expect(pans.length, 'no salt pan at the mouth').toBeGreaterThan(0);
    await say(salter, `pour #${pail} into #${pans[0]}`);
    const pan0 = await liters(salter, `#${pans[0]}`);
    await advanceLiving('12 hours', [salter]);
    const pan1 = await liters(salter, `#${pans[0]}`);
    note(`  [4] the open pan: ${pan0} L → ${pan1} L`);
    // "As today": it dries under the sky — unless the half-day rained.
    expect.soft(pan1, 'the open pan did not dry').toBeLessThan(pan0);
    // ⚠ The crock half is STAGED, though the step is `player`: sea water
    // off a half-day's pan is nowhere near saturation, and salt's
    // solubility barely moves with temperature, so no brine a player can
    // take off in a day holds past it. The crock is handed near-saturated
    // brine (0.37 kg/L over 0.36 cold, under salt's 1.1 metastable ratio)
    // and everything after is the player's.
    const crock = await hand(salter, T.crock, {
      keywords: ['crock', 'pot', TAG.brine4],
      _materialPath: M.stoneware,
      coats: {
        inside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
        outside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
      },
      interiorMaterial: M.saltWater,
      interiorAmount: 3,
      interiorPayload: { dissolvedSolidsKgPerL: 0.37 },
    });
    await say(salter, `drop #${crock}`);
    await advanceLiving('1 hour', [salter]);
    const crystals0 = await idsHere(salter, 'crystals');
    expect(crystals0.length, 'the cooled brine set crystals on its own').toBe(0);
    await act(salter, `stir #${crock}`);
    await advanceLiving('20 minutes', [salter]);
    const crystals1 = await idsHere(salter, 'crystals');
    note(`  [4] crystals beside the crock: ${crystals0.length} → ${crystals1.length}`);
    expect(crystals1.length, 'stirred, the brine set nothing').toBeGreaterThan(0);
  }, 2_400_000);
});

suite('⭐⭐ one wall exchange — a cask remembers (AC 3, 4)', () => {
  it('5. [staged · player] a cask remembers: water in a whiskey cask smells of whiskey; a washed one carries less; a pitched ale cask gives nothing', async () => {
    await daylight();
    taster = await at(taster.handle, CROWSFOOT);
    // A nose that can name a spirit: an aroma word bands by its row's own
    // discipline (`distilling`).
    for (let i = 0; i < 16; i++) await taster.cmd('practice distilling hard success');
    await hand(taster, T.gasAnalyzer);
    // (staged) Two plain casks that have held whiskey — their walls hold
    // what a whiskey fill leaves (W4's `absorbed`) and a little whiskey is
    // still in them — and a pitched ale cask with the same history.
    const memory = { inside: [{ type: SPIRIT_AROMA, amount: 60 }] };
    const a = await hand(taster, T.distillingCask, {
      keywords: ['cask', 'barrel', TAG.caskA],
      absorbed: memory,
      interiorMaterial: M.whiskey,
      interiorAmount: 2,
    });
    await say(taster, `drop #${a}`);
    const b = await hand(taster, T.distillingCask, {
      keywords: ['cask', 'barrel', TAG.caskB],
      absorbed: memory,
      interiorMaterial: M.whiskey,
      interiorAmount: 2,
    });
    await say(taster, `drop #${b}`);
    const c = await hand(taster, T.brewingCask, {
      keywords: ['cask', 'barrel', TAG.caskC],
      absorbed: { inside: [{ type: BEER_AROMA, amount: 60 }] },
    });
    await say(taster, `drop #${c}`);
    // The player empties A and B (into the slop bucket) and fills A, then
    // washes B and fills it, and fills the pitched cask.
    for (const id of [a, b]) {
      const poured = await say(taster, `pour #${id} into "slop bucket"`);
      if (!/pour/i.test(poured)) await say(taster, `spill #${id}`);
    }
    await say(taster, `fill #${a} from standpipe`);
    await act(taster, `wash #${b}`);
    await say(taster, `fill #${b} from standpipe`);
    await say(taster, `fill #${c} from standpipe`);
    // The wall gives back over hours, not at once.
    await advanceLiving('3 hours', [taster]);
    const smelt = await say(taster, `smell #${a}`);
    const nosedA = await say(taster, `analyze aroma #${a}`);
    expect(`${smelt} ${nosedA}`, `the water in the whiskey cask: ${smelt} | ${nosedA}`).toMatch(/spirit|alcohol|whisk/i);
    const figA = figure(await say(taster, `measure aroma #${a}`), /spirit|alcohol|whisk/i);
    const figB = figure(await say(taster, `measure aroma #${b}`), /spirit|alcohol|whisk/i);
    note(`  [5] the spirit in the water: unwashed ${figA} OU, washed ${figB} OU`);
    expect(figA, 'the unwashed cask gave no measurable spirit').toBeGreaterThan(0);
    expect(Number.isFinite(figB) ? figB : 0, 'the washed cask gave as much as the unwashed').toBeLessThan(figA);
    const nosedC = await say(taster, `analyze aroma #${c}`);
    expect(nosedC, `the pitched cask's water: ${nosedC}`).not.toMatch(/beer|ale|spirit|alcohol/i);
    before.caskMemory = await evalOn(taster, TERMINUS, TAG.caskA, `JSON.stringify(this.absorbedAromas('inside'))`);
  }, 1_800_000);

  it('6. [instant · player] the whiskey is the distiller’s: `analyze condition` reads the cooper’s work, tasting reads the distiller’s; the cask’s maker is still the cooper', async () => {
    taster = await at(taster.handle, CROWSFOOT);
    // Training for the two reads: an appraiser's eye (condition's
    // `appraisal`) and a distiller's palate (the blend's discipline).
    for (let i = 0; i < 16; i++) await taster.cmd('practice appraisal hard success');
    // (staged) A cooper-made cask, FINE work, holding a distiller's POOR batch.
    const d = await hand(taster, T.distillingCask, {
      keywords: ['cask', 'barrel', TAG.caskD],
      maker: cooperPath,
      gradeBand: 'fine',
      interiorMaterial: M.whiskey,
      interiorAmount: 5,
      interiorPayload: { grade: 'poor', maker: DISTILLER },
    });
    await say(taster, `drop #${d}`);
    const condition = await say(taster, `analyze condition #${d}`);
    expect(condition, `analyze condition: ${condition}`).toMatch(/it is fine work/i);
    expect(condition).not.toMatch(/poor work/i);
    const tasted = await say(taster, `taste #${d}`);
    expect(tasted, `taste: ${tasted}`).toMatch(/making of it reads poor/i);
    // ⚠ W0: no `look` line names a cask's maker (the verdict augmenters are
    // a bottle's and a craft vessel's, and render the CONTENTS'). The
    // cask's own maker is read back by `eval`, and the look is recorded.
    const looked = await examine(taster, `#${d}`);
    const me = await cooper.query('me', { fields: ['displayName'] });
    const cooperName = String((me[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
    note(`  [6] look cask: ${looked} (the cooper is '${cooperName}')`);
    expect.soft(looked, 'look names the cooper (no such line was found at W0)').toContain(cooperName);
    const marks = (await evalOn(
      taster,
      TERMINUS,
      TAG.caskD,
      `JSON.stringify({ maker: this.getMaker(), grade: this.getGrade().getBand(), payload: this.getBulkPayload('interior') })`,
    )) as { maker?: string; grade?: string; payload?: { grade?: string; maker?: string } };
    expect(marks.maker, 'filling the cask changed its maker').toBe(cooperPath);
    expect(marks.grade).toBe('fine');
    expect(marks.payload?.maker).toBe(DISTILLER);
    expect(marks.payload?.grade).toBe('poor');
    before.marks = marks;
  }, 900_000);

  it('7. [staged · staged] a poor mold casts poor; a poor bottle leaves a fine wine fine', async () => {
    await daylight();
    boiler = await at(boiler.handle, CURING);
    // (staged) A poor cone, on a pot; a fine strike in a pail.
    const cone = await hand(boiler, T.cone, { keywords: ['cone', 'mould', TAG.cone7], gradeBand: 'poor' });
    const pots = await idsHere(boiler, 'pot');
    expectOk(await boiler.cmd(`put #${cone} on #${pots[pots.length - 1]}`));
    const pail = await hand(boiler, T.pail, {
      keywords: ['pail', 'bucket', TAG.pail7],
      interiorMaterial: M.strike,
      interiorAmount: 6,
      interiorPayload: { dissolvedSolidsKgPerL: 1.3, purity: 0.93, grade: 'fine', maker: DISTILLER },
    });
    await say(boiler, `pour #${pail} into #${cone}`);
    await act(boiler, `stir #${cone}`);
    await advanceLiving('30 minutes', [boiler]);
    const loaf = await examine(boiler, `#${cone}:i`);
    expect(loaf, `the cast in the poor mold: ${loaf}`).toMatch(/loaf/i);
    expect(loaf).toMatch(/poor/i);
    expect(loaf).not.toMatch(/looks fine/i);
    // (staged) A poor bottle; a fine wine.
    const bottle = await hand(boiler, T.wineBottle, { keywords: ['bottle', 'wine', TAG.bottle7], gradeBand: 'poor' });
    const wine = await hand(boiler, T.pail, {
      keywords: ['pail', 'bucket', TAG.wine7],
      interiorMaterial: M.redWine,
      interiorAmount: 2,
      interiorPayload: { grade: 'fine', maker: DISTILLER },
    });
    await say(boiler, `pour #${wine} into #${bottle}`);
    const bottled = await examine(boiler, `#${bottle}`);
    expect(bottled, `the fine wine in the poor bottle: ${bottled}`).toMatch(/looks fine/i);
    expect(bottled).not.toMatch(/looks poor/i);
  }, 900_000);
});

suite('⭐⭐ one leak — pores, flaws, joints (AC 1, 2)', () => {
  it('8. [short · staged] a sprung stave leaks: a full cask falls over an hour and the floor pools; a new stave is fitted and the fall stops', async () => {
    await daylight();
    cooper = await at(cooper.handle, CROWSFOOT);
    // (staged) A full cask, one stave sprung — `parts` overlaid whole, so its
    // `joints` are overlaid with it (W0: `ensureParts` leaves them empty).
    const e = await hand(cooper, T.distillingCask, {
      keywords: ['cask', 'barrel', TAG.caskE],
      interiorMaterial: M.water,
      interiorAmount: 25,
      parts: [
        { part: 'stave', template: T.stave, count: 30, role: 'structural', material: '/stuff/idea/material/wood/oak', grade: 'fair', condition: 1, failed: 1, makers: [], plural: 'staves' },
        { part: 'head', template: '/trade/coopering/thing/cask-head', count: 2, role: 'structural', material: '/stuff/idea/material/wood/oak', grade: 'fair', condition: 1, failed: 0, makers: [] },
        { part: 'hoop', template: '/trade/smithing/thing/hoop', count: 6, role: 'fastener', material: '/stuff/idea/material/element/iron', grade: 'fair', condition: 1, failed: 0, makers: [] },
      ],
      joints: [
        { key: 'hooping', method: '/trade/coopering/joints/tight-hooped', members: ['stave', 'head'], fastener: 'hoop', tension: 1, maker: '' },
      ],
    });
    await say(cooper, `drop #${e}`);
    const l0 = await liters(cooper, `#${e}`);
    await advanceLiving('1 hour', [cooper]);
    const l1 = await liters(cooper, `#${e}`);
    note(`  [8] the sprung cask: ${l0} L → ${l1} L in an hour`);
    // W3's dial: a 25 L cask with one failed stave loses about a third an hour.
    expect(l1, `the cask with a sprung stave over an hour: ${l0} → ${l1}`).toBeLessThan(l0 * 0.85);
    const floor = await lookHere(cooper);
    expect(floor, `the floor under the cask: ${floor}`).toMatch(/puddle of[^.|]*water/i);
    // The mend: a stave and a driver in hand, coopering at proficient.
    for (let i = 0; i < 20; i++) await cooper.cmd('practice coopering hard success');
    await hand(cooper, T.stave);
    await hand(cooper, T.driver);
    const fitted = await act(cooper, `fit stave to #${e}`);
    expect(fitted.said, `fit stave: ${fitted.said}`).toMatch(/fit a new stave|stave/i);
    const l2 = await liters(cooper, `#${e}`);
    await advanceLiving('1 hour', [cooper]);
    const l3 = await liters(cooper, `#${e}`);
    note(`  [8] fitted: ${l2} L → ${l3} L in the next hour`);
    expect(l3, `the mended cask over an hour: ${l2} → ${l3}`).toBeGreaterThan(l2 - 0.3);
    before.leakCaskL = l3;
    before.leakPuddle = /puddle of[^.|]*water/i.test(await lookHere(cooper));
  }, 1_800_000);

  it('9. [short · staged] a crack in glazed stoneware leaks through the crack: the cracked crock falls at the crack’s rate, its sound twin not at all', async () => {
    await daylight();
    potter = await at(potter.handle, POTTERS_SHOP);
    const glazed = {
      _materialPath: M.stoneware,
      coats: {
        inside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
        outside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
      },
      interiorMaterial: M.water,
      interiorAmount: 3.5,
    };
    const now = await worldClockNow();
    const cracked = await hand(potter, T.crock, {
      ...glazed,
      keywords: ['crock', 'pot', TAG.crack9],
      flaws: [{ kind: 'crack', visible: true, atS: now }],
    });
    await say(potter, `drop #${cracked}`);
    const sound = await hand(potter, T.crock, { ...glazed, keywords: ['crock', 'pot', TAG.sound9] });
    await say(potter, `drop #${sound}`);
    const c0 = await liters(potter, `#${cracked}`);
    const s0 = await liters(potter, `#${sound}`);
    await advanceLiving('30 minutes', [potter]);
    const c1 = await liters(potter, `#${cracked}`);
    const s1 = await liters(potter, `#${sound}`);
    note(`  [9] cracked ${c0} → ${c1} L, sound ${s0} → ${s1} L in half an hour`);
    // W3's dial: a crack lets out 4 L an hour — about 2 L in half an hour.
    expect(c0 - c1, 'the cracked glazed crock held its water').toBeGreaterThan(0.8);
    expect(s0 - s1, 'the sound glazed crock leaked').toBeLessThan(0.05);
  }, 900_000);
});

suite('⭐ the crock remembers (AC 3)', () => {
  it('10. [short · player] the glazed butter crock remembers nothing; the oak churn, emptied, gives its old cream to fresh milk, and washed it gives less', async () => {
    await daylight();
    dairy = await at(dairy.handle, CREAMERY);
    await hand(dairy, T.gasAnalyzer);
    // ⭐ Re-planned at build (lens 1 — the world is derivable): the shipped
    // butter crock is LEAD-GLAZED inside and out, and a glaze seals — so it
    // holds no memory, which is why a dairy keeps butter in glazed ware. The
    // creamery's OAK churn is the vessel that remembers (oak is absorbent).
    // The cream is handed (setup); the creamery's own cream is a morning's
    // work the dairy drive drives.
    const creamC = await hand(dairy, T.dairyJug, { interiorMaterial: M.cream, interiorAmount: 1.5 });
    await say(dairy, `pour #${creamC} into "butter crock"`);
    await advanceLiving('8 hours', [dairy]);
    await say(dairy, `pour "butter crock" into #${creamC}`);
    const milkC = await hand(dairy, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
    await say(dairy, `pour #${milkC} into "butter crock"`);
    await advanceLiving('2 hours', [dairy]);
    const glazed = figure(await say(dairy, 'measure aroma "butter crock"'), /cream/i);
    note(`  [10] fresh milk in the emptied glazed crock: cream ${glazed} OU`);
    expect(Number.isFinite(glazed) ? glazed : 0, 'the glazed crock gave back cream').toBe(0);
    // The oak churn: cream, emptied, fresh milk.
    const cream = await hand(dairy, T.dairyJug, { interiorMaterial: M.cream, interiorAmount: 1.5 });
    await say(dairy, `pour #${cream} into churn`);
    await advanceLiving('8 hours', [dairy]);
    await say(dairy, `pour churn into #${cream}`);
    const milkA = await hand(dairy, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
    await say(dairy, `pour #${milkA} into churn`);
    await advanceLiving('2 hours', [dairy]);
    const nosed = await say(dairy, 'analyze aroma churn');
    const first = figure(await say(dairy, 'measure aroma churn'), /cream/i);
    note(`  [10] fresh milk in the emptied oak churn: ${nosed} · cream ${first} OU`);
    expect(first, 'no cream measured in the fresh milk in the churn').toBeGreaterThan(0);
    // Emptied again, washed, refilled.
    await say(dairy, `pour churn into #${milkA}`);
    await act(dairy, 'wash churn');
    const milkB = await hand(dairy, T.dairyJug, { interiorMaterial: M.milk, interiorAmount: 1.5 });
    await say(dairy, `pour #${milkB} into churn`);
    await advanceLiving('2 hours', [dairy]);
    const second = figure(await say(dairy, 'measure aroma churn'), /cream/i);
    note(`  [10] after the wash: cream ${second} OU (was ${first})`);
    expect(Number.isFinite(second) ? second : 0, 'washed, the churn gave as much cream').toBeLessThan(first);
    before.crockMemory = await evalOn(dairy, HD, 'churn', `JSON.stringify(this.absorbedAromas('inside'))`);
  }, 1_800_000);
});

suite('⭐⭐ one hole rule — a snag, `bail` and `repair` (AC 1, 10)', () => {
  it('11. [short · staged] a snag holes the rowboat by play; `bail` races it; `repair` patches her to her seep — and the Hesper, holed the same way, is refused a course until patched', async () => {
    // ── the rowboat ──
    // By night: a snag in a choked reach is SEEN by day and held off, and
    // STRUCK by night (`snagVerdict`).
    await toHour(22);
    boatman = await at(boatman.handle, PUT_IN);
    // Stock of her own planking and an edge to work it (`repair` help).
    await hand(boatman, T.billet);
    await hand(boatman, T.billhook);
    // A rowboat of her own, handed where she stands (the harbors drive's way).
    const boat = await hand(boatman, T.rowboat, { keywords: ['rowboat', 'boat', 'skiff', TAG.boat11] });
    expectOk(await boatman.cmd(`go #${boat}`));
    expect(await say(boatman, 'launch')).toMatch(/floats/);
    // ⚠ DISCOVERED (W0, offline): the put-in is km 60.4 (bend #2, clear);
    // the nearest choked bend is #4, about km 59.2–58.5 (obstruction ≈ 0.52
    // over `SNAG_CHOKED` 0.5). Paddled hard downstream into it.
    expectOk(await boatman.cmd('paddle downstream --hard'));
    let heard = '';
    for (let i = 0; i < 60 && !/stove in on a snag/.test(heard); i++) {
      heard += ' ' + squash(await boatman.listen(15_000));
      if (/swamp|goes over|upside down/.test(heard)) break;
      if (/grounds|nothing to paddle|not on any water|stops/.test(heard) && !/stove in/.test(heard)) {
        await boatman.cmd('paddle downstream --hard');
      }
    }
    note(`  [11] the paddle: ${heard.slice(0, 600)}`);
    const where = JSON.stringify(await boatman.query('me:e:e', { fields: 'ref' }).catch(() => null));
    note(`  [11] ⚠ DISCOVERED: struck at ${where}`);
    expect(heard, 'the rowboat never met the snag').toMatch(/stove in on a snag/);
    await boatman.cmd('stop');
    // The bilge fills, and bailing races it (0.18 L/s in, a bucket's 0.5 out).
    await advanceWorldClock('5 minutes');
    let bailed = '';
    for (let i = 0; i < 3; i++) bailed += ' ' + (await act(boatman, `bail #${boat}`)).said;
    expect(bailed, `bailing the holed boat: ${bailed}`).toMatch(/bucketful of water out over her side/);
    // `repair` patches the hole; the leak falls to her seams' seep.
    const patched = await act(boatman, `repair #${boat}`);
    expect(patched.said, `repair the rowboat: ${patched.said}`).toMatch(/patch/i);
    await advanceWorldClock('20 minutes');
    let after = '';
    for (let i = 0; i < 3; i++) after += ' ' + (await act(boatman, `bail #${boat}`)).said;
    expect(after, `the patched boat: ${after}`).toMatch(/She is dry|not rising|dry/i);
    // A staged cross-check, recorded: the boat's flaws after the patch.
    const flaws = await evalOn(boatman, REJ, TAG.boat11, `JSON.stringify(this.getFlaws())`).catch((err: unknown) => String(err));
    note(`  [11] the rowboat's flaws after the patch: ${JSON.stringify(flaws)}`);

    // ── the Hesper ──
    // ⚠ DISCOVERED: the choked stretch she is run into. Snags are SEEDED per
    // bend on wooded stretches, never authored, and none was computed for
    // the city's river at plan time — so the catalogue is asked.
    const gov = await founder(BANK_HALL);
    let choked: { id: string; downKm: number; upKm: number; obstruction: number }[] = [];
    let quayKm = NaN;
    try {
      const found = (await evalIn(
        gov,
        TERMINUS,
        `return JSON.stringify(await (async () => { const cat = await StuffApi.singleton('/system/water/idea/WatercourseCatalogue'); ` +
          `const line = await cat.lineOf('kestrel'); const seen = {}; const out = []; ` +
          `for (let km = 0.05; km < 62; km += 0.05) { const s = line.stretchAt(km); if (s && s.obstruction > 0.5 && !seen[s.id]) { seen[s.id] = 1; out.push({ id: s.id, downKm: s.downKm, upKm: s.upKm, obstruction: s.obstruction }); } } ` +
          `const quay = cat.landingNamed('kestrel', 'town quay'); return { choked: out, quayKm: quay ? quay.km : null }; })())`,
      )) as { choked?: typeof choked; quayKm?: number | null };
      choked = found.choked ?? [];
      quayKm = typeof found.quayKm === 'number' ? found.quayKm : NaN;
    } finally {
      gov.close();
    }
    note(`  [11] ⚠ DISCOVERED: choked stretches on the Kestrel ${JSON.stringify(choked)}; the Town Quay at km ${quayKm}`);
    expect(choked.length, 'no choked stretch on the Kestrel to run the Hesper into').toBeGreaterThan(0);
    // The choked stretch nearest the quay; she is staged on its far side, in
    // the stretch beside it, so her course to the quay runs through it.
    const target = [...choked].sort((x, y) => Math.abs((x.upKm + x.downKm) / 2 - quayKm) - Math.abs((y.upKm + y.downKm) / 2 - quayKm))[0]!;
    const ordinal = Number(target.id.split(':')[1]);
    // Stretch ids are source-first: a larger ordinal is downstream.
    const beside = (target.upKm + target.downKm) / 2 > quayKm ? ordinal - 1 : ordinal + 1;
    note(`  [11] the Hesper staged at kestrel:${beside}, beside ${target.id} (km ${target.downKm.toFixed(2)}–${target.upKm.toFixed(2)})`);
    await stageShip(HESPER, {});
    await hand(boatman, T.billet);
    await hand(boatman, T.billet);
    const master = await at(boatman.handle, HESPER_DECK);
    boatman = master;
    const me = await master.query('me', { fields: ['displayName'] });
    const name = String((me[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
    const appoint = await founder(BANK_HALL);
    try {
      expectOk(await appoint.cmd(`house appoint "${name}" to master at ${HESPER_CO}`));
    } finally {
      appoint.close();
    }
    await stageShip(HESPER, { at: { frame: KESTREL, cite: String(beside) } });
    await toHour(23);
    const laid = await say(master, 'course town-quay');
    note(`  [11] the Hesper's course: ${laid}`);
    let hesperHeard = laid;
    for (let i = 0; i < 12 && !/holed on a snag/.test(hesperHeard); i++) {
      const hearing = master.listen(8_000);
      await advanceWorldClock('10 minutes');
      hesperHeard += ' ' + squash(await hearing);
      if (/made fast|not under way/.test(hesperHeard)) break;
    }
    expect(hesperHeard, 'the Hesper never struck the snag').toMatch(/holed on a snag/);
    const refused = await say(master, 'course town-quay');
    expect(refused, `the holed Hesper's course: ${refused}`).toMatch(/until she is patched/);
    const mended = await act(master, 'repair hesper');
    expect(mended.said, `repair the Hesper: ${mended.said}`).toMatch(/patch/i);
    const sails = await say(master, 'course town-quay');
    expect(sails, `the patched Hesper's course: ${sails}`).toMatch(/lay a course|under way|for the Town Quay/i);
    expect(sails).not.toMatch(/until she is patched/);
  }, 3_600_000);
});

suite('⭐⭐ one vaporization — the kiln, the copper, the retort (AC 7, 8)', () => {
  it('12. [staged · player] salt glazing: salt thrown into the kiln at heat salt-glazes the stoneware; the shop smells it and `analyze atmosphere` reads it; out, the chamber goes up the flue', async () => {
    // After the potter's hours: a lit kiln of a player's ware alone is one
    // she would douse (`pots`' first rule).
    await afterHours();
    potter = await at(potter.handle, POTTERS_SHOP);
    await hand(potter, T.gasAnalyzer);
    // (staged) A bone-dry green jug of a stoneware-firing clay (the clay
    // row's `stoneware` heat-work arm carries the salt `vapor:`).
    const jug = await hand(potter, T.ceramicJug, { keywords: ['jug', 'pot', TAG.jug12], _materialPath: M.clay, _moisture: 0 });
    await say(potter, `put #${jug} in kiln`);
    // The salt is thrown in with the load: lying in the chamber, it
    // vaporizes once the kiln passes 1350 K (W6 — `put salt in kiln` binds
    // the kiln as a Container). ⚠ In before the firing, not at its peak:
    // `fire kiln for …` holds the hands, and a `put` mid-firing would end it.
    await say(potter, 'get 1 salt');
    await say(potter, 'put salt in kiln');
    // The kiln lit and brought to heat by the player's own fire, as the
    // potter does it — the plan's `stage` is what a cold run falls back to.
    for (let i = 0; i < 6; i++) {
      await say(potter, 'get 1 charcoal');
      await say(potter, 'stoke charcoal into kiln');
    }
    await say(potter, 'light kiln');
    const fired = await say(potter, 'fire kiln for 10 hours');
    note(`  [12] fire: ${fired}`);
    await advanceLiving('6 hours', [potter]);
    // (Recorded only: the shop has pyrometric cones, not a thermometer.)
    note(`  [12] the kiln at six hours: ${await kelvin(potter, 'kiln')} K`);
    const nosed = await say(potter, 'smell');
    const air = await say(potter, 'analyze atmosphere');
    expect(`${nosed} ${air}`, `the salted shop: ${nosed} | ${air}`).toMatch(/salt|fume/i);
    const inRoom = figure(await say(potter, 'measure aroma'), /salt|fume/i);
    await advanceLiving('3.5 hours', [potter]);
    // Out: the fire is let go, and the chamber's air goes up the flue.
    await say(potter, 'douse kiln');
    await advanceLiving('1 hour', [potter]);
    const afterOut = figure(await say(potter, 'measure aroma'), /salt|fume/i);
    note(`  [12] salt fume in the shop: lit ${inRoom} OU, out ${afterOut} OU`);
    expect.soft(Number.isFinite(afterOut) ? afterOut : 0, 'putting the kiln out filled the shop with its air').toBeLessThanOrEqual(Number.isFinite(inRoom) ? inRoom * 1.2 + 1 : 1);
    await advanceLiving('3 hours', [potter]);
    await say(potter, `get #${jug} from kiln`);
    const glazed = await examine(potter, `#${jug}`);
    expect(glazed, `the jug out of the salted kiln: ${glazed}`).toMatch(/salt/i);
    expect(glazed).toMatch(/stoneware|glaz/i);
    await say(potter, `drop #${jug}`);
    before.saltJug = glazed;
  }, 3_600_000);

  it('13. [short · player] steam and fouled air reach the nose: a boiling copper raises `measure humidity` and is smelled; a retort with no condenser fouls the air', async () => {
    await afterHours();
    boiler = await at(boiler.handle, BOILING);
    await hand(boiler, T.hygrometer);
    const dry = figure(await say(boiler, 'measure humidity'), /humid|%/i);
    // Water in the copper (a boiling sugar liquor steams too, since the W6
    // follow-up — a boil drives off water — but plain water keeps the
    // step independent of step 1's liquor).
    await say(boiler, 'pour butt into copper --amount 20L');
    await fire(boiler, 'arch', 'coal', 3);
    await say(boiler, 'heat copper');
    await advanceLiving('2 hours', [boiler]);
    const steamy = figure(await say(boiler, 'measure humidity'), /humid|%/i);
    const nose = await say(boiler, 'smell');
    note(`  [13] humidity ${dry} → ${steamy}; smell: ${nose}`);
    expect(steamy, `the boiling floor's humidity: ${dry} → ${steamy}`).toBeGreaterThan(dry);
    expect(nose, `the steam, smelled: ${nose}`).toMatch(/damp|steam|wet/i);
    // (staged) A retort with nothing on its pipe, handed where she stands.
    await hand(boiler, T.retort);
    await hand(boiler, T.charcoal);
    await hand(boiler, T.cordwood);
    await say(boiler, 'stoke charcoal into retort');
    await say(boiler, 'light retort');
    await say(boiler, 'put cordwood in retort');
    await say(boiler, 'fire in retort for 3 hours');
    await advanceLiving('3 hours', [boiler]);
    const fouled = await say(boiler, 'smell');
    const air = await say(boiler, 'analyze atmosphere');
    expect(`${fouled} ${air}`, `the retort's fumes: ${fouled} | ${air}`).toMatch(/smoke|tar|acrid|creosote|pitch|gas/i);
  }, 3_600_000);
});

suite('⭐ one water for porous bodies (AC 9)', () => {
  it('14. [short · staged] rain and glaze: in rain the glazed pot sheds it, the terracotta takes it in and its held water rises; green ware under the hack cover takes none', async () => {
    await daylight();
    potter = await at(potter.handle, WEATHERING);
    // (staged) Two pots side by side on the open ground, one glazed.
    const glazedPot = await hand(potter, T.plantPot, {
      keywords: ['pot', 'plant pot', TAG.glazed14],
      _materialPath: M.terracotta,
      coats: {
        inside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
        outside: [{ material: M.leadGlaze, thicknessM: 0.0003, state: 'set' }],
      },
    });
    const terra = await hand(potter, T.plantPot, { keywords: ['pot', 'plant pot', TAG.terra14], _materialPath: M.terracotta });
    await say(potter, `drop #${glazedPot}`);
    await say(potter, `drop #${terra}`);
    // A green brick under the hack cover.
    potter = await at(potter.handle, HACKS);
    const brick = await hand(potter, T.brick, { keywords: ['brick', TAG.brick14], _materialPath: M.alluvial });
    await say(potter, `put #${brick} on hack`);
    // Held water — a staged read: no player reading reports it (none added).
    const READ = `JSON.stringify({ moisture: this.getMoisture(), wetness: this.getWetness?.() ?? null })`;
    type Wet = { moisture?: number; wetness?: number | null };
    const brick0 = (await evalOn(potter, HD, TAG.brick14, READ)) as Wet;
    potter = await at(potter.handle, WEATHERING);
    const glazed0 = (await evalOn(potter, HD, TAG.glazed14, READ)) as Wet;
    const terra0 = (await evalOn(potter, HD, TAG.terra14, READ)) as Wet;
    await pinWeather('rain', WEATHERING);
    try {
      await advanceLiving('1 hour', [potter]);
      const glazed1 = (await evalOn(potter, HD, TAG.glazed14, READ)) as Wet;
      const terra1 = (await evalOn(potter, HD, TAG.terra14, READ)) as Wet;
      potter = await at(potter.handle, HACKS);
      const brick1 = (await evalOn(potter, HD, TAG.brick14, READ)) as Wet;
      note(`  [14] glazed ${JSON.stringify(glazed0)} → ${JSON.stringify(glazed1)}; terracotta ${JSON.stringify(terra0)} → ${JSON.stringify(terra1)}; green brick ${JSON.stringify(brick0)} → ${JSON.stringify(brick1)}`);
      expect(terra1.moisture, 'the terracotta took in no rain').toBeGreaterThan(terra0.moisture ?? 0);
      expect(glazed1.moisture ?? 0, 'the glazed pot’s body took in rain').toBeLessThanOrEqual((glazed0.moisture ?? 0) + 1e-3);
      expect(brick1.moisture ?? 0, 'the green brick under the hack cover took in rain').toBeLessThanOrEqual((brick0.moisture ?? 0) + 1e-3);
      // W7: the film on a sealed face is a fraction of the open one's.
      expect.soft(glazed1.wetness ?? 0, 'the glaze held as much film as the terracotta').toBeLessThan(terra1.wetness ?? Infinity);
      before.terraMoisture = terra1.moisture;
    } finally {
      await unpinWeather(WEATHERING);
    }
  }, 1_800_000);
});

suite('⭐ one drip — lye goes where the ash lies (AC 2)', () => {
  it('15. [short · player] ash in the hopper, watered, gives lye `pour hopper into pail` draws; ash heaped on the floor and watered pools its lye on the floor', async () => {
    await daylight();
    asher = await at(asher.handle, CHANDLERY);
    for (let i = 0; i < 4; i++) await buySure(asher, 'wood ash');
    for (let i = 0; i < 4; i++) await say(asher, 'put "wood ash" in hopper');
    const pail = await hand(asher, T.pail, { keywords: ['pail', 'bucket', TAG.pail15] });
    await say(asher, `fill #${pail} from butt`);
    await say(asher, `pour #${pail} into hopper`);
    await advanceLiving('14 hours', [asher]);
    await daylight();
    await say(asher, `pour hopper into #${pail}`);
    const drawn = await examine(asher, `#${pail}`);
    expect(drawn, `what the hopper gave: ${drawn}`).toMatch(/lye|slippery|faintly yellow/i);
    // A heap on the bare floor, watered with a second pail.
    await buySure(asher, 'wood ash');
    const heaps = await idsHere(asher, 'me:i:ash');
    expect(heaps.length, 'the bought ash is not in hand').toBeGreaterThan(0);
    const heap = heaps[heaps.length - 1]!;
    await say(asher, `drop #${heap}`);
    const water = await hand(asher, T.pail, { keywords: ['pail', 'bucket', TAG.ash15] });
    await say(asher, `fill #${water} from butt`);
    const watered = await say(asher, `pour #${water} onto #${heap}`);
    expect(watered, `pour onto the heap: ${watered}`).not.toMatch(/can'?t|cannot|nothing to/i);
    await advanceLiving('12 hours', [asher]);
    await daylight();
    const room = await lookHere(asher);
    expect(room, `the floor under the watered heap: ${room}`).toMatch(/puddle of[^.|]*(lye|slippery|faintly yellow)/i);
  }, 2_400_000);
});

suite('⭐⭐ restart — every state reads back (AC 11)', () => {
  it('16. [instant · staged] restarted, the world reads back the cask’s memory, the crock’s after its wash, the leaking cask and its puddle, the Hesper patched, the grade and maker on the contents and the cask, the salt glaze and the terracotta’s held water', async () => {
    for (const s of open.values()) s.close();
    open.clear();
    await restartWorld();

    // the cask's memory
    taster = await at(taster.handle, CROWSFOOT);
    const memory = await evalOn(taster, TERMINUS, TAG.caskA, `JSON.stringify(this.absorbedAromas('inside'))`);
    note(`  [16] cask memory ${JSON.stringify(before.caskMemory)} → ${JSON.stringify(memory)}`);
    expect(memory, 'the cask forgot what it held').toEqual(before.caskMemory);

    // the grade and maker on the contents against the cask's own
    const marks = await evalOn(
      taster,
      TERMINUS,
      TAG.caskD,
      `JSON.stringify({ maker: this.getMaker(), grade: this.getGrade().getBand(), payload: this.getBulkPayload('interior') })`,
    );
    expect(marks, 'the cask and its contents’ marks moved across the restart').toEqual(before.marks);

    // the leaking cask's level, and the puddle
    cooper = await at(cooper.handle, CROWSFOOT);
    const level = await liters(cooper, TAG.caskE);
    note(`  [16] the mended cask ${String(before.leakCaskL)} L → ${level} L`);
    expect(level, 'the mended cask came back at another level').toBeCloseTo(before.leakCaskL as number, 0);
    // ⚠ Crowsfoot's floor is a plain `Hall`, not a persistent one: whether
    // its puddle is kept is the finding this line records.
    expect.soft(/puddle of[^.|]*water/i.test(await lookHere(cooper)), 'the puddle under the cask did not survive').toBe(before.leakPuddle);

    // the crock's memory after its wash
    dairy = await at(dairy.handle, CREAMERY);
    const crock = await evalOn(dairy, HD, 'churn', `JSON.stringify(this.absorbedAromas('inside'))`);
    note(`  [16] crock memory ${JSON.stringify(before.crockMemory)} → ${JSON.stringify(crock)}`);
    expect(crock, 'the crock forgot what its wash left').toEqual(before.crockMemory);

    // the Hesper's patched state
    const gov = await founder(BANK_HALL);
    try {
      const hesper = (await evalIn(
        gov,
        TERMINUS,
        `return JSON.stringify((() => { const h = StuffApi.findByTemplatePath('${HESPER}'); return { holed: h.isHoled(), flaws: h.getFlaws() }; })())`,
      )) as { holed?: boolean; flaws?: Array<{ kind?: string; mended?: string }> };
      expect(hesper.holed, 'the Hesper came back holed').toBe(false);
      expect(hesper.flaws?.some((f) => f.kind === 'holed' && f.mended === 'patched'), 'the Hesper lost her patch').toBe(true);
    } finally {
      gov.close();
    }

    // the salt-glazed pot's coat
    potter = await at(potter.handle, POTTERS_SHOP);
    const glazed = await examine(potter, TAG.jug12);
    expect(glazed, `the salt-glazed jug after the restart: ${glazed}`).toMatch(/salt/i);

    // the terracotta's held moisture
    potter = await at(potter.handle, WEATHERING);
    const terra = (await evalOn(potter, HD, TAG.terra14, `JSON.stringify({ moisture: this.getMoisture() })`)) as { moisture?: number };
    note(`  [16] terracotta moisture ${String(before.terraMoisture)} → ${terra.moisture}`);
    // It goes on drying in the air after the rain; it is not reset to dry.
    expect(terra.moisture, 'the terracotta’s held water was lost in the restart').toBeGreaterThan(0);
    expect(terra.moisture as number).toBeLessThanOrEqual((before.terraMoisture as number) + 1e-3);
  }, 1_800_000);
});

/* ───────────────────────────── small helpers ───────────────────────────── */

/** Ids of what matches `kw` here (or a full MQL when it has a colon). */
async function idsHere(s: Session, kw: string): Promise<string[]> {
  const q = kw.includes(':') ? kw : `here:i:${kw}`;
  const rows = await s.query(q, { fields: ['displayName'] }).catch(() => []);
  return rows.map((r) => String((r as { stuffId?: unknown }).stuffId ?? '')).filter((x) => x !== '');
}

/** Buy `item`, again if the counter was mid-restock. */
async function buySure(s: Session, item: string): Promise<void> {
  let said = '';
  for (let i = 0; i < 3 && !/you buy/i.test(said); i++) said = await say(s, `buy "${item}"`);
  expect(said, `buy ${item}: ${said}`).toMatch(/you buy/i);
}
