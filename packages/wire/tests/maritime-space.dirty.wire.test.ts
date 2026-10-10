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
 * ⭐ Revision 1 (perception at range): nothing on the horizon is ever
 * announced. `look horizon` and `watch horizon` are acts; the hired
 * lookout CALLS what she sees; a fix is `measure bearing`. The crossing
 * report is a derived delta, and the haar's fog is the weather field's.
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
const HOLD = '/world/terminus/hesper/hold';
const AVENUE = '/world/terminus/university-avenue/location/crossing';
const MILL = '/world/terminus/wharfside/mill/location/floor';
const OUTFIT = '/world/terminus/hesper/idea/outfit';
/** The tower as `look horizon` features it, and its own description. */
const FEATURED_TOWER = /You can see the terminal clock tower/;
const TOWER_SAYS = /square brick shaft/;
const LIGHT = /light on Gannet Rock/;

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

/**
 * `look horizon` until `want` is in view, waiting out the weather between
 * looks (fog and rain shorten sight). The craft must be at anchor or
 * ashore — waiting moves nothing else.
 */
async function horizonUntil(s: Session, want: RegExp, tries = 8): Promise<string> {
  let said = '';
  for (let i = 0; i < tries; i++) {
    said = await look(s, 'look horizon');
    if (want.test(said)) return said;
    await advanceWorldClock('3 hours');
  }
  return said;
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

suite('23 · 24 · the horizon ashore', () => {
  it('23 · the strand raises the Hesper and not the light; the headland above it raises the light', async () => {
    const strand = await horizonUntil(me, /Hesper/);
    expect(strand).toMatch(/Hesper/);
    expect(strand).not.toMatch(LIGHT);
    expectOk(await me.cmd('north'));
    const head = await horizonUntil(me, LIGHT);
    expect(head).toMatch(/You can see the light on Gannet Rock, to the north-east, some \d+ miles off/);
    // ⛔ The room's own look repeats nothing from outside it.
    expect(await look(me)).not.toMatch(LIGHT);
    const drill = await look(me, 'look horizon:light');
    expect(drill).toMatch(/white tower on a black rock/);
    expectOk(await me.cmd('south'));
  });

  it('24 · the tower is featured from three zones and read once; an interior sees nothing', async () => {
    for (const where of [AVENUE, BANK, MOUTH]) {
      const s = await Session.open(LANDSMAN, { startLocation: where });
      try {
        expect(await horizonUntil(s, FEATURED_TOWER), where).toMatch(FEATURED_TOWER);
        expect(await look(s, 'look horizon:tower'), where).toMatch(TOWER_SAYS);
        expect(await look(s), where).not.toMatch(TOWER_SAYS);
      } finally {
        s.close();
      }
    }
    const inside = await Session.open(LANDSMAN, { startLocation: MILL });
    try {
      expect(await look(inside, 'look horizon')).toMatch(/Nothing beyond where you stand/);
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

suite('9 · 11 · 13 · 14 · 26 · the bands — the water says what changed', () => {
  let passage = '';
  let latitudeInFog = '';
  it('9 · laying a course for the Rock: a current takes her as she enters the Westerlies', async () => {
    const go = await me.cmd('course gannet');
    expectOk(go);
    expectNote(go, 'engagement-started');
    // Short legs, so a watch falls INSIDE the haar (two and a half miles
    // of it) — a long jump would carry her straight through.
    for (let i = 0; i < 30 && !/You raise Gannet Rock/.test(passage); i++) {
      const leg = await sail(me, '10 minutes');
      passage += ' ' + leg;
      if (/Fog closes in/.test(leg) && !latitudeInFog) {
        expectOk(await me.cmd('get sextant'));
        latitudeInFog = squash(await (await me.cmd('measure latitude')).said());
      }
    }
    expect(passage).toMatch(/A current takes her, setting north-east\./);
  });

  it('26 · into the haar: fog closes in, and the sextant is refused by the fog', () => {
    expect(passage).toMatch(/Fog closes in\./);
    expect(latitudeInFog).toMatch(/The sky is fog — there is no sun/);
  });

  it('13 · 14 · over the race the sea gets up, short and steep, with nothing authoring rough', () => {
    expect(passage).toMatch(/The sea gets up — [a-z ]+, short and steep\./);
  });

  it('11 · ⛔ nothing fixes her and nothing is sighted by being seen', () => {
    expect(passage).not.toMatch(/fix your position|A sail:/);
  });

  it('she comes up to Gannet Rock', () => {
    expect(passage).toMatch(/You raise Gannet Rock/);
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
    await me.cmd('get sextant');
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
  it('19 · `look horizon` at the Rock shows the light; `look horizon:light` reads it; `hail` it', async () => {
    const said = await look(me, 'look horizon');
    expect(said).toMatch(/You can see the light on Gannet Rock/);
    expect(await look(me, 'look horizon:light')).toMatch(/white tower on a black rock/);
    const r = await me.cmd('hail light');
    expectOk(r);
    expect(squash(await r.said())).toMatch(/You hail the light on Gannet Rock/);
  });

  it('19 · ⭐ somebody below decks sees nothing of it', async () => {
    const s = await Session.open(LANDSMAN, { startLocation: HOLD });
    try {
      expect(await look(s, 'look horizon')).toMatch(/Nothing beyond where you stand/);
    } finally {
      s.close();
    }
  });

  it('20 · ⭐ a watch from the deck misses the light; an appointed lookout calls it', async () => {
    // Out past the deck's horizon for the light, inside the masthead's,
    // and at anchor so the weather can be waited out without moving.
    expectOk(await me.cmd('course open sea'));
    await sail(me, '3 hours');
    expectOk(await me.cmd('anchor'));
    const w = await me.cmd('watch horizon');
    expectOk(w);
    expect(squash(await w.said())).toMatch(/You settle to watching the horizon/);
    // ⛔ Nobody in the seat: nobody calls anything.
    const quiet = squash(await me.listen(35_000));
    expect(quiet).not.toMatch(LIGHT);
    expectOk(await me.cmd(`appoint tam to lookout at ${OUTFIT}`));
    let called = '';
    for (let i = 0; i < 6 && !LIGHT.test(called); i++) {
      called = squash(await me.listen(40_000));
      if (!LIGHT.test(called)) await advanceWorldClock('3 hours');
    }
    expect(called).toMatch(/Tam Rook[^]*light on Gannet Rock[^]*!/);
    expectOk(await me.cmd('watch off'));
  });

  it('25 · close the coast, raise the light, and `measure bearing` on it to fix your position', async () => {
    expectOk(await me.cmd('get compass'));
    expectOk(await me.cmd('course gannet'));
    let seen = '';
    for (let i = 0; i < 24 && !LIGHT.test(seen); i++) {
      await sail(me, '10 minutes');
      seen = await look(me, 'look horizon');
    }
    expect(seen).toMatch(LIGHT);
    expectOk(await me.cmd('anchor'));
    const r = await me.cmd('measure bearing light');
    expectOk(r);
    expect(squash(await r.said())).toMatch(/The light on Gannet Rock bears \d{3}° ± [\d.]+°\. .*fixes you to within/);
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
