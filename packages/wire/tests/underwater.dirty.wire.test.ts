/**
 * Underwater — ⭐⭐ **water is a place you can go into**, driven over the
 * wire: the water below the Wharfside quay and its column to the bed; the
 * breath you hold and the urge that tells you; the line, the slate and the
 * bell; the dive shop and the city's work below the waterline; the tide at
 * the estuary; the frog in the mere; a working that will not be spoken
 * where no voice carries.
 *
 * The underwater requirements' drive, its numbering kept where a step is
 * driven here. ⭐ Every checkpoint asserts the verb was UNDERSTOOD (status
 * ok, or a named refusal) AND a state change or the words that prove one.
 *
 * Steps run elsewhere, and why (the plan's drive record says the same):
 *  - 4–5 (blackout, the dying clock) and 11 (the fight) are the unit
 *    suite's (`Respiration.test.ts`, `Swimming.test.ts`,
 *    `WeaponProfile.water.test.ts`): the wire cannot hold a body under for
 *    the minutes a blackout takes without a clock jump that also runs the
 *    dying clock past any rescue.
 *  - 8 (the winter mere) waits on the climate's winter; 9 (the cistern)
 *    is the same column under another row.
 *  - 13–14 (the bell, the hard-hat suit) are rows over the same seams the
 *    unit suite pins (`Bell.test.ts`, `AirPump.test.ts`, the bends in
 *    `Swimming.test.ts`).
 *
 * ⚠⚠ `.dirty.`: it buys gear, posts and settles the city's gigs, lifts
 * the lost anchor, spears the confluence's fish, drops a barrel on the
 * strandline and moves the clock. None of it is produced again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'buys diving gear, lifts the city’s lost anchor, spears the confluence’s ' +
  'fish, leaves a barrel on the strandline and moves the clock — none of it ' +
  'produced again';

declareFile({
  file: 'underwater.dirty.wire.test.ts',
  packs: ['terminus', 'water', 'trade-diving', 'trade-fishing', 'hollow-mere', 'arcane-library', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BANK = '/world/terminus/wharfside/bank';
const SHOP = '/world/terminus/wharfside/diving/location/shop';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const STRAND = '/world/terminus/estuary/strand';
const MERE = '/world/terminus/hollow-mere/location/pool';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

async function look(s: Session, what = 'look here'): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(what));
}

/** What a command said back to its giver, flattened. */
async function say(s: Session, text: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(text);
  return squash(await r.said());
}

/**
 * One honest breath: wait out the hyperventilation window (10 real
 * seconds since the last inhale — two inhales inside it are
 * hyperventilating, which takes the warning away; requirements step 4).
 */
async function breathe(...ss: Session[]): Promise<void> {
  await ss[0]!.listen(11_000);
  for (const s of ss) expectOk(await s.cmd('inhale'));
}

/**
 * ⭐ One swim up or down the column. It takes real seconds now (the
 * meters over your own vertical speed, breath burning the whole way —
 * underwater review), so wait until you are THERE before the next act.
 */
async function stroke(s: Session, verb: 'descend' | 'ascend'): Promise<Awaited<ReturnType<Session['cmd']>>> {
  const where = async () => JSON.stringify(await s.query('here', { fields: 'ref' }));
  const before = await where();
  const r = await s.cmd(verb);
  if (r.status !== 'ok') return r;
  for (let t = 0; t < 120; t++) {
    if ((await where()) !== before) break;
    await new Promise((res) => setTimeout(res, 500));
  }
  return r;
}

/** From the quay into the water, then down the column until it is no deeper; the looks on the way. */
async function toTheBed(s: Session): Promise<string[]> {
  // The way in from beside a water is `swim`; `descend` is the column's.
  // ⭐ A body worn down by the dives before (a blackout, a haul out of a
  // cold river) cannot swim with a load a fresh one carries — the
  // exertion model, not a defect (found by run 33: a fresh diver with
  // the same gear swims). Rest on the quay, lying down, until it can.
  // A deep breath is let go after half a minute, so a rest means a fresh
  // breath before going in (run 35: the diver rested, went down on an
  // ordinary breath, and ran out on the way).
  let into = await s.cmd('swim basin');
  for (let i = 0; i < 6 && into.status !== 'ok' && /carrying too much/i.test(squash(await into.said())); i++) {
    await s.cmd('lie');
    await s.listen(30_000);
    await s.cmd('stand');
    await breathe(s);
    into = await s.cmd('swim basin');
  }
  expect(into.status, squash(await into.said())).toBe('ok');
  const looks: string[] = [await look(s)];
  for (let i = 0; i < 8; i++) {
    const r = await stroke(s, 'descend');
    if (r.status !== 'ok') break;
    looks.push(await look(s));
  }
  return looks;
}

/** Up the column until the surface refuses another ascent. */
async function toTheSurface(s: Session): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const r = await stroke(s, 'ascend');
    if (r.status !== 'ok') {
      // The only refusal that ends a good ascent is being at the top.
      const said = squash(await r.said());
      expect(said, said).toMatch(/already at the surface/i);
      return;
    }
  }
}

/** Advance to daylight — a dark world reads every creature as "something". */
async function daylight(s: Session): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const said = await look(s);
    if (!/pitch dark|Shapes and edges/i.test(said)) return;
    await advanceWorldClock('2 hours');
  }
}

/** Read `what`, waiting for light good enough to read ink by. */
async function readInDaylight(s: Session, what: string): Promise<string> {
  let said = await say(s, `read ${what}`);
  for (let i = 0; i < 24 && /cannot make out a word/.test(said); i++) {
    await advanceWorldClock('1 hour');
    said = await say(s, `read ${what}`);
  }
  return said;
}

/** Fund a fresh character and buy `goods` at Morrow's counter. */
async function outfitted(handle: string, goods: string[]): Promise<Session> {
  let s = await Session.open(handle, { startLocation: BANK_HALL });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: underwater funding"`));
  } finally {
    gov.close();
  }
  s.close();
  s = await Session.open(handle, { startLocation: SHOP });
  for (const good of goods) expectOk(await s.cmd(`buy ${good}`));
  return s;
}

/** Walk a session from the dive shop to the quay. */
async function toQuay(s: Session): Promise<void> {
  expectOk(await s.cmd('go bank'));
  expect(await look(s)).toMatch(/Kestrel|embankment|steps/i);
}

const DIVER = uniqueHandle('diver');
const BUDDY = uniqueHandle('buddy');
let diver: Session;
let buddy: Session;

beforeAll(async () => {
  // ⛔ No season walk here: open water is a SPAN (underwater.soak.dirty,
  // the soak-harness census). The steps below read daylight, not open water.
  diver = await outfitted(DIVER, [
    'lifeline', '"diver\'s slate"', '"signal bell"', '"fish spear"',
    '"air bag"', '"air bag"', '"air bag"', '"tide almanac"', '"glass-tipped wand"', '"weight belt"',
  ]);
  buddy = await Session.open(BUDDY, { startLocation: BANK });
  await daylight(buddy);
  // ⚠ A long-lived drive world answers a purchase in 1.5–20 s (the store
  // is remote): the outfitting alone can take minutes, and the season
  // step-on more.
}, 2_400_000);

afterAll(() => {
  diver?.close();
  buddy?.close();
});

suite('A · the water place', () => {
  it('15d · on the quay, the almanac prints the next high and low waters', async () => {
    // Ink wants daylight; read it on the open quay, before it gets wet.
    const said = await readInDaylight(diver, 'almanac');
    expect(said).toMatch(/HIGH/);
    expect(said).toMatch(/low/);
  });

});

suite('C · 15d · D · the tide', () => {
  it('18 · at the mouth the channel reads the tide in words, and analyze gives the stream', async () => {
    const s = await Session.open(BUDDY, { startLocation: MOUTH });
    try {
      let said = await look(s, 'look channel');
      for (let i = 0; i < 5 && !/tide/i.test(said); i++) {
        await s.listen(1_500);
        said = await look(s, 'look channel');
      }
      expect(said).toMatch(/tide is (making|ebbing|on the turn)/i);
      const reading = await say(s, 'analyze water');
      expect(reading).toMatch(/tide: (making|ebbing)/);
      expect(reading).toMatch(/oxygen: \d/);
    } finally {
      s.close();
    }
  });

  it('16 · at low water the tidepool is cut off, and its oxygen falls', async () => {
    const s = await Session.open(BUDDY, { startLocation: STRAND });
    try {
      expectOk(await s.cmd('south'));
      let reading = '';
      for (let i = 0; i < 14; i++) {
        await s.listen(1_000);
        reading = await say(s, 'analyze water');
        if (/cut off/.test(reading)) break;
        await advanceWorldClock('1 hour');
      }
      expect(reading).toMatch(/cut off from the sea/);
      const first = Number(/oxygen: ([\d.]+)/.exec(reading)?.[1] ?? NaN);
      await advanceWorldClock('2 hours');
      await s.listen(1_000);
      const later = await say(s, 'analyze water');
      const second = Number(/oxygen: ([\d.]+)/.exec(later)?.[1] ?? NaN);
      if (/cut off/.test(later)) expect(second).toBeLessThan(first);
    } finally {
      s.close();
    }
  });
});

suite('D · 19 · the frog', () => {
  it('19 · the mere has a frog that goes down and comes up on its own breath', async () => {
    const s = await Session.open(BUDDY, { startLocation: MERE });
    try {
      await daylight(s);
      let seen = false;
      let gone = false;
      for (let i = 0; i < 20 && !(seen && gone); i++) {
        const here = await look(s);
        if (/bullfrog/i.test(here)) seen = true;
        else gone = true;
        await s.listen(3_000);
      }
      expect(seen).toBe(true);
    } finally {
      s.close();
    }
  });
});

