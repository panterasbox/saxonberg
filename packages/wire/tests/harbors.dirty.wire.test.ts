/**
 * Harbors — ⭐⭐ **the blocking drive** (the requirements' drive
 * steps 1–25, numbering kept), over the wire.
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
 * ⭐ **Stage B (11–25)** — owning a ship: bought and named off Pell's yard's
 * hull book (two hulls on the stocks, both sold here; ⚠ the yard then
 * sells none, so a SECOND run of this file wants a fresh world — a kept
 * world's yard is sold out),
 * entered in the city's register as her company's, its sixty-fourths all hers; a second player's
 * smack keeps her own rooms; the gangway is a lock with a key and the helm
 * is only her master's; shares sold with the money and the shares together;
 * she keeps across a server RESTART (15, run in the middle, in a world this
 * run owns); her hull on the house's clock — settled at her berth, pumped
 * off the mud, sounded, pumped and rising again; at sea under her flag; a
 * rowboat bought and loaded, a dinghy swamped in a chop; a canoe hired by
 * the day; settling, going down, swum up out of, dived to; a holed boat
 * bailed and let go; the caulker's kit. ⚠ The ORDER is the requirements'
 * with these moves, each for a reason: **15–16 and 19–20 before 14** (she
 * must be at her berth to be left, restarted, settled and pumped — 14
 * takes her to sea, where 17's chop and 21–23's sinking need her), and
 * **24–25 after 23** (the rowboat 17 bought is the one holed).
 * Each stage-B ship is named afresh every run (a name already entered is
 * refused — which is step 11's other half, driven by the second buyer).
 *
 * ⚠⚠ `.dirty.` (docs/testing.md § Repeatable by default): it charters the
 * Hesper, pays dues and charters from a funded player, moves three ships
 * and leaves the Hesper at Waponi Woo — none of it produced again. (The
 * plan named it `harbors.wire.test.ts`; a file that consumes the world is
 * named `.dirty.` by the testing doctrine, so it is.)
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CommandResult } from '../src/harness';
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
  hand,
  isOwnedTestWorld,
} from '../src/harness';
import { bootOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';

export const DIRTY_REASON =
  'charters the Hesper and pays her dues and days from a funded player, ' +
  'moves the Hesper and the line’s two regulars and leaves the Hesper at ' +
  'Waponi Woo, buys two smacks into the register and sinks one, buys and ' +
  'sinks a rowboat, restarts the world — none of it produced again';

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

async function session(handle: string, at: string, committees: string[] = []): Promise<Session> {
  const s = await Session.open(handle, {
    startLocation: at,
    ...(committees.length ? { committees } : {}),
  });
  open.push(s);
  return s;
}

/**
 * The founder, put down at `at` — one session at a time (a second login
 * replaces the first). It holds every office by default but sits on no
 * committee, so it is seated on Terminus's: the harbor works' house
 * (`house pnl` at the office) answers to that committee (wizard-axis D13).
 */
async function founderAt(at: string): Promise<Session> {
  return session('founder', at, ['/world/terminus']);
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
  const heard: string[] = [];
  for (let i = 0; i < tries; i++) {
    if (i > 0) await advanceWorldClock('1 hour');
    const said = await say(s, 'hail office');
    if (want.test(said)) return said;
    heard.push(said);
  }
  // Not answered as wanted: every answer, so the failure shows the trail.
  return heard.join(' | ');
}

/** A venue's running balance, as the house's own P&L reads it (the founder: the line's as Prime Minister, the works' by its committee seat). */
async function balanceAt(where: string): Promise<number> {
  const f = await founderAt(where);
  try {
    const said = await say(f, 'house pnl');
    // A house nothing has been paid to yet has no account: nothing in its books.
    if (/no house account here/.test(said)) return 0;
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
  await gov.cmd(`house dismiss me at ${HESPER_CO}`);
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
    expect(quay, quay).toMatch(/line from the Hesper/i);
    // ⭐ An exit is a candidate in its own right and describes
    // itself. ⚠ (drive 2026-11-03) Since the paint merge the SHIP is a
    // candidate on the quay she lies at, so the way is CALLED her gangway
    // and `look hesper` is HER — before, the two tied by name and the look
    // prompted *"which target? hesper / the Hesper"*. The way answers to
    // `gangway` (and `go hesper`, whose scope is ways only).
    const her = await say(sailor, 'look hesper');
    expect(her, her).toMatch(/black-hulled ketch/);
    expect(her, her).not.toMatch(/Town Quay/);
    const gangway = await say(sailor, 'look gangway');
    expect(gangway, gangway).toMatch(/A gangway runs up to the Hesper's deck\./);
    // Her lines are made fast round the quay's bollards: the line ashore says so.
    const line = await say(sailor, 'look first line');
    expect(line, line).toMatch(/mooring line comes ashore from the Hesper, made fast round .*bollard/i);
    expectOk(await sailor.cmd('go hesper'));
    expect(await look(sailor)).toMatch(/Hesper's deck/i);
    expectOk(await sailor.cmd('go ashore'));
    expect(await look(sailor)).toMatch(/Town Quay/);
  }, 600_000);

  it('3. (short · staged) a regular alongside the same quay — two ways, each named for its ship; a third, too long for what is left, is sent to the roads and says so', async () => {
    // The Kittiwake's helm: the founder holds the office that appoints her company.
    let f = await founderAt(KETCH_DECK);
    await f.cmd(`house appoint me to master at ${KETCH_CO}`);
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
    await f.cmd(`house appoint me to master at ${COASTER_CO}`);
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
    expect(said, `${said} — from: ${await look(sailor)}`).toMatch(/The harbor office is closed\. Lie in the roads until the office opens/);
  }, 300_000);

  it('7. (instant · player) a ship with no line aboard is refused at the quay: she has no lines to make fast', async () => {
    await stageShip(HESPER, { at: { node: BAR } });
    // (staged) The founder takes her two lines off her bitts.
    const f = await founderAt(HESPER_DECK);
    expectOk(await f.cmd('get "1 mooring line"'));
    expectOk(await f.cmd('get "1 mooring line"'));
    try {
      const refused = await sailor.cmd('course town-quay');
      expectNote(refused, 'controller-rejected', { reason: 'course-refused' });
      expect(squash(await refused.said())).toMatch(/She has no lines to make fast/);
    } finally {
      // Her lines back AT HER BITTS whatever happened (a rope
      // loose on her deck is not one of her lines): step 10 makes fast with them.
      expectOk(await f.cmd('put "mooring line" on bitts'));
      expectOk(await f.cmd('put "mooring line" on bitts'));
      f.close();
    }
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

/* ══════════════════════════ Stage B — the boats ══════════════════════════ */

const SHED = '/world/terminus/harbor/yard/shed';
const YARD = '/world/terminus/harbor/yard/quay';
const CHANDLER = '/world/terminus/harbor/chandler/shop';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const STONE = '/stuff/thing/gear/press-stone';
const AIR_TANK = '/stuff/thing/gear/air-tank';

// ⭐ A name the register has never seen, every run (a kept world is driven
// again; a name already entered is refused, which is step 11's other half).
const tag = (): string =>
  Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
const NAME1 = `Petrel${tag()}`;
const NAME2 = `Fulmar${tag()}`;
const way1 = NAME1.toLowerCase();
const way2 = NAME2.toLowerCase();

const OWNER = uniqueHandle('hbo');
const SECOND = uniqueHandle('hbt');
let owner: Session;
let second: Session;
let ownerName = '';
let secondName = '';
/** The rowboat the second player bought (17), and the weight put in her. */
let rowboat = '';
const stones: string[] = [];

/** The ids of the `kw` things lying here — so a drive names the one it means (`#<id>`). */
async function idsHere(s: Session, kw: string): Promise<string[]> {
  const rows = await s.query(`here:i:${kw}`, { fields: ['displayName'] });
  return rows.map((r) => String((r as { stuffId?: unknown }).stuffId ?? '')).filter((x) => x !== '');
}

/** A player's own name, as others see it (what `give … to` and `title transfer … from` bind). */
async function nameOf(s: Session): Promise<string> {
  const me = await s.query('me', { fields: ['displayName'] });
  return String((me[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
}

/** A funded player at the bank: an account and `amount` in it. */
async function funded(handle: string, amount: number): Promise<void> {
  const s = await session(handle, BANK_HALL);
  expectOk(await s.cmd('bank open'));
  const gov = await founderAt(BANK_HALL);
  expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: harbors stage B funding"`));
  gov.close();
  s.close();
}

/** The prompt envelope's id and its first note, wherever the frame carries them. */
function promptOf(p: unknown): { id: string; kind: string } {
  type Body = { promptId?: string; outcome?: { notes?: Array<{ kind?: string }> } };
  const frame = p as Body & { payload?: Body };
  const body = frame.payload?.promptId ? frame.payload : frame;
  const kind = body.outcome?.notes?.find((n) => n.kind?.startsWith('prompt-'))?.kind ?? '';
  return { id: body.promptId ?? '', kind };
}

/**
 * Run `line` on `s` and answer every prompt that arrives on `asked` (the
 * giver, or the other party a verb asks) with the next of `answers`, in
 * order. ⚠ Polled in short slices that stop when the command resolves: a
 * long `awaitPrompt` left pending would swallow the next command's prompt.
 */
async function withPrompts(s: Session, line: string, answers: string[], asked: Session = s): Promise<{ r: CommandResult; said: string }> {
  await s.drainProse();
  let done = false;
  const left = [...answers];
  // ⚠ One question can arrive on more than one frame: answer each id once
  // (run 3 named the second smack "no" — her name went to the echo).
  const answered = new Set<string>();
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = await asked.awaitPrompt(250).catch(() => null);
      if (p === null || done) continue;
      const { id } = promptOf(p);
      if (!id || answered.has(id)) continue;
      answered.add(id);
      asked.answerPrompt(id, left.shift() ?? 'no');
    }
  })();
  const r = await pending;
  return { r, said: squash(await r.said()) };
}

/** An engaged act run to its end; the prose it ended with (read off the starting command). */
async function act(s: Session, line: string): Promise<{ r: CommandResult; said: string }> {
  await s.drainProse();
  const r = await s.cmd(line);
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) {
    await s.awaitActivity(started.engagementId, 120_000).catch(() => undefined);
    await new Promise((res) => setTimeout(res, 1_500));
  }
  return { r, said: squash(await r.said()) };
}

/**
 * ⭐ One crossing under water (a swim up her hatch, a stroke up or down the
 * column). It takes real seconds and its reply comes BEFORE the move — no
 * engagement note rides it — so wait until you are somewhere else, or the
 * next act is "your hands are already busy" (fresh-DB run 2026-11-04,
 * steps 22–23). The underwater drive's `stroke`, verbatim in shape.
 */
async function cross(s: Session, line: string): Promise<{ r: CommandResult; said: string }> {
  const where = async (): Promise<string> => JSON.stringify(await s.query('here', { fields: 'ref' }));
  const before = await where();
  await s.drainProse();
  let r = await s.cmd(line);
  let said = squash(await r.said());
  // Hands still busy with the act before (putting the tank on is an
  // engaged act too — run 2 of 2026-11-04 went down nowhere): wait it out.
  for (let i = 0; i < 30 && r.status !== 'ok' && /busy/i.test(said); i++) {
    await new Promise((res) => setTimeout(res, 1_000));
    r = await s.cmd(line);
    said = squash(await r.said());
  }
  if (r.status !== 'ok') return { r, said };
  for (let t = 0; t < 120; t++) {
    if ((await where()) !== before) break;
    await new Promise((res) => setTimeout(res, 500));
  }
  return { r, said };
}

/** What the bilge reads, as a sounding rod finds it. */
async function sound(s: Session): Promise<string> {
  return say(s, 'measure bilge');
}

/** Into office hours (6–20) if the clock is outside them — a `short` move. */
async function inOfficeHours(): Promise<void> {
  const now = await worldClockNow();
  const h = ((now % DAY) + DAY) % DAY / 3600;
  if (h < 6.5 || h >= 18) await toHour(7);
}

suite('B1 — owning a ship', () => {
  beforeAll(async () => {
    await funded(OWNER, 6_000);
    await funded(SECOND, 6_000);
    await inOfficeHours();
    owner = await session(OWNER, SHED);
    second = await session(SECOND, SHED);
    // ⭐ Strangers know each other by description only: a key handed and
    // shares sold name their party, so the two buyers meet first (run 3:
    // `title transfer … from <name>` bound nobody — they had never met).
    expectOk(await owner.cmd('introduce'));
    expectOk(await second.cmd('introduce'));
    ownerName = await nameOf(owner);
    secondName = await nameOf(second);
  }, 600_000);

  it('11. (instant · player) at the yard, `buy smack` and name her: she lies at the yard’s quay; the register lists her in your name, 64 shares, under Terminus’ flag', async () => {
    const { r, said } = await withPrompts(owner, 'buy smack', [NAME1]);
    expect(r.status, said).toBe('ok');
    expect(said, said).toMatch(new RegExp(`entered in the register of the City of Terminus as the ${NAME1}, all sixty-four shares in your name, and you are her master`));
    expect(said, said).toMatch(/Her gangway is locked; the key is yours/);
    expectOk(await owner.cmd('go north'));
    const quay = await look(owner);
    expect(quay, quay).toMatch(new RegExp(`Alongside: the ${NAME1}`));
    expect(quay, quay).toMatch(new RegExp(`\\b${way1}\\b`));
    // The register, read at the harbor office.
    expectOk(await owner.cmd('go east'));
    expectOk(await owner.cmd('go east'));
    expectOk(await owner.cmd('go south'));
    const reg = await say(owner, 'read register');
    // ⭐ The register keeps her title — her company — and the company's table beside it.
    expect(reg, reg).toMatch(new RegExp(`The ${NAME1} \\(smack\\), under the flag of the City of Terminus: owned by the ${NAME1}'s company, held [^.]*64/64`));
    expectOk(await owner.cmd('go north'));
    expectOk(await owner.cmd('go west'));
    expectOk(await owner.cmd('go west'));
  }, 600_000);

  it('12. (instant · player) a second player’s smack (a name already entered is refused): her rooms are hers; a locked gangway keeps them off yours, her key lets them aboard, never the helm; locked with them aboard, they can still go ashore', async () => {
    // ⭐ 11's refusal: the name already in the register, then her own.
    const { r, said } = await withPrompts(second, 'buy smack', [NAME1, NAME2]);
    expect(r.status, said).toBe('ok');
    expect(said, said).toMatch(new RegExp(`named ${NAME1} already\\. Another name`));
    expect(said, said).toMatch(new RegExp(`as the ${NAME2}, all sixty-four shares in your name`));
    // ⭐ The yard's hull book had two hulls on the stocks: both are sold, and
    // the yard sells no third (no faucet).
    const book = await say(second, 'look "hull book"');
    expect(book, book).toMatch(/Every hull in it is sold/);
    expect(book, book).toMatch(new RegExp(`Sold off the far stocks: the smack ${NAME2}`));
    const none = await say(second, 'buy smack');
    expect(none, none).toMatch(/The yard has no hull on the stocks/);
    expectOk(await second.cmd('go north'));

    // What you leave in your hold is not in hers.
    expectOk(await owner.cmd(`go ${way1}`));
    expect(await look(owner)).toMatch(/smack's deck/i);
    expectOk(await owner.cmd('go down'));
    expectOk(await owner.cmd('go north'));
    const oakum = await hand(owner, '/stuff/thing/oakum');
    expectOk(await owner.cmd(`drop #${oakum}`));
    expect(await look(owner)).toMatch(/oakum/i);
    expectOk(await owner.cmd('go south'));
    expectOk(await owner.cmd('go up'));
    expectOk(await owner.cmd('go ashore'));
    expectOk(await second.cmd(`go ${way2}`));
    // ⭐ Her gangway left unlocked and her key in her own cabin, so the only
    // key the second player carries from here is the one they are handed.
    expectOk(await second.cmd('unlock ashore'));
    expectOk(await second.cmd('go down'));
    expectOk(await second.cmd('drop key'));
    expectOk(await second.cmd('go north'));
    const theirs = await look(second);
    expect(theirs, theirs).toMatch(/fish hold/i);
    expect(theirs, theirs).not.toMatch(/oakum/i);
    expectOk(await second.cmd('go south'));
    expectOk(await second.cmd('go up'));
    expectOk(await second.cmd('go ashore'));
    expect(await look(second)).toMatch(/yard quay/i);

    // Locked: not aboard without her key.
    const kept = await second.cmd(`go ${way1}`);
    expect(kept.status, squash(await kept.said())).not.toBe('ok');
    // Handed her key: aboard — and still not her helm.
    expectOk(await owner.cmd(`give key to "${secondName}"`));
    expectOk(await second.cmd(`go ${way1}`));
    expect(await look(second)).toMatch(/smack's deck/i);
    const helm = await second.cmd('course roads');
    expectNote(helm, 'controller-rejected', { reason: 'not-her-master' });
    // The key back, ashore; unlocked from the quay, the second player goes
    // aboard; locked behind them, they still go ashore — and cannot return.
    expectOk(await second.cmd('go ashore'));
    expectOk(await second.cmd(`give key to "${ownerName}"`));
    expectOk(await owner.cmd(`unlock "${way1}"`));
    expectOk(await second.cmd(`go ${way1}`));
    expectOk(await owner.cmd(`go ${way1}`));
    const locked = await say(owner, 'lock ashore');
    expect(locked, locked).toMatch(/lock/i);
    const leaves = await second.cmd('go ashore');
    expect(leaves.status, squash(await leaves.said())).toBe('ok');
    expect(await look(second)).toMatch(/yard quay/i);
    const barred = await second.cmd(`go ${way1}`);
    expect(barred.status, squash(await barred.said())).not.toBe('ok');
    expectOk(await owner.cmd('go ashore'));
  }, 600_000);

  it('13. (instant · player) 16 shares sold to the second player at a price both accept: the money and the shares move together; the register shows both owners', async () => {
    const { r, said } = await withPrompts(second, `title transfer 16 shares of ${NAME1} from "${ownerName}" for 400`, ['yes'], owner);
    expect(r.status, said).toBe('ok');
    expect(said, said).toMatch(new RegExp(`You buy 16 of the ${NAME1}'s shares from .* for [^.]*400`));
    // At the office: both owners on her company's table, beside her register entry.
    expectOk(await second.cmd('go east'));
    expectOk(await second.cmd('go east'));
    expectOk(await second.cmd('go south'));
    const reg = await say(second, 'read register');
    expect(reg, reg).toMatch(new RegExp(`The ${NAME1} \\(smack\\)[^.]*48/64`));
    expect(reg, reg).toMatch(new RegExp(`The ${NAME1} \\(smack\\)[^.]*16/64`));
    // Nobody but a shareholder sells: the second player has no shares in hers to sell twice over.
    const none = await withPrompts(owner, `title transfer 16 shares of ${NAME2} from "${ownerName}" for 1`, []);
    expect(none.r.status, none.said).not.toBe('ok');
  }, 600_000);
});

suite('B1 — she keeps across a restart (15)', () => {
  // ⚠ No `afterAll(stopOwnedWorld)`: the rebooted world stays up for the
  // steps after this one (the cleanliness drive's precedent).
  it.skipIf(!isOwnedTestWorld())('15. (instant · player) leave her; she sleeps; restart the server; come back: she is where you left her, with what you left in her', async () => {
    for (const s of open) s.close();
    open.length = 0;
    await new Promise((r) => setTimeout(r, 8_000));
    try {
      copyFileSync(WIRE_LOG, `${WIRE_LOG}.before-restart`);
    } catch {
      /* no log to keep */
    }
    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    // ⭐ A RESTART, not a crash (the sugar soak's precedent): the server gets
    // a minute to capture what it holds. Preflight's default two seconds
    // SIGKILLs it before the shutdown capture — run 1 (2026-11-03) lost the
    // oakum in her hold that way.
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
      env: { ...process.env, PREFLIGHT_GRACE_MS: '60000' },
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    owner = await session(OWNER, YARD);
    second = await session(SECOND, YARD);
    const quay = await look(owner);
    expect(quay, `the yard quay, after a restart: ${quay}`).toMatch(new RegExp(`Alongside: [^.]*the ${NAME1}`));
    // Her way aboard is wired again from the register's `lies`.
    expectOk(await owner.cmd(`go ${way1}`));
    expect(await look(owner)).toMatch(/smack's deck/i);
    expectOk(await owner.cmd('go down'));
    expectOk(await owner.cmd('go north'));
    const hold = await look(owner);
    expect(hold, `her hold, after a restart: ${hold}`).toMatch(/oakum/i);
    expectOk(await owner.cmd('go south'));
    expectOk(await owner.cmd('go up'));
  }, 1_500_000);

  it('16. (staged · player — twin of soak S1) her hull staged worn and her sleep staged long: settled at her berth; her hull reads worn; pump her out', async () => {
    await stageShip(NAME1, { hull: 'worn', sleptDays: 60 });
    const held = await say(owner, 'course bar');
    expect(held, held).toMatch(/settled onto the mud/);
    const survey = await say(owner, 'survey');
    expect(survey, survey).toMatch(/fabric of the place is worn/);
    const full = await sound(owner);
    expect(full, full).toMatch(/full of water almost to her deck|deeper than a man could stand in/);
    // (staged) The water down near her floors, so a few strokes float her
    // (2,600 strokes otherwise, and the packing wears in fifteen).
    await stageShip(NAME1, { bilgeL: 2_850 });
    let heard = '';
    for (let i = 0; i < 6 && !/lifts off the mud/.test(heard); i++) {
      const stroke = await act(owner, 'pump well');
      expect(stroke.r.status, stroke.said).toBe('ok');
      heard += ' ' + stroke.said + ' ' + squash(await owner.listen(1_500));
    }
    expect(heard, heard).toMatch(/over her side/);
    expect(heard, heard).toMatch(/She lifts off the mud and floats again/);
  }, 600_000);
});

suite('B3 — the hull’s decline (at her berth)', () => {
  it('19. (staged · player — twin of soak S1) her caulking staged worn: sound the well — water in the bilge, rising', async () => {
    await stageShip(NAME1, { hull: 'worn', bilgeL: 0, sleptDays: 1 });
    const read = await sound(owner);
    expect(read, read).toMatch(/knee-deep|waist-deep|hand's depth/);
    expect(read, read).toMatch(/rising/);
  }, 300_000);

  it('20. (short · player) `pump well`: the level falls while you work; stop, and it rises', async () => {
    // (staged) The level a hand's breadth over a band's edge, so a few
    // strokes show in the words a sounding gives.
    await stageShip(NAME1, { bilgeL: 2_870 });
    expect(await sound(owner)).toMatch(/knee-deep/);
    let after = '';
    for (let i = 0; i < 6 && !/hand's depth/.test(after); i++) {
      const stroke = await act(owner, 'pump well');
      expect(stroke.said, stroke.said).toMatch(/over her side/);
      after = await sound(owner);
    }
    expect(after, after).toMatch(/hand's depth of water in her bilge/);
    await advanceWorldClock('1 hour');
    const later = await sound(owner);
    expect(later, later).toMatch(/knee-deep/);
    expect(later, later).toMatch(/rising/);
  }, 600_000);
});

suite('B1 — at sea (14)', () => {
  it('14. (short · player) her dues paid, `course bar`; at sea, `government`: the City of Terminus, her flag state', async () => {
    await inOfficeHours();
    // ⚠ A smack owes a day's dues the moment she leaves the yard quay.
    expectOk(await owner.cmd('go ashore'));
    expectOk(await owner.cmd('go east'));
    expectOk(await owner.cmd('go east'));
    expectOk(await owner.cmd('go south'));
    const paid = await say(owner, 'pay office');
    expect(paid, paid).toMatch(/You pay|Nothing (more )?is owed/);
    expectOk(await owner.cmd('go north'));
    expectOk(await owner.cmd('go west'));
    expectOk(await owner.cmd('go west'));
    expectOk(await owner.cmd(`go ${way1}`));
    // ⚠ (drive 2026-11-03) `course bar`, not `course roads`: on the river a
    // course is up, down, or a landing on it — the river takes her out over
    // the bar and "the next course is the sea's" (river D18). The roads are
    // a node of the sea, so naming them from the yard quay was the step's
    // error; she is at sea once she lies off the bar.
    const laid = await say(owner, 'course bar');
    expect(laid, laid).toMatch(/lay a course|under way/i);
    const heard = await comeIn(owner, 18);
    expect(heard, heard).toMatch(/not under way|roads|lies/i);
    const gov = await say(owner, 'government');
    expect(gov, gov).toMatch(/City of Terminus/);
  }, 900_000);
});

suite('B2 — owning a boat', () => {
  it('17. (instant · staged — a chop pinned) a rowboat bought, her bow line in her; loaded she rides lower; overloaded in a chop, she swamps', async () => {
    await inOfficeHours();
    const buyer = await session(SECOND, PUT_IN);
    // ⭐ The house's rowboat, lying on the shingle: sold where she
    // lies — the same boat before and after, hers now.
    const before = await idsHere(buyer, 'rowboat');
    expect(before.length, 'no rowboat of the house\'s on the shingle').toBeGreaterThan(0);
    const bought = await say(buyer, 'buy rowboat');
    expect(bought, bought).toMatch(/You buy .*rowboat/);
    expect(bought, bought).toMatch(/yours where it lies/);
    rowboat = (await idsHere(buyer, 'rowboat')).find((id) => before.includes(id)) ?? '';
    expect(rowboat, 'the rowboat bought is not on the landing').not.toBe('');
    // Finite: the house had one rowboat, and has none now.
    const none = await say(buyer, 'buy rowboat');
    expect(none, none).toMatch(/no rowboat of the house's lying here/);
    const inHer = await say(buyer, `look in #${rowboat}`);
    expect(inHer, inHer).toMatch(/bow line/i);
    // (staged) Weight to load her with — in stones a body can lift back
    // out (step 24 unloads her by hand; a 90 kg stone "doesn't budge").
    for (let i = 0; i < 6; i++) {
      const id = await hand(buyer, STONE, { mass: 30 });
      stones.push(id);
      expectOk(await buyer.cmd(`put #${id} in #${rowboat}`));
    }
    const lower = await say(buyer, `look #${rowboat}`);
    expect(lower, lower).toMatch(/sits lower in the water|riding low/);
    buyer.close();
    // Her own dinghy, put over the side of the smack at sea: light she
    // floats; loaded past her freeboard she swamps.
    // ⚠ (drive 2026-11-04) The CHOP is not staged: the run pinned rain on
    // the roads node, but no Locality covers open water — the sea's weather
    // is the global field, which `testharness weather` cannot pin. The
    // overload half is driven; a wave over a laden dinghy's gunwale is
    // `Boat.reconcileFloat`'s `waveAt` and is covered by its unit tests.
    expect(await look(owner)).toMatch(/smack's deck/i);
    expectOk(await owner.cmd('go dinghy'));
    const afloat = await say(owner, 'launch');
    expect(afloat, afloat).toMatch(/floats/);
    const rides = await say(owner, 'look here');
    expect(rides, rides).not.toMatch(/fills|swamp/i);
    expectOk(await owner.cmd('recover'));
    expectOk(await owner.cmd('go out'));
    // ⚠ (drive 2026-11-04) Past her freeboard with no chop to help: her
    // 0.4 m of freeboard over 3.7 × 1.3 m of waterline is ~1,350 kg, so
    // sixteen 90 kg stones (and their owner) put her under — four only
    // took 0.13 m.
    for (let i = 0; i < 16; i++) {
      const id = await hand(owner, STONE, { mass: 90 });
      expectOk(await owner.cmd(`put #${id} in dinghy`));
    }
    expectOk(await owner.cmd('go dinghy'));
    const swamped = await say(owner, 'launch');
    const seen = `${swamped} ${squash(await owner.listen(3_000))} ${await look(owner)}`;
    expect(seen, seen).toMatch(/fills|swamp|over her gunwale|loaded past/i);
    // Back aboard her, whatever the water did.
    if (!/smack's deck/i.test(await look(owner))) {
      // ⚠ (drive 2026-11-04) Out of the water up her side is a SWIM (the
      // way's media are water and vertical; `go` walks and is refused).
      const back = await owner.cmd(`swim ${way1}`);
      if (back.status !== 'ok') await owner.cmd('go out');
    }
    expect(await look(owner)).toMatch(/smack's deck/i);
  }, 600_000);

  it('18. (instant · player) a canoe hired from Ada Fenn for two days: two days’ money, taken at hire; paddled off; returned', async () => {
    await inOfficeHours();
    const hirer = await session(SECOND, PUT_IN);
    const canoe = (await idsHere(hirer, 'canoe'))[0] ?? '';
    expect(canoe, 'no canoe on the shingle').not.toBe('');
    const hired = await say(hirer, `rent #${canoe} for 2 days`);
    expect(hired, hired).toMatch(/You hire (a|the) canoe for 2 days/);
    expect(hired, hired).toMatch(/\([^)]*\b6(\.00)?\b[^)]*\)/);
    const page = await say(hirer, 'look "hire book"');
    expect(page, page).toMatch(/For hire: /);
    expect(await say(hirer, `look #${canoe}`)).toMatch(/hire/i);
    expectOk(await hirer.cmd(`go #${canoe}`));
    const launched = await say(hirer, 'launch');
    expect(launched, launched).toMatch(/floats/);
    const off = await act(hirer, 'paddle upstream');
    expect(off.r.status, off.said).toBe('ok');
    const back = await say(hirer, 'recover');
    expect(back, back).toMatch(/comes up out of the water/);
    expectOk(await hirer.cmd('go out'));
    const after = await say(hirer, 'look "hire book"');
    expect(after, after).not.toMatch(/Written under it/);
    expect(await say(hirer, `look #${canoe}`)).not.toMatch(/on hire/i);
    hirer.close();
  }, 600_000);
});

suite('B3 — she goes down', () => {
  it('21. (short · staged — twin of soak S2; the bilge staged near the line) the lowest rooms flood, then the next; told she is settling, with time to act; she goes down', async () => {
    // ⚠ (drive 2026-11-04) 33,850 L, not 33,000: a smack's bilge holds
    // 9 × 3 × 0.7 × 1.8 m³ = 34,020 L and a worn hull lets in 130 L an hour,
    // so the step's four hours never filled 33,000 to her deck.
    await stageShip(NAME1, { hull: 'worn', bilgeL: 33_850 });
    // Her lowest rooms are flooded; her deck is dry.
    expectOk(await owner.cmd('go down'));
    const cabin = await look(owner);
    expect(cabin, cabin).toMatch(/water (stands|is up to|here is over)/i);
    expectOk(await owner.cmd('go up'));
    const deck = await look(owner);
    expect(deck, deck).not.toMatch(/Water (stands|sloshes)|over your head/);
    // Let it go: the deck goes under, and she says so.
    let told = '';
    for (let i = 0; i < 16 && !/She is settling/.test(told); i++) {
      const hearing = owner.listen(6_000);
      await advanceWorldClock('15 minutes');
      told += ' ' + squash(await hearing);
    }
    expect(told, told).toMatch(/She is settling\. The water is at her deck, and she will not float much longer/);
    // ⭐ Time to act: these are acts, and she has not gone yet.
    expectOk(await owner.cmd('look'));
    expectOk(await owner.cmd('inhale'));
    const hearing = owner.listen(15_000);
    for (let i = 0; i < 6; i++) await owner.cmd('look');
    const gone = squash(await hearing);
    expect(gone, gone).toMatch(/She goes down under you/);
  }, 900_000);

  it('22. (instant · player) still aboard, you are in her rooms under water; swim up the column to the surface', async () => {
    const under = await look(owner);
    expect(under, under).toMatch(/She lies on the bottom, and the sea fills her/);
    // ⚠ (drive 2026-11-04) `swim up`, as the step says: `go` walks, and
    // under water the way up answers "you'll have to swim" — honestly.
    // A crossing under water costs real seconds (an engaged act): each is
    // waited out, or the next is "your hands are already busy" (run 9).
    const up = await cross(owner, 'swim up');
    expect(up.r.status, up.said).toBe('ok');
    let top = '';
    for (let i = 0; i < 10; i++) {
      const { r, said } = await cross(owner, 'ascend');
      if (r.status !== 'ok') {
        top = said;
        break;
      }
    }
    expect(top, top).toMatch(/already at the surface/i);
  }, 600_000);

  it('23. (instant · player) a diver goes down to her: the wreck is the ship — her rooms, her cargo in the hold — and she is still in your name in the register', async () => {
    // (staged) The diver's kit, handed.
    const tank = await hand(owner, AIR_TANK);
    const worn = await act(owner, `wear #${tank}`);
    expect(worn.r.status, worn.said).toBe('ok');
    for (let i = 0; i < 10; i++) {
      const { r } = await cross(owner, 'descend');
      if (r.status !== 'ok') break;
    }
    const bed = await look(owner);
    expect(bed, bed).toMatch(new RegExp(`\\b${way1}\\b`));
    // Into her from the water around her: a swim, as up her side is.
    const aboard = await cross(owner, `swim ${way1}`);
    expect(aboard.r.status, aboard.said).toBe('ok');
    expect(await look(owner)).toMatch(/smack's deck/i);
    // Her rooms are under water too: each way through them is a swim
    // (`go` is over your head) and a crossing that takes its seconds.
    for (const way of ['swim down', 'swim north']) {
      const step = await cross(owner, way);
      expect(step.r.status, step.said).toBe('ok');
    }
    const hold = await look(owner);
    expect(hold, hold).toMatch(/oakum/i);
    expect(hold, hold).toMatch(/sea fills her/);
    const clerk = await session(SECOND, OFFICE);
    const reg = await say(clerk, 'read register');
    expect(reg, reg).toMatch(new RegExp(`The ${NAME1} \\(smack\\)[^.]*48/64`));
    clerk.close();
  }, 600_000);

  it('24. (short · player) a boat holed on a grounding leaks: `bail` keeps her up; stop, and she sinks with what is in her', async () => {
    await inOfficeHours();
    const boatman = await session(uniqueHandle('hbb'), PUT_IN);
    // Her load out on the shingle; the bow line stays in her.
    // ⚠ (drive 2026-11-03) One stone at a time: six 30 kg stones held at
    // once are 180 kg, and the seventh lift "won't budge" — the step's
    // error, not the boat's.
    for (const id of stones) {
      expectOk(await boatman.cmd(`get #${id} from #${rowboat}`));
      expectOk(await boatman.cmd(`drop #${id}`));
    }
    // (staged) The grounding's blow: a hole stove in her. ⚠ (drive
    // 2026-11-04) The run staged it with `eval --parcel /world/terminus …
    // addFlaw` on the second player's rowboat, and the sandbox refused it:
    // a player's titled boat is not in the founder's jurisdiction, as it
    // should not be. The hole is staged in a boat of the boatman's own,
    // handed holed — the same act on the water, with what is in her.
    const now = await worldClockNow();
    const holedBoat = await hand(boatman, '/system/transport/thing/rowboat', {
      flaws: [{ kind: 'holed', visible: true, atS: now }],
    });
    // (A boat is handed where you stand, never into your hands.)
    expectOk(await boatman.cmd(`get #${stones[0]}`));
    expectOk(await boatman.cmd(`put #${stones[0]} in #${holedBoat}`));
    rowboat = holedBoat;
    expectOk(await boatman.cmd(`go #${rowboat}`));
    expect(await say(boatman, 'launch')).toMatch(/floats/);
    await advanceWorldClock('10 minutes');
    let bailed = '';
    for (let i = 0; i < 3; i++) bailed += ' ' + (await act(boatman, `bail #${rowboat}`)).said;
    expect(bailed, bailed).toMatch(/bucketful of water out over her side/);
    expect(bailed, bailed).toMatch(/going down|She is dry/);
    // Stop: she fills, and goes down with what is in her.
    // ⚠ (drive 2026-11-04) Listened for in slices: one three-hour jump took
    // four minutes to drain, and a ten-second ear heard none of it.
    let heardSink = '';
    for (let i = 0; i < 10 && !/goes down under you|You are in the water/.test(heardSink); i++) {
      const hearing = boatman.listen(6_000);
      await advanceWorldClock('18 minutes');
      heardSink += ' ' + squash(await hearing);
    }
    const sank = `${heardSink} ${await look(boatman)}`;
    expect(sank, sank).toMatch(/goes down under you|You are in the water/);
    boatman.close();
  }, 600_000);

  it('25. (instant · player) `maintain` her hull with a caulker’s kit from the chandler: the leak stops, the hull reads sound; mooring, pumping and handling her counted toward seamanship', async () => {
    await inOfficeHours();
    const caulker = await session(SECOND, CHANDLER);
    const kit = await say(caulker, "buy caulker's kit");
    expect(kit, kit).toMatch(/You buy .*caulker's kit/);
    expectOk(await caulker.cmd('go northeast'));
    expectOk(await caulker.cmd('go west'));
    expectOk(await caulker.cmd('go west'));
    // Her own smack, worn: the leak stops and the hull reads sound.
    await stageShip(NAME2, { hull: 'worn', bilgeL: 0 });
    // Her gangway was left unlocked (12), her key in her cabin.
    expectOk(await caulker.cmd(`go ${way2}`));
    expect(await sound(caulker)).toMatch(/rising/);
    const done = await act(caulker, 'maintain');
    expect(done.r.status, done.said).toBe('ok');
    expect(done.said, done.said).toMatch(/seams/);
    const survey = await say(caulker, 'survey');
    expect(survey, survey).toMatch(/fabric of the place is sound/);
    const after = await sound(caulker);
    expect(after, after).toMatch(/not rising|dry/);
    // The owner moored, pumped and handled hers: seamanship on the transcript.
    const comp = await say(owner, 'competence');
    expect(comp, comp).toMatch(/seamanship/i);
    caulker.close();
  }, 600_000);
});
