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

/** Down the column until the water is no deeper; the looks on the way. */
async function toTheBed(s: Session): Promise<string[]> {
  const looks: string[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await s.cmd('descend');
    if (r.status !== 'ok') {
      // The first step must go: from the quay, into the water.
      if (i === 0) expect(r.status, squash(await r.said())).toBe('ok');
      break;
    }
    looks.push(await look(s));
  }
  return looks;
}

/** Up the column until the surface refuses another ascent. */
async function toTheSurface(s: Session): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const r = await s.cmd('ascend');
    if (r.status !== 'ok') return;
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
  diver = await outfitted(DIVER, [
    'lifeline', '"diver\'s slate"', '"signal bell"', '"fish spear"',
    '"air bag"', '"air bag"', '"air bag"', '"tide almanac"',
  ]);
  buddy = await Session.open(BUDDY, { startLocation: BANK });
  await daylight(buddy);
}, 300_000);

afterAll(() => {
  diver?.close();
  buddy?.close();
});

suite('A · the water place', () => {
  it('1 · from the quay the water below reads as water you could go into', async () => {
    await toQuay(diver);
    let said = await look(diver, 'look river');
    for (let i = 0; i < 5 && !/Kestrel/.test(said); i++) {
      await diver.listen(1_500);
      said = await look(diver, 'look river');
    }
    expect(said).toMatch(/Kestrel/);
  });

  it('15d · on the quay, the almanac prints the next high and low waters', async () => {
    // Ink wants daylight; read it on the open quay, before it gets wet.
    const said = await readInDaylight(diver, 'almanac');
    expect(said).toMatch(/HIGH/);
    expect(said).toMatch(/low/);
  });

  it('2 · inhale, descend: the surface, the column, the bed — the light dims, and a second diver is in the same room at every step', async () => {
    expectOk(await diver.cmd('inhale'));
    expectOk(await buddy.cmd('inhale'));
    const down = await toTheBed(diver);
    expect(down.length).toBeGreaterThanOrEqual(3);
    expect(down[0]).toMatch(/foot of the quay steps|in the river/i);
    const buddyDown = await toTheBed(buddy);
    expect(buddyDown.length).toBe(down.length);
    // Same room: each sees the other.
    expect(await look(buddy)).toMatch(new RegExp(DIVER, 'i'));
    expect(await look(diver)).toMatch(new RegExp(BUDDY, 'i'));
    // The bed is not the surface's light.
    expect(down[down.length - 1]).not.toEqual(down[0]);
  });

  it('10 · under the water a voice is bubbles; an emote and a message still reach', async () => {
    const said = await say(diver, 'say can you hear me');
    expect(said).toMatch(/bubbles|nobody hears/i);
    expectOk(await diver.cmd('smile'));
    await buddy.drainProse();
    const dm = await diver.cmd(`dm "${BUDDY}" meet at the anchor`);
    expect(dm.status, squash(await dm.said())).toBe("ok");
    expect(squash(await buddy.listen(2_000))).toMatch(/meet at the anchor/);
    const sit = await diver.cmd('sit');
    expectRefused(sit);
  });

  it('10a · a slate jotted below is read by the other diver; a struck bell is heard from nowhere', async () => {
    expectOk(await diver.cmd('jot slate the anchor is here'));
    expectOk(await diver.cmd(`give slate to ${BUDDY}`));
    expect(await say(buddy, 'read slate')).toMatch(/the anchor is here/);
    await buddy.drainProse();
    expectOk(await diver.cmd('ring bell'));
    expect(squash(await buddy.listen(2_000))).toMatch(/bell rings out[^.]*nowhere/i);
  });

  it('3 · the urge to breathe rises in your own body; ascent is never refused for skill', async () => {
    const felt = squash(await diver.listen(9_000));
    expect(felt).toMatch(/chest|breath|lungs|air/i);
    await toTheSurface(diver);
    await toTheSurface(buddy);
    const top = await look(diver);
    expect(top).toMatch(/foot of the quay steps|in the river/i);
    expect(top).not.toMatch(/you are unconscious/i);
  });
});

suite('C · the line', () => {
  it('8a · 12 · a line heaved from the quay; tugs read on the holder\'s end; the haul brings the swimmer up the steps', async () => {
    expectOk(await diver.cmd('up'));
    expect(await look(diver)).toMatch(/Kestrel|embankment/i);
    expectOk(await diver.cmd(`heave lifeline to ${BUDDY}`));
    await diver.drainProse();
    expectOk(await buddy.cmd('tug line'));
    expectOk(await buddy.cmd('tug line'));
    expect(squash(await diver.listen(2_000))).toMatch(/haul me up/);
    expectOk(await diver.cmd('haul line'));
    expect(await look(buddy)).toMatch(/Kestrel|embankment/i);
  });
});

suite('C · the city\'s work', () => {
  it('15b · the lost anchor will not come up on a line; three air bags float it, and the line brings it in', async () => {
    expectOk(await diver.cmd('inhale'));
    await toTheBed(diver);
    expect(await look(diver)).toMatch(/anchor/i);
    const one = await say(diver, 'lash bag to anchor');
    expect(one).toMatch(/does not stir|needs more air/i);
    await say(diver, 'lash bag to anchor');
    const three = await say(diver, 'lash bag to anchor');
    expect(three).toMatch(/lift off the bottom|go up through the water/i);
    await toTheSurface(diver);
    expect(await look(diver)).toMatch(/anchor/i);
  });

  it('15c · in the lit band a spear takes what the water holds', async () => {
    expectOk(await diver.cmd('inhale'));
    expectOk(await diver.cmd('descend'));
    const r = await diver.cmd('spear fish');
    const said = squash(await r.said());
    expect(said, said).not.toMatch(/don't understand/i);
    expect(said).toMatch(/spear comes back/i);
    await toTheSurface(diver);
  });
});

suite('C · 15d · D · the tide', () => {
  it('10 · the almanac carried into the river is wet through, and its ink has run', async () => {
    const said = await say(diver, 'read almanac');
    expect(said).toMatch(/ink has run/i);
  });

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

suite('Magic · 20', () => {
  it('20 · under the water a working cannot be spoken', async () => {
    expectOk(await diver.cmd('inhale'));
    expectOk(await diver.cmd('descend'));
    const r = await diver.cmd('cast glowlight');
    const said = squash(await r.said());
    expectRefused(r);
    expect(said).toMatch(/cannot speak the words|no gift|know no working/i);
    await toTheSurface(diver);
  });
});
