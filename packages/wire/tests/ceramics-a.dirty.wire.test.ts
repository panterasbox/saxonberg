/**
 * ⭐⭐ **Ceramics, part A — the brickmaker's year**, driven end to end
 * against the real socket (the ceramics requirements' drive, steps 1–9;
 * the model is docs/subsystems/ceramics.md).
 *
 * The drive in one sentence: *dig the Delight's river clay and read it;
 * leave a heap out for the winter and another in the shed; tread the
 * weathered heap with sand and breeze in the temper pit and keep a lump of
 * fat clay untempered; mould a day of bricks at the table and come away
 * muddy; lose a green brick to the rain on the open yard and another to a
 * frost; dry the rest in the hacks to leather-hard and bone-dry and find
 * the fat batch cracked; set and fire the clamp and draw three grades by
 * position, ring the sound one and hear the soft one dead; burn a second
 * clamp starved and draw blue brick; and measure a brick against the
 * Terminus statute — and a brick off the old pit's oversize mould.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD and a STATE changed,
 * read back off the world — never only that the verb was not refused (the
 * taps lesson).
 *
 * ⚠ Long game-time acts (a day at the table, a three-day burn) are driven
 * by jumping the world clock past them and then awaiting the engagement.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<this worktree's> npx vitest run
 * tests/ceramics-a.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  advanceLiving,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'wins clay and sand from the Delight clay pit (a persisted per-band ledger ' +
  'nothing refills), leaves heaps and green bricks on persisted brickfield ' +
  'grounds, burns two charges in the brickfield clamp, practises brickmaking ' +
  'onto its characters, and moves the world clock through a winter';

declareFile({
  file: 'ceramics-a.dirty.wire.test.ts',
  packs: [
    'trade-ceramics',
    'trade-quarrying',
    'trade-coopering',
    'trade-fuel',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'hearts-delight',
    'terminus',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const B = '/world/terminus/hearts-delight/brickfield/location';
const GROUND = `${B}/weathering-ground`;
const PIT = `${B}/clay-pit`;
const HACKS = `${B}/hacks`;

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const open: Session[] = [];

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

function rejectedByParser(r: CommandResult): boolean {
  return (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'command-rejected');
}

/** Run a line; it must be understood. Returns what it said. */
async function say(s: Session, line: string): Promise<string> {
  const r = await s.cmd(line);
  const said = squash(plain(await r.said()));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} > ${line} → ${r.status}\n          ${said.slice(0, 400)}`);
  expect(rejectedByParser(r), `'${line}' never reached a controller: ${said}`).toBe(false);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/**
 * ⚠⚠ Jump the clock, then wait for the world to catch up: a long jump
 * drains every schedule in the interval and the server is busy for a while.
 */
async function advance(duration: string): Promise<void> {
  // Lived time: in day-long jumps, the drive's people fed between them.
  await advanceLiving(duration, open);
  const probe = await Session.open('founder', { startLocation: GROUND, wizard: true }).catch(() => null);
  try {
    const until = Date.now() + 600_000;
    while (probe && Date.now() < until) {
      const ok = await probe
        .query('here', { fields: ['displayName'] })
        .then(() => true)
        .catch(() => false);
      if (ok) break;
    }
  } finally {
    probe?.close();
  }
}

/**
 * A durative act: send it, and when it engaged, jump the clock past it
 * (`gameTime`) and wait for it to finish. Returns everything it said.
 */
async function act(s: Session, line: string, gameTime?: string): Promise<string> {
  const r = await s.cmd(line);
  const said = squash(plain(await r.said()));
  expect(rejectedByParser(r), `'${line}' never reached a controller: ${said}`).toBe(false);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  const started = (r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advance(gameTime);
    await s.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(plain(await s.listen(1_500).catch(() => '')));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} > ${line} → ${r.status}\n          ${said.slice(0, 300)} … ${later.slice(0, 300)}`);
  await s.drainProse();
  return `${said} ${later}`.trim();
}

/** What a player reads off things in reach — every match, description and augmenters. */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' }).catch(() => []);
  const text = rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${s.handle.slice(0, 18)} examines ${keyword}\n          ${squash(text).slice(0, 500)}`);
  return text;
}

/** The display names of what the player holds. */
/** The ids a query names — to take one thing by identity. */
async function idsOf(s: Session, keyword: string): Promise<string[]> {
  const rows = await s.query(keyword, { fields: ['displayName'] }).catch(() => []);
  return (rows as { stuffId?: string }[]).map((r) => r.stuffId ?? '').filter((x) => x !== '');
}

async function held(s: Session): Promise<string[]> {
  const rows = await s.query('me:i', { fields: ['displayName'] }).catch(() => []);
  return rows.map((r) => String((r as { displayName?: unknown }).displayName ?? ''));
}

async function at(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  open.push(s);
  await s.drainProse();
  return s;
}

/** Jump to the next game-time with the hour of day in [fromH, toH). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advance(`${Math.ceil(wait / 60) + 1} minutes`);
}

/**
 * Bring the clock to the first segment whose weather `test` accepts.
 *
 * ⭐ Reads the FORECAST and jumps straight to the segment it names, rather
 * than stepping one boundary at a time (that loop cost ten minutes a run).
 * ⚠ Fails fast where there is no sky to read — run 2 read the weather
 * inside the moulding shed sixty times and could never see rain there.
 */
async function untilWeather(s: Session, test: (weather: string) => boolean, segments: number): Promise<boolean> {
  const SEGMENT_S = 6 * 3600;
  const toBoundary = async (n: number): Promise<void> => {
    const { after } = await advanceWorldClock('0 seconds');
    const toNext = Math.ceil((after + 1) / SEGMENT_S) * SEGMENT_S - after;
    await advance(`${Math.ceil(toNext + (n - 1) * SEGMENT_S) + 60} seconds`);
    await new Promise((r) => setTimeout(r, 4_000)); // the boundary fan-out is async
  };
  let read = await say(s, 'analyze weather');
  expect(read, 'untilWeather needs open sky — the drive is standing indoors').not.toMatch(
    /no active sky weather here/i,
  );
  for (let tries = 0; tries < segments && !test(read); ) {
    // The forecast names the coming segments in order: jump to the first
    // that rains, or past the whole forecast when none does.
    const forecast = /forecast:\s*([^\n]*?)(?:\s+the last|$)/i.exec(read)?.[1] ?? '';
    const ahead = forecast.split(/\s*→\s*/).filter(Boolean);
    const at = ahead.findIndex((w) => /rain|drizzle|shower|storm|downpour/i.test(w));
    // ⚠ Never past it: whether the forecast's first word is THIS segment or
    // the next is not the drive's to assume, so it lands at or just before
    // the rain and reads again (at most one extra step).
    const jump = at >= 0 ? Math.max(1, at) : Math.max(1, ahead.length - 1);
    await toBoundary(jump);
    tries += jump;
    read = await say(s, 'analyze weather');
  }
  return test(read);
}

const RAINING = (w: string): boolean =>
  /type:\s*(rain|drizzle|showers?|storm|downpour)/i.test(w) && /rain precipitation/i.test(w);

// ── the cast of this file ───────────────────────────────────────────────
let digger: Session; // the brickmaker

beforeAll(async () => {
  await toHour(9, 15);
  digger = await at(uniqueHandle('brickmaker'), PIT);
}, 600_000);

afterAll(() => {
  for (const s of open) s?.close();
});

suite('⭐ 1 — win the clay', () => {
  it('`dig clay with spade` at the Delight pit wins lumps of the river clay', async () => {
    // ⚠ The gang's leftover lumps are carried off first. A lump dug onto a
    // lying heap JOINS it (its weathering blended by mass — Clay's merge,
    // honestly), so after weeks of the moulders' work the drive's fresh clay
    // read "weathered a little" (run 18). They go north to the weathering
    // ground, where a heap is left to weather anyway (step 2). The founder's
    // eval could not move them (`getPlacement()` denied, run 19).
    if (/clay/i.test(await examine(digger, 'here:i:clay'))) {
      await say(digger, 'get clay');
      await say(digger, 'north');
      await say(digger, 'drop clay');
      await say(digger, 'south');
    }
    const got = await say(digger, 'get 1 spade');
    expect(got, `get spade: ${got}`).toMatch(/you pick up|spade/i);
    const before = (await held(digger)).join(' | ');
    expect(before).not.toMatch(/clay/i);
    for (let i = 0; i < 10; i++) {
      const dug = await act(digger, 'dig clay with spade', '2 minutes');
      expect(dug, `dig ${i + 1}: ${dug}`).not.toMatch(/at the water|worked out|no clay in this ground/i);
    }
    // At this pit the won clay lies where it fell, at your feet.
    await say(digger, 'get clay');
    // ⭐ STATE: the lumps are in hand.
    expect((await held(digger)).join(' | '), 'the dug clay is held').toMatch(/clay/i);
  }, 900_000);

  it('`look clay` reads it fresh and unweathered', async () => {
    expect(await examine(digger, 'me:i:clay')).toMatch(/unweathered|fresh-dug/i);
  }, 120_000);

  it('`analyze clay` reads its composition in words — fat, and the colour of its iron', async () => {
    const read = await say(digger, 'analyze clay lump');
    expect(read, `analyze clay: ${read}`).toMatch(/fat/i);
    expect(read).not.toMatch(/\d+\s*%/); // words, never a figure
  }, 120_000);

  it('the same wall gives river sand — the temper is dug with the clay', async () => {
    const dug = await act(digger, 'dig sand with spade', '2 minutes');
    expect(dug).not.toMatch(/at the water|no sand in this ground/i);
    await say(digger, 'get sand');
    expect((await held(digger)).join(' | ')).toMatch(/sand/i);
  }, 300_000);
});

suite('⭐ 2 — weather it (and what the weather does to green ware)', () => {
  it('a heap is left out on the weathering ground, another in the shed', async () => {
    await say(digger, 'north');
    expect(await say(digger, 'drop 6 clay')).toMatch(/drop|clay/i);
    // ⭐ STATE: the heap lies on the ground.
    expect(await examine(digger, 'here:i:clay')).toMatch(/clay/i);
    // The indoor heap — the moulding shed holds its own air.
    await say(digger, 'east');
    await say(digger, 'east');
    // Two lumps stay in the shed (the indoor heap, and later the fat batch);
    // one stays in hand for the test bricks.
    expect(await say(digger, 'drop 2 clay')).toMatch(/drop|clay/i);
    expect(await examine(digger, 'here:i:clay')).toMatch(/unweathered|fresh-dug/i);
  }, 300_000);

  it('two test bricks off one lump: one on the open yard, one under the hack cover', async () => {
    // ⭐ Ten lumps dug and carried spend a body: the first run answered
    // "You're too tired for that". Rest the way a person would, on the clock
    // (the drilling drive's precedent), rather than cheapen the digging.
    await say(digger, 'sit');
    await advance('8 hours');
    await say(digger, 'stand');
    // A day at the table with one lump makes a few green bricks.
    const day = await act(digger, 'shape clay into brick', '9 hours');
    // ⭐ STATE, not prose: the day's line lands during the clock jump,
    // before the drive is listening (run 4 began the day and read only that).
    const made = await examine(digger, 'here:i:brick');
    expect(made, `the test bricks: ${day}`).toMatch(/brick/i);
    expect(made).toMatch(/green|soft|thumbprint/i);
    await say(digger, 'get 2 bricks');
    // One into the hacks (rain kept off, frost not).
    await say(digger, 'south');
    expect(await say(digger, 'drop 1 brick')).toMatch(/drop|brick/i);
    // One onto the open yard.
    await say(digger, 'north');
    await say(digger, 'west');
    await say(digger, 'west');
    expect(await say(digger, 'drop 1 brick')).toMatch(/drop|brick/i);
    expect(await examine(digger, 'here:i:brick')).toMatch(/green/i);
  }, 900_000);

  it('5a. ⭐ the green brick on the open yard SLUMPS in the rain', async () => {
    const rained = await untilWeather(digger, RAINING, 60);
    expect(rained, 'no liquid rain at a segment boundary in fifteen game days').toBe(true);
    await advance('2 hours');
    expect(await examine(digger, 'here:i:brick'), 'the yard brick after rain').toMatch(/slumped/i);
  }, 3_600_000);

  it('⭐ through the winter: the heap outside mellows, the heap in the shed stays raw', async () => {
    let looks = '';
    for (let month = 0; month < 12; month++) {
      await advance('30 days');
      looks = await examine(digger, 'here:i:clay');
      if (/frost-broken|crumbling/i.test(looks)) break;
    }
    expect(looks, 'the outdoor heap after a winter').toMatch(/frost-broken|crumbling/i);
    expect(looks).not.toMatch(/unweathered/i);
    await say(digger, 'east');
    await say(digger, 'east');
    expect(await examine(digger, 'here:i:clay'), 'the heap kept in the shed').toMatch(/unweathered|fresh-dug/i);
    await say(digger, 'west');
    await say(digger, 'west');
  }, 7_200_000);

  it('5b. ⭐ the brick left wet under the hack cover across the frost burst', async () => {
    // ⚠ A brick made in SPRING is dry long before winter (about two weeks
    // under the cover), and a dry brick takes a frost — so the drive makes
    // a fresh one NOW, in the winter the last checkpoint reached, leaves it
    // wet under the cover, and lets a frost find it. Rain never reaches it
    // (the canvas), so a ruin here is the FROST's.
    await toHour(9, 15);
    await say(digger, 'east');
    await say(digger, 'east');
    // ⚠ By identity: `get 1 brick` bound the moulding table — its keyword
    // is "brick table", and a singular head noun matches the modifier (run
    // 24; the MQL finding) — and the hack's fourteen gang bricks are not ours.
    const before = new Set(await idsOf(digger, 'bricks'));
    await act(digger, 'shape clay into brick', '9 hours');
    const fresh = (await idsOf(digger, 'bricks')).find((id) => !before.has(id));
    expect(fresh, 'the brick just struck').toBeTruthy();
    await say(digger, `get #${fresh}`);
    await say(digger, 'south');
    await say(digger, `drop #${fresh}`);
    let hackBrick = '';
    for (let half = 0; half < 20 && !/frost has burst|froze wet/i.test(hackBrick); half++) {
      await advance('12 hours');
      hackBrick = await examine(digger, `#${fresh}`);
    }
    expect(hackBrick, 'the hack brick after the winter').toMatch(/frost has burst|froze wet/i);
    expect(hackBrick).not.toMatch(/slumped/i);
    await say(digger, 'north');
    await say(digger, 'west');
    await say(digger, 'west');
    // ⚠ Room for all twenty half-days. A timed-out test does not stop its
    // loop: run 24's kept jumping the clock through 3 and 4, and the
    // brickmaker — sodden from the pit — died of hypothermia mid-moulding.
  }, 1_800_000);
});

suite('⭐ 3 — knead it', () => {
  it('the weathered heap is trodden with sand and breeze in the temper pit — ONE clay, leaner', async () => {
    // A checkpoint owns its position: the weathered heap is on the ground
    // (run 21: a failed 5b left the brickmaker at the hacks, and `east`
    // walked to the clamp ground).
    digger.close();
    digger = await at(digger.handle, GROUND);
    await toHour(9, 15);
    expect(await say(digger, 'get 3 clay')).toMatch(/pick up|clay/i);
    const fat = await say(digger, 'analyze clay lump');
    await say(digger, 'east');
    await say(digger, 'put clay in pit');
    await say(digger, 'put sand in pit');
    await say(digger, 'get breeze');
    await say(digger, 'put breeze in pit');
    const inPit = await examine(digger, 'pit');
    expect(inPit).toMatch(/pit/i);
    const kneaded = await act(digger, 'knead pit', '30 minutes');
    expect(kneaded, `knead: ${kneaded}`).not.toMatch(/dry|wants water|empty/i);
    // ⭐ STATE: the sand and the breeze are gone into the clay — read off
    // the clay that comes out, which is the player's act. (`pit:i` lists
    // nothing in a live world though the pit holds the clay — the same
    // finding as the salt pan's, recorded in the plan; it does not
    // reproduce in a unit test.)
    const taken = await say(digger, 'get clay from pit');
    expect(taken, 'the clay out of the pit').toMatch(/clay/i);
    expect(taken).not.toMatch(/sand|breeze/i);
    const lean = await say(digger, 'analyze clay lump');
    expect(lean, `tempered: ${lean} — raw: ${fat}`).not.toEqual(fat);
    expect(lean).toMatch(/workable|lean/i);
  }, 900_000);

  it('a second batch of fat clay is kept back with NO sand in it', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // The shed's raw lumps are the no-sand batch: nothing was trodden into them.
    await say(digger, 'east');
    const raw = await examine(digger, 'here:i:clay');
    expect(raw, 'the untempered clay in the shed').toMatch(/clay/i);
    await say(digger, 'west');
  }, 120_000);
});

/** The display names inside a container in reach. */
async function s_namesIn(s: Session, container: string): Promise<string[]> {
  const rows = await s.query(`${container}:i`, { fields: ['displayName'] }).catch(() => []);
  return rows.map((r) => String((r as { displayName?: unknown }).displayName ?? ''));
}

suite('⭐ 4 — shape it', () => {
  it('`shape clay into brick` at the table — a durative day, a pallet of green bricks, a muddy moulder', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // The tempered clay is in hand (fetched from the pit in 3).
    await say(digger, 'east');
    const beforeMe = await examine(digger, 'me');
    const day = await act(digger, 'shape clay into brick', '9 hours');
    expect(day, `the day: ${day}`).toMatch(/brick/i);
    // ⭐ STATE: green bricks stand on the pallet.
    expect(await examine(digger, 'here:i:bricks'), 'the pallet').toMatch(/green|thumbprint/i);
    // ⭐ STATE: the moulder is muddy.
    const me = await examine(digger, 'me');
    expect(me, `the moulder: ${me}`).toMatch(/mud/i);
    expect(beforeMe === me).toBe(false);
    // ⚠ "A low-band moulder makes fewer": a day is clay-bound at the drive's
    // scale (a lump is three bricks; a novice's day is 480), so the rate by
    // band is pinned in trade-ceramics `shape.test.ts`, not here.
  }, 900_000);

  it('the fat, no-sand batch is moulded too', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // The shed's raw lump — fat, unweathered, no sand.
    expect(await say(digger, 'get 1 clay')).toMatch(/pick up|clay/i);
    const day = await act(digger, 'shape clay into brick', '9 hours');
    expect(day).toMatch(/brick/i);
  }, 900_000);
});

suite('⭐ 6 — dry them', () => {
  it('into the hacks; weeks later leather-hard, then bone-dry — and the fat batch has cracked', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    const got = await say(digger, 'get bricks');
    expect(got).toMatch(/pick up|brick/i);
    await say(digger, 'get bricks');
    await say(digger, 'south');
    // ⭐ Set ON the hack, where the wind reaches every face — dropped on the
    // yard (one face to the air) they never got past leather-hard.
    await say(digger, 'put bricks on hack');
    await say(digger, 'put bricks on hack');
    expect(await examine(digger, 'here:i:bricks')).toMatch(/green/i);
    let rows = '';
    for (let week = 0; week < 6 && !/leather-hard/i.test(rows); week++) {
      await advance('5 days');
      rows = await examine(digger, 'here:i:bricks');
    }
    expect(rows, 'leather-hard in the hacks').toMatch(/leather-hard|bone-dry/i);
    for (let week = 0; week < 10 && !/bone-dry/i.test(rows); week++) {
      await advance('7 days');
      rows = await examine(digger, 'here:i:bricks');
    }
    expect(rows, 'bone-dry in the hacks').toMatch(/bone-dry/i);
    // ⭐ The fat clay dried faster than it could stand: a drying check.
    expect(rows, 'the no-sand batch').toMatch(/crack|check/i);
  }, 7_200_000);
});

suite('⭐ 7 — fire the clamp', () => {
  it('set, light and burn the clamp; at night it glows from the hacks, and its smoke carries', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // ⭐ The setter is trained (a better setter, fewer clinkers — the share
    // is the setter's band, `BrickClamp.onFireStart`).
    for (let i = 0; i < 12; i++) await digger.cmd('practice brickmaking hard success');
    await digger.drainProse();
    await say(digger, 'get bricks');
    await say(digger, 'east');
    const put = await say(digger, 'put bricks in clamp');
    expect(put, `set: ${put}`).not.toMatch(/won't|can't|not fireable|wet/i);
    expect((await s_namesIn(digger, 'clamp')).join(' | '), 'the clamp is charged').toMatch(/brick/i);
    const lit = await say(digger, 'ignite clamp');
    expect(lit).toMatch(/catch|light|burn|alight|fire/i);
    // Fire it into the night and look from next door.
    await toHour(20, 23);
    const firing = await digger.cmd('fire clamp for 3 days');
    const fired = squash(plain(await firing.said()));
    expect(rejectedByParser(firing)).toBe(false);
    expect(fired).not.toMatch(/stone cold|empty/i);
    const watcher = await at(uniqueHandle('watcher'), HACKS);
    const look = await say(watcher, 'look');
    expect(look, `from the hacks at night: ${look}`).toMatch(/glow|fire|clamp/i);
    const smell = await say(watcher, 'smell');
    expect(smell, `the smoke: ${smell}`).toMatch(/smoke|sulph|sulf|coal|burn/i);
    const id = (firing.notes as Array<{ kind?: string; engagementId?: string }>).find(
      (n) => n.kind === 'engagement-started',
    )?.engagementId;
    await advance('3 days');
    if (id) await digger.awaitActivity(id, 300_000).catch(() => []);
    await digger.drainProse();
  }, 3_600_000);

  it('⭐ drawn cold, the bricks come out in three grades by where they sat', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    await say(digger, 'douse clamp');
    await advance('1 day');
    const drawn = await say(digger, 'get bricks from clamp');
    expect(drawn).toMatch(/pick up|brick/i);
    const grades = await examine(digger, 'me:i:brick');
    // Channels: clinker. Middle: sound earthenware. Skin: soft terracotta.
    expect(grades, 'the over-burnt').toMatch(/clinker|blistered/i);
    expect(grades, 'the sound brick').toMatch(/earthenware|hard-fired/i);
    expect(grades, 'the place brick').toMatch(/terracotta|porous/i);
  }, 600_000);

  it('⭐ `ring` a well-burnt brick — it rings; a place brick sounds dead', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    const names = await held(digger);
    const sound = names.find((n) => /earthenware/i.test(n));
    const place = names.find((n) => /terracotta/i.test(n));
    expect(sound, `held: ${names.join(' | ')}`).toBeDefined();
    expect(place, `held: ${names.join(' | ')}`).toBeDefined();
    const rang = await say(digger, `ring ${sound!.split(/\s+/).find((w) => /earthenware/i.test(w))!.toLowerCase()} brick`);
    expect(rang, `the sound brick: ${rang}`).toMatch(/ring|clear|note/i);
    const dead = await say(digger, `ring ${place!.split(/\s+/).find((w) => /terracotta/i.test(w))!.toLowerCase()} brick`);
    expect(dead, `the place brick: ${dead}`).toMatch(/dead|dull|thud|knock/i);
    // ⭐ What each will drink: the place brick reads porous; the sound one does not.
    const looks = await examine(digger, 'me:i:brick');
    expect(looks).toMatch(/porous/i);
  }, 300_000);
});

suite('⭐ 8 — reduce the draught: blue brick', () => {
  it('a second clamp fired starved of air comes out blue', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // The first clamp's bricks stay on the clamp ground (9 measures them).
    await say(digger, 'drop bricks');
    // A second load: clay from the pit, a day at the table, the hacks.
    // Clamp ground → hacks → shed → temper → yard → pit.
    for (const d of ['west', 'north', 'west', 'west', 'south']) await say(digger, d);
    for (let i = 0; i < 2; i++) await act(digger, 'dig clay with spade', '2 minutes');
    await say(digger, 'get clay');
    for (const d of ['north', 'east', 'east']) await say(digger, d);
    await act(digger, 'shape clay into brick', '9 hours');
    await say(digger, 'get bricks');
    await say(digger, 'south');
    await say(digger, 'put bricks on hack');
    let rows = '';
    for (let week = 0; week < 10 && !/bone-dry/i.test(rows); week++) {
      await advance('7 days');
      rows = await examine(digger, 'here:i:bricks');
    }
    expect(rows, 'the second load dry').toMatch(/bone-dry/i);
    await say(digger, 'get bricks');
    await say(digger, 'east');
    await say(digger, 'put bricks in clamp');
    expect((await s_namesIn(digger, 'clamp')).join(' | ')).toMatch(/brick/i);
    await say(digger, 'get coal');
    await say(digger, 'stoke coal into clamp');
    await say(digger, 'ignite clamp');
    const fired = await act(digger, 'fire clamp --draught half for 3 days', '3 days');
    expect(fired).not.toMatch(/stone cold|empty|draught\?/i);
    await say(digger, 'douse clamp');
    await advance('1 day');
    await say(digger, 'get bricks from clamp');
    const blue = await examine(digger, 'me:i:brick');
    expect(blue, 'the starved burn').toMatch(/blue|starved of air|smoke-grey|grey/i);
  }, 3_600_000);
});

suite('⭐ 9 — measure against the statute brick', () => {
  /** The first word of a held brick's name that matches `re` (`earthenware`). */
  async function wordOf(re: RegExp): Promise<string> {
    const names = await held(digger);
    // ⚠ Not the starved burn's blue earthenware — the sound red one.
    const name = names.find((n) => re.test(n) && !/blue/i.test(n));
    expect(name, `held: ${names.join(' | ')}`).toBeDefined();
    return name!.split(/\s+/).find((w) => re.test(w))!.toLowerCase();
  }

  it('⭐ a sound brick measures to Terminus’s statute brick', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // A trained reader — an untrained eye's ±8 % blurs a small error away.
    for (let i = 0; i < 12; i++) await digger.cmd('practice brickmaking hard success');
    await digger.drainProse();
    // At the clamp ground: the blue load down, then the gauging rod off its
    // nail in the shed, then the first clamp's graded bricks back up.
    await say(digger, 'drop bricks');
    await say(digger, 'west');
    await say(digger, 'north');
    expect(await say(digger, 'get rod')).toMatch(/pick up|rod/i);
    await say(digger, 'south');
    await say(digger, 'east');
    await say(digger, 'get bricks');
    const sound = await wordOf(/earthenware/i);
    const statute = await say(digger, `measure size ${sound} brick`);
    expect(statute, `a statute brick: ${statute}`).toMatch(/statute|standard|true/i);
    expect(statute).not.toMatch(/off standard/i);
    await say(digger, 'drop bricks');
  }, 900_000);

  it('⭐ a brick off the old pit’s oversize mould measures OFF STANDARD', async () => {
    // Read by daylight: in the dark a query sees nothing (perception gates the read).
    await toHour(9, 15);
    // Clamp ground → hacks → shed → temper → yard → pit: a lump of clay.
    for (const d of ['west', 'north', 'west', 'west', 'south']) await say(digger, d);
    await act(digger, 'dig clay with spade', '2 minutes');
    await say(digger, 'get clay');
    // The old table stands on the bank of the flooded pit.
    await say(digger, 'west');
    expect(await examine(digger, 'here:i:table')).toMatch(/old|mould/i);
    const day = await act(digger, 'shape clay at old table into brick', '9 hours');
    expect(day, `the old mould: ${day}`).toMatch(/brick/i);
    await say(digger, 'get bricks');
    // Dry them in the hacks: old pit → pit → yard → temper → shed → hacks.
    for (const d of ['east', 'north', 'east', 'east', 'south']) await say(digger, d);
    await say(digger, 'put bricks on hack');
    let rows = '';
    for (let week = 0; week < 10 && !/bone-dry/i.test(rows); week++) {
      await advance('7 days');
      rows = await examine(digger, 'here:i:bricks');
    }
    expect(rows, 'the oversize bricks dry').toMatch(/bone-dry/i);
    await say(digger, 'get bricks');
    // Burn them in the clamp ground's firing pit, on their own.
    await say(digger, 'east');
    await say(digger, 'put bricks in pit');
    expect((await s_namesIn(digger, 'pit')).join(' | ')).toMatch(/brick/i);
    await say(digger, 'ignite pit');
    await act(digger, 'fire pit for 1 day', '1 day');
    await say(digger, 'douse pit');
    await advance('12 hours');
    await say(digger, 'get bricks from pit');
    const oversize = await say(digger, 'measure size brick');
    expect(oversize, `the old mould's brick: ${oversize}`).toMatch(/off standard/i);
    expect(oversize).toMatch(/over/i);
  }, 7_200_000);
});
