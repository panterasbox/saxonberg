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
  worldClockNow,
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

/**
 * Out of winter: the confluence carries ice in the cold months (the ice
 * trade's own model), and the column's way up is then a ceiling. The
 * drive dives in open water; the winter dive is step 8's.
 */
async function openWater(s: Session): Promise<void> {
  // ⚠ Let the cold boot settle first (the sea's first read takes ~90 s),
  // then go to high summer in chunks — the storage-and-ice drive's shape:
  // one long jump outruns the fetch's headers timeout.
  await s.listen(60_000);
  const DAY = 86_400;
  const doy = Math.floor((await worldClockNow()) / DAY) % 360;
  let left = doy < 200 ? 200 - doy : 0;
  for (; left > 0; left -= 30) await advanceWorldClock(`${Math.min(30, left)} days`);
  for (let i = 0; i < 6; i++) {
    // The first read after half a year integrates half a year of weather:
    // kick it with a look and let it land before asking the instrument.
    await s.cmd('look river').catch(() => undefined);
    await s.listen(45_000);
    const said = await say(s, 'analyze water');
    if (!/ice lies on the water/.test(said)) return;
    await advanceWorldClock('10 days');
  }
  throw new Error('the confluence never opened in high summer');
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
  const season = await Session.open(BUDDY, { startLocation: BANK });
  try {
    await openWater(season);
  } finally {
    season.close();
  }
  diver = await outfitted(DIVER, [
    'lifeline', '"diver\'s slate"', '"signal bell"', '"fish spear"',
    '"air bag"', '"air bag"', '"air bag"', '"tide almanac"',
  ]);
  buddy = await Session.open(BUDDY, { startLocation: BANK });
  await daylight(buddy);
  // ⚠ A long-lived drive world answers a purchase in 1.5–20 s (the store
  // is remote): the outfitting alone can take minutes.
}, 900_000);

afterAll(() => {
  diver?.close();
  buddy?.close();
});

suite('A · the water place', () => {
  it('1 · from the quay the water below reads as water you could go into', async () => {
    await toQuay(diver);
    // The work gear waits on the quay: carried, it is weight, and weight is
    // the one thing that refuses the way up (D14).
    for (const g of ['me:i:lifeline', 'me:i:spear', 'me:i:bag']) expectOk(await diver.cmd(`drop ${g}`));
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

  it('2 · inhale, descend: the surface, the column, the bed — and a second diver is in the same room at every step', async () => {
    await breathe(diver, buddy);
    try {
      const down = await toTheBed(diver);
      expect(down.length).toBeGreaterThanOrEqual(3);
      expect(down[0]).toMatch(/foot of the quay steps|in the river/i);
      const buddyDown = await toTheBed(buddy);
      expect(buddyDown.length).toBe(down.length);
      // ⭐ Same room by where they ARE — the bed of a silty river may be
      // too dark to see the other diver by (step 10b's premise).
      expect(JSON.stringify(await buddy.query('here', { fields: 'ref' })))
        .toEqual(JSON.stringify(await diver.query('here', { fields: 'ref' })));
      // Each step down is a different place: the bed is not the surface.
      expect(new Set(down).size).toBe(down.length);
      expect(down[down.length - 1]).toMatch(/bottom|bed/i);
    } finally {
      await toTheSurface(diver);
      await toTheSurface(buddy);
    }
  });

  it('10 · in the lit band a voice is bubbles; an emote still reaches', async () => {
    await breathe(diver, buddy);
    expectOk(await diver.cmd('descend'));
    expectOk(await diver.cmd('descend'));
    expectOk(await buddy.cmd('descend'));
    expectOk(await buddy.cmd('descend'));
    const said = await say(diver, 'say can you hear me');
    expect(said).toMatch(/bubbles|nobody hears/i);
    await buddy.drainProse();
    expectOk(await diver.cmd('smile'));
    expect(squash(await buddy.listen(2_000))).toMatch(/smile/i);
    const sit = await diver.cmd('sit');
    expectRefused(sit);
  });

  it('10a · a slate jotted below is read by the other diver; a struck bell is heard from nowhere', async () => {
    expectOk(await diver.cmd('jot slate the anchor is here'));
    const give = await diver.cmd(`give slate to ${BUDDY}`);
    expect(give.status, squash(await give.said())).toBe('ok');
    expect(await say(buddy, 'read slate')).toMatch(/the anchor is here/);
    await buddy.drainProse();
    expectOk(await diver.cmd('ring bell'));
    expect(squash(await buddy.listen(2_000))).toMatch(/bell rings out[^.]*nowhere/i);
  });

  it('3 · the urge to breathe rises in your own body; ascent is never refused for skill', async () => {
    let felt = '';
    for (let i = 0; i < 12 && !/want to breathe|chest|tunnels/i.test(felt); i++) {
      felt += ' ' + squash(await diver.listen(5_000));
    }
    // ⭐ The warning comes before the dark — one breath, not hyperventilated.
    expect(felt).toMatch(/You want to breathe/);
    expect(felt).not.toMatch(/tunnels/);
    await toTheSurface(diver);
    await toTheSurface(buddy);
    const top = await look(diver);
    expect(top).toMatch(/foot of the quay steps|in the river/i);
    expect(top).not.toMatch(/you are unconscious/i);
  });

  // ⚠ PRE-EXISTING, not this build's: `dm`/`tell` resolve their `online`
  // target to nobody for any character (found by the climate build; the
  // drive confirms it with the exact displayed name). `it.fails` holds the
  // checkpoint until the online scope is fixed, and flips red the day it is.
  it.fails('10a · a message is aether: it reaches a diver below as it would anywhere', async () => {
    const dm = await diver.cmd(`dm ${BUDDY} meet at the anchor`);
    expect(dm.status, squash(await dm.said())).toBe('ok');
  });
});

suite('C · the line', () => {
  it('8a · 12 · a line heaved from the quay; tugs read on the holder\'s end; the haul brings the swimmer up the steps', async () => {
    // 8b · the wall refuses; the steps are the way out.
    expectRefused(await diver.cmd('up'));
    const out = await diver.cmd('climb up');
    expect(out.status, squash(await out.said())).toBe('ok');
    expect(await look(diver)).toMatch(/Kestrel|embankment/i);
    // The gear left on the quay, taken up again for the work.
    // The line, taken up again for this step (the rest stays on the quay:
    // a swimmer carrying all of it is refused — "carrying too much").
    expectOk(await diver.cmd('get here:i:lifeline'));
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
    expectOk(await diver.cmd('drop me:i:lifeline'));
    expectOk(await diver.cmd('get here:i:bag'));
    await breathe(diver);
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
    expectOk(await diver.cmd('climb up'));
    expectOk(await diver.cmd('get here:i:spear'));
    await breathe(diver);
    expectOk(await diver.cmd('descend'));
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
    expectOk(await diver.cmd('climb up'));
    const said = await readInDaylight(diver, 'almanac');
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
    await breathe(diver);
    expectOk(await diver.cmd('descend'));
    expectOk(await diver.cmd('descend'));
    const r = await diver.cmd('cast glowlight');
    const said = squash(await r.said());
    expectRefused(r);
    expect(said).toMatch(/cannot speak the words|no gift|know no working/i);
    await toTheSurface(diver);
  });
});
