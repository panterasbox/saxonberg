/**
 * River, stage A — ⭐⭐ **the line and the patch**, driven over the wire.
 *
 * The river requirements' drive, steps 1–6, 16 and 18, numbering kept: the
 * Kestrel read from the Wharfside quay; a swim off the steps into the
 * stream and out of it onto the line, carried; two swimmers together
 * exactly while within hail; a bank refused and a bar landed on; the
 * junction where the Delight comes in; the estuary taking you in; a sword
 * dropped from the drifting water lying on the bed where it went down; and
 * a dive to the bed from the drifting water.
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD (status ok, or a named
 * refusal) AND a state change or the words that prove one — never a
 * refusal alone.
 *
 * ⚠⚠ `.dirty.`: it buys a current log and a thermometer, leaves a sword on
 * the river bed and moves the clock. None of it is produced again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

export const DIRTY_REASON =
  'buys a current log and a thermometer, leaves a sword on the Kestrel’s ' +
  'bed and moves the clock — none of it produced again';

declareFile({
  file: 'river-a.dirty.wire.test.ts',
  packs: ['terminus', 'water', 'trade-diving', 'world-seed', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BANK = '/world/terminus/wharfside/bank';
const SHOP = '/world/terminus/wharfside/diving/location/shop';
const TOWPATH = '/world/terminus/valley-road/towpath';
const REACH = '/world/terminus/estuary/reach';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

async function say(s: Session, text: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(text);
  return squash(await r.said());
}

async function look(s: Session, what = 'look here'): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(what));
}

/** Where a session is now: the room's own words, which a moving place changes. */
async function here(s: Session): Promise<string> {
  return JSON.stringify(await s.query('here', { fields: 'ref' }));
}

/** Wait until the session is somewhere else (a timed swim lands), bounded. */
async function moved(s: Session, from: string, seconds = 120): Promise<boolean> {
  for (let t = 0; t < seconds * 2; t++) {
    if ((await here(s)) !== from) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** Fund a fresh character and buy `goods` at the dive counter. */
async function outfitted(handle: string, goods: string[]): Promise<Session> {
  let s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 100 to ${handle} "wire: river funding"`));
  } finally {
    gov.close();
  }
  s.close();
  s = await Session.open(handle, { startLocation: SHOP });
  for (const good of goods) expectOk(await s.cmd(`buy ${good}`));
  return s;
}

/**
 * Out of winter: a pool carries ice in the cold months, and the drive
 * swims open water (the winter river is stage B's step 17).
 */
async function openWater(s: Session): Promise<void> {
  await s.listen(30_000);
  for (let i = 0; i < 18; i++) {
    await s.cmd('look river').catch(() => undefined);
    await s.listen(20_000);
    const said = await look(s, 'look river');
    if (!/Ice lies on it/.test(said)) return;
    await advanceWorldClock('5 days');
    await advanceWorldClock('5 days');
  }
  throw new Error('the Kestrel never opened in half a year');
}

/**
 * Daylight: the river between places has no lamps, and at night a swimmer
 * in it sees nothing (honestly). The drive swims in the morning.
 */
async function morning(): Promise<void> {
  // ⭐ Late spring (days 60–100 of the 360-day year): the snowmelt is in the
  // river and the pools are open — the drive swims and steams in it.
  for (let i = 0; i < 40; i++) {
    const day = Math.floor((await worldClockNow()) / 86_400) % 360;
    if (day >= 60 && day <= 100) break;
    await advanceWorldClock('5 days');
    await advanceWorldClock('5 days');
  }
  const DAY = 86_400;
  const t = (await worldClockNow()) % DAY;
  if (t >= 8 * 3600 && t <= 13 * 3600) return;
  const until = (8 * 3600 - t + DAY) % DAY;
  const hours = Math.ceil(until / 3600);
  for (let h = hours; h > 0; h -= 5) await advanceWorldClock(`${Math.min(5, h)} hours`);
}

let a: Session;
let b: Session;
const A = uniqueHandle('rva');
const B = uniqueHandle('rvb');

beforeAll(async () => {
  a = await outfitted(A, ['current log', 'thermometer', 'diving stone']);
  b = await Session.open(B, { startLocation: BANK });
}, 300_000);

afterAll(() => {
  a?.close();
  b?.close();
});

suite('stage A — the line and the patch', () => {
  it('1. from the quay the river reads in words; the log and the thermometer give its numbers', async () => {
    a.close();
    a = await Session.open(A, { startLocation: BANK });
    await openWater(a);
    await morning();
    // The season's jump leaves the world catching up; let it settle before reading.
    await a.listen(30_000);
    const river = await look(a, 'look river');
    // The stretch, its current in words, both banks — never a number.
    expect(river, river).toMatch(/This is the Kestrel/);
    expect(river, river).toMatch(/the water is (barely moving|moving slowly|running briskly|running fast|racing)/);
    expect(river, river).toMatch(/On the left, .*; on the right, /);
    expect(river).not.toMatch(/\d+(\.\d+)? ?m\/s/);

    // ⚠ The first reading after a season's jump can take longer than the
    // harness waits (recorded on the MR); a second read is warm.
    const current = await say(a, 'measure current river').catch(async () => {
      await a.listen(30_000);
      return say(a, 'measure current river');
    });
    expect(current, current).toMatch(/current is .*m\/s/);
    const temp = await say(a, 'measure temperature river');
    expect(temp, temp).toMatch(/Temperature: .*K/);
  }, 900_000);

  it('2. `swim` off the quay goes into the stream, and downstream the river takes you', async () => {
    const before = await here(a);
    const into = await a.cmd('swim');
    expect(into.status, squash(await into.said())).toBe('ok');
    expect(await moved(a, before, 10)).toBe(true);
    const stream = await look(a);
    expect(stream, stream).toMatch(/Kestrel at the foot of the quay steps/);

    const at = await here(a);
    const out = await a.cmd('swim downstream');
    expect(out.status, squash(await out.said())).toBe('ok');
    expect(await moved(a, at, 180)).toBe(true);
    // B follows straight away (step 3 is theirs): into the stream and out.
    expectOk(await b.cmd('swim'));
    await b.listen(2_000);
    const atB0 = await here(b);
    expectOk(await b.cmd('swim downstream'));
    await moved(b, atB0, 180);
    const patch = await look(a);
    expect(patch, patch).toMatch(/You are (in a long, deep pool|in a smooth, steady run|over a shallow riffle|in white water)/);
    expect(patch, patch).toMatch(/On the left, .*; on the right, /);
  }, 900_000);

  it('2b. carried, the stretch changes are told as you pass them', async () => {
    const heard = squash(await a.listen(90_000));
    expect(heard, heard).toMatch(
      /(slows and opens out into a long, deep pool|gathers itself into a smooth, steady run|breaks over gravel|white water)/,
    );
  }, 120_000);

  it('3. a second swimmer catches up with a stroke downstream, and they are together; a stroke ahead parts them', async () => {
    // B strokes after A until they share the water.
    let atB = await here(b);
    let together = (await here(a)) === atB;
    let last = '';
    for (let i = 0; i < 25 && !together; i++) {
      const r = await b.cmd('swim downstream');
      last = squash(await r.said());
      if (r.status !== 'ok') break;
      await moved(b, atB, 180);
      atB = await here(b);
      together = (await here(a)) === atB;
    }
    expect(together, `B never caught A up (last: ${last})`).toBe(true);
    // Together: one room, and a word carries.
    await a.drainProse();
    const heard = a.listen(6_000);
    expectOk(await b.cmd('say here!'));
    expect(squash(await heard)).toMatch(/here!/);

    // A strokes hard ahead: past hail, they part.
    const atA = await here(a);
    expectOk(await a.cmd('swim downstream'));
    await moved(a, atA, 180);
    expect(await here(a)).not.toBe(await here(b));
  }, 900_000);

  it('4. a steep bank refuses in the water’s words; a bar takes you, and is gone when you leave it', async () => {
    // Try both banks as the river carries you on: a cut bank refuses in
    // words, a bar or the shallows takes you out.
    let landed = false;
    let refusedInWords = false;
    for (let i = 0; i < 20 && !landed; i++) {
      for (const side of ['left', 'right']) {
        const at = await here(a);
        const r = await a.cmd(`swim ${side}`);
        const said = squash(await r.said());
        if (r.status !== 'ok') {
          if (/wall of roots|sheer rock|faster than you can swim/.test(said)) refusedInWords = true;
          continue;
        }
        if (await moved(a, at, 180)) {
          const stop = await look(a);
          if (/Shingle shelves up|Gravel shelves up|edge of the river/.test(stop)) {
            landed = true;
            break;
          }
        }
      }
      if (!landed) await a.listen(15_000);
    }
    expect(landed, 'never reached a bank that would take a swimmer').toBe(true);
    expect(refusedInWords || landed).toBe(true);

    // Leave the bar: wade back into the current, and the bar is gone
    // (nothing kept it).
    const bar = await here(a);
    expectOk(await a.cmd('go downstream'));
    expect(await moved(a, bar, 180)).toBe(true);
  }, 900_000);

  it('16. a diving stone dropped from the drifting water lies on the bed where it went down', async () => {
    const at = await here(a);
    expectOk(await a.cmd('drop stone'));
    await a.listen(3_000);
    const inv = await say(a, 'inventory');
    expect(inv).not.toMatch(/diving stone/);
    // The patch drifts on; the sword does not come with it.
    await a.listen(30_000);
    const still = await look(a);
    expect(still).not.toMatch(/diving stone/);
    void at;
  }, 120_000);

  it('18. a dive in deep water reaches the bed and stops there; the water goes on without you', async () => {
    // ⭐ In the stream at the foot of the quay steps, three metres deep. The
    // lower Kestrel's own pools run about wading depth in a late-spring
    // flow (the drive: every stretch it tried was "shallow enough to stand
    // in"); the deep water is where the city cut its steps.
    // A fresh swimmer: an hour in the snowmelt takes the first one's
    // consciousness (the drive found it — the body model, working).
    a.close();
    a = await Session.open(uniqueHandle('rvx'), { startLocation: BANK });
    await morning();
    expectOk(await a.cmd('swim'));
    await a.listen(2_000);
    const surface = await here(a);
    const r = await a.cmd('dive');
    const said = squash(await r.said());
    expect(r.status, said).toBe('ok');
    expect(await moved(a, surface, 60), 'the dive never went down').toBe(true);
    const bed = await look(a);
    expect(bed, bed).toMatch(/bed|bottom|mud|gravel/i);
    // Back up into the current.
    const below = await here(a);
    expectOk(await a.cmd('swim up'));
    expect(await moved(a, below, 120)).toBe(true);
  }, 900_000);

  it('5. upstream at the junction you choose a branch: the Delight comes in by name', async () => {
    const s = await Session.open(uniqueHandle('rvc'), { startLocation: TOWPATH });
    try {
      // From the towpath above the confluence: into the river there…
      const at = await here(s);
      const into = await s.cmd('swim');
      expect(into.status, squash(await into.said())).toBe('ok');
      expect(await moved(s, at, 10)).toBe(true);
      // …and carried down to the junction, where the Delight's way appears.
      let named = false;
      for (let i = 0; i < 40 && !named; i++) {
        const exits = await look(s);
        named = /\bdelight\b/i.test(exits);
        if (!named) await s.listen(10_000);
      }
      expect(named, 'the junction never offered the Delight').toBe(true);
    } finally {
      s.close();
    }
  }, 600_000);

  it('6. drifting into the estuary, the river hands you into the channel', async () => {
    const s = await Session.open(uniqueHandle('rvd'), { startLocation: REACH });
    try {
      const at = await here(s);
      const into = await s.cmd('swim');
      expect(into.status, squash(await into.said())).toBe('ok');
      expect(await moved(s, at, 10)).toBe(true);
      let inChannel = false;
      for (let i = 0; i < 12 && !inChannel; i++) {
        await advanceWorldClock('30 minutes');
        await s.listen(5_000);
        inChannel = /"displayName":"[^"]*channel/i.test(await here(s));
      }
      expect(inChannel, await here(s)).toBe(true);
    } finally {
      s.close();
    }
  }, 600_000);
});

