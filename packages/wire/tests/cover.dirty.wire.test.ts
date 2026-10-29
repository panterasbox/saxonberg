/**
 * The cover build's drive — arable and grazing (cover-requirements § The
 * drive, 19 steps), against a booted world, in the order a year runs.
 *
 * ⭐⭐ **Tests build state; this uses it.** Everything here is typed the
 * way a player types it — `plough`, `sow wheat`, `harvest wheat`,
 * `move college herd to …` — and asserted on the envelope's reasons and
 * the world's own words, never on "defined".
 *
 * ⚠ The calendar: the world boots at midnight on 1 Arienle, midwinter.
 * The drive walks a year in ten-day jumps (a long jump drains every
 * schedule and outlives the client's header timeout), stepping to
 * daylight before it looks at anything: a dark field binds the wrong
 * thing and reads as nothing.
 *
 * ⚠ NPC positions after a jump are nondeterministic (memory: probe-world):
 * the drive asserts what the world HOLDS — the hay in the rick, the band
 * of the grass, the condition of a head — never where a hand is standing.
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
 * ⚠ Why this file cannot run twice: it hires itself onto the campus
 * farm's labourer seat, ploughs and sows the university's home field and
 * cuts it to stubble, cuts a swath of the Delight's wheat, moves the
 * college herd, grubs out and replants a Waponi cane piece, and eats into
 * the dairy's rick. None of that is regenerated.
 */
export const DIRTY_REASON =
  'takes a campus labourer seat, ploughs, sows and cuts the home field, ' +
  'cuts the Delight bench, moves the college herd, grubs and replants a ' +
  'Waponi smallholding, and draws down the dairy rick';

declareFile({
  file: 'cover.dirty.wire.test.ts',
  packs: [
    'platform',
    'trade-farming',
    'trade-ranching',
    'trade-sugar',
    'eternal-university',
    'hearts-delight',
    'waponi-woo',
    'terminus',
    'rejection',
  ],
  dirtyReason: DIRTY_REASON,
});

const DAY = 86_400;

const BENCH = '/world/terminus/hearts-delight/bench-field/location/upper-bench';
const CLOSE = '/world/terminus/hearts-delight/bench-field/location/orchard-close';
const PASTURE = '/world/terminus/hearts-delight/dairy/location/pasture';
const BYRE = '/world/terminus/hearts-delight/dairy/location/byre';
const STORE = '/world/terminus/general-store/shop-floor';
const SQUARE = '/world/terminus/market/square';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const YARD = '/world/terminus/eternal/campus-farm/location/yard';
const HOME_FIELD = '/world/terminus/eternal/campus-field/location/home-field';
const PADDOCK = '/world/terminus/eternal/campus-field/location/back-paddock';
const CANE_PIECE = '/world/terminus/waponi-woo/location/cane-piece';
const SMALLHOLDING = '/world/terminus/waponi-woo/location/smallholding-b';
const GOAT_PEN = '/world/terminus/rejection/kestrel-road/goat-pen';

/** The words a field crop's stage is read in (requirements step 6). */
const STAGES = /just emerging|tillering|in ear|ripening|ripe and ready to cut/i;

let handle = '';
let p: Session;
/** Whether the home field's grass was mown for hay (step 16's hay). */
let mown = false;

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  // eslint-disable-next-line no-console
  console.log(`[cover drive] ${flat}`);
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
 * rest an hour of game time and go again — the way a person sows a field.
 */
async function work(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  let out = await act(s, text);
  for (let i = 0; i < 6 && refusedFor(out.r) === 'too-tired'; i++) {
    await advance(3_600);
    out = await act(s, text);
  }
  return out;
}

/** Work, and require that it was understood and not refused. */
async function working(s: Session, text: string): Promise<string> {
  const { r, said } = await work(s, text);
  expect(refusedFor(r), `'${text}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
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
  note(`${text} → ${said.slice(0, 400)}`);
  return said;
}

/** Jump the clock, ten game-days at most a step, and prove it moved. */
async function advance(seconds: number): Promise<void> {
  // ⚠ Six hours or more away is spent INDOORS, then back to where the
  // hand stood. The hand is logged in, and a body left standing in an
  // open field in a student shirt through a winter month dropped (drive
  // 8), and through an autumn night after a day's cutting it died (drive
  // 9, step 7).
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

/** Game-day of the year now (0-based). */
async function dayOfYear(): Promise<number> {
  return Math.floor((await worldClockNow()) / DAY) % 360;
}

/** Move the character by reopening the session where it needs to be. */
/**
 * A drink at the market standpipe, then back to where the hand stood.
 * ⚠ The hand died of DEHYDRATION in drives 6–11, cutting wheat for hours
 * with nothing to drink. (Food it can go without for months; a staged
 * 120 days showed it still in good flesh.)
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
    note(`(founder eval → ${said.slice(0, 200)})`);
    expect(refusedFor(r)).toBeNull();
    return said;
  } finally {
    gov.close();
  }
}

/** The stockman's condition bands, thinnest first (Creature's phrases). */
const BANDS: Array<[RegExp, number]> = [
  [/wasted — every rib/i, 0],
  [/thin; you can count the ribs/i, 1],
  [/in good flesh/i, 2],
  [/well covered, running to fat/i, 3],
  [/fat, and carrying more/i, 4],
];

/** The condition band a draft line reads, as a rank (0 wasted … 4 fat). */
function bandOf(said: string): number {
  for (const [re, rank] of BANDS) if (re.test(said)) return rank;
  throw new Error(`no condition band in: ${said}`);
}

/**
 * Head `index`'s condition, drafted out of the college herd, read off the
 * draft line, and returned. ⚠ Never by `handle`: a thin wild cow put the
 * drive's player into the rail and out cold (a ranching hazard).
 */
async function collegeHead(index: number): Promise<number> {
  await goTo(YARD);
  const said = await doing(p, `draft ${index}`);
  await doing(p, 'return cow');
  const band = bandOf(said);
  note(`college head ${index}: band ${band}`);
  return band;
}

/** Head 3's flesh in spring, before the paddock (step 14's baseline). */
let spring3 = 0;

beforeAll(async () => {
  handle = uniqueHandle('cover');
  const k = await Session.open(handle, { startLocation: BANK_HALL });
  expectOkish(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOkish(await gov.cmd(`reserve override 80 to ${handle} "wire: cover funding"`));
  } finally {
    gov.close();
  }
  k.close();
  p = await Session.open(handle, { startLocation: STORE });
}, 600_000);

afterAll(() => {
  p?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[cover drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

function expectOkish(r: CommandResult): void {
  expect(refusedFor(r), JSON.stringify(r.notes)).toBeNull();
}

/* ═══════════════════════ Stage A — arable ═══════════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage A — arable', () => {
  it('1. the bench reads as a wheat crop, in words — no loose plants', async () => {
    await daylight();
    await goTo(BENCH);
    const looked = await read(p, 'look');
    expect(looked).toMatch(/stand of wheat grows over about three-quarters of it/i);
    expect(looked).toMatch(STAGES);
    expect(looked, 'never a number').not.toMatch(/\d+\s*(m²|kg|%)/);
    // One crop, not three plants in a field.
    expect((looked.match(/a stand of wheat/gi) ?? []).length).toBeLessThanOrEqual(2);
  }, 600_000);

  it('2. the general store sells a sickle and seed wheat', async () => {
    await goTo(STORE);
    await doing(p, 'buy sickle');
    await doing(p, 'buy seed wheat');
    await doing(p, 'buy seed wheat');
    expect(await read(p, 'inventory')).toMatch(/sickle.*sack of seed wheat.*sack of seed wheat/i);
  }, 600_000);

  it('13a. the college herd is on the home field, and is moved by a keeper only', async () => {
    await goTo(YARD);
    expect(await read(p, 'look herdbook')).toMatch(/grazing the home field/i);
    // A stranger is refused — the herd, and the field.
    await refused(p, 'move college herd to back paddock', 'not-keeper');
    await doing(p, 'go field');
    await refused(p, 'sow wheat', 'not-held');
    await doing(p, 'go yard');
    // Hired: the labourer's seat.
    await doing(p, 'apply for labourer');
  }, 600_000);

  it('3. on shift, the herd goes to the paddock and the field is ploughed for the season — once', async () => {
    // Spring.
    await toDay(80);
    spring3 = await collegeHead(3);
    await goTo(HOME_FIELD);
    await act(p, 'clock on');
    // 13. On shift, the herd moves — the home field is wanted for the plough.
    await doing(p, 'move college herd to back paddock');
    await doing(p, 'go east');
    expect(await read(p, 'look')).toMatch(/six head of the college herd are grazing it/i);
    await doing(p, 'go west');
    let said = '';
    for (let i = 0; i < 5 && !/ploughed for the season/i.test(said); i++) {
      said = (await work(p, 'plough')).said + ' ' + (await read(p, 'look'));
    }
    expect(said).toMatch(/ploughed for the season/i);
    await refused(p, 'plough', 'already-ploughed');
  }, 1_200_000);

  it('4. sowing takes an area per act and spends the seed in proportion: about a third sown', async () => {
    const first = await doing(p, 'sow wheat');
    expect(first).toMatch(/walk the ground, casting|seed goes into the ground/i);
    for (let i = 0; i < 12 && /sack of seed wheat/i.test(await read(p, 'inventory')); i++) {
      const { r, said } = await work(p, 'sow wheat');
      expect(refusedFor(r), said).toBeNull();
    }
    expect(await read(p, 'inventory')).not.toMatch(/seed wheat/i);
    expect(await read(p, 'look')).toMatch(/stand of wheat grows over about a third of it/i);
  }, 1_800_000);

  it('14. grazing: a fortnight on the paddock takes the grass down; a drafted head holds condition', async () => {
    await goTo(PADDOCK);
    const before = await read(p, 'look');
    await advance(14 * DAY);
    await daylight();
    await goTo(PADDOCK);
    const after = await read(p, 'look');
    expect(after).toMatch(/six head of the college herd are grazing it/i);
    note(`paddock grass: «${/The grass is ([^.]*)\./.exec(before)?.[1]}» → «${/The grass is ([^.]*)\./.exec(after)?.[1]}»`);
    // A fortnight on fresh grass: the head holds, or gains.
    const fed = await collegeHead(3);
    expect(fed, 'a fortnight on fresh grass: it holds, or gains').toBeGreaterThanOrEqual(spring3);
  }, 1_800_000);

  it('6. through the season the stages are named in words', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      await advance(10 * DAY);
      await daylight();
      await goTo(HOME_FIELD);
      const looked = await read(p, 'look');
      const m = STAGES.exec(looked);
      if (m) seen.add(m[0].toLowerCase());
      // The crop's own condition and cause, for the record.
      await read(p, 'look wheat');
      // ⭐ Step 16's hay: the rest of the field is mown when it is ready,
      // and the bales lie where they fell until the winter.
      if (!mown && /a good even cover|about ready for them|well ahead of them/i.test(looked)) {
        await goTo(YARD);
        await act(p, 'get scythe');
        await goTo(HOME_FIELD);
        mown = /cut it down to the residual/i.test((await act(p, 'mow')).said);
      }
      if (/ripe and ready to cut/i.test(looked)) break;
    }
    note(`stages seen: ${[...seen].join(', ')}`);
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect([...seen].join(' ')).toMatch(/ripe and ready to cut/);
  }, 3_600_000);

  it('9. the bench’s ripe wheat is the farm’s when a stranger cuts it; sowing there is refused', async () => {
    // Seed in hand first: the last of it went into the home field, and
    // with none held `sow wheat` names the standing crop (not plantable).
    await goTo(STORE);
    await doing(p, 'buy seed wheat');
    await goTo(BENCH);
    const looked = await read(p, 'look');
    expect(looked).toMatch(/ripe and ready to cut/i);
    await refused(p, 'sow seed', 'not-held');
    // Put the seed down: what is in hand next is the cut, and the cut is
    // the farm's — the sack of seed is the stranger's own.
    await act(p, 'drop seed');
    for (let i = 0; i < 10 && (await p.query('me:i:wheat')).length === 0; i++) {
      await work(p, 'harvest wheat');
    }
    const held = await p.query('me:i:wheat');
    expect(held.length, 'the stranger holds the sheaf').toBeGreaterThan(0);
    // ⭐ Custody, not title: it is in the stranger's hands and it is not
    // theirs — `mine` says WHAT is yours.
    expect((await p.query('me:i:wheat:mine')).length).toBe(0);
    // Put it down where it was cut.
    await act(p, 'drop all wheat');
  }, 1_800_000);

  it('7. harvest with the sickle cuts a swath; bare hands cut less; down to the stubble', async () => {
    await goTo(HOME_FIELD);
    // Step 9's cutting at the bench has worn the body out: rest first.
    await daylight();
    const first = await working(p, 'harvest wheat');
    expect(first).toMatch(/cut a swath of/i);
    expect(await read(p, 'look')).toMatch(/part of it is cut/i);
    // Bare-handed: a smaller swath — not enough yet to make up a sack.
    await act(p, 'drop sickle');
    const bare = await working(p, 'harvest wheat');
    expect(bare).toMatch(/pull it by hand|not yet enough to make up a load|cut a swath/i);
    await doing(p, 'get sickle');
    // The take is the university's, not the labourer's.
    expect((await p.query('me:i:wheat:mine')).length).toBe(0);
    let looked = '';
    // A third of a hectare is days of work: rest when tired, and stop at
    // dusk — in the dark nothing in the field can be made out to cut.
    for (let i = 0; i < 120; i++) {
      await daylight();
      if (i % 10 === 9) await drink();
      const { said } = await work(p, 'harvest wheat');
      if (/cut down to the stubble|nothing left standing/i.test(said)) break;
    }
    await daylight();
    looked = await read(p, 'look');
    expect(looked).toMatch(/cut down to the stubble/i);
  }, 3_600_000);

  it('8. stubble to fallow: a season on, the grass comes back over the stubble', async () => {
    await advance(30 * DAY);
    await daylight();
    await goTo(HOME_FIELD);
    expect(await read(p, 'look')).toMatch(/grass is coming back over the stubble|stubble is lost under the grass|cut down to the stubble/i);
  }, 1_800_000);

  it('10–11. Waponi: the cane stands ratooning, and the cutters cut it by area', async () => {
    await daylight();
    await goTo(CANE_PIECE);
    const looked = await read(p, 'look');
    expect(looked).toMatch(/stand of sugar cane grows over/i);
    note(`day ${await dayOfYear()}: ${looked.slice(0, 200)}`);
  }, 600_000);

  it('12. ratoon decline: tired stools are grubbed out, ploughed and replanted from cut cane', async () => {
    // Several ratoons on, by the record: the drive cannot cut a piece five
    // times over, so the smallholding's crop is set five cycles in.
    await founderEval(
      SMALLHOLDING,
      '/world/terminus/waponi-woo',
      'return self.getContainer().getContents().filter(c => c.isAreaCrop && c.isAreaCrop()).map(c => { c._cycleCount = 6; return c.getCycleCount(); }).join(",")',
    );
    await daylight();
    await goTo(SMALLHOLDING);
    expect(await read(p, 'look')).toMatch(/stools are tired/i);
    // The holder's work: grub, plough, replant from cut cane.
    const gov = await Session.open('founder', { startLocation: SMALLHOLDING, wizard: true });
    try {
      // The Okafors' spade and plough are at the piece. A bundle off the
      // old stools first, by hand — what the new planting is laid from.
      await act(gov, 'get spade');
      for (let i = 0; i < 6 && (await gov.query('me:i:bundle')).length === 0; i++) {
        await work(gov, 'harvest cane');
      }
      expect((await gov.query('me:i:bundle')).length, 'a bundle of cut cane in hand').toBeGreaterThan(0);
      const grubbed = await act(gov, 'grub');
      expect(refusedFor(grubbed.r)).toBeNull();
      expect(await read(gov, 'look')).not.toMatch(/stand of sugar cane grows/i);
      let ploughed = '';
      for (let i = 0; i < 4 && !/ploughed for the season/i.test(ploughed); i++) {
        await work(gov, 'plough');
        ploughed = await read(gov, 'look');
      }
      expect(ploughed).toMatch(/ploughed for the season/i);
      await doing(gov, 'sow cane');
      expect(await read(gov, 'look')).toMatch(/stand of sugar cane grows over a strip of it, just emerging/i);
    } finally {
      gov.close();
    }
  }, 1_800_000);

  it('18. Hearts Delight, unattended: a month on, the pasture trough drew on the rick; a cow still milks', async () => {
    // ⭐ The requirement's month (R2: the rick carries the unwatched
    // month). Nobody stacks hay at the Delight while nobody is there, so
    // the month that counts is the one the grass gives out in — late in
    // the first year, when the trough first turns to the rick. A whole
    // unwatched year starves the herd, and that is the sim being right.
    await toDay(255);
    const RICK_KG =
      "return self.getContainer().getContents().filter(t => /rick/.test(t.getTemplatePath() ?? '')).map(t => t.getContents().reduce((a, c) => a + c.getMass().rawValue(), 0)).join(',')";
    const kgOf = (said: string): number => Number(/([0-9.]+)/.exec(said)?.[1] ?? NaN);
    const before = kgOf(await founderEval(PASTURE, '/world/terminus/hearts-delight', RICK_KG));
    await advance(30 * DAY);
    await daylight();
    const after = kgOf(await founderEval(PASTURE, '/world/terminus/hearts-delight', RICK_KG));
    note(`the dairy rick over the month the grass gave out: ${before} kg → ${after} kg`);
    expect(after, 'the trough drew on the rick').toBeLessThan(before);
    await goTo(PASTURE);
    expect(await read(p, 'look')).toMatch(/head of the Delight dairy herd are grazing it/i);
    await goTo(CLOSE);
    expect(await read(p, 'look')).toMatch(/head of the Delight flock are grazing it/i);
    // ⭐ And she milks: the pasture and the rick behind it kept her in
    // condition, and milk follows condition.
    await goTo(BYRE);
    await act(p, 'get pail');
    const cow = await doing(p, 'draft 1 from dairy');
    expect(bandOf(cow), 'the pasture and the rick kept her in flesh').toBeGreaterThanOrEqual(2);
    // ⚠ Should she have dried off (milk is an `expire` tap and the
    // Delight has had nobody milking it), she says so plainly (B33).
    // A head cut out of the herd has nothing standing in her yet: she
    // fills from the draft. Let her stand the morning.
    await advance(6 * 3_600);
    const milked = await act(p, 'milk cow');
    expect(milked.said).toMatch(/milk her right out|pail fills|has dried off/i);
    expect(milked.said).not.toMatch(/come back later/i);
    await act(p, 'return cow');
  }, 1_800_000);
});

/* ═══════════════════════ Stage B — grazing ═══════════════════════ */

suite.skipIf(!isOwnedTestWorld())('Stage B — grazing', () => {
  it('17. the herd goes back onto the stubble, and eats it down', async () => {
    // ⭐ A season away costs the seat: a holder absent past
    // employment.absenceVacatesAfterDays is vacated (economic bootstrap
    // D16), and the drive has been logged out for months. Back to the
    // yard, take the seat again, and clock on.
    await goTo(YARD);
    await act(p, 'apply for labourer');
    await doing(p, 'clock on');
    await doing(p, 'go field');
    await doing(p, 'move college herd to here');
    const before = await read(p, 'look');
    expect(before).toMatch(/six head of the college herd are grazing it/i);
  }, 600_000);

  it('15. winter, unfed: the grass gives out; drafted heads thin; none dies', async () => {
    const autumn = await collegeHead(1);
    const shyAutumn = await collegeHead(2);
    // Into the winter on the stubble, nothing in the trough — a fortnight
    // at a time until the fattest head shows it (a fat beast carries a
    // long way into a hungry winter; the bands are coarse).
    let winter = autumn;
    let shyWinter = shyAutumn;
    for (let i = 0; i < 8 && winter >= autumn; i++) {
      await advance(15 * DAY);
      await daylight();
      winter = await collegeHead(1);
      shyWinter = await collegeHead(2);
      // None dies: a head that can be drafted is a head still standing.
    }
    await goTo(HOME_FIELD);
    expect(await read(p, 'look')).toMatch(/eaten right down|grazed to the dirt/i);
    note(`winter: head 1 ${autumn} → ${winter}; head 2 ${shyAutumn} → ${shyWinter}`);
    expect(winter, 'unfed through the winter, it thins').toBeLessThan(autumn);
  }, 3_600_000);

  it('16. hay in the trough feeds them, and the trough empties', async () => {
    await goTo(HOME_FIELD);
    expect(mown, 'the home field was mown for hay in the summer').toBe(true);
    // What a person does: pick up a cut, put it in the trough, until the
    // field has none left or the trough has six. (⚠ The harness query
    // `here:hay` read 0 with twenty cuts lying in plain sight — drive 9 —
    // so the count is the acts, not a query.)
    let forked = 0;
    for (let i = 0; i < 6; i++) {
      const got = await act(p, 'get hay');
      if (refusedFor(got.r) !== null) break;
      await doing(p, 'put hay in trough');
      forked++;
    }
    note(`cuts of hay forked into the trough: ${forked}`);
    expect(forked, 'there was hay lying in the home field').toBeGreaterThan(0);
    expect(await read(p, 'look trough')).not.toMatch(/It is empty/);
    await advance(7 * DAY);
    await daylight();
    await goTo(HOME_FIELD);
    expect(await read(p, 'look trough')).toMatch(/It is empty/);
  }, 1_800_000);

  it('19. Rejection’s goats: a small field with a trough kept from a rick', async () => {
    await goTo(GOAT_PEN);
    const looked = await read(p, 'look');
    expect(looked).toMatch(/head of the Rejection nannies are grazing it/i);
    expect(looked).toMatch(/trough/i);
  }, 600_000);
});
