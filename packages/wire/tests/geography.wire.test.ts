/**
 * ⭐⭐ The geography build's DRIVE (its exit criterion) — the requirements'
 * blocking drive, over the real socket against an owned world: the realm
 * on the chart, one horizon for land, river and sea, a skyline worked out
 * from the content rows and kept, the rough direction for everyone and the
 * bearing for the instrument.
 *
 * ⭐ The expected reads come from the realm's chart (geography D12) ON THIS
 * WORLD — a third of Earth's radius, so a degree is 20 nm and the horizon
 * is √⅓ as far (sugar D12). From Hinkley Hills (a 132 m eye) the light on
 * Gannet Rock is ~73°, 18.2 nm — *to the east, some 18 miles off*. From
 * the Market (a 37 m eye) the same light, 18.7 nm off, is UNDER the
 * horizon — an honest small-world answer the drive asserts. The Terminal is
 * *close by* from inside the city. The headland raises the light; the strand
 * below it does not.
 *
 * ⚠ Departures from the requirements' drive, each for a reason (the owed
 * tools are in geography-slate § Open 8):
 *  - **2** the eye reads ±10° and the compass ±5° for an untrained reader;
 *    no harness tool stages a Navigation competence, so the narrowing BY
 *    BAND is the unit suite's (`BearingReading.test.ts`). The tool is owed.
 *  - **11** (a tower written and pulled down by `edit -c` / `rm`) is the
 *    unit suite's (`LocationGraphRegistry.skyline.test.ts` — a row saved,
 *    re-heighted and removed changes the next read): `edit -c` takes its
 *    data as a structured payload and the harness's `cmd()` sends text only
 *    (the wizard-axis drive's same finding). The channel is owed.
 *  - **12** is at Hinkley Hills, not Hollow Mere: the mere keeps its
 *    zone's 58° S (Q1 deferred — geography-slate § Open 4).
 *
 * Clean: every act is a read, a posture or a staged override that is put
 * back (a weather pin is unpinned; the Hesper is left where step 9 staged
 * her, at the bar, as the harbors drive stages her); the clock jump is a
 * night, and the restart steps run only in a world this run owns.
 */

import { describe as suite, it, expect, beforeAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
  stage,
  stageShip,
  hand,
  pinWeather,
  unpinWeather,
  restartWorld,
} from '../src/harness';
import { afterAll } from 'vitest';

declareFile({
  file: 'geography.wire.test.ts',
  packs: [
    'saxonberg-lounge',
    'terminus',
    'world-seed',
    'hinkley-hills',
    'hollow-mere',
    'generic-objects',
    'transport',
    'water',
  ],
});

const MARKET = '/world/terminus/market/square';
const HINKLEY = '/world/terminus/hinkley-hills/place/arrival';
const HINKLEY_LANE = '/world/terminus/hinkley-hills/place/lane';
const LANDING = '/world/terminus/gannet-rock/landing';
const GALLERY = '/world/terminus/gannet-rock/gallery';
const LADDER_LOW = '/world/terminus/gannet-rock/ladder-low';
const HALL = '/world/terminus/terminal/place/hall';
const AVENUE = '/world/terminus/university-avenue/place/crossing';
const BANK = '/world/terminus/wharfside/bank';
const QUAY = '/world/terminus/harbor/fish-quay';
const STRAND = '/world/terminus/estuary/strand';
const BROW = '/world/terminus/estuary/headland/brow';
const MILL = '/world/terminus/wharfside/mill/place/floor';
const MOOR = '/world/moor/stormy-heath';
const HESPER = '/world/terminus/hesper/structure';
const HESPER_DECK = '/world/terminus/hesper/deck';
const BAR = '/stuff/idea/WaterExpanse/greywater/bar';
const ROCK_NODE = '/stuff/idea/WaterExpanse/greywater/gannet-rock';
const COMPASS = '/stuff/thing/instrument/hand-compass';
const SEXTANT = '/stuff/thing/instrument/sextant';
const DAY = 86_400;
/** Where the drive reads the sky — pinned clear (one pin per covering Locality), unpinned after. */
const PINNED = [MARKET, HINKLEY, BANK, AVENUE];
/** Ten miles from the rock toward the coast: in the gallery's reach (12.1 nm), past the landing's (6.9). */
const OFF_THE_ROCK = { latDeg: 42.2905, lonDeg: -8.0943 };

const handle = uniqueHandle('surveyor');

/** `query horizon` at `where`, as plain prose. */
async function horizonAt(where: string, who = handle): Promise<string> {
  const s = await Session.open(who, { startLocation: where });
  try {
    await s.drainProse();
    // The arrival `look` (as a client sends on entering) stands up what the
    // horizon will name; the query that follows reads it complete (D9).
    await s.prose('look');
    return plain(await s.prose('query ~horizon'));
  } finally {
    s.close();
  }
}

/** The line naming `what` in a horizon listing, or ''. */
const lineOf = (prose: string, what: RegExp): string =>
  prose.split(/(?<=\.)\s+|,\s+(?=the |a |an )/).find((l) => what.test(l)) ?? '';

const record: string[] = [];
const note = (step: string, text: string): void => {
  record.push(`${step}: ${text}`);
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${step}: ${text.replace(/\s*\n\s*/g, " / ").slice(0, 500)}`);
};

beforeAll(async () => {
  // ⭐ Daylight first: every skyline read but step 7's is a day read.
  if (!isOwnedTestWorld()) return;
  const sec = (await worldClockNow()) % DAY;
  const toNoon = sec <= 12 * 3600 ? 12 * 3600 - sec : DAY + 12 * 3600 - sec;
  if (toNoon > 60) await advanceWorldClock(`${Math.round(toNoon / 60)} minutes`);
  for (const scope of PINNED) await pinWeather('clear', scope);
}, 600_000);

afterAll(async () => {
  if (!isOwnedTestWorld()) return;
  for (const scope of PINNED) await unpinWeather(scope).catch(() => undefined);
});

suite('geography — the drive', { timeout: 300_000 }, () => {
  let marketByDay = '';

  it('1 · the Market: the Terminal close by; the light, 18.7 nm off, under a 37 m eye\'s horizon', async () => {
    marketByDay = await horizonAt(MARKET);
    note('1', marketByDay);
    expect(marketByDay).toMatch(/clock tower[^.]*close by/i);
    expect(marketByDay).not.toMatch(/light on Gannet Rock/i);
    // Landmarks first: the first sentence names a landmark.
    expect(marketByDay.split('.')[0]).toMatch(/clock tower/i);
  });

  it('2 · `analyze bearing` by eye and `measure bearing` with the compass on the light', async () => {
    const s = await Session.open(handle, { startLocation: HINKLEY });
    try {
      await s.drainProse();
      const eye = plain(await s.prose('analyze bearing light'));
      note('2 eye', eye);
      expect(eye).toMatch(/bears 0(6|7|8)\d° ± 10°/);
      await hand(s, COMPASS);
      const compass = plain(await s.prose('measure bearing light'));
      note('2 compass', compass);
      expect(compass).toMatch(/bears 0(6|7|8)\d° ±/);
      expect(compass).toMatch(/second bearing/i);
    } finally {
      s.close();
    }
    const m = await Session.open(handle, { startLocation: MARKET });
    try {
      await m.drainProse();
      const near = plain(await m.prose('analyze bearing tower'));
      note('2 tower', near);
      expect(near).toMatch(/too near/i);
    } finally {
      m.close();
    }
  });

  it('3 · Hinkley Hills: the light to the east — the two rough reads agree on one place', async () => {
    const hills = await horizonAt(HINKLEY);
    note('3', hills);
    expect(hills).toMatch(/light on Gannet Rock\s*, to the east, some (17|18|19) miles off/i);
    expect(hills).toMatch(/clock tower\s*, to the south/i);
  });

  it('4 · the Market\'s Terminal line carries no compass point', () => {
    const tower = lineOf(marketByDay, /clock tower/i);
    expect(tower).not.toMatch(/to the (north|south|east|west)/i);
  });

  it('5 · Gannet Rock: the gallery raises what the landing cannot', async () => {
    // The Hesper on the Greywater, ten miles toward the coast (staged).
    await stageShip(HESPER, { at: { node: ROCK_NODE } });
    await stage(HESPER, 'setExpansePosition', OFF_THE_ROCK);
    // The rock's sky is the realm-wide field once its landing stands: pin it
    // if a Locality covers it, else say what the sky was doing.
    const look = await Session.open(handle, { startLocation: LANDING });
    look.close();
    await pinWeather('clear', LANDING).catch((err) => note('5 sky', String(err)));
    const low = await horizonAt(LANDING);
    const s = await Session.open(handle, { startLocation: LADDER_LOW });
    let high = '';
    try {
      await s.drainProse();
      await s.cmd('up');
      await s.cmd('up');
      await s.drainProse();
      await s.prose('look');
      high = plain(await s.prose('query ~horizon'));
    } finally {
      s.close();
    }
    note('5 landing', low);
    note('5 gallery', high);
    expect(low).not.toMatch(/light on Gannet Rock/i); // its own structure
    expect(high).toMatch(/Hesper/i);
    expect(low).not.toMatch(/Hesper/i);
  });

  it('6 · a roofed room: nothing beyond its walls', async () => {
    const hall = await horizonAt(HALL);
    note('6', hall);
    expect(hall).not.toMatch(/light on Gannet Rock|clock tower\s*, /i);
  });

  it('8 · a blocked sector across the light: it is gone, and comes back', async () => {
    await stage(HINKLEY_LANE, 'setHorizon', { block: [{ from: 55, to: 95, beyondNm: 2 }] });
    try {
      const blocked = await horizonAt(HINKLEY_LANE);
      note('8 blocked', blocked);
      expect(blocked).not.toMatch(/light on Gannet Rock/i);
    } finally {
      await stage(HINKLEY_LANE, 'setHorizon', null);
    }
    expect(await horizonAt(HINKLEY_LANE)).toMatch(/light on Gannet Rock/i);
  });

  it('9 · the headland brow raises the Hesper at the bar and the light; aboard her, the land', async () => {
    await stageShip(HESPER, { at: { node: BAR } });
    const brow = await horizonAt(BROW);
    note('9 brow', brow);
    expect(brow).toMatch(/Hesper[^.]*to the/i);
    expect(brow).toMatch(/light on Gannet Rock\s*, to the/i);
    const deck = await horizonAt(HESPER_DECK);
    note('9 deck', deck);
    expect(deck).toMatch(/clock tower[^.]*to the/i);
  });

  it('10 · D5\'s table: every recast place still sees what it saw', async () => {
    const rows: Array<[string, string, RegExp, RegExp | null]> = [
      ['University Avenue', AVENUE, /clock tower[^.]*close by/i, null],
      ['Wharfside', BANK, /clock tower\s*, to the (north-west|west)/i, /light on Gannet Rock/i],
      ['the Harbor', QUAY, /clock tower/i, null],
      ['the Estuary', STRAND, /clock tower\s*, to the/i, /light on Gannet Rock/i],
      ['the Headland', BROW, /light on Gannet Rock/i, null],
      ['the mill', MILL, /^(?![\s\S]*clock tower)/i, /light on Gannet Rock/i],
    ];
    for (const [name, where, must, mustNot] of rows) {
      const seen = await horizonAt(where);
      note(`10 ${name}`, seen);
      expect(seen, name).toMatch(must);
      if (mustNot) expect(seen, name).not.toMatch(mustNot);
    }
  });

  it('12 · Hinkley Hills: the sextant reads the Locality\'s latitude', async () => {
    const s = await Session.open(handle, { startLocation: HINKLEY });
    try {
      await s.drainProse();
      await hand(s, SEXTANT);
      const lat = plain(await s.prose('measure latitude'));
      note('12', lat);
      expect(lat).toMatch(/Latitude 42(\.\d)?° N/);
    } finally {
      s.close();
    }
  });

  it('13 · the Weeping Moor (a test world): no skyline', async () => {
    const moor = await horizonAt(MOOR);
    note('13', moor);
    expect(moor).not.toMatch(/miles off|close by/i);
  });

  it('15 · nothing the client is sent carries a true bearing', async () => {
    const s = await Session.open(handle, { startLocation: MARKET });
    try {
      await s.drainProse();
      await s.prose('look');
      await s.cmd('query ~horizon');
      const frames = JSON.stringify(s.framesOf('sense.survey'));
      expect(frames.length).toBeGreaterThan(20);
      expect(frames).not.toMatch(/bearingDeg/);
      expect(frames).not.toMatch(/\b\d{3}°/);
    } finally {
      s.close();
    }
  });

  it.skipIf(!isOwnedTestWorld())('7 · by night at Hinkley Hills: the light, and not the Terminal', async () => {
    const sec = (await worldClockNow()) % DAY;
    const toOne = sec <= 3600 ? 3600 - sec : DAY + 3600 - sec;
    await advanceWorldClock(`${Math.round(toOne / 60)} minutes`);
    const night = await horizonAt(HINKLEY);
    note('7', night);
    expect(night).toMatch(/light on Gannet Rock/i);
    expect(night).not.toMatch(/clock tower/i);
  });

  it.skipIf(!isOwnedTestWorld())('14 · restart: Hinkley Hills reads the same, from the rows', async () => {
    await restartWorld();
    const after = await horizonAt(HINKLEY);
    note('14', after);
    // Night still (step 7 left the clock there): the lit light, by the rows.
    expect(after).toMatch(/light on Gannet Rock\s*, to the east, some (17|18|19) miles off/i);
  }, 900_000);
});
