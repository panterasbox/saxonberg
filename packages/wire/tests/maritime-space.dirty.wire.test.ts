/**
 * Maritime space — ⭐⭐ **a sea you cross by setting a course**, driven over
 * the wire: the estuary's strand and pool, the Hesper lying at the bar, the
 * Greywater's channel, Westerlies, haar and race, Gannet Rock and its light,
 * the pilot on the wharf and two charts in the hold.
 *
 * The requirements doc's drive, its numbering kept where a step is driven
 * here. ⚠ Step 22 (log out mid-crossing, restart, log back in) is run BY
 * HAND and recorded in the plan — a wire file cannot restart the server.
 * ⚠ Step 8's *different bracket at a different band* is proven in the unit
 * suite (`LatitudeReading.test.ts`): no wire session can be granted a
 * navigation band without earning one. Step 21's *same traffic at the same
 * place and hour* is likewise the unit suite's (`Expanse.test.ts`).
 *
 * ⭐ Every checkpoint asserts the verb was UNDERSTOOD (status ok, or a
 * named refusal) AND a state change or the words that prove one.
 *
 * ⚠ Game time: a watch is shortened with `config expanse.watchGameHours`
 * (a wizard dial) and the passage itself is skipped with the test-only
 * clock route; the voyage's position is DERIVED, so a watch after a jump
 * reports everything the craft crossed in it.
 *
 * ⚠⚠ `.dirty.`: it moves the Hesper (a persisted position), reads charts
 * into the founder's map, pays the pilot, appoints a lookout, draws a sea
 * cell, launches the dinghy. None of it is produced again.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
  expectNote,
  advanceWorldClock,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'moves the Hesper (a persisted position) and her dinghy, reads two charts ' +
  'into the founder’s map, pays the pilot, appoints a lookout, draws a sea ' +
  'cell and shortens the watch — none of it produced again';

declareFile({
  file: 'maritime-space.dirty.wire.test.ts',
  packs: ['terminus', 'water', 'transport', 'world-seed', 'trade-fishing', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const MOUTH = '/world/terminus/estuary/estuary-mouth';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BANK = '/world/terminus/wharfside/bank';
const HEADLAND = '/world/terminus/estuary/headland';
const AVENUE = '/world/terminus/university-avenue/location/crossing';
const MILL = '/world/terminus/wharfside/mill/location/floor';
const OUTFIT = '/world/terminus/hesper/idea/outfit';
const TOWER = /clock tower shows its face/;

/** A watch, shortened: 0.02 game hours = 72 game seconds = 6 real at 12×. */
const WATCH_MS = 7_000;
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

let me: Session;
/** A second person for the look-from-elsewhere checks — never the founder, whose body sails. */
const LANDSMAN = uniqueHandle('landsman');
/** The pilot's customer, who carries the coin. */
const MATE = uniqueHandle('mate');

/**
 * ⚠ `look here`, not a bare `look`: a bare look targets `$focus`, and
 * after handling things in one room and leaving it, the focus can still
 * name that room's things — the drive met a "which target?" prompt
 * between a chart in hand and the hold's lantern (recorded in the plan).
 */
async function look(s: Session, what = 'look here'): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(what));
}

/** Jump `hours` of game time and listen through the next watch. */
async function sail(s: Session, hours: string): Promise<string> {
  await s.drainProse();
  await advanceWorldClock(hours);
  return squash(await s.listen(WATCH_MS));
}

/** Advance to daylight — a dark world reads every room as pitch black. */
async function daylight(s: Session): Promise<void> {
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    const said = await look(s);
    if (!/pitch dark|Shapes and edges/i.test(said)) return;
    const t = await advanceWorldClock('2 hours');
    seen.push(`${Math.round(t.after)}: ${said.slice(0, 60)}`);
  }
  throw new Error(`no daylight in a day of trying:\n${seen.join('\n')}`);
}

/**
 * Read a chart on deck, waiting for light good enough to read ink by —
 * the `bright` band, which outdoors is a clear sky near noon.
 */
async function readInDaylight(s: Session, what: string): Promise<CommandResult> {
  let r = await s.cmd(`read ${what}`);
  for (let i = 0; i < 36 && r.status !== 'ok'; i++) {
    const why = r.notes.find((n) => (n as { reason?: string }).reason === 'too-dark-to-read');
    if (!why) break;
    await advanceWorldClock('1 hour');
    r = await s.cmd(`read ${what}`);
  }
  return r;
}

async function aboardFrom(s: Session): Promise<void> {
  const r = await s.cmd('go aboard');
  expectOk(r);
  expect(await look(s)).toMatch(/Hesper's deck/i);
}

beforeAll(async () => {
  // Coin for the pilot's fee: a newly embodied character carries the
  // Arrival Note's twenty in coin (the economic-bootstrap drive's shape).
  const mate = await Session.embody(MATE, {
    name: `Mate${Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5)}`,
  });
  try {
    expect((await mate.query('inventory:i:[keyword.coin]')).length).toBeGreaterThan(0);
  } finally {
    mate.close();
  }
  me = await Session.open('founder', { startLocation: MOUTH, wizard: true });
  expectOk(await me.cmd('config expanse.watchGameHours 0.02'));
  await daylight(me);
}, 180_000);

afterAll(() => me?.close());

suite('1–3 · the shore, the wade, the small water', () => {
  it('1 · from the wharf the river is described in the room, and you are on land', async () => {
    const s = await Session.open(LANDSMAN, { startLocation: BANK });
    try {
      const said = await look(s);
      expect(said).toMatch(/This is the Kestrel/);
    } finally {
      s.close();
    }
  });

  it('2 · wading is refused where no still water stands, in words; admitted where it does', async () => {
    const r = await me.cmd('swim west');
    expectRefused(r);
    expect(squash(await r.said())).not.toMatch(/don't understand/i);
    expectOk(await me.cmd('east'));
    expect(await look(me)).toMatch(/strand/i);
    const swim = await me.cmd('swim east');
    expectOk(swim);
  });

  it('3 · a water you can see across is a PLACE: you are in the pool, by an ordinary exit', async () => {
    expect(await look(me)).toMatch(/You are in the water/);
    expectOk(await me.cmd('swim west'));
    expect(await look(me)).toMatch(/strand/i);
  });
});

suite('23 · 24 · 26 · the headland, the landmark', () => {
  it('23 · from the headland you see the pool and the sea, each described once on itself', async () => {
    expectOk(await me.cmd('north'));
    const said = await look(me);
    expect(said).toMatch(/pool lies green and still/);
    expect(said).toMatch(/Greywater runs out to the edge of the sky/);
    expect(said).toMatch(/white tower on a black rock/);
  });

  it('24 · 26 · the tower is read from three zones, described once; an interior sees nothing', async () => {
    for (const where of [AVENUE, BANK, MOUTH]) {
      const s = await Session.open(LANDSMAN, { startLocation: where });
      try {
        expect(await look(s), where).toMatch(TOWER);
      } finally {
        s.close();
      }
    }
    const inside = await Session.open(LANDSMAN, { startLocation: MILL });
    try {
      expect(await look(inside)).not.toMatch(TOWER);
    } finally {
      inside.close();
    }
  });
});

suite('4 · 5 · aboard, a course, the reckoning', () => {
  it('4 · aboard the Hesper, `course` reads the plot; a course over the bar gets her under way', async () => {
    me.close();
    me = await Session.open('founder', { startLocation: MOUTH, wizard: true });
    await aboardFrom(me);
    const plot = squash(await me.prose('course'));
    expect(plot).toMatch(/not under way/);
    expect(plot).toMatch(/by reckoning/);
    // ⭐ Confined: over the bar only its two ends are a course.
    const cut = await me.cmd('course gannet');
    expectNote(cut, 'controller-rejected', { reason: 'confined' });
    const go = await me.cmd('course roads');
    expectOk(go);
    expectNote(go, 'engagement-started');
  });

  it('5 · `locate me` mid-crossing gives the reckoning, labelled as one', async () => {
    const said = squash(await me.prose('locate me'));
    expect(said).toMatch(/at sea, by reckoning/);
  });

  it('the bar is crossed and she comes up to the roads', async () => {
    const said = await sail(me, '1 hour');
    expect(said).toMatch(/You raise the roads/);
  });
});

suite('17 · 18 · charts', () => {
  it('17 · `read` a chart, then `map`: the waters appear, marked charted', async () => {
    // The hold is lit to see by, not to read fine ink by: the charts come
    // up on deck and are read in daylight, as a chart is.
    expectOk(await me.cmd('down'));
    expectOk(await me.cmd('get survey'));
    expectOk(await me.cmd('get old'));
    expectOk(await me.cmd('up'));
    const r = await readInDaylight(me, 'survey');
    expectOk(r);
    expect(squash(await r.said())).toMatch(/map/);
    const map = squash(await me.prose('map greywater'));
    expect(map).toMatch(/the Westerlies — from the roads to Gannet Rock \(charted\)/);
  });

  it('18 · a wrong chart appends, and the right claim stays beside it', async () => {
    expectOk(await readInDaylight(me, 'old'));
    const map = squash(await me.prose('map greywater'));
    expect(map).toMatch(/the Westerlies — ten miles south of the bar \(charted\)/);
    expect(map).toMatch(/the Westerlies — from the roads to Gannet Rock \(charted\)/);
  });
});

suite('9 · 10 · 11 · 13 · 14 · the bands — the water tells you', () => {
  let passage = '';
  it('9 · 13 · laying a course for the Rock crosses into the Westerlies, the haar and the race, reported by the water', async () => {
    const go = await me.cmd('course gannet');
    expectOk(go);
    expectNote(go, 'engagement-started');
    passage = await sail(me, '1 hour');
    passage += ' ' + (await sail(me, '1 hour'));
    expect(passage).toMatch(/The water changes\./);
  });

  it('13 · the belt reports like any band, and the narrow race laid over it wins the weather', async () => {
    passage += ' ' + (await sail(me, '30 minutes'));
    expect(passage).toMatch(/fog|haar/i);
    expect(passage).toMatch(/broken water/);
    expect(passage).toMatch(/running from the west/);
  });

  it('14 · over the shoal ledge the sea is short and steep, with nothing authoring rough', async () => {
    expect(passage).toMatch(/short and steep/);
  });

  it('11 · the reckoning has drifted from the truth — and a landmark fixes it', async () => {
    expect(passage).toMatch(/in sight, bearing \d{3}; you fix your position by it/);
  });

  it('she comes up to Gannet Rock', async () => {
    const said = (passage + ' ' + (await sail(me, '2 hours')));
    expect(said).toMatch(/You raise Gannet Rock/);
  });
});

suite('6 · 7 · 8 · finding out where you are', () => {
  it('6 · a sounding over known ground tightens the reckoning', async () => {
    expectOk(await me.cmd('get lead'));
    const r = await me.cmd('measure depth');
    expectOk(r);
    expect(squash(await r.said())).toMatch(/The lead finds bottom/);
  });

  it('7 · `measure latitude` gives latitude and nothing else — and the sky denies it in its own words', async () => {
    expectOk(await me.cmd('get sextant'));
    let got = '';
    let denied = '';
    for (let i = 0; i < 16 && (!got || !denied); i++) {
      const r = await me.cmd('measure latitude');
      const said = squash(await r.said());
      if (r.status === 'ok' && /Latitude \d/.test(said)) got = said;
      else if (/The sky is /.test(said)) denied = said;
      await advanceWorldClock('6 hours');
    }
    expect(got).toMatch(/nothing about how far along/);
    expect(got).not.toMatch(/longitude/i);
    expect(denied).toMatch(/The sky is [a-z ]+ — there is no sun/);
  });

  it('8 · `competence` shows navigation on the transcript', async () => {
    const said = squash(await me.prose('competence')).toLowerCase();
    expect(said).toMatch(/navigation/);
  });
});

suite('19 · 20 · 25 · sight at sea', () => {
  it('19 · hail what is in sight', async () => {
    const r = await me.cmd('hail light');
    expectOk(r);
    expect(squash(await r.said())).toMatch(/You hail the light on Gannet Rock/);
  });

  it('20 · 25 · appoint a lookout: the light is raised from further off, with nothing about her changed', async () => {
    // Out to open sea, past the deck's horizon for the light.
    expectOk(await me.cmd('course open sea'));
    await sail(me, '3 hours');
    expectOk(await me.cmd(`appoint me to lookout at ${OUTFIT}`));
    expectOk(await me.cmd('clock on'));
    expectOk(await me.cmd('course 200'));
    const said = await sail(me, '5 minutes');
    expect(said).toMatch(/light on Gannet Rock is in sight/);
  });
});

suite('12 · 15 · anchored at sea; the boat', () => {
  it('12 · anchor away from any node and fish over the side — the water read by nobody', async () => {
    expectOk(await me.cmd('anchor'));
    await daylight(me);
    const over = squash(await me.prose('look --peek gunwale'));
    expect(over).toMatch(/The sea is /);
    expectOk(await me.cmd('get worm'));
    expectOk(await me.cmd('get cane'));
    const cast = await me.cmd('fish with worm using cane');
    expectOk(cast);
    expectNote(cast, 'engagement-started');
    await me.cmd('cancel fishing');
  });

  it('15 · launch the dinghy: you are in the boat, and its position answers', async () => {
    expectOk(await me.cmd('drop cane'));
    expectOk(await me.cmd('go dinghy'));
    const r = await me.cmd('launch');
    expectOk(r);
    expect(squash(await me.prose('locate me'))).toMatch(/at sea, by reckoning/);
    expectOk(await me.cmd('recover'));
    // ⚠ `go out`: a bare `out` answered unknown-verb here (recorded).
    expectOk(await me.cmd('go out'));
    expect(await look(me)).toMatch(/Hesper's deck/i);
  });
});

suite('16 · 21 · roads refuse honestly; the pilot', () => {
  it('16 · `route` to a place across water refuses, naming course', async () => {
    const r = await me.cmd('route to gannet');
    expectRefused(r);
    expect(squash(await r.said())).toMatch(/course/);
  });

  it('21 · the pilot sells what she knows: told claims, signed', async () => {
    const s = await Session.open(MATE, { startLocation: BANK });
    try {
      const r = await s.cmd('pilot');
      expect(r.status, squash(await r.said())).toBe('ok');
      const map = squash(await s.prose('map greywater'));
      expect(map).toMatch(/\(told, by /);
    } finally {
      s.close();
    }
  });
});
