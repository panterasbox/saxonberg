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
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'unlocks and relocks the shipped pump-house door from inside, leaves the ' +
  'Duncan Hall front doors open, and has Katie provision a dorm room';

declareFile({
  file: 'boundary.dirty.wire.test.ts',
  packs: [
    'world-seed',
    'terminus',
    'eternal-university',
    'rejection',
    'residence',
    'generic-objects',
    'base-library',
    'ground',
    'trade-glass',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK = '/world/terminus/wharfside/bank';
const PUMP_HOUSE = '/world/terminus/wharfside/pumphouse/location/house';
const PUMP_DOOR = '/world/terminus/wharfside/thing/pump-house-door';
const HUT = '/world/terminus/rejection/location/glaziers-hut';
const HILLSIDE = '/world/terminus/rejection/location/hillside';
const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';

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
  // Leave the pump-house door as shipped: shut and locked.
  try {
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
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
    bank = await session(uniqueHandle('bdbank'), BANK);
    inside = await session(uniqueHandle('bdhouse'), PUMP_HOUSE);
  }, 240_000);

  it('1. [instant · player] the pump-house door is one locked door from both sides', async () => {
    expect(await exitsLine(bank)).toMatch(/pumphouse \(the pump-house door, locked\)/i);
    // ⚠ Inside, the door is named only by the light that comes in through
    // it — the pump house has no lamp of its own, so shut it is *something*
    // (a content finding for terminus, not this build). The STATE is the
    // check: the same `locked` from the inside.
    expect(await exitsLine(inside)).toMatch(/out \((the pump-house door|something), locked\)/i);
    const shut = await say(bank, 'go pumphouse');
    expect(shut.r.status).not.toBe('ok');
    expect(shut.w).toMatch(/locked/i);
    // ⭐ open refuses on the bolt from either side (a locked door does not open).
    expect((await say(bank, 'open "pump-house door"')).w).toMatch(/locked/i);
    expect((await say(inside, 'open door')).w).toMatch(/locked/i);
  }, 120_000);

  it('2. [instant · staged] the inside is the free side: unlock with no key, and the bank sees it', async () => {
    // Inside is `freeFrom`: the thumb-turn needs no key.
    expectOk((await say(inside, 'unlock door')).r);
    expectOk((await say(inside, 'open door')).r);
    // One object — the bank reads the same state.
    expect(await exitsLine(bank)).toMatch(/pumphouse \(the pump-house door, open\)/i);
    // A keyless stranger at the bank cannot lock it (it is not their side).
    expect((await say(bank, 'lock "pump-house door"')).r.status).not.toBe('ok');
    // ...and can walk in while it stands open.
    expectOk((await say(bank, 'go pumphouse')).r);
    expectOk((await say(bank, 'go out')).r);
    // Shut and bolt it from inside; the bank finds it locked again.
    expectOk((await say(inside, 'close door')).r);
    expectOk((await say(inside, 'lock door')).r);
    expect(await exitsLine(bank)).toMatch(/pumphouse \(the pump-house door, locked\)/i);
    expect((await say(bank, 'go pumphouse')).r.status).not.toBe('ok');
    // ...and leaving needs no key: from the free side the bolt answers the
    // thumb-turn. (It is a plain door, not a latched one, so it is opened
    // before it is walked through — the shut gate is not the bolt's.)
    expect((await say(inside, 'go out')).w).toMatch(/closed/i);
    expectOk((await say(inside, 'unlock door')).r);
    expectOk((await say(inside, 'open door')).r);
    expectOk((await say(inside, 'go out')).r);
  }, 180_000);

  it('5. [instant · player] the hut window shows the hillside and passes no body', async () => {
    const hut = await session(uniqueHandle('bdhut'), HUT);
    const line = await exitsLine(hut);
    expect(line).toMatch(/west \(the west window\)/i);
    expect(line).toMatch(/south/i);
    const look = await say(hut, 'look west');
    expect(look.w).toMatch(/window/i);
    const go = await say(hut, 'go west');
    expect(go.r.status).not.toBe('ok');
    expect(go.w).toMatch(/not a way through/i);
    // The hut is lit — through the window and its doorway — not pitch dark.
    expect(squash(await hut.prose('look'))).not.toMatch(/pitch dark/i);
    const hill = await session(uniqueHandle('bdhill'), HILLSIDE);
    expect(await exitsLine(hill)).toMatch(/east \(the west window\)/i);
    expect((await say(hill, 'go east')).w).toMatch(/not a way through/i);
  }, 180_000);

  it('6. [instant · player] Duncan Hall: the front doors are one way, by name or by direction', async () => {
    const lobby = await session(uniqueHandle('bdlobby'), HALL_LOBBY);
    const line = await exitsLine(lobby);
    expect(line).toMatch(/south \(the front doors?, (open|closed|locked)\)/i);
    const byName = await say(lobby, 'look doors');
    expect(byName.w).toMatch(/door/i);
    const byWay = await say(lobby, 'look south');
    expect(byWay.w).toMatch(/way south, through the front doors/i);
    // `look south` describes the way from here, never where it leads.
    expect(byWay.w).not.toMatch(/university avenue|crossing/i);
    await say(lobby, 'open doors'); // already open is fine — they are propped
    expect(await exitsLine(lobby)).toMatch(/south \(the front doors?, open\)/i);
    expectOk((await say(lobby, 'go south')).r);
  }, 180_000);

  it('7. [instant · player] the room card and `look` agree on a way’s state', async () => {
    const at = await session(uniqueHandle('bdcard'), BANK);
    const here = await at.queryOne('here', ['exits']);
    const exits = ((here as unknown as { exits?: unknown })?.exits ??
      (here as unknown as { fields?: { exits?: unknown } })?.fields?.exits) as
      | Array<{ direction: string; state: string; crossesZone: boolean; boundary?: { name: string } }>
      | undefined;
    record.push(`card exits: ${JSON.stringify(exits)?.slice(0, 400)}`);
    expect(Array.isArray(exits)).toBe(true);
    const pump = exits!.find((e) => e.direction === 'pumphouse');
    expect(pump?.boundary?.name).toMatch(/pump-house door/i);
    // ⭐ The two screens agree, whatever the door's state is now: the card's
    // `state` and `look`'s word for the same way (`shut` is `closed` in prose).
    const word = /pumphouse \(the pump-house door, (\w+)\)/i.exec(await exitsLine(at))?.[1];
    expect(word).toBeDefined();
    expect(pump?.state).toBe(word === 'closed' ? 'shut' : word);
    // Lock it (staged) and both read `locked`.
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
    const again = await at.queryOne('here', ['exits']);
    const again2 = ((again as unknown as { exits?: unknown })?.exits ??
      (again as unknown as { fields?: { exits?: unknown } })?.fields?.exits) as
      | Array<{ direction: string; state: string }>
      | undefined;
    expect(again2?.find((e) => e.direction === 'pumphouse')?.state).toBe('locked');
    expect(await exitsLine(at)).toMatch(/pumphouse \(the pump-house door, locked\)/i);
    // Every record carries the threshold flag.
    for (const e of exits!) expect(typeof e.crossesZone).toBe('boolean');
  }, 120_000);
});
