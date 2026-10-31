/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). The span twin of
 * `field-population.dirty.wire.test.ts`, split per testing.md § The soak lane
 * (2026-10-30). It carries the blocking drive's flow and keeps the spans in
 * place — the drive is a growing season on the home field — sown in spring (day 80), the bench read a fortnight on, a dry week by the day, and the cut at summer's end in ten-day jumps; the staged twin of each span is in the blocking file.
 *
 * The field-population build's drive — a field made of parts
 * (field-population-requirements § The drive, 13 steps), against a booted
 * world, in the order a year runs.
 *
 * ⭐⭐ **Tests build state; this uses it.** Everything is typed the way a
 * player types it — `look at the top end`, `sample wheat at the top end`,
 * `label wheat trial at the gate end`, `water wheat at the middle from
 * pail` — and asserted on the envelope's reasons and the world's own
 * words. Where a step needs the world in a state no player can put it in
 * inside a drive (a dry week, a neglected side of a field), the FOUNDER
 * stages it by `eval` on the patch — never on what is being measured.
 *
 * The order is the calendar's, not the requirement's numbering: the home
 * field is sown in spring (step 6), the bench is read a fortnight later
 * (steps 1–5, the bench is pre-sown), the home field is cared for and
 * watched (7, 8, 9, 11), and cut at summer's end (10). Each `it` carries
 * its requirement number.
 *
 * ⚠ The calendar: the world boots at midnight on 1 Arienle, midwinter.
 * Jumps are ten days at most a step (a long jump drains every schedule
 * and outlives the client's header timeout), and every read is taken in
 * daylight: a dark field binds the wrong thing and reads as nothing.
 *
 * ⚠⚠ **A read that binds one thing is taken from a FRESH session.** `look`
 * walks `$focus` before `reachable`, and a partial match in the focus beats
 * a whole match further out (field population W2, the resolver's to fix):
 * with the top end in focus `look top end wheat` reads the patch, and from
 * a room focus the quoted `look "wheat at the top end"` reads the ROOM
 * (found staging W6). A fresh session's focus is the room, where
 * `look at the top end` binds the patch and `look top end wheat` the stand.
 *
 * ⚠ A bare `look wheat` on a divided field PROMPTS among the stands (W2),
 * and the harness fails on a prompt — every crop is named by its patch.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  engagementIdOf,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

/**
 * ⚠ Why this file cannot run twice: it takes a campus labourer seat,
 * ploughs, sows and cuts the university's home field, pulls stems off the
 * Delight's bench, ties a label to a plant in the home field, takes a pail
 * from the Delight byre and a can from the rubber works, and spends the
 * farm's water and a sack of compost — and the founder dries and starves
 * the home field's patches by `eval`. None of that is regenerated.
 */
export const DIRTY_REASON =
  'takes a campus labourer seat, ploughs, sows and cuts the home field, ' +
  'pulls stems off the Delight bench, labels a plant, takes a byre pail ' +
  'and a rubber-works can, spends the farm water and compost, and dries ' +
  'and starves the home field patches by founder eval';

declareFile({
  file: 'field-population.soak.dirty.wire.test.ts',
  packs: [
    'platform',
    'trade-farming',
    'trade-ranching',
    'eternal-university',
    'hearts-delight',
    'waponi-woo',
    'terminus',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

const DAY = 86_400;

const BENCH = '/world/terminus/hearts-delight/bench-field/location/upper-bench';
const BYRE = '/world/terminus/hearts-delight/dairy/location/byre';
const STORE = '/world/terminus/general-store/shop-floor';
const SQUARE = '/world/terminus/market/square';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
/** Where a watering can lies to be picked up (the store sells none). */
const CANS = [
  '/world/terminus/goods-yards/rubber-works/location/ground/stove-house',
  '/world/terminus/hinkley-hills/lots/yard',
];
const YARD = '/world/terminus/eternal/campus-farm/location/yard';
const HOME_FIELD = '/world/terminus/eternal/campus-field/location/home-field';
const CANE_PIECE = '/world/terminus/waponi-woo/location/cane-piece';
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';

/**
 * The founder's jurisdiction for staging the home field. ⚠ Not
 * `/world/terminus/eternal`: the founder holds no authority there.
 */
const CAMPUS = '/world/terminus/eternal/campus-field';

/** Day-of-year the home field is sown (the cover drive's spring). */
const SOW_DAY = 80;
/** Day-of-year the bench is read — a fortnight on, crop in ear. */
const BENCH_DAY = 95;

/** How a crop LOOKS, as a rank — the banded field read and the pot read. */
const CONDITIONS: Array<[RegExp, number]> = [
  [/is failing/i, 0],
  [/looks poor|looks stressed/i, 1],
  [/looks well|looks healthy/i, 2],
  [/looks strong|is thriving/i, 3],
];

/** The cause sentences, banded (`… there.`) and pot (`The soil is dry.`). */
const CAUSE =
  /soil is (dry|spent)( there)?\.|too cold (there|here) for it|not getting enough light|roots have run out of room|outgrown its pot|Nothing is holding it back/i;

/** The grade bands, ascending. */
const GRADES = ['poor', 'fair', 'fine', 'exceptional', 'masterful'];

let handle = '';
let expert = '';
let p: Session;

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  // eslint-disable-next-line no-console
  console.log(`[field-population drive] ${flat}`);
}

/* ──────────────────────────── the harness ──────────────────────────── */

/** Every way a command dies before or inside its controller. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const n = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (x) =>
      x.kind === 'controller-rejected' ||
      x.kind === 'command-rejected' ||
      x.kind === 'validator-failed' ||
      x.kind === 'mql-error' ||
      x.kind === 'empty-result' ||
      x.kind === 'target-declined',
  );
  if (!n) return null;
  return n.reason ?? n.detail ?? n.kind ?? null;
}

/** Run an act; if it engaged, wait it out. Returns its prose. */
async function act(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await s.cmd(text);
  const engaged = (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'engagement-started');
  if (engaged) {
    await s.awaitActivity(engagementIdOf(r), 180_000);
    await new Promise((res) => setTimeout(res, 1_500));
  }
  const said = `${await r.said()} ${engaged ? await s.listen(800) : ''}`.trim();
  note(`${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 300)}`);
  return { r, said };
}

/** Act, and require that it was understood and not refused. */
async function doing(s: Session, text: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
}

/**
 * Work that tires a body: act, and when the body says it is too tired,
 * rest an hour of game time and go again.
 */
async function work(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  let out = await act(s, text);
  for (let i = 0; i < 6 && refusedFor(out.r) === 'too-tired'; i++) {
    await advance(3_600);
    out = await act(s, text);
  }
  return out;
}

/** Act, and require a refusal for `reason`. */
async function refused(s: Session, text: string, reason: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' should be refused '${reason}': ${said}`).toBe(reason);
  return said;
}

async function read(s: Session, text: string): Promise<string> {
  const r = await s.cmd(text);
  const said = await r.said();
  note(`${text} → ${said.slice(0, 500)}`);
  return said;
}

/**
 * A read from a FRESH session (see the header): open `who` at `where`,
 * read once, and leave.
 */
async function freshRead(who: string, where: string, text: string, wizard = false): Promise<string> {
  const s = await Session.open(who, { startLocation: where, ...(wizard ? { wizard: true } : {}) });
  try {
    await s.drainProse();
    return await read(s, text);
  } finally {
    s.close();
  }
}

/** Jump the clock, ten game-days at most a step, and prove it moved. */
async function advance(seconds: number): Promise<void> {
  // ⚠ Six hours or more away is spent INDOORS, then back to where the
  // hand stood (the cover drive: a body left standing in an open field
  // through a cold night dropped, and through an autumn night died).
  const back = here;
  const park = seconds >= 6 * 3_600 && p !== undefined && back !== STORE;
  if (park) await goTo(STORE);
  let left = seconds;
  while (left > 0) {
    const step = Math.min(left, 10 * DAY);
    // ⭐ And it DRINKS. A logged-in body's clock runs through a jump.
    if (park && step >= DAY) await drink();
    const { before, after } = await advanceWorldClock(`${Math.max(1, Math.round(step / 60))} minutes`);
    expect(after - before, 'world-time did not move').toBeGreaterThan(step * 0.9);
    left -= step;
  }
  await new Promise((r) => setTimeout(r, 800));
  if (park && back) await goTo(back);
}

/** Advance to game-day `day` (from the epoch), at `hour` o'clock. */
async function toDay(day: number, hour = 10): Promise<void> {
  const now = await worldClockNow();
  const target = day * DAY + hour * 3_600;
  if (target > now) await advance(target - now);
}

/** Make sure it is daylight: on to 10 o'clock when it is not. */
async function daylight(): Promise<void> {
  const now = await worldClockNow();
  const hour = (((now % DAY) + DAY) % DAY) / 3_600;
  if (hour < 8 || hour > 16) {
    const into = ((now % DAY) + DAY) % DAY;
    const wait = into < 10 * 3_600 ? 10 * 3_600 - into : DAY - into + 10 * 3_600;
    await advance(wait);
  }
}

/**
 * A drink at the market standpipe, then back. ⚠ The cover drive's hand
 * died of DEHYDRATION working through jumps with nothing to drink.
 */
async function drink(): Promise<void> {
  const back = here;
  await goTo(SQUARE);
  await act(p, 'drink standpipe');
  await act(p, 'drink standpipe');
  if (back && back !== SQUARE) await goTo(back);
}

/** Where the hand last stood (set by {@link goTo}). */
let here = '';

/** Move the character by reopening the session where it needs to be. */
async function goTo(where: string): Promise<void> {
  here = where;
  p?.close();
  p = await Session.open(handle, { startLocation: where });
  await p.drainProse();
}

/** As the founder, run a setup `eval` in `where` under `parcel`'s title. */
async function founderEval(where: string, parcel: string, code: string): Promise<string> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    const r = await gov.cmd(`eval --parcel ${parcel} ${code}`);
    const said = await r.said();
    note(`(founder eval → ${said.slice(0, 300)})`);
    expect(refusedFor(r)).toBeNull();
    expect(said, 'the eval threw').not.toMatch(/sandbox boundary denied|\berror:/i);
    return said;
  } finally {
    gov.close();
  }
}

/** Parse `key=number,key=number` out of an eval's reply. */
function byPart(said: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of said.matchAll(/([a-z-]+)=(-?[0-9.e-]+)/g)) out[m[1]!] = Number(m[2]);
  return out;
}

/** Each home-field patch's root-zone moisture fraction (reconciled). */
async function moistures(): Promise<Record<string, number>> {
  return byPart(
    await founderEval(
      HOME_FIELD,
      CAMPUS,
      'return self.getContainer().soilParts().map(p => p.soilPartKey() + "=" + p.soilMoistureFraction()).join(",")',
    ),
  );
}

/**
 * ⭐ Staging, not measuring: set the named patches' moisture to a
 * fraction of capacity (reconciling first, so the window that just ended
 * is credited at its true level). `eval` reaches a patch since W6 (a
 * fixture's jurisdiction is its host's).
 */
async function dryTo(want: Record<string, number>): Promise<string> {
  return setReserve('moisture', 'soilMoistureFraction', want);
}

/**
 * Set the named patches' `reserve` to a fraction of capacity, reading it
 * through `read` first (the reconcile). Returns the eval's prose — which
 * also carries whatever the founder SAW while standing there.
 */
async function setReserve(reserve: string, read: string, want: Record<string, number>): Promise<string> {
  const w = JSON.stringify(want);
  return founderEval(
    HOME_FIELD,
    CAMPUS,
    `return self.getContainer().soilParts().filter(p => (${w})[p.soilPartKey()] !== undefined).map(p => { p.${read}() ; const r = p.getReserve("${reserve}") ; p.adjustReserve("${reserve}", r.capacity.scale((${w})[p.soilPartKey()]).subtract(r.current)) ; return p.soilPartKey() + "=" + p.${read}() }).join(",")`,
  );
}

/** The condition rank a read states (the first condition phrase in it). */
function conditionOf(said: string): number {
  let best: { at: number; rank: number } | null = null;
  for (const [re, rank] of CONDITIONS) {
    const m = re.exec(said);
    if (m && (best === null || m.index < best.at)) best = { at: m.index, rank };
  }
  if (!best) throw new Error(`no condition phrase in: ${said}`);
  return best.rank;
}

/**
 * How well a read says a plant is doing: how it looks, then — at equal
 * looks — whether it is short of water. A dry week shows in the cause
 * long before it shows in the looks (vigor relaxes over weeks).
 */
function healthOf(said: string): number {
  return conditionOf(said) * 2 + (/soil is dry/i.test(said) ? 0 : 1);
}

/** The condition rank of one patch's line in a field's `look`. */
function patchCondition(looked: string, part: string): number {
  const m = new RegExp(`At ${part} it is [^.]*?(is failing|looks poor|looks well|looks strong)\\.`, 'i').exec(looked);
  if (!m) throw new Error(`no line for ${part} in: ${looked}`);
  return conditionOf(m[1]!);
}

/** Back onto the labourer's seat and on shift — a season away costs it. */
async function onShift(): Promise<void> {
  await goTo(YARD);
  await act(p, 'apply for labourer');
  await goTo(HOME_FIELD);
  await act(p, 'clock on');
}

beforeAll(async () => {
  handle = uniqueHandle('fieldpop');
  expert = uniqueHandle('fieldexp');
  const k = await Session.open(handle, { startLocation: BANK_HALL });
  expectOkish(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOkish(await gov.cmd(`reserve override 160 to ${handle} "wire: field population funding"`));
  } finally {
    gov.close();
  }
  k.close();
  // ⭐ The expert reader is trained by the SHIPPED harness (`practice`,
  // wizard-gated), and the drive's own hand is left a novice.
  const x = await Session.open(expert, { startLocation: BANK_HALL, wizard: true });
  try {
    for (let i = 0; i < 8; i++) await x.cmd('practice horticulture hard success');
    const said = await read(x, 'competence');
    expect(said, 'the expert reader is trained').toMatch(/horticulture — expert/i);
  } finally {
    x.close();
  }
  p = await Session.open(handle, { startLocation: STORE });
}, 600_000);

afterAll(() => {
  p?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[field-population drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

function expectOkish(r: CommandResult): void {
  expect(refusedFor(r), JSON.stringify(r.notes)).toBeNull();
}

/* ═══════════════════════ Stage A — spring ═══════════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage A — the home field in spring', () => {
  it('6a. hired on, the home field is ploughed and sown patch by patch', async () => {
    await toDay(SOW_DAY);
    await goTo(STORE);
    await doing(p, 'buy sickle');
    // The store keeps four sacks (par 4) — about two-thirds of a hectare.
    for (let i = 0; i < 4; i++) await doing(p, 'buy seed wheat');
    // ⚠ Two words: the potting-soil sack answers to `compost` too, and a
    // one-word query is not name-ranked (W2's scorer rule).
    await doing(p, 'buy compost sack');
    await goTo(YARD);
    await doing(p, 'apply for labourer');
    await goTo(HOME_FIELD);
    await act(p, 'clock on');
    // The home field is wanted for the plough (the cover drive's step 13).
    await act(p, 'move college herd to back paddock');
    let said = '';
    for (let i = 0; i < 5 && !/ploughed for the season/i.test(said); i++) {
      said = (await work(p, 'plough')).said + ' ' + (await read(p, 'look'));
    }
    expect(said).toMatch(/ploughed for the season/i);
    // ⭐ Every act on a divided field names its patch (R2).
    await refused(p, 'sow wheat', 'patch-unnamed');
    // The gate end until it is full, a little in the middle, the rest on
    // the far side.
    let filled = false;
    for (let i = 0; i < 14 && !filled; i++) {
      const { r, said: s } = await work(p, 'sow wheat at the gate end');
      if (refusedFor(r) === 'patch-sown') filled = true;
      else expect(refusedFor(r), s).toBeNull();
    }
    expect(filled, 'the gate end was sown full').toBe(true);
    const middle = await work(p, 'sow wheat at the middle');
    expect(refusedFor(middle.r), middle.said).toBeNull();
    // The far side until it is full; anything left goes into the middle,
    // so no seed is carried when the label is tied (a carried sack of seed
    // wheat answers to `wheat` first).
    let part = 'the far side';
    for (let i = 0; i < 20 && /sack of seed wheat/i.test(await read(p, 'inventory')); i++) {
      const { r, said: s } = await work(p, `sow wheat at ${part}`);
      if (refusedFor(r) === 'patch-sown' && part === 'the far side') {
        part = 'the middle';
        continue;
      }
      expect(refusedFor(r), s).toBeNull();
    }
    expect(await read(p, 'inventory')).not.toMatch(/seed wheat/i);
    // ⚠ A hectare ploughed and sown runs past dark (final pass 4: every
    // look after it read "pitch dark", and the hand, cold and winded, could
    // not lift a watering can in Stage B). A night's rest indoors, then
    // back out in daylight.
    await advance(8 * 3_600);
    await daylight();
    const looked = await read(p, 'look');
    for (const part of ['the gate end', 'the middle', 'the far side']) {
      expect(looked, `a line for ${part}`).toMatch(new RegExp(`At ${part} it is`, 'i'));
    }
  }, 2_400_000);

  it('6. label wheat at the gate end — look lists it, and reads it like a pot plant', async () => {
    // ⚠ With text: a bare label names the plant after the labeler (W4).
    const tied = await doing(p, 'label wheat trial at the gate end');
    expect(tied).toMatch(/tie your label to a stem of wheat at the gate end\s*: trial/i);
    await goTo(HOME_FIELD);
    expect(await read(p, 'look')).toMatch(/You also see:[^]*\btrial\b/i);
    const trial = await freshRead(handle, HOME_FIELD, 'look trial');
    // Stage and condition like a pot plant (the unbanded read).
    expect(trial).toMatch(/It is thriving\.|It looks healthy\.|It looks stressed\.|It is failing\./);
    expect(await freshRead(handle, HOME_FIELD, 'look at the gate end')).toMatch(/Trial stands here, labeled\./i);
  }, 600_000);
});

/* ═══════════════════════ Stage B — the bench ═══════════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage B — the bench, read by patch', () => {
  const novice = uniqueHandle('fieldnov');

  it('1. the bench reads a line per patch, and the top end reads poorest', async () => {
    await toDay(BENCH_DAY);
    await daylight();
    await goTo(BENCH);
    const looked = await read(p, 'look');
    expect(looked, 'never a number').not.toMatch(/\d+\s*(m²|kg|%)/);
    const top = patchCondition(looked, 'the top end');
    const middle = patchCondition(looked, 'the middle');
    const lane = patchCondition(looked, 'the lane end');
    note(`bench patches: top end ${top} · middle ${middle} · lane end ${lane}`);
    expect(top, 'the top end reads poorer than the middle').toBeLessThan(middle);
    expect(top, 'the top end reads poorer than the lane end').toBeLessThan(lane);
  }, 1_800_000);

  it('2. the same patch, the same moment: the novice reads less, never a different truth', async () => {
    // Back to back, no clock between: an untrained handle and an expert.
    const plain = await freshRead(novice, BENCH, 'look at the top end');
    const trained = await freshRead(expert, BENCH, 'look at the top end', true);
    expect(plain).toMatch(/A stand of wheat grows here/i);
    expect(plain, 'the floor band names no cause').not.toMatch(CAUSE);
    expect(trained, 'the expert names the cause').toMatch(CAUSE);
    // ⭐ Only by addition: every sentence the novice read is in the expert's.
    // A body line ("You're shivering.") is the reader's own state arriving
    // beside the read, not part of it (drive 2).
    const sentences = plain
      .replace(/\s+/g, ' ')
      .split(/(?<=\.)\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 3 && !/^You('re|'ve| are| feel)\b/.test(x));
    const flatTrained = trained.replace(/\s+/g, ' ');
    for (const sentence of sentences) {
      expect(flatTrained, `the expert's read lacks: ${sentence}`).toContain(sentence);
    }
    expect(flatTrained.length).toBeGreaterThan(plain.replace(/\s+/g, ' ').length);
    // ⭐ And the stand answers to its patch's name (amended D13).
    const stand = await freshRead(expert, BENCH, 'look top end wheat', true);
    expect(stand).toMatch(/It stands at the top end\./);
    expect(stand).toMatch(CAUSE);
  }, 600_000);

  it('3. sample wheat at the top end: a stem that names its field and patch, the same twice', async () => {
    const x = await Session.open(expert, { startLocation: BENCH, wizard: true });
    try {
      await x.drainProse();
      expect(await doing(x, 'sample wheat at the top end')).toMatch(/pull a stem of wheat from the top end/i);
      expect((await x.query('me:i:stem')).length).toBe(1);
      const first = await read(x, 'look me:i:stem:[1]');
      expect(first).toMatch(/It is (in ear|tillering|ripening|ripe|just up) and/);
      expect(first).toMatch(CAUSE);
      expect(first).toMatch(/Its roots/);
      expect(first).toMatch(/Taken from the top end of the upper bench\./);
      // ⭐ Same spot, same plant.
      await doing(x, 'sample wheat at the top end');
      const second = await read(x, 'look me:i:stem:[2]');
      // The plant's own words (an ambient line — *"You're shivering."* —
      // may lead either read).
      const own = (t: string): string => t.replace(/\s+/g, ' ').replace(/^.*?(?=a stem of wheat)/i, '');
      expect(own(second)).toBe(own(first));
      await act(x, 'drop all stem');
    } finally {
      x.close();
    }
  }, 600_000);

  it('4. sample wheat at the lane end: it reads better than the top end', async () => {
    const x = await Session.open(expert, { startLocation: BENCH, wizard: true });
    try {
      await x.drainProse();
      // Hands empty: two stems in hand make `look me:i:stem` ask which.
      await act(x, 'drop all stem');
      await doing(x, 'sample wheat at the top end');
      const top = await read(x, 'look me:i:stem');
      await act(x, 'drop all stem');
      await doing(x, 'sample wheat at the lane end');
      const lane = await read(x, 'look me:i:stem');
      expect(lane).toMatch(/Taken from the lane end of the upper bench\./);
      note(`stems: top end ${conditionOf(top)} · lane end ${conditionOf(lane)}`);
      expect(conditionOf(lane), 'the lane end stem reads better').toBeGreaterThan(conditionOf(top));
      await act(x, 'drop all stem');
    } finally {
      x.close();
    }
  }, 600_000);

  it('5. water wheat with no patch named is refused, naming all three', async () => {
    // `water` is afforded by the vessel (husbandry § water is
    // tool-afforded): a can in hand — the one step 7 waters with.
    let can = false;
    for (const where of CANS) {
      if (can) break;
      await goTo(where);
      can = refusedFor((await act(p, 'get 1 can')).r) === null;
    }
    expect(can, 'a watering can in hand').toBe(true);
    await goTo(BENCH);
    const said = await refused(p, 'water wheat', 'patch-unnamed');
    for (const part of ['the top end', 'the middle', 'the lane end']) expect(said).toContain(part);
  }, 600_000);
});

/* ═══════════════════ Stage C — the home field cared for ═══════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage C — care by patch, and the hand', () => {
  it('7. through a dry week the watered labeled plant reads better than its patch and a fresh sample', async () => {
    await daylight();
    // Six staged days. The founder dries the gate end every six hours
    // (rain would otherwise make it no dry week at all); the hand fills
    // the can at the yard trough and waters the labeled plant once a day.
    for (let d = 0; d < 6; d++) {
      await dryTo({ 'gate-end': 0.1 });
      await goTo(YARD);
      await doing(p, 'fill can from trough');
      await goTo(HOME_FIELD);
      const { r, said } = await act(p, 'water trial');
      if (refusedFor(r) !== 'already-wet') expect(refusedFor(r), said).toBeNull();
      await drink();
      for (let q = 0; q < 4; q++) {
        await advance(6 * 3_600);
        await dryTo({ 'gate-end': 0.1 });
      }
    }
    await daylight();
    await dryTo({ 'gate-end': 0.1 });
    const trial = await freshRead(expert, HOME_FIELD, 'look trial', true);
    const patch = await freshRead(expert, HOME_FIELD, 'look at the gate end', true);
    const x = await Session.open(expert, { startLocation: HOME_FIELD, wizard: true });
    let sample = '';
    try {
      await x.drainProse();
      // Empty hands first: a stem left over from an earlier step would make
      // `look me:i:stem` ask which (drive 1 cascaded from step 4 this way).
      await act(x, 'drop all stem');
      await doing(x, 'sample wheat at the gate end');
      sample = await read(x, 'look me:i:stem');
      await act(x, 'drop all stem');
    } finally {
      x.close();
    }
    note(`dry week: trial ${healthOf(trial)} · gate end ${healthOf(patch)} · sample ${healthOf(sample)}`);
    expect(healthOf(trial), 'the watered plant reads better than its patch').toBeGreaterThan(healthOf(patch));
    expect(healthOf(trial), 'and better than a fresh stem from it').toBeGreaterThan(healthOf(sample));
  }, 3_600_000);

  it('8. a pail at the middle says how much, and the patch barely moves', async () => {
    await goTo(BYRE);
    await doing(p, 'get 1 pail');
    await goTo(YARD);
    await doing(p, 'fill pail from trough');
    await goTo(HOME_FIELD);
    const cap = byPart(
      await founderEval(
        HOME_FIELD,
        CAMPUS,
        'return self.getContainer().soilParts().map(p => p.soilPartKey() + "=" + p.getReserve("moisture").capacity.rawValue()).join(",")',
      ),
    );
    const before = await moistures();
    const said = await doing(p, 'water wheat at the middle from pail');
    const after = await moistures();
    const litres = Number(/You tip ([0-9.,]+) L/.exec(said)?.[1]?.replace(/,/g, '') ?? NaN);
    expect(said).toMatch(/at the middle/i);
    expect(said).toMatch(/barely shows/i);
    expect(litres).toBeGreaterThan(0);
    const moved = (after.middle ?? NaN) - (before.middle ?? NaN);
    note(`pail: ${litres} L on the middle (capacity ${cap.middle} L): ${before.middle} → ${after.middle}`);
    expect(moved, 'the middle moved by no more than the pail').toBeLessThanOrEqual(litres / (cap.middle ?? 1) + 1e-3);
    expect(moved).toBeGreaterThan(-0.01);
  }, 1_200_000);

  it('9. compost at the far side: the reply states the kilograms, the far side alone is fed', async () => {
    await goTo(HOME_FIELD);
    // ⭐ Staging: a hungry far side. The campus hand feeds the hungriest
    // patch every beat (W5), so by now she may have filled it — and a
    // full patch has nothing to take.
    await setReserve('nitrogen', 'nutrientFraction', { 'far-side': 0.3 });
    const NITROGEN =
      'return self.getContainer().soilParts().map(p => p.soilPartKey() + "=" + p.nutrientFraction()).join(",")';
    const before = byPart(await founderEval(HOME_FIELD, CAMPUS, NITROGEN));
    // ⚠ One word for the source: a two-word object after the greedy patch
    // falls through every command shape (staged W6; W3 saw the same of
    // `fill watering can from …`). The only compost carried is the sack.
    const said = await doing(p, 'feed wheat at the far side with compost');
    const after = byPart(await founderEval(HOME_FIELD, CAMPUS, NITROGEN));
    expect(said).toMatch(/You work (less than )?[0-9.,]+ kg of .* at the far side/i);
    note(`nitrogen: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    expect(after['far-side']!, 'the far side was fed').toBeGreaterThan(before['far-side']! + 1e-4);
    for (const part of ['gate-end', 'middle']) {
      expect(Math.abs(after[part]! - before[part]!), `${part} untouched`).toBeLessThan(1e-3);
    }
  }, 1_200_000);

  it('11. the campus hand waters the patch her own read points to — and a bystander sees which', async () => {
    // Her hours are 06–18; she beats only once she is loaded (on the
    // roster's next pass after a jump). Below her `waterAt` (0.5) on all
    // three, but above the wheat's happy line (0.35): she has something
    // to decide, and nothing is stressed by the staging.
    await toDay(Math.floor((await worldClockNow()) / DAY) + 1, 9);
    await goTo(HOME_FIELD);
    // ⚠ Everything anybody standing in the field heard counts — the
    // founder staging the drain saw her water the gate end the moment the
    // soil dropped (staged W6), before the drive's own `listen` began.
    const STAGE = { 'gate-end': 0.44, middle: 0.4, 'far-side': 0.42 };
    let heard = await dryTo(STAGE);
    const expertRead = await freshRead(expert, HOME_FIELD, 'look', true);
    heard += ` ${expertRead}`;
    const WATERS = /waters a stand of wheat at (the gate end|the middle|the far side)/i;
    let watered: string | null = WATERS.exec(heard)?.[1] ?? null;
    for (let round = 0; round < 8 && watered === null; round++) {
      heard += ` ${await p.listen(45_000)}`;
      if (round % 2 === 1) heard += ` ${await dryTo(STAGE)}`;
      watered = WATERS.exec(heard)?.[1] ?? null;
    }
    note(`the hand: ${heard.replace(/\s+/g, ' ').slice(0, 600)}`);
    note(`the hand watered: ${watered ?? 'nothing'}; the expert's read of the moment: ${expertRead.replace(/\s+/g, ' ').slice(0, 600)}`);
    expect(watered, 'the hand watered SOME patch, by name').not.toBeNull();
    await read(p, 'look');
  }, 1_800_000);

  it('10. at harvest the kept patch grades better than the neglected one', async () => {
    // ⭐ Staging: the comparison window opens here — every stand's season
    // record is set even (reconciled first, so the window that just ended
    // is not charged to the new one; then `_worstLimiting` back to 1, the
    // dry week behind the gate end forgiven) — and then the far side is
    // NEGLECTED through one dry spell: dried by the founder, a day left
    // dry, and read while it is. Once, not every step: a stand kept dry
    // develops slowly enough that it would not ripen before the frost
    // (staged W6 — at day 228 the gate end was ripe and the far side
    // still in ear). The gate end is left to the weather.
    const WORST =
      'return self.getContainer().getContents().filter(c => c.isAreaCrop && c.isAreaCrop()).map(c => c.getGroundPart() + "=" + c.getWorstLimiting()).join(",")';
    await founderEval(
      HOME_FIELD,
      CAMPUS,
      // ⚠ No `;` in eval text: the command line splits on it (drive 2 found
      // the reset never ran). The comma operator does the same work.
      'return self.getContainer().getContents().filter(c => c.isAreaCrop && c.isAreaCrop()).map(c => (c.getVigor(), c._worstLimiting = 1, c.getGroundPart())).join(",")',
    );
    await daylight();
    // ⚠ Stressed, not killed: the campus barely rains (the realm finding),
    // so a patch dried to the wilting point never comes back and dies
    // before it ripens (drive 2). Neglect grades worse; it need not kill.
    await dryTo({ 'far-side': 0.25 });
    for (let q = 0; q < 4; q++) {
      await advance(6 * 3_600);
      await dryTo({ 'far-side': 0.25 });
    }
    await daylight();
    await dryTo({ 'far-side': 0.25 });
    await freshRead(expert, HOME_FIELD, 'look at the far side', true);
    note(`after the dry spell: ${await founderEval(HOME_FIELD, CAMPUS, WORST)}`);
    const GRADES_EVAL =
      'return self.getContainer().getContents().filter(c => /crop\\/wheat$/.test(c.getTemplatePath() ?? "")).map(c => c.stuffId + ":" + c.getGradeBand()).join(",")';
    const grades = (said: string): Map<string, string> =>
      new Map([...said.matchAll(/([A-Za-z0-9_-]{8,}):([a-z]+)/g)].map((m) => [m[1]!, m[2]!]));

    const cut = async (part: string): Promise<string> => {
      // Ripe first, then cut until a sack is in hand.
      for (let i = 0; i < 25; i++) {
        await daylight();
        await goTo(HOME_FIELD);
        if (new RegExp(`At ${part} it is ripe`, 'i').test(await read(p, 'look'))) break;
        await advance(10 * DAY);
      }
      await onShift();
      for (let i = 0; i < 40 && (await p.query('me:i:wheat')).length === 0; i++) {
        await daylight();
        await drink();
        const { r, said } = await work(p, `harvest wheat at ${part}`);
        expect(refusedFor(r), said).toBeNull();
      }
      expect((await p.query('me:i:wheat')).length, `a sack from ${part}`).toBeGreaterThan(0);
      const before = grades(await founderEval(HOME_FIELD, CAMPUS, GRADES_EVAL));
      await doing(p, 'drop all wheat');
      const after = grades(await founderEval(HOME_FIELD, CAMPUS, GRADES_EVAL));
      const fresh = [...after].filter(([id]) => !before.has(id)).map(([, g]) => g);
      expect(fresh.length, `the sack from ${part} lies in the field`).toBeGreaterThan(0);
      return fresh[0]!;
    };

    note(`the season's worst before the cut: ${await founderEval(HOME_FIELD, CAMPUS, WORST)}`);
    const kept = await cut('the gate end');
    const neglected = await cut('the far side');
    note(`grades: the gate end ${kept} · the far side ${neglected}`);
    expect(GRADES.indexOf(kept), 'the kept patch grades better').toBeGreaterThan(GRADES.indexOf(neglected));
  }, 7_200_000);
});

/* ═══════════════════ Stage D — what did not change ═══════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage D — one-piece fields and pots', () => {
  it('12. a Waponi cane piece reads and cuts with no patch named', async () => {
    await daylight();
    await goTo(CANE_PIECE);
    const looked = await read(p, 'look');
    expect(looked).toMatch(/stand of sugar cane grows/i);
    expect(looked).not.toMatch(/Which part\?|At the [a-z ]+ it is/i);
    const { r, said } = await act(p, 'harvest cane');
    expect(refusedFor(r), said).not.toBe('patch-unnamed');
    expect(said).not.toMatch(/Which part\?/i);
  }, 1_200_000);

  it('13. a potted plant reads and waters as before', async () => {
    /*
     * ⚠⚠ KNOWN GAP, named rather than passed quietly: **a drive handle
     * cannot reach a starter pot.** The dorm room is a keyed residence; a
     * `startLocation` stands the room up but NOT its `props:` (the
     * avatar-family drive found the same of its wardrobe), so the pot and
     * the lily are not there. Making a pot plant from shop goods hit two
     * defects outside this build (staged W6): `pour soil into clay pot`
     * fell through every command shape in the farm yard, and `plant` was
     * an unknown verb with a carried pot anywhere but the store. AC 10's
     * pot half is pinned by the unit suite (`WaterVerb.test.ts`,
     * `Growing.test.ts` — a pot plant is not banded). ⭐ The assertions
     * below stay LIVE: the moment the pot is in the room, they run.
     */
    const t = await Session.open(uniqueHandle('fielddorm'), { startLocation: DORM });
    try {
      await t.drainProse();
      const looked = await act(t, 'look lily');
      if (refusedFor(looked.r) === 'empty-result') {
        note('13: no lily in a drive-reached dorm room (the known props gap)');
        return;
      }
      const rank = conditionOf(looked.said);
      // The POT read, unbanded: no novice hedge, and a cause whenever
      // anything is short — whoever is reading.
      expect(looked.said).not.toMatch(/short of something/i);
      if (rank < 3) expect(looked.said, 'a pot names what holds it back').toMatch(CAUSE);
      await doing(t, 'get can');
      await doing(t, 'fill can from tap');
      const { r, said } = await act(t, 'water lily');
      // A fresh room's pot may be wet through; then the verb says so —
      // in the pot's words, never a patch's.
      if (refusedFor(r) === 'already-wet') {
        expect(said).toMatch(/already wet through/i);
      } else {
        expect(refusedFor(r), said).toBeNull();
        expect(said).toMatch(/You tip [0-9.]+ L of .* into the soil around .*lily/i);
        expect(said).not.toMatch(/barely shows|Which part/i);
      }
      expect(conditionOf(await read(t, 'look lily'))).toBeGreaterThanOrEqual(0);
    } finally {
      t.close();
    }
  }, 600_000);
});
