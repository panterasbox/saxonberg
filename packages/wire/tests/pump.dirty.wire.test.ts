/**
 * ⭐⭐ **The pump, driven end to end** — the pump build's exit criterion,
 * run against the real socket. The requirements' drive script, step by
 * step (`docs/requirements/pump-requirements.md § The drive`).
 *
 * In one sentence: *walk to the village well at Rejection, work its pump
 * and carry water a machine raised; take a barometer up a hill; try to
 * draw water fourteen metres and be told only the depth; set a force pump
 * in the same well and have it simply work; pump until the leather wears,
 * take it out and fit the spare; fit a pump to a dead brine bore and get a
 * continuous rate where a bailer got a bucket; switch the city's intake
 * off and find the tap uphill dry, in the shipped words; and work a forge's
 * bellows exactly as before any of this existed.*
 *
 * ⚠⚠ **Assert UNDERSTOOD AND CHANGED, never "not refused."** `refusedFor`
 * reads all three ways a command dies; every checkpoint reads prose or
 * state back.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_BOOT_TIMEOUT=900000
 * WIRE_FRAME_TIMEOUT=45000 npx vitest run tests/pump.dirty.wire.test.ts`
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
 * ⚠ Why this file cannot run twice: it moves the village's hand pump
 * between wells, carries the force pump and the rack's spare packing off
 * the claims office, wears a packing it leaves on a hillside, and leaves
 * water standing in troughs.
 */
export const DIRTY_REASON =
  'moves the village hand pump and the rack’s force pump and spare packing ' +
  'out of where they were staged, wears a packing it leaves behind, and ' +
  'leaves water standing in two troughs';

declareFile({
  file: 'pump.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'world-seed',
    'terminus',
    'rejection',
    'trade-tanning',
    'trade-mining',
    'trade-drilling',
    'ground',
    'hinkley-hills',
    'eternal-university',
  ],
  dirtyReason: DIRTY_REASON,
});

const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const YARD = '/world/terminus/rejection/location/pithead-yard';
const HINKLEY = '/world/terminus/hinkley-hills/location/arrival';
/** The yard → the claims office → the hillside the deep well is on. */
const TO_THE_HILLSIDE = ['north', 'north'] as const;
const BACK_TO_THE_OFFICE = ['southwest'] as const;

let k: Session;
let handle = '';

function secondsOf(duration: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(duration);
  expect(m, `unparseable duration '${duration}'`).toBeTruthy();
  const units: Record<string, number> = { second: 1, minute: 60, hour: 3_600, day: 86_400 };
  return Number(m![1]) * (units[m![2] as string] ?? 0);
}

async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(after - before, `advance ${duration}: world-time did not move`).toBeGreaterThan(
    secondsOf(duration) * 0.9,
  );
  await new Promise((r) => setTimeout(r, 500));
}

/** Noon — the wells are outdoors, and at night an outdoor room is black. */
async function daylight(): Promise<void> {
  const DAY = 86_400;
  const now = await worldClockNow();
  const intoDay = ((now % DAY) + DAY) % DAY;
  const NOON = DAY / 2;
  const wait = intoDay < NOON ? NOON - intoDay : DAY - intoDay + NOON;
  await advance(`${Math.max(1, Math.ceil(wait / 3600))} hours`);
}

async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    const payload = (
      pending as unknown as {
        payload?: {
          promptId?: string;
          outcome?: { notes?: Array<{ matches?: Array<{ stuffId?: string }> }> };
        };
      }
    ).payload;
    const id = payload?.promptId;
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

async function read(s: Session, text: string): Promise<string> {
  try {
    return await s.prose(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    await say(s, text);
    return await s.prose(text);
  }
}

async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await say(s, dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/** All three ways a command dies before or inside its controller. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (n) =>
      n.kind === 'controller-rejected' ||
      n.kind === 'command-rejected' ||
      n.kind === 'validator-failed',
  );
  if (!note) return null;
  return note.reason ?? note.detail ?? note.kind ?? null;
}

/** Run an engaged act out to its effect, and return the prose it ended with. */
async function settle(s: Session, started: CommandResult): Promise<string> {
  const id = engagementIdOf(started);
  expect(id, `the act did not start an engagement: ${JSON.stringify(started.notes)}`).toBeTruthy();
  await s.awaitActivity(id!, 90_000);
  await new Promise((r) => setTimeout(r, 500));
  return (await s.drainProse()).join('\n');
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows.map((r) => String((r as { displayName?: string }).displayName ?? '')).join(' | ');
}

/** One spell at a handle, run to completion; returns the closing prose. */
async function pumpOnce(s: Session, what: string): Promise<string> {
  const started = await say(s, `pump ${what}`);
  expect(refusedFor(started), `pump ${what} was refused`).toBeNull();
  return settle(s, started);
}

/** A pressure figure in kPa from a barometer's line. */
function kPaOf(line: string): number | null {
  const m = /([0-9]+(?:\.[0-9]+)?)\s*(kPa|hPa|Pa|atm|bar)\b/i.exec(line);
  if (!m) return null;
  const v = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  if (unit === 'kpa') return v;
  if (unit === 'hpa') return v / 10;
  if (unit === 'pa') return v / 1000;
  if (unit === 'atm') return v * 101.325;
  return v * 100;
}

const record: string[] = [];
function note(line: string): void {
  record.push(line);
  // eslint-disable-next-line no-console
  console.log(`[pump drive] ${line}`);
}

beforeAll(async () => {
  handle = uniqueHandle('pumper');
  // The barometer is in Duncan Hall's lobby; nothing in the valley sells one.
  k = await Session.open(handle, { startLocation: LOBBY, wizard: true });
  await say(k, 'get barometer');
  await k.drainProse();
  expect(await carried(k), 'a barometer from the lobby').toMatch(/barometer/i);
  k.close();
  k = await Session.open(handle, { startLocation: YARD, wizard: true });
}, 300_000);

afterAll(() => {
  k?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[pump drive] RECORD\n${record.map((l) => `  ${l}`).join('\n')}\n`);
});

/* ───────────── 0. noon, because the wells are outdoors ───────────── */

suite.skipIf(!isOwnedTestWorld())('0. the clock', () => {
  it('moves to daylight, from outside the fiction', async () => {
    await daylight();
  });
});

/* ───────────── 1. the village well, in words ───────────── */

suite('1. the village well reads in words, and no numbers', () => {
  it('⭐ a handle, a barrel, leather — and not a digit', async () => {
    const yard = await read(k, 'look');
    expect(yard, `the yard reads: ${yard}`).toMatch(/village well|well/i);
    const well = await read(k, 'look village well');
    note(`look village well → ${well.replace(/\s+/g, ' ').slice(0, 240)}`);
    expect(well).toMatch(/pump|handle/i);
    expect(well).toMatch(/trough/i);
    expect(well, 'the well prose must carry no digit').not.toMatch(/[0-9]/);
  });
});

/* ───────────── 2. work it, and carry what it raised ───────────── */

suite('2. pump well, and carry water a machine raised', () => {
  it('⭐⭐ an unpumped trough is empty, honestly', async () => {
    await say(k, 'get pail');
    await k.drainProse();
    expect(await carried(k)).toMatch(/pail/i);
    const fill = await say(k, 'fill pail from village well');
    await k.drainProse();
    expect(refusedFor(fill), 'an empty trough should not fill a pail').not.toBeNull();
  });

  it('⭐⭐ a spell at the handle raises water, and the pail carries it', async () => {
    const closing = await pumpOnce(k, 'village well');
    note(`pump village well → ${closing.replace(/\s+/g, ' ').slice(0, 200)}`);
    expect(closing).toMatch(/water comes up/i);
    const fill = await say(k, 'fill pail from village well');
    await k.drainProse();
    expect(refusedFor(fill), `fill was refused: ${JSON.stringify(fill.notes)}`).toBeNull();
    const pail = await read(k, 'look pail');
    note(`look pail → ${pail.replace(/\s+/g, ' ').slice(0, 200)}`);
    expect(pail).toMatch(/water/i);
  });
});

/* ───────────── 3. the barometer, low and high ───────────── */

suite('3. measure pressure at the yard, then up at Hinkley', () => {
  it('⭐ both places read a figure, and the record keeps both', async () => {
    const low = await read(k, 'measure pressure');
    const lowKPa = kPaOf(low);
    note(`measure pressure at the pithead yard → ${low.trim()}`);
    expect(lowKPa, `no figure in: ${low}`).not.toBeNull();
    expect(lowKPa!).toBeGreaterThan(85);
    expect(lowKPa!).toBeLessThan(115);

    k.close();
    k = await Session.open(handle, { startLocation: HINKLEY, wizard: true });
    const high = await read(k, 'measure pressure');
    const highKPa = kPaOf(high);
    note(`measure pressure at Hinkley (130 m) → ${high.trim()}`);
    expect(highKPa, `no figure in: ${high}`).not.toBeNull();
    expect(highKPa!).toBeGreaterThan(85);
    expect(highKPa!).toBeLessThan(115);
    // ⚠ NOT asserted strictly lower: an untrained reader reads a barometer
    // to ±8 % (~8 kPa) and the valley-to-hill difference is ~1.5 kPa. The
    // fall is a competence-gated observation; the truth is pinned by the
    // unit test (`BiomeApi.suctionHeadFor` at 130 m). Recorded, not hidden.
    note(`(yard ${lowKPa} kPa vs Hinkley ${highKPa} kPa as an untrained reader saw them)`);

    k.close();
    k = await Session.open(handle, { startLocation: YARD, wizard: true });
    await k.drainProse();
  });
});

/* ───────────── 4. fourteen metres, and only the depth ───────────── */

suite('4. a suction pump at the deep well is told the depth, and nothing else', () => {
  it('⭐⭐ the hand pump comes out of the village well', async () => {
    const got = await say(k, 'get hand pump from village well');
    await k.drainProse();
    note(`get hand pump from village well → ${refusedFor(got) ?? 'ok'}`);
    expect(refusedFor(got), `get pump from well: ${JSON.stringify(got.notes)}`).toBeNull();
    expect(await carried(k)).toMatch(/hand pump/i);
  });

  it('⭐ a pail is not a pump — the well refuses it in its own words', async () => {
    const put = await say(k, 'put pail in village well');
    const said = (await k.drainProse()).join(' ');
    note(`put pail in village well → ${refusedFor(put)} · ${said.trim()}`);
    expect(refusedFor(put)).toBe('refused-by-container');
    expect(said).toMatch(/only a pump goes in a well/i);
  });

  it('⭐⭐⭐ at fourteen metres it draws nothing — and says the depth, not why', async () => {
    await walk(k, TO_THE_HILLSIDE);
    const hill = await read(k, 'look');
    expect(hill).toMatch(/deep well|well/i);
    const put = await say(k, 'put hand pump in deep well');
    await k.drainProse();
    expect(refusedFor(put), `put pump in well: ${JSON.stringify(put.notes)}`).toBeNull();

    const tried = await say(k, 'pump deep well');
    const said = (await k.drainProse()).join(' ');
    note(`pump deep well (suction) → ${refusedFor(tried)} · ${said.trim()}`);
    expect(refusedFor(tried)).toBe('beyond-suction');
    expect(said).toMatch(/14 metres/);
    expect(said, 'the refusal must not name the ceiling').not.toMatch(/\b10\b/);
    expect(said, 'the refusal must not explain').not.toMatch(/\bair\b|atmospher|pressure|vacuum/i);

    const eye = await read(k, 'analyze pump deep well');
    note(`analyze pump deep well → ${eye.replace(/\s+/g, ' ').trim()}`);
    expect(eye).toMatch(/leather/i);
    expect(eye, 'the reading must not explain').not.toMatch(/\bair\b|atmospher|pressure|vacuum/i);
  });
});

/* ───────────── 5. a force pump simply works ───────────── */

suite('5. a force pump in the same well lifts', () => {
  it('⭐⭐ swap the pumps, and water comes up from fourteen metres', async () => {
    await say(k, 'get hand pump from deep well');
    await k.drainProse();
    await walk(k, BACK_TO_THE_OFFICE);
    await say(k, 'get force pump');
    await k.drainProse();
    expect(await carried(k)).toMatch(/force pump/i);
    await walk(k, ['north']);
    const put = await say(k, 'put force pump in deep well');
    await k.drainProse();
    expect(refusedFor(put), `put force pump: ${JSON.stringify(put.notes)}`).toBeNull();

    const closing = await pumpOnce(k, 'deep well');
    note(`pump deep well (force) → ${closing.replace(/\s+/g, ' ').slice(0, 200)}`);
    expect(closing).toMatch(/water comes up/i);
    const well = await read(k, 'look deep well');
    expect(well).toMatch(/holds .*water/i);
  });
});

/* ───────────── 6. the leather wears, and the spare goes in ───────────── */

suite('6. pump until the leather goes, and fit the spare', () => {
  async function packingWord(): Promise<string> {
    const eye = await read(k, 'analyze pump deep well');
    const m = /leather in the barrel (?:is |has )?(sound|worn|leaking|perished|gone)/i.exec(eye);
    expect(m, `no condition word in: ${eye}`).toBeTruthy();
    return m![1]!.toLowerCase();
  }

  it('⭐⭐ the condition word changes with service, and carries no digit', async () => {
    const before = await packingWord();
    note(`packing before → ${before}`);
    for (let i = 0; i < 4; i++) {
      await say(k, 'fill pail from deep well');
      await say(k, 'spill pail');
      await k.drainProse();
      await pumpOnce(k, 'deep well');
    }
    const after = await packingWord();
    note(`packing after five spells → ${after}`);
    expect(after).not.toBe(before);
  });

  it('repair, attempted and recorded', async () => {
    const tried = await say(k, 'repair packing');
    const said = (await k.drainProse()).join(' ');
    note(`repair packing → ${refusedFor(tried) ?? 'ok'} · ${said.replace(/\s+/g, ' ').slice(0, 200)}`);
    // ⚠ Recorded, not asserted: a self-repair wants a mending kit AND
    // leather stock, and the valley has neither to hand. The verb must be
    // understood, though — an unknown verb is a broken affordance.
    expect(refusedFor(tried)).not.toBe('command-rejected');
  });

  it('⭐⭐ take the worn leather out, and the pump stops; fit the spare, and it works', async () => {
    const out = await say(k, 'get packing from force pump');
    await k.drainProse();
    note(`get packing from force pump → ${refusedFor(out) ?? 'ok'}`);
    expect(refusedFor(out), `get packing: ${JSON.stringify(out.notes)}`).toBeNull();

    const dead = await say(k, 'pump deep well');
    await k.drainProse();
    expect(refusedFor(dead)).toBe('no-packing');

    await say(k, 'drop packing');
    await walk(k, BACK_TO_THE_OFFICE);
    await say(k, 'get packing');
    await k.drainProse();
    expect(await carried(k)).toMatch(/packing/i);
    await walk(k, ['north']);
    const fit = await say(k, 'put packing in force pump');
    await k.drainProse();
    expect(refusedFor(fit), `fit packing: ${JSON.stringify(fit.notes)}`).toBeNull();
    expect(await packingWord()).toBe('sound');
    await say(k, 'fill pail from deep well');
    await say(k, 'spill pail');
    await k.drainProse();
    const closing = await pumpOnce(k, 'deep well');
    expect(closing).toMatch(/water comes up/i);
  });
});
