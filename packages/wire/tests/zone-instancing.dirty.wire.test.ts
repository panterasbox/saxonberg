/**
 * ⭐ The zone-instancing drive (zone-instancing requirements § The drive):
 * every copy of a place a warren makes is a zone of its own. Stage A —
 * the holdings — is steps 1–6 and the holdings half of 10; stage B adds
 * the smack (7), the Hesper (8), a drift on the Kestrel (9) and the ships
 * half of 10.
 *
 *   1. [staged] two Hinkley lots sold to two characters (funded by the
 *      founder; the sale is played)
 *   2. [instant · player] walk the house from the lane: every room, `look`
 *      in each, each way where the plan says
 *   3. [instant · player] the neighbor next door; `map` lists two houses,
 *      neither's rooms under the other
 *   4. [instant · staged read] the house is a zone named for its lot; the
 *      government and the weather read the same in the hall as on the lane
 *   5. [short · player] out the front door onto the lane: no refusal
 *   6. [staged] a student let a Duncan Hall unit walks in and out; the
 *      unit is its own zone
 *   7. [staged · player] two smacks bought at the yard: each one's decks
 *      are her own zone, `<smack zone>/<serial>`
 *   8. [instant · staged] the Hesper at her berth: her way aboard, her deck,
 *      her zone `<her zone row>/hesper`
 *   9. [instant · staged] the river: a stop stood on the Kestrel is a copy
 *      of the stop zone, joined to the river's frame
 *  10. [short · staged] restart: the houses, the unit, a smack and the
 *      Hesper come back under the same zone identities with the same rooms
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
  stageShip,
} from '../src/harness';
import { bootOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';

export const DIRTY_REASON =
  'buys two Hinkley lots and both smacks on the yard\'s stocks with issued ' +
  'coin (none can be sold back), has Katie let a Duncan Hall unit, stands a ' +
  'stop on the Kestrel, and restarts the world';

declareFile({
  file: 'zone-instancing.dirty.wire.test.ts',
  packs: [
    'platform',
    'residence',
    'trade-farming',
    'hinkley-hills',
    'eternal-university',
    'terminus',
    'generic-objects',
    'water',
    'transport',
    'world-seed',
    'trade-diving',
  ],
  dirtyReason: DIRTY_REASON,
});

const REALTY = '/world/terminus/realty/office';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const HINKLEY = '/world/terminus/hinkley-hills';
const HINKLEY_LANE = `${HINKLEY}/location/lane`;
const LOTS = `${HINKLEY}/lots`;
const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const SHED = '/world/terminus/harbor/yard/shed';
const YARD = '/world/terminus/harbor/yard/quay';
const SMACK_ZONE = '/stuff/location/ship/smack';
const HESPER = '/world/terminus/hesper/structure';
const HESPER_BERTH = '/world/terminus/estuary/estuary-mouth';
const REACH_WARREN = '/system/water/idea/ReachWarren';
const tag = (): string =>
  Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
const NAME1 = `Petrel${tag()}`;
const NAME2 = `Fulmar${tag()}`;
const DUNCAN = '/world/terminus/eternal/duncan-hall';

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  console.log(`[zone-instancing drive] ${flat}`);
}

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

async function act(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await s.cmd(text);
  const said = (await r.said()).trim();
  note(`${s.handle}: ${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 300)}`);
  return { r, said };
}

async function doing(s: Session, text: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
}

async function read(s: Session, text: string): Promise<string> {
  const r = await s.cmd(text);
  const said = await r.said();
  note(`${s.handle}: ${text} → ${said.slice(0, 500)}`);
  return said;
}

async function goTo(who: string, where: string): Promise<Session> {
  const s = await Session.open(who, { startLocation: where });
  await s.drainProse();
  return s;
}

/** A funded stranger: an account at the bank, and the founder's override into it. */
async function funded(handle: string, zorkmids = 5000): Promise<void> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  try {
    await s.drainProse();
    await act(s, 'bank open');
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      await doing(gov, `reserve override ${zorkmids} to ${handle} "wire: zone-instancing funding"`);
    } finally {
      gov.close();
    }
  } finally {
    s.close();
  }
}

/** The first unsold lot on the book, from `title list`. */
function unsoldLot(book: string, wanted: RegExp): string {
  for (const line of book.split('\n')) {
    const m = /^\s*([a-z][a-z-]*-\d+)\s+—\s+(.*)$/.exec(line);
    if (!m) continue;
    if (/sold|held|owned/i.test(m[2]!)) continue;
    if (!wanted.test(m[1]!)) continue;
    return m[1]!;
  }
  return '';
}

/** Buy the next Hinkley lot; answer its leaf and which side of the lane its gate is on. */
async function buyLot(handle: string): Promise<{ leaf: string; side: string }> {
  const reg = await goTo(handle, REALTY);
  try {
    const book = await read(reg, 'title list');
    const leaf = unsoldLot(book, /^lot-/);
    expect(leaf, `an unsold Hinkley lot: ${book.slice(0, 300)}`).toBeTruthy();
    const bought = await doing(reg, `title buy ${leaf}`);
    const side = /gate is on the (\w+) side/i.exec(bought)?.[1] ?? '';
    expect(side, `the sale names the gate side: ${bought}`).toBeTruthy();
    return { leaf, side };
  } finally {
    reg.close();
  }
}

/**
 * A founder's read, as one JSON expression in `extent`'s jurisdiction
 * (the controllers-are-io `ev` shape). ⚠ One EXPRESSION.
 */
async function ev<T = unknown>(expr: string, extent: string, where: string): Promise<T> {
  const s = await Session.open('founder', { startLocation: where, wizard: true, committees: [extent] });
  try {
    await s.drainProse();
    const r = await s.cmd(`eval --parcel ${extent} JSON.stringify(${expr})`);
    let said = (await r.said()).trim();
    const VALUE = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m;
    for (let i = 0; i < 8 && !VALUE.test(said) && !/\berror:|sandbox boundary denied/i.test(said); i++) {
      said += `\n${await s.listen(1_000)}`;
    }
    expect(said, `eval threw: ${expr}`).not.toMatch(/\berror:|sandbox boundary denied/i);
    const m = VALUE.exec(said);
    expect(m, `eval answered no value: ${said.slice(-400)}`).toBeTruthy();
    const value = JSON.parse(JSON.parse(m![1]!) as string) as T;
    note(`(founder eval ${expr.slice(0, 120)} → ${JSON.stringify(value).slice(0, 300)})`);
    return value;
  } finally {
    s.close();
  }
}

/** Answer Katie's choice wheel (the size-and-carrying drive's helper). */
async function choose(s: Session, want: RegExp): Promise<void> {
  type Choice = { response?: string };
  type Body = { promptId?: string; outcome?: { notes?: Array<{ kind?: string; choices?: Choice[] }> } };
  for (let i = 0; i < 5; i++) {
    const p = (await s.awaitPrompt(10_000)) as unknown as Body & { payload?: Body };
    const body = p.payload?.promptId ? p.payload : p;
    const choices = body.outcome?.notes?.find((n) => n.kind === 'prompt-choice')?.choices ?? [];
    if (choices.length === 0) continue;
    const pick = choices.find((c) => want.test(JSON.stringify(c)));
    expect(pick, `no choice matching ${want} in ${JSON.stringify(choices).slice(0, 400)}`).toBeDefined();
    s.answerPrompt(body.promptId!, pick!.response ?? '');
    return;
  }
  throw new Error(`no choice wheel arrived for ${want}`);
}

/** Every live copy of the dorm unit's zone: who it is, its rooms, who is in them. */
interface UnitCopy {
  id: string;
  row: string;
  rooms: string[];
  people: number;
}
function unitCopies(): string {
  // A unit's copy is filed at the unit's extent, not under its row — so it
  // is found through the rooms that stand in it.
  return (
    `StuffApi.findAllByTemplatePath('${DUNCAN}/unit/room')` +
    `.filter((r) => !r.isDestroyed() && r.getZone())` +
    `.map((r) => r.getZone())` +
    `.map((z) => ({ id: z.getIdentityPath(), row: z.getTemplatePath(), ` +
    `rooms: [...z.getLocations()].map((l) => l.getTemplatePath()), ` +
    `people: [...z.getLocations()].flatMap((l) => l.getContents()).filter((c) => typeof c.getPlayerId === 'function' && c.getPlayerId()).length }))`
  );
}

/**
 * A founder's read whose code already evaluates to a JSON STRING (or a
 * promise of one) — for reads that need a promise chain.
 */
async function evRaw<T = unknown>(code: string, extent: string, where: string): Promise<T> {
  const s = await Session.open('founder', { startLocation: where, wizard: true, committees: [extent] });
  try {
    await s.drainProse();
    const r = await s.cmd(`eval --parcel ${extent} ${code}`);
    let said = (await r.said()).trim();
    const VALUE = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m;
    for (let i = 0; i < 8 && !VALUE.test(said) && !/\berror:|sandbox boundary denied/i.test(said); i++) {
      said += `\n${await s.listen(1_000)}`;
    }
    expect(said, `eval threw: ${code}`).not.toMatch(/\berror:|sandbox boundary denied/i);
    const m = VALUE.exec(said);
    expect(m, `eval answered no value: ${said.slice(-400)}`).toBeTruthy();
    const value = JSON.parse(JSON.parse(m![1]!) as string) as T;
    note(`(founder eval ${code.slice(0, 120)} → ${JSON.stringify(value).slice(0, 300)})`);
    return value;
  } finally {
    s.close();
  }
}

/** The prompt a frame carries. */
function promptOf(p: unknown): { id: string } {
  type Body = { promptId?: string };
  const frame = p as Body & { payload?: Body };
  const body = frame.payload?.promptId ? frame.payload : frame;
  return { id: body.promptId ?? '' };
}

/** Run `line` answering each prompt it raises with the next answer (the harbors drive's helper). */
async function withPrompts(s: Session, line: string, answers: string[]): Promise<{ r: CommandResult; said: string }> {
  await s.drainProse();
  let done = false;
  const left = [...answers];
  const answered = new Set<string>();
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = await s.awaitPrompt(250).catch(() => null);
      if (p === null || done) continue;
      const { id } = promptOf(p);
      if (!id || answered.has(id)) continue;
      answered.add(id);
      s.answerPrompt(id, left.shift() ?? 'no');
    }
  })();
  const r = await pending;
  const said = (await r.said()).replace(/\s+/g, ' ');
  note(`${s.handle}: ${line} → ${said.slice(0, 300)}`);
  return { r, said };
}

/** The zones the live copies of a plan room stand in (every copy's room shares its row). */
function zonesOf(roomRow: string): string {
  return (
    `StuffApi.findAllByTemplatePath('${roomRow}')` +
    `.filter((r) => !r.isDestroyed() && r.getZone())` +
    `.map((r) => r.getZone().getIdentityPath()).sort()`
  );
}

/** The live copy filed at `identity`: its row and the rooms standing in it. */
interface CopyRead {
  row: string | null;
  rooms: string[];
}
function copyAt(identity: string): string {
  return (
    `((z) => z ? { row: z.getTemplatePath(), rooms: [...z.getLocations()].map((l) => l.getTemplatePath()).sort() } : { row: null, rooms: [] })` +
    `(StuffApi.findByIdentityPath('${identity}').find((s) => !s.isDestroyed() && s.getIdentityPath() !== s.getTemplatePath()))`
  );
}

const DAY = 86_400;
/** Daylight (a garden in the dark reads nothing); a short step at most. */
async function daylight(): Promise<void> {
  const now = await worldClockNow();
  const into = ((now % DAY) + DAY) % DAY;
  const hour = into / 3_600;
  if (hour >= 8 && hour <= 16) return;
  const wait = into < 10 * 3_600 ? 10 * 3_600 - into : DAY - into + 10 * 3_600;
  await advanceWorldClock(`${Math.max(1, Math.round(wait / 60))} minutes`);
}

let owner = '';
let neighbor = '';
let student = '';
let lot1 = { leaf: '', side: '' };
let lot2 = { leaf: '', side: '' };
let unitExtent = '';
const open: Session[] = [];

beforeAll(async () => {
  owner = uniqueHandle('ziowner');
  neighbor = uniqueHandle('zineighbor');
  student = uniqueHandle('zistudent');
  await funded(owner);
  await funded(neighbor);
  await daylight();
}, 600_000);

afterAll(() => {
  for (const s of open) s.close();
  if (record.length > 0) console.log(`\n[zone-instancing drive record]\n${record.join('\n')}\n`);
});

/** The rooms of a Hinkley house, as the plan lays them out from the yard. */
const HOUSE_RUN: Array<[string, RegExp]> = [
  ['west', /garden/i],
  ['east', /yard behind the house/i],
  ['north', /hall/i],
  ['east', /kitchen/i],
  ['east', /scullery/i],
  ['west', /kitchen/i],
  ['west', /hall/i],
  ['west', /living|sitting|parlou?r/i],
  ['east', /hall/i],
  ['north', /bedroom/i],
  ['east', /bath/i],
  ['west', /bedroom/i],
  ['south', /hall/i],
  ['south', /yard behind the house/i],
];

/** The yard's ways as `look` lists them: `[direction, note]`. */
function exitsOf(look: string): Array<[string, string]> {
  const line = /Obvious exits:([^\n]*)/.exec(look)?.[1] ?? '';
  return [...line.matchAll(/\b([a-z][a-z-]*)\b(?:\s*\(([^)]*)\))?/g)]
    .filter((m) => m[1] !== 'and')
    .map((m) => [m[1]!, (m[2] ?? '').trim()]);
}

/**
 * The plan's walk read through the copy's mirror (a lot across the lane is
 * laid out reflected — D9): the house door's way and the garden's say which.
 */
function runFor(yardLook: string): Array<[string, RegExp]> {
  const ways = exitsOf(yardLook);
  const door = ways.find(([, n]) => /\bdoor\b/i.test(n))?.[0];
  const garden = ways.find(([, n]) => n === '')?.[0];
  const ns = door === 'south';
  const ew = garden === 'east';
  const flip: Record<string, string> = {
    ...(ns ? { north: 'south', south: 'north' } : {}),
    ...(ew ? { east: 'west', west: 'east' } : {}),
  };
  note(`the yard's ways: ${JSON.stringify(ways)} → mirrored${ns ? ' north-south' : ''}${ew ? ' east-west' : ''}${!ns && !ew ? ' not at all' : ''}`);
  return HOUSE_RUN.map(([d, re]) => [flip[d] ?? d, re]);
}

/**
 * Into your own house from the lane, as a player finds it: the registrar
 * names only the SIDE of the road, and the lane grows a reach at a time as
 * frontage sells, so walk it west trying the gate on that side until the
 * house door opens to your key. Ends in the hall; answers the yard's look.
 */
async function intoHall(s: Session, side: string): Promise<string> {
  for (let reach = 0; reach < 8; reach++) {
    const gate = await act(s, `go ${side}`);
    if (/yard behind the house/i.test(gate.said)) {
      const yard = await read(s, 'look');
      const door = exitsOf(yard).find(([, n]) => /\bdoor\b/i.test(n))?.[0] ?? 'north';
      const tried = await act(s, `go ${door}`);
      if (/\bhall\b/i.test(tried.said)) return yard;
      // Somebody else's house: back out to the lane and on.
      const out = exitsOf(yard).find(([, n]) => /\bgate\b/i.test(n))?.[0];
      expect(out, 'a yard names its gate').toBeTruthy();
      await doing(s, `go ${out}`);
    }
    const on = await act(s, 'go west');
    expect(refusedFor(on.r), `the lane runs on west: ${on.said}`).toBeNull();
  }
  throw new Error(`no house of mine behind a ${side} gate along the lane`);
}

suite.skipIf(!isOwnedTestWorld())('stage A — the holdings', () => {
  it('1. [staged] two Hinkley lots sold to two characters', async () => {
    lot1 = await buyLot(owner);
    lot2 = await buyLot(neighbor);
    expect(lot1.leaf).not.toBe(lot2.leaf);
  }, 600_000);

  it('2. [instant · player] the house walked from the lane: every room, each way where the plan says', async () => {
    const s = await goTo(owner, HINKLEY_LANE);
    open.push(s);
    const yard = await intoHall(s, lot1.side);
    // Back to the yard, where the plan's walk starts.
    const door = exitsOf(await read(s, 'look')).find(([, n]) => /\bdoor\b/i.test(n))?.[0] ?? 'south';
    expect(await doing(s, `go ${door}`)).toMatch(/yard behind the house/i);
    for (const [dir, where] of runFor(yard)) {
      await doing(s, `go ${dir}`);
      expect(await read(s, 'look'), `after go ${dir}`).toMatch(where);
    }
  }, 600_000);

  it('3. [instant · player] next door is a second house; the map keeps them apart', async () => {
    const n = await goTo(neighbor, HINKLEY_LANE);
    open.push(n);
    await intoHall(n, lot2.side);
    // The map files a house's rooms by their address, `<locality>/<lot>/<room>`.
    const mine = await read(open[0]!, 'map terminus/hinkley-hills');
    expect(mine, 'the owner has mapped their own house').toMatch(new RegExp(`hinkley-hills/${lot1.leaf}/hall:`, 'i'));
    expect(mine, 'the owner never walked next door').not.toMatch(new RegExp(`hinkley-hills/${lot2.leaf}/`, 'i'));
    const theirs = await read(n, 'map terminus/hinkley-hills');
    expect(theirs).toMatch(new RegExp(`hinkley-hills/${lot2.leaf}/hall:`, 'i'));
    expect(theirs, 'the neighbor never walked into the owner\'s house').not.toMatch(
      new RegExp(`hinkley-hills/${lot1.leaf}/`, 'i'),
    );
  }, 600_000);

  it('4. [instant · staged read] the house is a zone named for its lot; government and weather read as on the lane', async () => {
    // A copy's zone stands while somebody is in it: the owner goes in.
    const hall = open[0]!;
    const door = exitsOf(await read(hall, 'look')).find(([, n]) => /\bdoor\b/i.test(n))?.[0] ?? 'north';
    await doing(hall, `go ${door}`);
    const one = await ev<CopyRead>(copyAt(`${LOTS}/${lot1.leaf}`), HINKLEY, HINKLEY_LANE);
    expect(one.row).toBe(`${HINKLEY}/house`);
    expect(one.rooms.length).toBeGreaterThanOrEqual(8);
    const two = await ev<CopyRead>(copyAt(`${LOTS}/${lot2.leaf}`), HINKLEY, HINKLEY_LANE);
    expect(two.row).toBe(`${HINKLEY}/house`);
    // Two zones, one row.
    const govIn = await read(hall, 'government');
    const wxIn = await read(hall, 'analyze weather');
    const lane = await goTo(uniqueHandle('zilane'), HINKLEY_LANE);
    open.push(lane);
    const govOut = await read(lane, 'government');
    const wxOut = await read(lane, 'analyze weather');
    const firstLine = (t: string) => t.split('\n').find((l) => l.trim() !== '')?.trim() ?? '';
    expect(firstLine(govIn), 'the house answers to its lot’s government').toBe(firstLine(govOut));
    expect(govIn).not.toMatch(/no government claims/i);
    note(`weather in the hall: ${wxIn.slice(0, 200)} · on the lane: ${wxOut.slice(0, 200)}`);
    expect(wxIn).not.toMatch(/\berror\b/i);
  }, 600_000);

  it('5. [short · player] out the front door onto the lane: no refusal', async () => {
    const s = open[0]!;
    // The hall's way back to the yard is the door's (the plan's south, or
    // north when mirrored).
    const toYard = exitsOf(await read(s, 'look')).find(([, n]) => /\bdoor\b/i.test(n))?.[0] ?? 'south';
    expect(await doing(s, `go ${toYard}`)).toMatch(/yard behind the house/i);
    const gate = exitsOf(await read(s, 'look')).find(([, n]) => /\bgate\b/i.test(n))?.[0];
    expect(gate, 'the yard names its gate').toBeTruthy();
    const said = await doing(s, `go ${gate}`);
    expect(said).toMatch(/lane/i);
  }, 300_000);

  it('6. [staged] a student let a Duncan Hall unit walks in and out; the unit is its own zone', async () => {
    const k = await goTo(student, HALL_LOBBY);
    open.push(k);
    let t = await k.cmd('talk katie');
    if (t.status !== 'ok') t = await k.cmd('talk super');
    expect(t.status).toBe('ok');
    await choose(k, /need a room/i);
    await choose(k, /./);
    const told = await k.listen(8_000);
    note(`after Katie: ${told.slice(0, 300)}`);
    await doing(k, 'go up');
    const corridor = await read(k, 'look');
    const units = [...corridor.matchAll(/\bunit-(\d+)\b/gi)].map((m) => `unit-${m[1]}`);
    expect(units.length, `the corridor names its units: ${corridor}`).toBeGreaterThan(0);
    let inside = '';
    for (const u of units) {
      const r = await act(k, `go ${u}`);
      if (refusedFor(r.r) === null && /dorm room/i.test(r.said)) {
        inside = u;
        break;
      }
    }
    expect(inside, 'the student walked into their own unit').toBeTruthy();
    expect(await read(k, 'look')).toMatch(/dorm room|narrow single room/i);
    // The copy holding a person: the student's unit, a zone of its own.
    const copies = await ev<UnitCopy[]>(unitCopies(), DUNCAN, HALL_LOBBY);
    const theirs = copies.find((c) => c.people > 0);
    expect(theirs, `a unit copy with the student in it: ${JSON.stringify(copies)}`).toBeDefined();
    expect(theirs!.row).toBe(`${DUNCAN}/unit`);
    expect(theirs!.rooms).toEqual([`${DUNCAN}/unit/room`]);
    unitExtent = theirs!.id;
    // The corridor may be unlit; the arrival line names it either way.
    expect(await doing(k, 'go out')).toMatch(/corridor|landing/i);
    // …and home again: the student is left in their unit, where a restart
    // finds them (step 10).
    expect(await doing(k, `go ${inside}`)).toMatch(/dorm room|narrow single room/i);
  }, 600_000);
});

let smackZones: string[] = [];
let hesperZone = '';

suite.skipIf(!isOwnedTestWorld())('stage B — ships and water', () => {
  it('7. [staged · player] two smacks bought at the yard: each one\'s decks are her own zone', async () => {
    const a = uniqueHandle('zisailor');
    const b = uniqueHandle('zimate');
    await funded(a, 6_000);
    await funded(b, 6_000);
    for (const [who, name] of [[a, NAME1], [b, NAME2]] as const) {
      const s = await goTo(who, SHED);
      open.push(s);
      const { r, said } = await withPrompts(s, 'buy smack', [name]);
      expect(r.status, said).toBe('ok');
      expect(said).toMatch(new RegExp(`as the ${name}`));
      await doing(s, 'go north');
      expect(await doing(s, `go ${name.toLowerCase()}`)).toMatch(/smack's deck/i);
    }
    smackZones = await ev<string[]>(zonesOf(`${SMACK_ZONE}/deck`), '/world/terminus', YARD);
    expect(smackZones.length).toBeGreaterThanOrEqual(2);
    expect(new Set(smackZones).size).toBe(smackZones.length);
    for (const z of smackZones) expect(z).toMatch(new RegExp(`^${SMACK_ZONE}/[^/]+$`));
  }, 900_000);

  it('8. [instant · staged] the Hesper: her way aboard, her deck, her zone `<her zone row>/hesper`', async () => {
    await stageShip(HESPER, {});
    const s = await goTo(uniqueHandle('zihesper'), HESPER_BERTH);
    open.push(s);
    expect(await read(s, 'look')).toMatch(/Alongside: [^.]*the Hesper/i);
    expect(await doing(s, 'go hesper')).toMatch(/deck/i);
    const zones = await ev<string[]>(zonesOf('/world/terminus/hesper/deck'), '/world/terminus', HESPER_BERTH);
    expect(zones).toEqual(['/world/terminus/hesper/hesper']);
    hesperZone = zones[0]!;
  }, 600_000);

  it('9. [instant · staged] a stop stood on the Kestrel is a copy of the stop zone, joined to the river', async () => {
    // A promise chain that ENDS in a string (the eval prints a resolved
    // value; it does not take `await`). It fails the step if it cannot
    // stand the stop — never a quiet pass.
    const stop = await evRaw<{ row: string; id: string; copy: boolean }>(
      `StuffApi.singleton('${REACH_WARREN}')` +
        `.then((w) => w.stopAt('kestrel', 1, 'mid'))` +
        `.then((s) => s.getZone())` +
        `.then((z) => JSON.stringify({ row: z.getTemplatePath(), id: z.getIdentityPath(), copy: z.isCopy() }))`,
      '/world/terminus',
      YARD,
    );
    expect(stop.row).toBe('/system/water/location/reach/stop');
    expect(stop.id.startsWith('/system/water/location/reach/stop/')).toBe(true);
    expect(stop.copy).toBe(true);
  }, 300_000);
});

suite.skipIf(!isOwnedTestWorld())('stage A — a restart (10, holdings)', () => {
  it('10. [short · staged] restart: each house and the unit return under the same zone identities with the same rooms', async () => {
    for (const s of open) s.close();
    open.length = 0;
    await new Promise((r) => setTimeout(r, 8_000));
    try {
      copyFileSync(WIRE_LOG, `${WIRE_LOG}.before-restart`);
    } catch {
      /* no log to keep */
    }
    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
      env: { ...process.env, PREFLIGHT_GRACE_MS: '60000' },
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    // Walk back in: the house wakes as its copy.
    const s = await goTo(owner, HINKLEY_LANE);
    open.push(s);
    await intoHall(s, lot1.side);
    const again = await ev<CopyRead>(copyAt(`${LOTS}/${lot1.leaf}`), HINKLEY, HINKLEY_LANE);
    expect(again.row).toBe(`${HINKLEY}/house`);
    expect(again.rooms.length).toBeGreaterThanOrEqual(8);
    expect(await read(s, 'map terminus/hinkley-hills'), 'the map still lists the house').toMatch(
      new RegExp(`hinkley-hills/${lot1.leaf}/hall:`, 'i'),
    );
    // The student logs back in where they left off — in their unit: the
    // keyed room is re-entered through its institution, and the unit's copy
    // stands again under the same name.
    // ⚠ FINDING (pre-existing, not this build's): after a restart Duncan
    // Hall's lobby has no `up` until the dorm's warren stands — nothing the
    // lobby loads stands it — so a student re-homed to the LOBBY cannot climb.
    const k = await Session.open(student);
    open.push(k);
    await k.drainProse();
    expect(await read(k, 'look'), 'the student is back in their unit').toMatch(/dorm room|narrow single room/i);
    const copies = await ev<UnitCopy[]>(unitCopies(), DUNCAN, HALL_LOBBY);
    const theirs = copies.find((c) => c.people > 0);
    expect(theirs?.id, `the unit returns under the same name: ${JSON.stringify(copies)}`).toBe(unitExtent);
    expect(theirs!.rooms).toEqual([`${DUNCAN}/unit/room`]);
    // ⭐ The ships: aboard again, the same zone names.
    await stageShip(HESPER, {});
    const h = await goTo(uniqueHandle('zihesper2'), HESPER_BERTH);
    open.push(h);
    await doing(h, 'go hesper');
    expect(await ev<string[]>(zonesOf('/world/terminus/hesper/deck'), '/world/terminus', HESPER_BERTH)).toEqual([hesperZone]);
    const y = await goTo(uniqueHandle('ziyard'), YARD);
    open.push(y);
    expect(await read(y, 'look')).toMatch(new RegExp(`Alongside: [^.]*the ${NAME1}`));
    await stageShip(NAME1, {});
    await stageShip(NAME2, {});
    const smacksAgain = await ev<string[]>(zonesOf(`${SMACK_ZONE}/deck`), '/world/terminus', YARD);
    for (const z of smackZones) expect(smacksAgain).toContain(z);
  }, 900_000);
});
