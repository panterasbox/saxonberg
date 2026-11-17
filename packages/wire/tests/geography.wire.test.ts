/**
 * ⭐⭐ The geography build's DRIVE (its exit criterion) — the requirements'
 * blocking drive, over the real socket against an owned world: the realm
 * on the chart, one horizon for land, river and sea, a skyline worked out
 * from the content rows and kept, the rough direction for everyone and the
 * bearing for the instrument.
 *
 * ⭐ The expected reads come from geography-plan D12's geometry: from the
 * Market (the city's point, 37 m eye) the light on Gannet Rock is ~58°,
 * 18.7 nm — *to the north-east, some 19 miles off*; from Hinkley Hills ~73°,
 * 18.2 nm — *to the east*. The Terminal is *close by* from inside the city.
 *
 * ⚠ Departures from the plan's table, each for a reason (recorded in the
 * plan's drive record):
 *  - **2** bare-handed and with the compass both read ±10°: no harness tool
 *    stages a Navigation competence, so the narrowing is the unit suite's
 *    (`BearingReading.test.ts` — the bracket by band). The tool is owed.
 *  - **11** (a tower written and pulled down by `edit -c` / `rm`) is the
 *    unit suite's (`LocationGraphRegistry.skyline.test.ts` — a row saved,
 *    re-heighted and removed changes the next read): `edit -c` takes its
 *    data as a structured payload and the harness's `cmd()` sends text only
 *    (the wizard-axis drive's same finding). The channel is owed.
 *  - **12** is at Hinkley Hills, not Hollow Mere: the mere keeps its
 *    zone's 58° S this build (Q1 deferred — see the plan).
 *
 * Clean: every act is a read, a posture or a staged override that is put
 * back; the clock jump is a night, and the restart steps run only in a
 * world this run owns.
 */

import { describe as suite, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join } from 'path';
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
} from '../src/harness';
import { bootOwnedWorld, WIRE_PORT } from '../src/runner/boot';

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
const HINKLEY = '/world/terminus/hinkley-hills/location/arrival';
const HINKLEY_LANE = '/world/terminus/hinkley-hills/location/lane';
const LANDING = '/world/terminus/gannet-rock/landing';
const GALLERY = '/world/terminus/gannet-rock/gallery';
const LADDER_LOW = '/world/terminus/gannet-rock/ladder-low';
const HALL = '/world/terminus/terminal/location/hall';
const AVENUE = '/world/terminus/university-avenue/location/crossing';
const BANK = '/world/terminus/wharfside/bank';
const QUAY = '/world/terminus/harbor/fish-quay';
const STRAND = '/world/terminus/estuary/strand';
const BROW = '/world/terminus/estuary/headland/brow';
const MILL = '/world/terminus/wharfside/mill/location/floor';
const MOOR = '/world/moor/stormy-heath';
const HESPER = '/world/terminus/hesper/structure';
const HESPER_DECK = '/world/terminus/hesper/deck';
const BAR = '/stuff/idea/WaterExpanse/greywater/bar';
const COMPASS = '/stuff/thing/instrument/hand-compass';
const SEXTANT = '/stuff/thing/instrument/sextant';
const DAY = 86_400;

const handle = uniqueHandle('surveyor');

/** `query horizon` at `where`, as plain prose. */
async function horizonAt(where: string, who = handle): Promise<string> {
  const s = await Session.open(who, { startLocation: where });
  try {
    await s.drainProse();
    return plain(await s.prose('query horizon'));
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
  console.log(`  [drive] ${step}: ${text.slice(0, 400)}`);
};

beforeAll(async () => {
  // ⭐ Daylight first: every skyline read but step 7's is a day read.
  if (!isOwnedTestWorld()) return;
  const sec = (await worldClockNow()) % DAY;
  const toNoon = sec <= 12 * 3600 ? 12 * 3600 - sec : DAY + 12 * 3600 - sec;
  if (toNoon > 60) await advanceWorldClock(`${Math.round(toNoon / 60)} minutes`);
  for (const scope of [MARKET, HINKLEY, LANDING, BROW, STRAND, AVENUE, BANK, QUAY]) {
    await pinWeather(scope, 'clear').catch(() => undefined);
  }
}, 600_000);

suite('geography — the drive', { timeout: 300_000 }, () => {
  let marketByDay = '';

  it('1 · the Market: the Terminal close by, the light to the north-east some 19 miles off, landmarks first', async () => {
    marketByDay = await horizonAt(MARKET);
    note('1', marketByDay);
    expect(marketByDay).toMatch(/clock tower[^.]*close by/i);
    expect(marketByDay).toMatch(/light on Gannet Rock, to the north-east, some (18|19|20) miles off/i);
    // Landmarks first: the first sentence names a landmark.
    expect(marketByDay.split('.')[0]).toMatch(/clock tower|light on Gannet Rock/i);
  });

  it('2 · `analyze bearing` by eye and `measure bearing` with the compass on the light', async () => {
    const s = await Session.open(handle, { startLocation: MARKET });
    try {
      await s.drainProse();
      const eye = plain(await s.prose('analyze bearing light'));
      note('2 eye', eye);
      expect(eye).toMatch(/bears 0(5|6)\d° ± 10°/);
      await hand(s, COMPASS);
      const compass = plain(await s.prose('measure bearing light'));
      note('2 compass', compass);
      expect(compass).toMatch(/bears 0(5|6)\d° ±/);
      expect(compass).toMatch(/second bearing/i);
      const near = plain(await s.prose('measure bearing tower'));
      note('2 tower', near);
      expect(near).toMatch(/too near/i);
    } finally {
      s.close();
    }
  });

  it('3 · Hinkley Hills: the light to the east — the two rough reads agree on one place', async () => {
    const hills = await horizonAt(HINKLEY);
    note('3', hills);
    expect(hills).toMatch(/light on Gannet Rock, to the east, some (17|18|19) miles off/i);
  });

  it('4 · the Market\'s Terminal line carries no compass point', () => {
    const tower = lineOf(marketByDay, /clock tower/i);
    expect(tower).not.toMatch(/to the (north|south|east|west)/i);
  });

  it('5 · Gannet Rock: the gallery raises what the landing cannot', async () => {
    const low = await horizonAt(LANDING);
    const s = await Session.open(handle, { startLocation: LADDER_LOW });
    let high = '';
    try {
      await s.drainProse();
      await s.cmd('up');
      await s.cmd('up');
      await s.drainProse();
      high = plain(await s.prose('query horizon'));
    } finally {
      s.close();
    }
    note('5 landing', low);
    note('5 gallery', high);
    expect(low).not.toMatch(/light on Gannet Rock/i); // its own structure
    expect(high).toMatch(/rubber works/i);
    expect(low).not.toMatch(/rubber works/i);
  });

  it('6 · a roofed room: nothing beyond its walls', async () => {
    const hall = await horizonAt(HALL);
    note('6', hall);
    expect(hall).not.toMatch(/light on Gannet Rock|clock tower, /i);
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
    expect(brow).toMatch(/light on Gannet Rock, to the/i);
    const deck = await horizonAt(HESPER_DECK);
    note('9 deck', deck);
    expect(deck).toMatch(/clock tower[^.]*to the/i);
  });

  it('10 · D5\'s table: every recast place still sees what it saw', async () => {
    const rows: Array<[string, string, RegExp, RegExp | null]> = [
      ['University Avenue', AVENUE, /clock tower[^.]*close by/i, null],
      ['Wharfside', BANK, /clock tower, to the (north-west|west)/i, null],
      ['the Harbor', QUAY, /clock tower/i, null],
      ['the Estuary', STRAND, /clock tower, to the/i, /light on Gannet Rock/i],
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
      await s.cmd('query horizon');
      const frames = JSON.stringify(s.framesOf('sense.survey'));
      expect(frames.length).toBeGreaterThan(20);
      expect(frames).not.toMatch(/bearingDeg/);
      expect(frames).not.toMatch(/\b\d{3}°/);
    } finally {
      s.close();
    }
  });

  it.skipIf(!isOwnedTestWorld())('7 · by night: the light, and not the Terminal', async () => {
    const sec = (await worldClockNow()) % DAY;
    const toOne = sec <= 3600 ? 3600 - sec : DAY + 3600 - sec;
    await advanceWorldClock(`${Math.round(toOne / 60)} minutes`);
    const night = await horizonAt(MARKET);
    note('7', night);
    expect(night).toMatch(/light on Gannet Rock/i);
    expect(night).not.toMatch(/clock tower/i);
  });

  it.skipIf(!isOwnedTestWorld())('14 · restart: the Market reads the same, from the rows', async () => {
    const serverDir = fileURLToPath(new URL('../../server', import.meta.url));
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
      env: { ...process.env, PREFLIGHT_GRACE_MS: '300000' },
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    const after = await horizonAt(MARKET);
    note('14', after);
    // Night still (step 7 left the clock there): the lit light, by the rows.
    expect(after).toMatch(/light on Gannet Rock, to the north-east, some (18|19|20) miles off/i);
  }, 900_000);
});
