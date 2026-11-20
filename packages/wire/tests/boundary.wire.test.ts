/**
 * ⭐ The boundary drive — one shared edge, each side the exit.
 *
 * The blocking drive of the boundary build (requirements retired at its sweep;
 * the model is `docs/subsystems/boundary.md`): a door
 * between two places is ONE object, so its state, its words and its lock read
 * the same from both sides; a holding's keyed door is the same door from the
 * corridor and from inside; a window into a place shows the far side and
 * passes no body; and every screen tells a way's whole state in one word.
 *
 * Every step is `instant` or `short`; there is no soak drive (nothing in this
 * build waits on the clock). Steps that only a wizard can stage say so.
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8): the cellar door
 * between the lit shop and the unlit cellar (its free side) for the
 * Wharfside pump-house door, the hut's window onto the plaza for the
 * glazier's hut, and the hall's double doors for Duncan Hall's front doors.
 * The cellar door is STAGED shut and locked before the steps and put back
 * so after them; the double doors are left open, as authored. It runs
 * twice on one world. (Its old dirty reason named a dorm provisioning by
 * Katie that no step here had done for some time.)
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  isOwnedTestWorld,
  stage,
  advanceWorldClock,
  worldClockNow,
  SHOP,
  CELLAR,
  CELLAR_DOOR,
  HUT,
  PLAZA,
  HALL,
  EXITS,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

declareFile({
  file: 'boundary.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

/** The lit side of the cellar door (the keyed side). */
const LIT_SIDE = SHOP;
/** The unlit side — the door's free side. */
const FREE_SIDE = CELLAR;
const DOOR = CELLAR_DOOR;
/** The cellar door's way from each side. */
const DOWN = EXITS.shop.cellar;
const UP = EXITS.cellar.shop;
/** The hut window's way from each side. */
const TO_PLAZA = EXITS.hut.plaza;
const TO_HUT = EXITS.plaza.hut;
/** The hall's double doors, from inside. */
const HALL_OUT = EXITS.hall.plaza;

// `plain` pads an inline tag with spaces (`( the oak door , locked)`); close them up.
const squash = (t: string): string =>
  plain(t)
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ ([,)])/g, '$1')
    .trim();
const record: string[] = [];
const open: Session[] = [];

async function session(handle: string, start: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: start });
  open.push(s);
  await s.drainProse();
  return s;
}

/** The words a command produced — its prose and any refusal detail. */
async function words(r: CommandResult): Promise<string> {
  const said = squash(await r.said());
  const detail = (r.notes as Array<{ detail?: string }>)
    .map((n) => n.detail ?? '')
    .join(' ');
  return `${said} ${detail}`.trim();
}

async function say(s: Session, text: string): Promise<{ r: CommandResult; w: string }> {
  const r = await s.cmd(text);
  const w = await words(r);
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 200)}`);
  return { r, w };
}

/**
 * ⭐ To the working day, by the clock as it stands (the glass drive's
 * helper): a door is seen in its room's light, and an unlit lobby or a hut
 * lit only through its window reads its door as *something* at night —
 * correctly. At most a day's jump, so a short step.
 */
async function toMidday(): Promise<void> {
  const now = await worldClockNow();
  const into = ((now % 86_400) + 86_400) % 86_400;
  if (into >= 9 * 3600 && into <= 15 * 3600) return;
  const toNoon = (12 * 3600 - into + 86_400) % 86_400;
  await advanceWorldClock(`${Math.ceil(toNoon / 60)} minutes`);
}

/** The obvious-exits line of `look`. */
async function exitsLine(s: Session): Promise<string> {
  let line = '';
  // A peer's arrival can land as the only prose of a `look`; ask again.
  for (let i = 0; i < 3 && line === ''; i++) {
    await s.drainProse();
    // `look here`, never bare `look`: right after an act on a thing, bare
    // `look` looks at THAT thing (command recency), not the room.
    const said = squash(await s.prose('look here'));
    line = /Obvious exits: (.*?)\.(?:\s|$)/.exec(said)?.[1] ?? '';
    if (line === '') record.push(`${s.handle} look (no exits line): ${said.slice(0, 300)}`);
  }
  record.push(`${s.handle} exits: ${line}`);
  return line;
}

afterAll(async () => {
  // Leave the cellar door as authored: shut and locked.
  try {
    await stage(DOOR, 'setOpen', false);
    await stage(DOOR, 'setLocked', true);
  } catch {
    /* a world that never stood it up */
  }
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[boundary drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

suite.skipIf(!isOwnedTestWorld())('the boundary — blocking drive', () => {
  let bank: Session;
  let inside: Session;
  beforeAll(async () => {
    await toMidday();
    // ⭐ Staged: the cellar door shut and locked, whatever the last drive did.
    await stage(DOOR, 'setOpen', false);
    await stage(DOOR, 'setLocked', true);
    bank = await session(uniqueHandle('bdbank'), LIT_SIDE);
    inside = await session(uniqueHandle('bdhouse'), FREE_SIDE);
  }, 240_000);

  it('1. [instant · player] the cellar door is one locked door from both sides', async () => {
    expect(await exitsLine(bank)).toMatch(new RegExp(`${DOWN} \\(the cellar door, locked\\)`, 'i'));
    // ⚠ Inside, the door is named only by the light that comes in through
    // it — the cellar has no lamp of its own, so shut it is *something*.
    // The STATE is the check: the same `locked` from the inside.
    expect(await exitsLine(inside)).toMatch(new RegExp(`${UP} \\((the cellar door|something), locked\\)`, 'i'));
    const shut = await say(bank, `go ${DOWN}`);
    expect(shut.r.status).not.toBe('ok');
    expect(shut.w).toMatch(/locked/i);
    // ⭐ open refuses on the bolt from either side (a locked door does not open).
    expect((await say(bank, 'open "cellar door"')).w).toMatch(/locked/i);
    expect((await say(inside, 'open door')).w).toMatch(/locked/i);
  }, 120_000);

  it('2. [instant · staged] the inside is the free side: unlock with no key, and the bank sees it', async () => {
    // Inside is `freeFrom`: the thumb-turn needs no key.
    expectOk((await say(inside, 'unlock door')).r);
    expectOk((await say(inside, 'open door')).r);
    // One object — the shop reads the same state.
    expect(await exitsLine(bank)).toMatch(new RegExp(`${DOWN} \\(the cellar door, open\\)`, 'i'));
    // A keyless stranger in the shop cannot lock it (it is not their side).
    expect((await say(bank, 'lock "cellar door"')).r.status).not.toBe('ok');
    // ...and can walk in while it stands open.
    expectOk((await say(bank, `go ${DOWN}`)).r);
    expectOk((await say(bank, `go ${UP}`)).r);
    // Shut and bolt it from inside; the shop finds it locked again.
    expectOk((await say(inside, 'close door')).r);
    expectOk((await say(inside, 'lock door')).r);
    expect(await exitsLine(bank)).toMatch(new RegExp(`${DOWN} \\(the cellar door, locked\\)`, 'i'));
    expect((await say(bank, `go ${DOWN}`)).r.status).not.toBe('ok');
    // ...and leaving needs no key: from the free side the bolt answers the
    // thumb-turn. (It is a plain door, not a latched one, so it is opened
    // before it is walked through — the shut gate is not the bolt's.)
    expect((await say(inside, `go ${UP}`)).w).toMatch(/closed/i);
    expectOk((await say(inside, 'unlock door')).r);
    expectOk((await say(inside, 'open door')).r);
    expectOk((await say(inside, `go ${UP}`)).r);
  }, 180_000);

  it('5. [instant · player] the hut window shows the plaza and passes no body', async () => {
    const hut = await session(uniqueHandle('bdhut'), HUT);
    const line = await exitsLine(hut);
    expect(line).toMatch(new RegExp(`${TO_PLAZA} \\(the hut window\\)`, 'i'));
    // The doorway — the hut's other way, an open one.
    expect(line).toMatch(new RegExp(`(^|[,\\s])${EXITS.hut.approach}\\b`, 'i'));
    const look = await say(hut, `look ${TO_PLAZA}`);
    expect(look.w).toMatch(/window/i);
    const go = await say(hut, `go ${TO_PLAZA}`);
    expect(go.r.status).not.toBe('ok');
    expect(go.w).toMatch(/not a way through/i);
    // The hut is lit — through the window and its doorway — not pitch dark.
    expect(squash(await hut.prose('look'))).not.toMatch(/pitch dark/i);
    const plaza = await session(uniqueHandle('bdplaza'), PLAZA);
    expect(await exitsLine(plaza)).toMatch(new RegExp(`${TO_HUT} \\(the hut window\\)`, 'i'));
    expect((await say(plaza, `go ${TO_HUT}`)).w).toMatch(/not a way through/i);
  }, 180_000);

  it('6. [instant · player] the hall: the double doors are one way, by name or by direction', async () => {
    const lobby = await session(uniqueHandle('bdlobby'), HALL);
    const line = await exitsLine(lobby);
    expect(line).toMatch(new RegExp(`${HALL_OUT} \\(the double doors, (open|closed|locked)\\)`, 'i'));
    const byName = await say(lobby, 'look doors');
    expect(byName.w).toMatch(/door/i);
    const byWay = await say(lobby, `look ${HALL_OUT}`);
    expect(byWay.w).toMatch(new RegExp(`way ${HALL_OUT}, through the double doors`, 'i'));
    // `look <way>` describes the way from here, never where it leads.
    expect(byWay.w).not.toMatch(/plaza|square/i);
    await say(lobby, 'open doors'); // already open is fine — they are propped
    expect(await exitsLine(lobby)).toMatch(new RegExp(`${HALL_OUT} \\(the double doors, open\\)`, 'i'));
    expectOk((await say(lobby, `go ${HALL_OUT}`)).r);
  }, 180_000);

  it('7. [instant · player] the room card and `look` agree on a way’s state', async () => {
    const at = await session(uniqueHandle('bdcard'), LIT_SIDE);
    const here = await at.queryOne('here', ['exits']);
    const exits = ((here as unknown as { exits?: unknown })?.exits ??
      (here as unknown as { fields?: { exits?: unknown } })?.fields?.exits) as
      | Array<{ direction: string; state: string; crossesZone: boolean; boundary?: { name: string } }>
      | undefined;
    record.push(`card exits: ${JSON.stringify(exits)?.slice(0, 400)}`);
    expect(Array.isArray(exits)).toBe(true);
    const pump = exits!.find((e) => e.direction === DOWN);
    expect(pump?.boundary?.name).toMatch(/cellar door/i);
    // ⭐ The two screens agree, whatever the door's state is now: the card's
    // `state` and `look`'s word for the same way (`shut` is `closed` in prose).
    const word = new RegExp(`${DOWN} \\(the cellar door, (\\w+)\\)`, 'i').exec(await exitsLine(at))?.[1];
    expect(word).toBeDefined();
    expect(pump?.state).toBe(word === 'closed' ? 'shut' : word);
    // Lock it (staged) and both read `locked`.
    await stage(DOOR, 'setOpen', false);
    await stage(DOOR, 'setLocked', true);
    const again = await at.queryOne('here', ['exits']);
    const again2 = ((again as unknown as { exits?: unknown })?.exits ??
      (again as unknown as { fields?: { exits?: unknown } })?.fields?.exits) as
      | Array<{ direction: string; state: string }>
      | undefined;
    expect(again2?.find((e) => e.direction === DOWN)?.state).toBe('locked');
    expect(await exitsLine(at)).toMatch(new RegExp(`${DOWN} \\(the cellar door, locked\\)`, 'i'));
    // Every record carries the threshold flag.
    for (const e of exits!) expect(typeof e.crossesZone).toBe('boolean');
  }, 120_000);
});
