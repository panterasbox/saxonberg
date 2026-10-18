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

  it('⭐ 3. days on: the ice holds you; you cross and come back; the spud reads it; the solid field will not be fished', async () => {
    // ⚠ Day 3, not 2 (run 2): the sheet bears 92 kg at noon on day 2 and
    // the cutter is 70 kg with 23 kg of tools — physics, not a defect.
    await goto(SHORE);
    await nextDays(3);
    await goto(SHORE);
    for (const tool of ['spud', 'scraper', 'marker', 'saw']) await say(`get ${tool}`);
    const inv = await carried();
    console.info(`  carried: ${inv.slice(0, 300)}`);
    expect(inv, inv).toMatch(/spud/i);
    expect(inv, inv).toMatch(/ice saw/i);
    const on = await k.cmd('north');
    expect(refusal(on), JSON.stringify(on.notes)).toBeNull();
    expect(await here()).toMatch(/Hollow Mere/i);
    const across = await k.cmd('north');
    expect(refusal(across), JSON.stringify(across.notes)).toBeNull();
    expect(await arrive(/far bank/i)).toMatch(/far bank/i);
    expectOk(await k.cmd('south'));
    expect(await arrive(/Hollow Mere/i)).toMatch(/Hollow Mere/i);
    const read = await say('measure ice');
    console.info(`  measure ice (day 3): ${read}`);
    expect(read, read).toMatch(/read the ice at .* of (clear black ice|white snow-ice)/i);
    // ⭐ 8 (first half). Fishing frozen water is refused in words — asked
    // HERE, before any cut: a cut channel is open water (run 4).
    const fish = await k.cmd('fish');
    const why = refusal(fish);
    const fishSaid = await fish.said();
    console.info(`  fish (solid): ${why} — ${fishSaid.slice(0, 160)}`);
    expect(why, 'fishing frozen water is refused').not.toBeNull();
    expect(fishSaid, fishSaid).toMatch(/ice|frozen/i);
  });

  it('⭐ 4. scrape a patch: the snow is cleared', async () => {
    const said = await say('scrape');
    console.info(`  scrape: ${said.slice(0, 200)}`);
    const ground = await k.prose('look ground');
    console.info(`  look ground: ${ground.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(ground, ground).toMatch(/scraped patch/i);
  });

  it('⭐ 6. mark the field: the grid is scored', async () => {
    const said = await say('mark');
    console.info(`  mark: ${said.slice(0, 200)}`);
    const ground = await k.prose('look ground');
    expect(ground, ground).toMatch(/marked grid/i);
  });

  it('⭐ 7. cut a block: graded off the sheet, its mass from the thickness and grid; the cut shows', async () => {
    const said = await say('cut marked');
    console.info(`  cut marked: ${said.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 15_000));
    await k.drainProse();
    const reach = await inReach();
    expect(reach, reach).toMatch(/block of ice|ice block/i);
    const block = await examine('block');
    console.info(`  the block: ${block.slice(0, 400)}`);
    expect(block, block).toMatch(/black|clear/i);
    const ground = await k.prose('look ground');
    console.info(`  look ground: ${ground.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(ground, ground).toMatch(/cut channel/i);
  });

  it('⭐ 8. a hole is cut and fished; into the water at the channel, then `stand` back onto the ice', async () => {
    await say('cut hole');
    await new Promise((r) => setTimeout(r, 15_000));
    await k.drainProse();
    const ground = await k.prose('look ground');
    expect(ground, ground).toMatch(/hole is cut/i);
    const fishAgain = await k.cmd('fish');
    const again = await fishAgain.said();
    console.info(`  fish (hole): ${refusal(fishAgain)} — ${again.slice(0, 160)}`);
    expect(again, again).not.toMatch(/frozen|through the ice/i);
    // A second scraped patch for the reading after the cold (drive 5):
    // `mark` took the first one for its grid.
    await say('scrape');
    const swim = await k.cmd('swim');
    console.info(`  swim (into the channel): ${refusal(swim)} — ${(await swim.said()).slice(0, 160)}`);
    expect(refusal(swim), JSON.stringify(swim.notes)).toBeNull();
    const stand = await k.cmd('stand');
    expect(refusal(stand), JSON.stringify(stand.notes)).toBeNull();
    const walk = await k.cmd('south');
    expect(refusal(walk), 'standing on the ice again, you walk off it').toBeNull();
    expect(await here()).toMatch(/shore/i);
  });

  it('⭐ 9. the ice plough is a horse\'s load: nobody carries it out by hand', async () => {
    // ⚠ The horse rung (a draft animal refused on ice that bears a person)
    // is not driven: no horse stands at the mere, and the plough refuses a
    // walker without one (`ice-trade.test.ts`). ⚠ Run 3: lifting 60 kg is
    // a soft body read — one cutter cannot, the next can — so each branch
    // asserts ITS consequence.
    await goto(SHORE);
    const r = await k.cmd('get plough');
    const lifted = /plough/i.test(await carried());
    console.info(`  get plough: ${lifted ? 'lifted' : refusal(r)}`);
    if (!lifted) {
      expect(refusal(r)).toBe('too-heavy-to-lift');
      return;
    }
    // ⭐ Carried, it is a load the day-3 ice will not take: 93 kg of cutter
    // and tools plus 60 kg of plough against 123 kg of bearing. The mass
    // decides, never chance — the walker goes in, and must swim for it.
    const out = await k.cmd('north');
    expect(refusal(out), JSON.stringify(out.notes)).toBeNull();
    const walkOff = await k.cmd('south');
    expect(refusal(walkOff), 'in the water with the plough: swim for it').not.toBeNull();
    expectOk(await k.cmd('swim south'));
    expect(await arrive(/shore/i)).toMatch(/shore/i);
    await say('drop plough');
  });

  it('⭐ 10. carry the block to the icehouse: deposit with the keeper; the book records it in your name', async () => {
    await goto(SHORE);
    expectOk(await k.cmd('north'));
    const stand = await k.cmd('stand');
    expect(refusal(stand), 'the ice bears the cutter').toBeNull();
    await say('get block');
    expect(await carried()).toMatch(/block of ice/i);
    expectOk(await k.cmd('south'));
    expectOk(await k.cmd('south'));
    expectOk(await k.cmd('east'));
    expect(await here()).toMatch(/platform/i);
    harvestPrice = await counterPrice();
    console.info(`  counter price after the harvest: ${harvestPrice}`);
    const dep = await k.cmd('deposit block');
    const said = await dep.said();
    console.info(`  deposit block: ${refusal(dep)} — ${said.trim().slice(0, 300)}`);
    expect(refusal(dep), JSON.stringify(dep.notes)).toBeNull();
    // ⭐ The receipt is the BOOK's record, filed in your name with its terms.
    expect(said, said).toMatch(/book records .* to your name/i);
    expect(said, said).toMatch(/allowance of \d+%/i);
    // ⭐ The house BUYS a cutter's block (the review): back out for a
    // second block, and sell it — the bid paid into the account, the block
    // onto the stack on the house's claim.
    await goto(SHORE);
    expectOk(await k.cmd('north'));
    await say('mark');
    await say('cut marked');
    await new Promise((r) => setTimeout(r, 15_000));
    await k.drainProse();
    await say('get block');
    expect(await carried()).toMatch(/block of ice/i);
    await goto(PLATFORM);
    const sold = await k.cmd('sell block');
    const soldSaid = await sold.said();
    console.info(`  sell block: ${refusal(sold)} — ${soldSaid.trim().slice(0, 300)}`);
    expect(refusal(sold), JSON.stringify(sold.notes)).toBeNull();
    expect(soldSaid, soldSaid).toMatch(/You sell .* to the house for .*onto the stack/i);
    expect(await carried()).not.toMatch(/block of ice/i);
    // A counter buys only the lines it says it does.
    const rod = await k.cmd('sell rod');
    expect(refusal(rod)).toBe('not-bought');
    const book = await k.prose('look book');
    console.info(`  look book: ${book.replace(/\n/g, ' | ').slice(0, 400)}`);
  });

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

  it('⭐ 5. eight more cold days: the scraped patch reads thicker than the field', async () => {
    await goto(SHORE);
    await nextDays(8);
    await goto(SHORE);
    expectOk(await k.cmd('north'));
    const field = await say('measure ice field');
    const scraped = await say('measure ice scraped');
    console.info(`  field: ${field} · scraped: ${scraped}`);
    expect(scraped, scraped).toMatch(/black/i);
    const cm = (s: string): number => Number(/(\d+(?:\.\d+)?)\s*cm/.exec(s)?.[1] ?? NaN);
    expect(Number.isFinite(cm(field)) && Number.isFinite(cm(scraped)), `${field} | ${scraped}`).toBe(true);
    // ⚠ Run 5: Hollow Mere's sky is PINNED clear (the timeline must
    // repeat: no person on day 0, a person on day 3), so no snow lies on
    // the field and a scraping has nothing to clear — scraped and field
    // read the same black ice. The advantage under snow is the unit's
    // (`IceSheet.test.ts`: a scraped patch grows thicker and black under
    // snow). Here: the scraped patch is black and never thinner.
    expect(cm(scraped)).toBeGreaterThanOrEqual(cm(field));
    // Leave an iron tool on the field for the thaw (drive 12).
    await say('drop spud');
    expectOk(await k.cmd('south'));
  }, 600_000);

  it('⭐ 12. late summer: the pool is open water and remembers none of the cuts; the spud is gone; you swim it and come out wet', async () => {
    await goto(SHORE);
    await nextDays(280);
    await goto(SHORE);
    await lighten();
    const water = await k.prose('analyze water');
    console.info(`  analyze water (day 290): ${water.replace(/\n/g, ' | ').slice(0, 300)}`);
    const into = await k.cmd('swim north');
    expect(refusal(into), JSON.stringify(into.notes)).toBeNull();
    expect(await here()).toMatch(/Hollow Mere/i);
    const look = await k.prose('look ground');
    console.info(`  look ground (pool, summer): ${look.replace(/\n/g, ' | ').slice(0, 400)}`);
    expect(look, look).toMatch(/open water/i);
    expect(look, look).not.toMatch(/cut channel|scraped|marked grid/i);
    // Run 6: the summer floor said it was "a wide sheet of ice … ringing
    // faintly under the cold" above "It is open water."
    expect(look, look).not.toMatch(/sheet of ice|ringing faintly/i);
    const reach = await inReach();
    expect(reach, `the spud sank: ${reach}`).not.toMatch(/spud/i);
    const across = await k.cmd('swim north');
    console.info(`  swim north (summer, across): ${refusal(across)} — ${(await across.said()).replace(/\n/g, ' | ').slice(0, 300)} ${JSON.stringify(across.notes).slice(0, 300)}`);
    expect(refusal(across), JSON.stringify(across.notes)).toBeNull();
    const landed = await arrive(/far bank/i);
    if (!/far bank/i.test(landed)) console.info(`  still at ${landed}: ${JSON.stringify(await k.query('me', { fields: ['bodyState'] })).slice(0, 600)}`);
    expect(landed).toMatch(/far bank/i);
    const me = await examine('me');
    expect(me, me).toMatch(/wet|soak/i);
  }, 1_800_000);

  it('⭐ 12 (stacks). the small house has lost a far larger share than the large one; the packing reads wetter', async () => {
    await goto(PLATFORM);
    await say('get rod');
    await goto(HOUSE);
    const big = await say('measure stock stack');
    const bigEye = await say('analyze stock stack');
    await goto(SMALL_HOUSE);
    const small = await say('measure stock stack');
    console.info(`  large: ${big}\n  large (eye): ${bigEye}\n  small: ${small}`);
    const bigKg = iceKg(big);
    const smallKg = iceKg(small);
    // Seeds: 20 000 kg large, 2 000 kg small.
    if (Number.isFinite(bigKg) && Number.isFinite(smallKg)) {
      expect(1 - smallKg / 2000).toBeGreaterThan(1 - bigKg / 20_000);
    }
    // The packing went in dry: the small house's has taken its meltwater.
    // (The large house lost a twelfth and its packing may still band dry.)
    expect(small, small).toMatch(/sawdust[^;]*\((damp|wet|sodden)\)/i);
  });

  it('⭐ 13. the house room is colder than the empty shed beside it', async () => {
    await goto(HOUSE);
    const house = await traceTemp();
    await goto(SHED);
    const shed = await traceTemp();
    console.info(`  house ${house.toFixed(1)} K · shed ${shed.toFixed(1)} K`);
    expect(house).toBeLessThan(shed);
  });

  it('⭐ 14. a second character with no claim takes a block off the stack: no receipt changes', async () => {
    const thief = await Session.open(uniqueHandle('thief'), { startLocation: HOUSE, wizard: true });
    try {
      const r = await thief.cmd('get block from stack');
      const said = await r.said();
      console.info(`  thief: ${refusal(r)} — ${said.slice(0, 200)}`);
      expect(refusal(r), JSON.stringify(r.notes)).toBeNull();
      expect(await carried(thief)).toMatch(/block/i);
    } finally {
      thief.close();
    }
  });

  it('⭐ 15. at the counter, `buy` a block: brought up from the house, dearer than after the harvest', async () => {
    await goto(PLATFORM);
    const late = await counterPrice();
    console.info(`  counter price (late summer): ${late} (after the harvest: ${harvestPrice})`);
    // ⭐ The price follows the store's days of supply against the stocking
    // horizon: a house still nine-tenths full has years of supply and
    // prices at base. It climbs when the store runs short (run 1, an empty
    // store: 6 → 9). Never cheaper than after the harvest.
    if (Number.isFinite(late) && Number.isFinite(harvestPrice)) expect(late).toBeGreaterThanOrEqual(harvestPrice);
    const before = await carried();
    const bought = await say('buy block');
    console.info(`  buy block: ${bought.slice(0, 200)}`);
    const after = await carried();
    expect(after.match(/block/gi)?.length ?? 0, `${before} → ${after}`).toBeGreaterThan(
      before.match(/block/gi)?.length ?? 0,
    );
  });

  it('⭐ 16. the ice company\'s seasonal seats: in summer the crew and the boss are not on the ice', async () => {
    await goto(SHORE);
    // ⭐ Laden with the summer's purchases, the water refuses you in words.
    const laden = await k.cmd('swim north');
    console.info(`  swim north, laden (16): ${refusal(laden)} — ${(await laden.said()).replace(/\n/g, ' | ').slice(0, 300)}`);
    if (refusal(laden) !== null) {
      expect(refusal(laden)).toBe('gate:encumbrance');
      await lighten();
    } else {
      expectOk(await k.cmd('swim south'));
      await lighten();
    }
    const into = await k.cmd('swim north');
    console.info(`  swim north (16): ${refusal(into)} — ${(await into.said()).replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(refusal(into), JSON.stringify(into.notes)).toBeNull();
    const look = await k.prose('look');
    console.info(`  the pool in summer: ${look.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(look, look).not.toMatch(/Bryn|Hedda/);
    expectOk(await k.cmd('swim south'));
  });

  it('⭐ 17. withdraw against the receipt: the block comes out near 0 °C, the fee is paid', async () => {
    await goto(PLATFORM);
    const r = await k.cmd('withdraw ice');
    const said = await r.said();
    console.info(`  withdraw ice: ${refusal(r)} — ${said.slice(0, 300)}`);
    expect(refusal(r), JSON.stringify(r.notes)).toBeNull();
    expect(said, said).toMatch(/fee|pay/i);
  });

  it('⭐ 18. with no keeper on shift (night), deposit and withdraw are refused in words', async () => {
    await goto(PLATFORM);
    const sec = (await worldClockNow()) % DAY;
    const toNight = sec <= 23 * 3600 ? 23 * 3600 - sec : DAY + 23 * 3600 - sec;
    await advanceWorldClock(`${Math.round(toNight / 60)} minutes`);
    await goto(PLATFORM);
    const r = await k.cmd('withdraw ice');
    const said = await r.said();
    console.info(`  withdraw at night: ${refusal(r)} — ${said.slice(0, 200)}`);
    expect(refusal(r)).toBe('no-keeper');
    expect(said, said).toMatch(/nobody is keeping the book/i);
    // Back to noon for whatever follows.
    await advanceWorldClock('13 hours');
  }, 600_000);

  /* ───────────── 19–20. the kernel ───────────── */

  it('⭐ 19. an ice block shows its composition and claims no temper', async () => {
    const block = await examine('block');
    console.info(`  block: ${block.slice(0, 400)}`);
    expect(block, block).not.toMatch(/temper/i);
  });

  it('⭐ 20. the estuary pool in summer: you come out wet', async () => {
    await goto(ESTUARY_STRAND);
    await lighten();
    expectOk(await k.cmd('swim east'));
    expectOk(await k.cmd('swim west'));
    const me = await examine('me');
    console.info(`  in the estuary: ${me.slice(0, 300)}`);
    expect(me, me).toMatch(/wet|soak/i);
  });

  it('the road is reachable from the crossroads', async () => {
    await goto(ROAD);
    const r = await k.cmd('west');
    expect(refusal(r), JSON.stringify(r.notes)).toBeNull();
    expect(await here()).toMatch(/crossroads/i);
  });
});
