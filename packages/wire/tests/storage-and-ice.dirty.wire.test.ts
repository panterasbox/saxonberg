/**
 * ⭐⭐ The storage-and-ice build's DRIVE (its exit criterion) — the
 * requirements' script, played over the real socket against an owned
 * world.
 *
 * Hollow Mere is tuned so a fresh world's day 0 is the mere's first days
 * of cold (the pack's `mere.test.ts` pins it against the shipped rows):
 * the ice will not hold a person on day 0, holds one by day 2, and is
 * open water again before day 280. The drive walks that year once:
 *
 *   day 0   — the young ice, the break-through, the swim back (1–2);
 *   day 2   — standing, crossing, the spud, the scrape, the grid, the
 *             cut, the hole, the plough, the deposit, the sawdust (3–11);
 *   day 10  — the scraped patch has run ahead of the field (5);
 *   day 290 — late summer: the open pool, the things left on the ice,
 *             the stacks, the shed, the theft, the counter, the
 *             withdrawal, the seasonal seats, the cookhouse (12–18);
 *   kernel  — composition without a temper (19), the estuary swim (20).
 *
 * ⚠ The day-indexed checkpoints assume the drive STARTS on day 0 of the
 * year — a fresh world. In a world whose clock other files have moved,
 * they skip themselves and say so.
 *
 * ⚠ Restart (21) is not driven: the harness has no path that restarts the
 * world it booted. The survival of the stores' lines, the receipts and
 * the pond's patch log across a restore is proven where a restore IS
 * reachable — `Store.test.ts`, `Receipt` round-trip and `IceSheet.test.ts`
 * — and recorded as such in the plan's drive record.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

export const DIRTY_REASON =
  'moves the world clock through most of a year (day 0 → day 290), cuts ' +
  'the Hollow Mere ice, deposits on and draws down the icehouse stacks, ' +
  'and buys from the ice counter';

declareFile({
  file: 'storage-and-ice.dirty.wire.test.ts',
  packs: [
    'world-seed',
    'water',
    'trade-ice',
    'hollow-mere',
    'trade-carpentry',
    'trade-coopering',
    'trade-forestry',
    'trade-fishing',
    'trade-shopkeeping',
    'hearthworks',
    'hearts-delight',
    'terminus',
    'generic-objects',
    'base-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const DAY = 86_400;
const YEAR_DAYS = 360;

const ROAD = '/world/terminus/hollow-mere/location/road';
const SHORE = '/world/terminus/hollow-mere/location/shore';
const POOL = '/world/terminus/hollow-mere/location/pool';
const PLATFORM = '/world/terminus/hollow-mere/icehouse/location/platform';
const HOUSE = '/world/terminus/hollow-mere/icehouse/location/house';
const SMALL_HOUSE = '/world/terminus/hollow-mere/small-house/location/house';
const SHED = '/world/terminus/hollow-mere/shed/location/shed';
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const ESTUARY_STRAND = '/world/terminus/estuary/strand';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GENERAL_STORE = '/world/terminus/general-store/shop-floor';

const T = {
  bole: '/trade/forestry/thing/bole',
  rod: '/trade/coopering/thing/gauging-rod',
  glowcap: '/world/terminus/rejection/thing/glowcap-jar',
};

let k: Session;
let handle = '';
let startDoy = -1;
/** The counter's price for a block just after the harvest. */
let harvestPrice = Number.NaN;

/* ───────────────────────────── helpers ───────────────────────────── */

/** Re-home the drive's character at `path` (see the climate drive's note). */
async function goto(path: string): Promise<void> {
  k.close();
  k = await Session.open(handle, { startLocation: path, wizard: true });
  await k.drainProse();
}

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function say(line: string, s: Session = k): Promise<string> {
  const r = await s.cmd(line);
  const said = (await r.said()).trim();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/** The refusal note's reason (or a locomotion gate's name), or null. */
function refusal(r: CommandResult): string | null {
  const note = (
    r.notes as Array<{ kind?: string; reason?: string; gate?: string }>
  ).find(
    (n) =>
      n.kind === 'controller-rejected' ||
      n.kind === 'command-rejected' ||
      n.kind === 'locomotion-gate-failed' ||
      n.kind === 'validator-failed',
  );
  if (!note) return null;
  return note.reason ?? `gate:${note.gate ?? note.kind ?? '?'}`;
}

/** Where the character stands, by the room's display name. */
async function here(s: Session = k): Promise<string> {
  const rows = await s.query('here', { fields: ['displayName'] });
  return String((rows[0] as { displayName?: string } | undefined)?.displayName ?? '');
}

/**
 * Wait until the character stands somewhere matching `re` — a crossing
 * longer than a minute is ENGAGED, and arrives after the command returns
 * (run 2: a six-minute swim read the room it was leaving).
 */
async function arrive(re: RegExp, budgetMs = 180_000): Promise<string> {
  const until = Date.now() + budgetMs;
  let at = await here();
  while (!re.test(at) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 3000));
    at = await here();
  }
  return at;
}

/**
 * ⭐ A swimmer swims LIGHT: put down everything the drive has picked up
 * (run 5: *"You're carrying too much to swim."* — the encumbrance gate,
 * honestly). Each word is tried; what is not carried is simply not there.
 */
async function lighten(): Promise<void> {
  for (const w of ['saw', 'marker', 'scraper', 'block', 'block', 'block', 'rod', 'rod', 'worm', 'glowcap']) {
    if (new RegExp(w, 'i').test(await carried())) await k.cmd(`drop ${w}`);
  }
  await k.drainProse();
}

/** What is in reach, by display name. */
async function inReach(s: Session = k): Promise<string> {
  const rows = await s.query('reachable', { fields: 'detail' });
  return rows.map((r) => String((r as { displayName?: unknown }).displayName ?? '')).join(', ');
}

/** What the character carries, by display name. */
async function carried(s: Session = k): Promise<string> {
  await s.drainProse();
  return (await s.prose('inventory')).replace(/\s+/g, ' ');
}

/** A thing's whole description, through the projection (`look` renders to the card). */
async function examine(keyword: string, s: Session = k): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' });
  return JSON.stringify(rows);
}

/** The room's temperature off `trace atmosphere`, K. */
async function traceTemp(): Promise<number> {
  const out = await k.prose('trace atmosphere');
  const line = out.split('\n').find((l) => /temperature:/.test(l)) ?? '';
  const kMatch = /(-?\d+(?:\.\d+)?)\s*K\b/.exec(line);
  const cMatch = /(-?\d+(?:\.\d+)?)\s*°C/.exec(line);
  const kelvin = kMatch ? Number(kMatch[1]) : cMatch ? Number(cMatch[1]) + 273.15 : Number.NaN;
  expect(Number.isFinite(kelvin), `no temperature in: ${line}`).toBe(true);
  return kelvin;
}

/** The kg figures a gauge printed for a stack's ice line (the bracket's midpoint). */
function iceKg(gauge: string): number {
  const m = /ice[^:;]*:\s*([^;]+)/i.exec(gauge);
  const nums = (m?.[1] ?? '').match(/[\d,]+(?:\.\d+)?/g)?.map((n) => Number(n.replace(/,/g, ''))) ?? [];
  if (nums.length === 0) return Number.NaN;
  const tonnes = /\bt\b|tonne/i.test(m?.[1] ?? '');
  const mid = nums.length >= 2 ? (nums[0]! + nums[1]!) / 2 : nums[0]!;
  return tonnes ? mid * 1000 : mid;
}

/** Into the ROOM, by the founder, who holds the title. */
async function cloneHere(where: string, path: string): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here`));
  } finally {
    f.close();
  }
}

async function nextDays(n: number): Promise<void> {
  // ⚠ In chunks: a 287-day jump on a loaded box outran the fetch's
  // headers timeout (300 s) while the server was still walking the year.
  const start = await worldClockNow();
  for (let left = n; left > 0; left -= 60) {
    await advanceWorldClock(`${Math.min(60, left)} days`);
  }
  const moved = (await worldClockNow()) - start;
  expect(moved, `the clock did not move ${n} days`).toBeGreaterThan(DAY * n * 0.9);
  await new Promise((r) => setTimeout(r, 500));
}

const startsOnDayZero = (): boolean => startDoy === 0;

/** The price the counter quotes for a block, in the currency's units. */
async function counterPrice(): Promise<number> {
  const out = await k.prose('look counter');
  const m = /ice-block \((\d+(?:\.\d+)?)\)/.exec(out);
  return m ? Number(m[1]) : Number.NaN;
}

/* ───────────────────────────── setup ───────────────────────────── */

beforeAll(async () => {
  handle = uniqueHandle('cutter');
  // A funded account: the counter and the fee want money.
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: storage-and-ice drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  // ⚠ Run 2: the founder may not `clone` fishing tackle (it is the
  // trade's title); a rod is bought, as anyone gets one.
  const store = await Session.open(handle, { startLocation: GENERAL_STORE, wizard: true });
  for (const good of ['rod', 'worm']) expectOk(await store.cmd(`buy ${good}`));
  store.close();
  k = await Session.open(handle, { startLocation: SHORE, wizard: true });
  // ⭐ Noon: every outdoor reading here is made in daylight.
  const sec = (await worldClockNow()) % DAY;
  const toNoon = sec <= 12 * 3600 ? 12 * 3600 - sec : DAY + 12 * 3600 - sec;
  if (toNoon > 60) await advanceWorldClock(`${Math.round(toNoon / 60)} minutes`);
  startDoy = Math.floor((await worldClockNow()) / DAY) % YEAR_DAYS;
  console.info(`storage-and-ice drive: starting on day-of-year ${startDoy}`);
}, 900_000);

afterAll(() => {
  k?.close();
});

/* ───────────── 1–2. the young ice ───────────── */

// ⚠ Run 1: a loaded box (siblings' suites) makes a clock jump slow — every
// checkpoint gets the long budget.
suite.skipIf(!isOwnedTestWorld())('storage-and-ice — the drive', { timeout: 900_000 }, () => {
  it('⭐ 1. day 0 at the shore: the young ice reads, and will not hold a person', async () => {
    if (!startsOnDayZero()) return console.info(`  (skipped: drive started on day ${startDoy})`);
    await goto(SHORE);
    const water = await k.prose('analyze water');
    console.info(`  analyze water: ${water.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(water, water).toMatch(/ice/i);
  });

  it('⭐ 2. walk out: you break through, you are in the water, you swim back', async () => {
    if (!startsOnDayZero()) return;
    await goto(SHORE);
    const out = await k.cmd('north');
    const said = await out.said();
    console.info(`  north (day 0): ${said.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(refusal(out), JSON.stringify(out.notes)).toBeNull();
    expect(await here()).toMatch(/Hollow Mere/i);
    expect(said, said).toMatch(/give|break|through|water/i);
    // The ice that broke will not hold you.
    const up = await k.cmd('stand');
    expect(refusal(up), `standing on broken ice: ${JSON.stringify(up.notes)}`).not.toBeNull();
    // A body in the water leaves by swimming.
    const walk = await k.cmd('south');
    expect(refusal(walk), 'walking out of the water').not.toBeNull();
    const back = await k.cmd('swim south');
    expect(refusal(back), JSON.stringify(back.notes)).toBeNull();
    expect(await here()).toMatch(/shore/i);
    const me = await examine('me');
    console.info(`  me after the swim: ${me.slice(0, 400)}`);
    expect(me, me).toMatch(/wet|soak/i);
  });

  /* ───────────── 3–11. day 2: the harvest ───────────── */

  it('⭐ 11. at the sawmill, sawing a log lands sawdust by the boards cut', async () => {
    await goto(SAWMILL);
    await cloneHere(SAWMILL, T.glowcap);
    await say('get glowcap');
    await cloneHere(SAWMILL, T.bole);
    const sawing = await say('saw bole');
    console.info(`  saw bole: ${sawing.slice(0, 200)}`);
    // ⚠ Run 1: the mill finishes on the GAME clock (`WorldClockApi.after`).
    await advanceWorldClock('2 hours');
    await new Promise((r) => setTimeout(r, 3000));
    await k.drainProse();
    const reach = await inReach();
    console.info(`  at the mill: ${reach.slice(0, 300)}`);
    expect(reach, reach).toMatch(/sawdust/i);
    await say('get sawdust');
    await goto(HOUSE);
    const put = await say('put sawdust in stack');
    console.info(`  put sawdust: ${put.slice(0, 200)}`);
    expect(put, put).not.toMatch(/can'?t|cannot|don'?t see|went wrong/i);
  });

  it('the road is reachable from the crossroads', async () => {
    await goto(ROAD);
    const r = await k.cmd('west');
    expect(refusal(r), JSON.stringify(r.notes)).toBeNull();
    expect(await here()).toMatch(/crossroads/i);
  });
  // ⛔ 3–10, 5 and 12–20 — the ice that comes to bear a person over days,
  // and the summer after it — are one SPAN and live in
  // storage-and-ice.soak.dirty (the soak-harness census). 1 and 2 are day
  // 0 only, and 11 and the road need no earlier state.
});
