/**
 * Harbors — ⭐⭐ **the Stage A blocking drive** (the requirements' drive
 * steps 1–10, numbering kept), over the wire.
 *
 * The Port of Terminus: a ship hails the office from the bar and is given
 * a berth; comes in on `course <quay>` and makes her own lines fast to its
 * bollards; is reached by a way named for her and by nothing else; a
 * regular lies alongside her and a third ship too long for what is left is
 * sent to the roads; the deep coaster waits for the flood; dues detain the
 * SHIP and never the people, and are paid at the office; the office's
 * hours send a night hail to the roads; a ship with no line is refused;
 * the Hesper is helmed only by her master — a charterer — and the charter
 * ends, billed, as she berths; Waponi Woo is reached by berthing.
 *
 * ⭐ Every step is tagged with its PACE (docs/workflow.md § No merge waits
 * on the clock): `instant`, `short` (within a game day — every clock jump
 * here is under one), `staged` (the ship put where the step needs her by
 * `stageShip`, never sailed there). No span step: the two voyages are the
 * soak twin's (`harbors.soak.dirty.wire.test.ts`, S3).
 *
 * ⚠ The ORDER is the requirements' with three moves, each for a reason:
 *  - **8 runs first** — the plan's table: the Hesper's helm has no holder
 *    until somebody charters her, so step 1's hail and step 2's course are
 *    a charterer's, and step 8 is where the charter is first taken. Step 9
 *    (chartered, staged off the bar: hail, berth, pay, ashore, the charter
 *    ended and billed) IS steps 1, 2 and 5 sailed by that charterer, so its
 *    assertions ride theirs.
 *  - **4 after 5** — A2's finding: with the Hesper (30 m) and the Kittiwake
 *    (20 m) alongside the Town Quay (70 m) there is no room for the Corrigan
 *    (35 m) at ANY tide, so her low-water refusal and high-water admission
 *    can only be driven once the Hesper has left (step 5).
 *  - **10 last**, where the requirements put it.
 *
 * ⚠⚠ `.dirty.` (docs/testing.md § Repeatable by default): it charters the
 * Hesper, pays dues and charters from a funded player, moves three ships
 * and leaves the Hesper at Waponi Woo — none of it produced again. (The
 * plan named it `harbors.wire.test.ts`; a file that consumes the world is
 * named `.dirty.` by the testing doctrine, so it is.)
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectNote,
  advanceWorldClock,
  worldClockNow,
  stageShip,
} from '../src/harness';

export const DIRTY_REASON =
  'charters the Hesper and pays her dues and days from a funded player, ' +
  'moves the Hesper and the line’s two regulars and leaves the Hesper at ' +
  'Waponi Woo — none of it produced again';

declareFile({
  file: 'harbors.dirty.wire.test.ts',
  packs: ['platform', 'terminus', 'water', 'transport', 'world-seed', 'trade-diving', 'waponi-woo', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const TOWN = '/world/terminus/harbor/town-quay';
const OFFICE = '/world/terminus/harbor/office';
const LINE_DESK = '/world/terminus/harbor/line-desk';
const HESPER = '/world/terminus/hesper/structure';
const HESPER_DECK = '/world/terminus/hesper/deck';
const HESPER_CO = '/world/terminus/hesper/idea/outfit';
const KETCH = '/world/terminus/harbor/ships/ketch/structure';
const KETCH_DECK = '/world/terminus/harbor/ships/ketch/deck';
const KETCH_CO = '/world/terminus/harbor/ships/ketch/idea/company';
const COASTER = '/world/terminus/harbor/ships/coaster/structure';
const COASTER_DECK = '/world/terminus/harbor/ships/coaster/deck';
const COASTER_CO = '/world/terminus/harbor/ships/coaster/idea/company';
const SEA = '/stuff/idea/WaterExpanse/greywater';
const BAR = `${SEA}/bar`;
const ISLAND = `${SEA}/waponi-woo`;

const DAY = 86_400;
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

const SAILOR = uniqueHandle('hbs');
let sailor: Session;

async function session(handle: string, at: string, wizard = false): Promise<Session> {
  const s = await Session.open(handle, { startLocation: at, ...(wizard ? { wizard: true } : {}) });
  open.push(s);
  return s;
}

/** The founder, put down at `at` — one session at a time (a second login replaces the first). */
async function founderAt(at: string): Promise<Session> {
  return session('founder', at, true);
}

async function say(s: Session, text: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(text);
  return squash(await r.said());
}

async function look(s: Session): Promise<string> {
  await s.drainProse();
  return squash(await s.prose('look here'));
}

/** Move the clock forward to the next `hour` o'clock (under a day — a `short` step). */
async function toHour(hour: number): Promise<void> {
  const now = await worldClockNow();
  const h = ((now % DAY) + DAY) % DAY / 3600;
  const ahead = (hour - h + 24) % 24;
  if (ahead < 0.05) return;
  await advanceWorldClock(`${Math.round(ahead * 60)} minutes`);
}

/**
 * Wait until her readout says she is not under way, moving the clock ten
 * game minutes at a time (a river ship finds her stop at her next watch);
 * what was heard on the way is returned with the last readout.
 */
async function comeIn(s: Session, tries = 12): Promise<string> {
  let heard = '';
  for (let i = 0; i < tries; i++) {
    // ⚠ Listening starts BEFORE the jump: her stop is told while the jump
    // drains its schedules, and `listen` drops whatever came before it.
    const hearing = s.listen(8_000);
    await advanceWorldClock('10 minutes');
    heard += ' ' + squash(await hearing);
    if (/made fast|lies off/.test(heard)) break;
    const readout = await say(s, 'course');
    if (/not under way/.test(readout)) {
      heard += ' ' + squash(await s.listen(4_000)) + ' ' + readout;
      break;
    }
  }
  return heard;
}

/**
 * Hail the office until its answer matches `want`, an hour at a time — the
 * tide's window and the office's hours are the clock's to change (`short`:
 * fourteen hours at most).
 */
async function hailUntil(s: Session, want: RegExp, tries = 14): Promise<string> {
  let said = '';
  for (let i = 0; i < tries; i++) {
    if (i > 0) await advanceWorldClock('1 hour');
    said = await say(s, 'hail office');
    if (want.test(said)) return said;
  }
  return said;
}

/** A venue's running balance, as the house's own P&L reads it (the founder holds every house). */
async function balanceAt(where: string): Promise<number> {
  const f = await founderAt(where);
  try {
    const said = await say(f, 'house pnl');
    const m = /running balance:\s*([^\s]+)/.exec(said);
    return m ? Number(m[1]!.replace(/[^\d.-]/g, '')) : NaN;
  } finally {
    f.close();
  }
}

beforeAll(async () => {
  // A funded sailor: dues and a charter's days are paid from her account.
  const s = await session(SAILOR, BANK_HALL);
  expectOk(await s.cmd('bank open'));
  const gov = await founderAt(BANK_HALL);
  expectOk(await gov.cmd(`reserve override 200 to ${SAILOR} "wire: harbors funding"`));
  // ⭐ The Hesper's master seat is held by nobody (a drive before may have
  // appointed the founder): the line lets her by charter here.
  await gov.cmd(`dismiss me at ${HESPER_CO}`);
  gov.close();
  s.close();
  // The office keeps the harbormaster's hours, six till eight.
  await toHour(8);
  sailor = await session(SAILOR, MOUTH);
}, 600_000);

afterAll(() => {
  for (const s of open) s.close();
});

suite('A2 — the charter (step 8 first: her helm has no holder until she is chartered)', () => {
  it('8. (instant · player) without a charter her helm is refused; chartered at Waponi Woo, `course bar` is yours to give', async () => {
    expectOk(await sailor.cmd('go hesper'));
    expect(await look(sailor)).toMatch(/Hesper's deck/i);
    const refused = await sailor.cmd('course bar');
    expectNote(refused, 'controller-rejected', { reason: 'not-her-master' });
    // (staged — twin of soak S3) She lies at Waponi Woo, the sailor aboard.
    await stageShip(HESPER, { at: { node: ISLAND } });
    expectOk(await sailor.cmd('go down'));
    const chartered = await say(sailor, 'charter');
    expect(chartered, chartered).toMatch(/You charter the Hesper at 2 a day/);
    expectOk(await sailor.cmd('go up'));
    const laid = await say(sailor, 'course bar');
    expect(laid, laid).toMatch(/lay a course .* for the bar/i);
  }, 300_000);
});

suite('A1 — the port', () => {
  it('1. (staged · player — 9’s staging) chartered and lying off the bar, the master hails the office: a berth at a named quay', async () => {
    await stageShip(HESPER, { at: { node: BAR } });
    const answer = await hailUntil(sailor, /Berth at/);
    expect(answer, answer).toMatch(/harbor office answers: Berth at the Town Quay/);
  }, 600_000);

  it('2. (short · player) `course town-quay`: alongside, her lines fast round the bollards; the quay names her and has a way `hesper`; `ashore` leads to the quay — and the charter has ended, billed (9)', async () => {
    const set = await say(sailor, 'course town-quay');
    expect(set, set).toMatch(/over the bar and up the river, for the Town Quay/);
    const heard = await comeIn(sailor);
    expect(heard, heard).toMatch(/made fast round the bollard/);
    // ⭐ 9: the charter ends as she berths at a kept quay, its days billed.
    expect(heard, heard).toMatch(/charter of the Hesper ends as she makes fast: \d+ days? at 2/);
    const ashore = await sailor.cmd('go ashore');
    expect(ashore.status, squash(await ashore.said())).toBe('ok');
    const quay = await look(sailor);
    expect(quay, quay).toMatch(/Town Quay/);
    expect(quay, quay).toMatch(/Alongside: the Hesper/);
    expect(quay, quay).toMatch(/line from the Hesper made fast round the bollard|line .* round the bollard/i);
    expectOk(await sailor.cmd('go hesper'));
    expect(await look(sailor)).toMatch(/Hesper's deck/i);
    expectOk(await sailor.cmd('go ashore'));
    expect(await look(sailor)).toMatch(/Town Quay/);
  }, 600_000);

  it('3. (short · staged) a regular alongside the same quay — two ways, each named for its ship; a third, too long for what is left, is sent to the roads and says so', async () => {
    // The Kittiwake's helm: the founder holds the office that appoints her company.
    let f = await founderAt(KETCH_DECK);
    await f.cmd(`appoint me to master at ${KETCH_CO}`);
    await stageShip(KETCH, { at: { node: BAR } });
    const given = await hailUntil(f, /Berth at/);
    expect(given, given).toMatch(/Berth at the Town Quay/);
    expect(await say(f, 'course town-quay'), 'the Kittiwake would not come in').toMatch(/for the Town Quay/);
    const heard = await comeIn(f);
    expect(heard, heard).toMatch(/made fast/);
    f.close();
    const quay = await look(sailor);
    expect(quay, quay).toMatch(/Alongside: the Hesper, the Kittiwake|Alongside: the Kittiwake, the Hesper/);
    expect(quay, quay).toMatch(/\bhesper\b/i);
    expect(quay, quay).toMatch(/\bkittiwake\b/i);
    // The Corrigan (35 m): 70 − 30 − 20 leaves 20 m on the Town Quay, and the
    // Fish Quay is 25 — sent to the roads by room, once the bar would take her.
    f = await founderAt(COASTER_DECK);
    await f.cmd(`appoint me to master at ${COASTER_CO}`);
    await stageShip(COASTER, { at: { node: BAR } });
    const sent = await hailUntil(f, /no berth long enough|Berth at/);
    expect(sent, sent).toMatch(/There is no berth long enough for her — she is 35 m\. Lie in the roads/);
    f.close();
  }, 1_200_000);

  it('5. (short · player) owing, `course` is refused citing the dues — and everyone aboard can still go ashore; paid at the office, she sails: her lines come in, her way is gone; the dues are in the harbor works’ books', async () => {
    expectOk(await sailor.cmd('go hesper'));
    // Her helm again: the last charter ended as she berthed.
    expectOk(await sailor.cmd('go down'));
    expect(await say(sailor, 'charter')).toMatch(/You charter the Hesper/);
    expectOk(await sailor.cmd('go up'));
    const held = await sailor.cmd('course bar');
    expectNote(held, 'controller-rejected');
    const why = squash(await held.said());
    expect(why, why).toMatch(/harbor dues/);
    expect(why, why).toMatch(/on her bills/);
    // ⛔ The SHIP is held, never the people.
    const ashore = await sailor.cmd('go ashore');
    expect(ashore.status, squash(await ashore.said())).toBe('ok');
    expect(await look(sailor)).toMatch(/Town Quay/);
    const worksBefore = await balanceAt(OFFICE);
    const lineBefore = await balanceAt(LINE_DESK);
    expectOk(await sailor.cmd('go south'));
    const paid = await say(sailor, 'pay office');
    expect(paid, paid).toMatch(/You pay .*harbor dues for the Hesper.*charter of the Hesper.*Nothing more is owed/);
    expect(await balanceAt(OFFICE), 'the dues are not in the harbor works’ books').toBeGreaterThan(worksBefore);
    expect(await balanceAt(LINE_DESK), 'the charter’s days are not in the line’s books').toBeGreaterThan(lineBefore);
    expectOk(await sailor.cmd('go north'));
    expectOk(await sailor.cmd('go hesper'));
    const out = await say(sailor, 'course bar');
    expect(out, out).toMatch(/under way downstream/);
    // From the quay: her way is gone, the Kittiwake's stands.
    const f = await founderAt(TOWN);
    const quay = await look(f);
    f.close();
    expect(quay, quay).not.toMatch(/Alongside: the Hesper|Alongside: .*the Hesper/);
    expect(quay, quay).toMatch(/Kittiwake/);
  }, 900_000);

  it('4. (short · player) the deep coaster at low water is told to wait for the flood; at high water she comes in', async () => {
    // (staged) The clock to the office's opening, then on an hour at a time
    // until the bar will not float her. ⚠ The search must not be a HAIL: a
    // hail at high water is answered with a berth, written in the book, and
    // a berth given stands — she would never be told to wait. `course
    // town-quay` with no berth given is a pure probe: the bar refuses her
    // first ("not until the flood"), else the quay does ("hail first").
    // From 06:15 a rising tide always follows within the office's day: the
    // admitted window is under six hours and the refused one under seven.
    await toHour(6.25);
    const f = await founderAt(COASTER_DECK);
    for (let i = 0; i < 8; i++) {
      if (i > 0) await advanceWorldClock('1 hour');
      if (/Not until the flood/.test(await say(f, 'course town-quay'))) break;
    }
    const low = await hailUntil(f, /Not until the flood/, 1);
    expect(low, low).toMatch(/over the bar and she wants [\d.]+\. Not until the flood/);
    const high = await hailUntil(f, /Berth at/);
    expect(high, high).toMatch(/Berth at the Town Quay/);
    const set = await say(f, 'course town-quay');
    expect(set, set).toMatch(/over the bar and up the river, for the Town Quay/);
    const heard = await comeIn(f);
    expect(heard, heard).toMatch(/made fast/);
    f.close();
  }, 1_800_000);

  it('6. (short · player) a hail at night: lie in the roads until the office opens', async () => {
    await toHour(23);
    const said = await say(sailor, 'hail office');
    expect(said, said).toMatch(/The harbor office is closed\. Lie in the roads until the office opens/);
  }, 300_000);

  it('7. (instant · player) a ship with no line aboard is refused at the quay: she has no lines to make fast', async () => {
    await stageShip(HESPER, { at: { node: BAR } });
    // (staged) The founder takes her two lines off the deck.
    const f = await founderAt(HESPER_DECK);
    expectOk(await f.cmd('get 1 mooring line'));
    expectOk(await f.cmd('get 1 mooring line'));
    const refused = await sailor.cmd('course town-quay');
    expectNote(refused, 'controller-rejected', { reason: 'course-refused' });
    expect(squash(await refused.said())).toMatch(/She has no lines to make fast/);
    expectOk(await f.cmd('drop 1 mooring line'));
    expectOk(await f.cmd('drop 1 mooring line'));
    f.close();
  }, 300_000);
});

suite('A2 — sugar’s island', () => {
  it('10. (staged · player — twin of soak S3) chartered, staged lying off Waponi Woo: she hails and berths alongside its quay; ashore by the way named for her — no hard-wired exit remains', async () => {
    await toHour(8);
    // (staged) Off the island, the sailor aboard.
    await stageShip(HESPER, { at: { node: ISLAND } });
    // "Charter her again" — step 5's charter still runs (she has not berthed
    // at a kept quay since), so the book says she is hers already.
    expectOk(await sailor.cmd('go down'));
    expect(await say(sailor, 'charter')).toMatch(/You charter the Hesper|is yours already/);
    expectOk(await sailor.cmd('go up'));
    // The island's office is the estate store; its harbormaster the owner, 6–20.
    const given = await hailUntil(sailor, /Berth at/);
    expect(given, given).toMatch(/Berth at the landing at Waponi Woo\. .*`course waponi woo`/);
    const inAlongside = await say(sailor, 'course waponi woo');
    expect(inAlongside, inAlongside).toMatch(/You bring her in to the landing at Waponi Woo\..*made fast/);
    expect(inAlongside, inAlongside).toMatch(/charter of the Hesper ends as she makes fast/);
    expectOk(await sailor.cmd('go ashore'));
    const landing = await look(sailor);
    expect(landing, landing).toMatch(/jetty/);
    expect(landing, landing).toMatch(/Alongside: the Hesper/);
    expect(landing, landing).not.toMatch(/\baboard\b/i);
    expectOk(await sailor.cmd('go hesper'));
    expect(await look(sailor)).toMatch(/Hesper's deck/i);
    expectOk(await sailor.cmd('go ashore'));
    // The island's book is paid at the estate store, its harbor office.
    expectOk(await sailor.cmd('go north'));
    expectOk(await sailor.cmd('go north'));
    const paid = await say(sailor, 'pay office');
    expect(paid, paid).toMatch(/You pay .*Nothing more is owed/);
  }, 900_000);
});
