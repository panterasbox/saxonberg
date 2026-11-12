/**
 * ⭐⭐ **Load on use, round two — the blocking drive** (the load-on-use
 * build; requirements `docs/requirements/load-on-use-requirements.md`
 * § The drive, steps 0–12), against the real socket.
 *
 * The drive in one sentence: *nothing the nine rosters hold stands up at
 * boot — and every read a player makes reaches its row anyway: a room's
 * biome, light and floor, the sky by day and night, a material smelled and
 * tasted, a made good analyzed, two governments, a condition's signs, a
 * still's fractions, a part-ripened vat, a soap, a garment's fabric and a
 * dye — and a restart reads the same.*
 *
 * Adapted from the requirements, recorded in the plan's drive record:
 * - step 4: no reading reports a good's MASS (there is no mass channel); the
 *   drive measures DENSITY on a bowl of brine, which is the same material
 *   read (a row reached for its figures);
 * - step 6: the toxin is a strong drink (the `intoxicated` condition row —
 *   a toxin by its `toxinBehavior`); a sting stages nothing a player can
 *   reach on demand;
 * - step 8: the vat is charged by a pour (the charge picks the profile by
 *   its own row read) and its conversion set with a wizard's `eval` — the
 *   staged twin of soak step S1.
 *
 * ⚠ A cold read surfaces as a controller error (`DocumentNotResidentError`
 * is loud by design, D1): every step asserts its sentence AND that no
 * controller error rode the envelope.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2019 WIRE_BOOT_TIMEOUT=840000 npx vitest run
 * tests/load-on-use.dirty.wire.test.ts` (build-4's port).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'consumes handed drink, wash and wort, dyes a handed bolt, charges and ' +
  'lights the Veshko still, and moves the world clock';

declareFile({
  file: 'load-on-use.dirty.wire.test.ts',
  packs: [
    'base-library',
    'generic-objects',
    'expression',
    'eternal-university',
    'terminus',
    'hearts-delight',
    'world-seed',
    'water',
    'ground',
    'trade-farming',
    'trade-textiles',
    'trade-tailoring',
    'trade-dyeing',
    'trade-chandlery',
    'trade-distilling',
    'trade-sugar',
    'trade-haulage',
    'trade-medicine',
    'trade-shopkeeping',
  ],
  dirtyReason: DIRTY_REASON,
});

const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const SQUARE = '/world/terminus/market/square';
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const WARD = '/world/terminus/infirmary/ward';
const DISTILLERY = '/world/terminus/goods-yards/veshko/location/distillery';
const BATHS = '/world/terminus/market/bathhouse/location/baths';
const TAILOR = '/world/terminus/mayfield-row/tailor/location/shop';
const DYEHOUSE = '/world/terminus/wharfside/dyehouse/location/floor';

const T = {
  bowl: '/stuff/thing/items/bowl',
  brine: '/stuff/idea/material/bulk/salt-water',
  jug: '/trade/ceramics/thing/jug',
  whiskey: '/trade/distilling/thing/whiskey',
  washBucket: '/trade/distilling/thing/wash-bucket',
  wash: '/trade/distilling/idea/material/wash',
  vat: '/trade/distilling/thing/vat',
  wort: '/trade/distilling/idea/material/dark-rum-wort',
  apron: '/trade/tailoring/thing/apron',
  shirt: '/trade/tailoring/thing/shirt',
  soap: '/trade/chandlery/thing/soap-bar',
  brush: '/stuff/thing/gear/scrub-brush',
  pot: '/trade/dyeing/thing/household-vat',
  madder: '/trade/farming/idea/material/madder',
  bolt: '/trade/textiles/thing/bolt',
};

const WIZARD = { wizard: true, committees: ['/world/terminus'] };
const PARCEL = '--parcel /world/terminus';

/** The nine rosters' boot lines (the two that still log a warm). */
const ROSTER_WARM = /(MaterialCatalogue: \d+ material|ConditionCatalogue: \d+ condition) singleton\(s\) live/;

/** What a cold read looks like to a player (D1: cold means loud). */
const COLD = /not resident|DocumentNotResident|went wrong|controller error/i;

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

/** Run one line; return what it said, asserting no cold read rode it. */
async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  const said = squash(await r.said());
  noCold(r, said, line);
  return said;
}

function noCold(r: CommandResult, said: string, line: string): void {
  const err = (r.notes as Array<{ kind?: string; detail?: unknown; reason?: unknown }>).find(
    (n) => n.kind === 'controller-error',
  );
  expect(err, `${line}: a controller error — ${JSON.stringify(err)}`).toBeUndefined();
  expect(said, line).not.toMatch(COLD);
}

/** Run an expression on a thing in reach, as a seated wizard. */
async function evalOn(s: Session, target: string, code: string): Promise<string> {
  const line = await say(s, `eval ${PARCEL} --on ${target} --all ${code}`);
  expect(line, code).not.toMatch(/error:|no authority|Couldn't bind/);
  return line;
}

/** Run a command that may engage, wait the engagement out, and return all it said. */
async function act(s: Session, line: string, gameTime?: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  const first = squash(await r.said());
  noCold(r, first, line);
  const started = (r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advanceWorldClock(gameTime);
    await s.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  const later = squash(await s.listen(1_500).catch(() => ''));
  await s.drainProse();
  expect(later, line).not.toMatch(COLD);
  return `${first} ${later}`.trim();
}

/** One thing's long description by keyword (or `#id`). */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' }).catch(() => []);
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
}

/** Restart the world (a SIGTERM, so the shutdown capture lands) — the documents drive's pattern. */
async function restartWorld(): Promise<void> {
  const listener = Number(
    spawnSync('lsof', ['-ti', `tcp:${WIRE_PORT}`, '-sTCP:LISTEN']).stdout?.toString().trim().split('\n')[0] ?? '',
  );
  if (listener > 0) {
    process.kill(listener, 'SIGTERM');
    const deadline = Date.now() + 180_000;
    for (;;) {
      try {
        process.kill(listener, 0);
      } catch {
        break;
      }
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await stopOwnedWorld();
  const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
  spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
    cwd: serverDir,
    stdio: 'ignore',
  });
  process.env.WIRE_SERVER_URL = await bootOwnedWorld();
}

/** Move the clock to the next `fromH`–`toH` window (by daylight: in the dark a thing is "something"). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advanceWorldClock(`${Math.ceil(wait / 60)} minutes`);
}

suite('load on use: nothing stands at boot, everything answers', () => {
  beforeAll(async () => {
    await toHour(10, 14);
  }, 120_000);

  const opened: Session[] = [];
  async function open(prefix: string, opts: Parameters<typeof Session.open>[1]): Promise<Session> {
    const s = await Session.open(uniqueHandle(prefix), opts);
    opened.push(s);
    return s;
  }
  afterAll(() => {
    for (const s of opened) s.close();
  });

  const kept: { drinker?: string } = {};

  /* The reads step 12 repeats after the restart. */
  async function step1(): Promise<void> {
    const s = await open('first', { startLocation: LOBBY });
    const line = await say(s, 'look');
    expect(line).toMatch(/Duncan Hall|lobby/i);
    // The floor is a material read (ground.md): it names what it is made of.
    expect(await say(s, 'look floor')).toMatch(/floor/i);
  }
  async function step3(): Promise<void> {
    const s = await open('taster', { startLocation: LOBBY });
    await hand(s, T.bowl, { interiorMaterial: T.brine, interiorAmount: 0.3 });
    expect(await say(s, 'taste me:i:bowl')).toMatch(/salty/);
    expect(await say(s, 'smell me:i:bowl')).not.toMatch(/salt/);
    await hand(s, T.whiskey);
    await say(s, 'open me:i:whiskey');
    expect(await say(s, 'taste me:i:whiskey')).toMatch(/It tastes /);
  }
  async function step5(): Promise<void> {
    const delight = await open('parish', { startLocation: SAWMILL });
    expect(await say(delight, 'government')).toMatch(/Heart's Delight Parish/);
    const city = await open('citizen', { startLocation: LOBBY });
    expect(await say(city, 'government')).toMatch(/City of Terminus/);
  }
  async function step6(s: Session): Promise<void> {
    const self = squash(await examine(s, 'me'));
    const assessed = await say(s, 'assess');
    expect(`${self} ${assessed}`, 'the intoxicated row reads with its signs').toMatch(/flushed|unsteady|slurr/i);
  }
  async function step10(): Promise<void> {
    const s = await open('fitting', { startLocation: TAILOR });
    await hand(s, T.shirt);
    const looked = await say(s, 'look me:i:shirt');
    expect(looked).toMatch(/linen|wool|cotton|silk|fustian|cloth/i);
  }

  it.skipIf(!isOwnedTestWorld())('0. the boot stood none of the rosters up', () => {
    // Read before any session opens (step 0 runs first): the boot's own lines.
    const path = process.env.WIRE_SERVER_LOG;
    expect(path && existsSync(path), 'the owned world wrote its boot log').toBeTruthy();
    const bootLog = readFileSync(path!, 'utf8');
    expect(bootLog.length).toBeGreaterThan(1000);
    expect(bootLog).not.toMatch(ROSTER_WARM);
  });

  it('1. the first look reads the room and its floor', step1);

  it('2. outdoors by day the sky and weather read; at night they read again', async () => {
    const s = await open('outdoor', { startLocation: SQUARE });
    expect(await say(s, 'look')).toMatch(/square/i);
    expect(await say(s, 'analyze weather')).not.toMatch(/I don't understand|can't/i);
    await toHour(22, 24);
    expect(await say(s, 'look')).toMatch(/square|dark|night/i);
    expect(await say(s, 'analyze sky')).not.toMatch(/I don't understand/i);
    await toHour(10, 14);
  });

  it('3. smell and taste a material nothing touched since boot', step3);

  it('4. analyze a made good for its material; measure a brine', async () => {
    const s = await open('assayer', { startLocation: LOBBY });
    await hand(s, T.jug);
    const chem = await say(s, 'analyze chemistry me:i:jug');
    expect(chem).not.toMatch(/I don't understand|can't analyze/i);
    expect(chem.length).toBeGreaterThan(10);
    await hand(s, T.bowl, { interiorMaterial: T.brine, interiorAmount: 0.3 });
    const dense = await say(s, 'measure density me:i:bowl');
    expect(dense).not.toMatch(/I don't understand/i);
    expect(dense.length).toBeGreaterThan(10);
  });

  it('5. government in Hearts Delight and in Terminus', step5);

  it('6. a strong drink, and the ward reads the condition with its signs', async () => {
    const s = await open('drinker', { startLocation: WARD });
    kept.drinker = s.handle;
    for (let i = 0; i < 4; i++) {
      await hand(s, T.whiskey);
      await say(s, 'open me:i:whiskey');
      await act(s, 'drink me:i:whiskey');
    }
    await advanceWorldClock('20 minutes');
    await step6(s);
  });

  it('7. the Veshko still, charged and lit: a draw reads its fraction by schedule', async () => {
    const s = await open('distiller', { startLocation: DISTILLERY, ...WIZARD });
    const bucket = await hand(s, T.washBucket, { interiorMaterial: T.wash, interiorAmount: 10 });
    await act(s, `pour #${bucket} into still`);
    await act(s, 'stoke log into still');
    await act(s, 'light still');
    await advanceWorldClock('1 hour');
    const smelled = await say(s, 'smell still');
    // ⭐ The schedule's own sentences (`wash.yaml`): a row read, not a code table.
    expect(smelled).toMatch(/solvent|nail varnish|hot and raw|clean and sweet|dull and oily|wet-cardboard/i);
    const drawn = await act(s, 'pour still into slop-bucket --amount 0.2 L');
    expect(drawn).not.toMatch(/I don't understand|can't pour/i);
  });

  it('8. a vat staged part-way through its ripening reads its stage', async () => {
    const s = await open('vintner', { startLocation: DISTILLERY, ...WIZARD });
    const vat = await hand(s, T.vat);
    await say(s, `drop #${vat}`);
    const bucket = await hand(s, T.washBucket, { interiorMaterial: T.wort, interiorAmount: 10 });
    await act(s, `pour #${bucket} into #${vat}`);
    // The staged twin of soak S1: the batch a game week in.
    await evalOn(s, `#${vat}`, 'this.fractionConverted = 0.4');
    const looked = await say(s, `look #${vat}`);
    expect(looked).toMatch(/It bubbles steadily, a yeasty breath rising off it/);
    const tasted = await say(s, `taste #${vat}`);
    expect(tasted).toMatch(/It tastes /);
  });

  it('9. at the bathhouse, soap takes grease out of an apron', async () => {
    const s = await open('bather', { startLocation: BATHS, ...WIZARD });
    const apron = await hand(s, T.apron);
    await evalOn(s, `#${apron}`, 'this.deposits = Object.fromEntries([["|/platform/dirt/grease", 1]])');
    expect(await examine(s, `#${apron}`)).toMatch(/greas/i);
    await hand(s, T.soap);
    await hand(s, T.brush);
    await act(s, `wash #${apron} with soap using brush --hard`);
    expect(await examine(s, `#${apron}`), 'scrubbed with soap').not.toMatch(/greas/i);
  });

  it('10. at the tailor, a garment reads its fabric', step10);

  it('11. at the dyehouse, the dyestuff takes', async () => {
    const s = await open('dyer', { startLocation: DYEHOUSE });
    const pot = await hand(s, T.pot, { interiorMaterial: T.madder, interiorAmount: 10 });
    const bolt = await hand(s, T.bolt);
    const dyed = await act(s, `dye #${bolt} in #${pot}`, '1 hour');
    // ⭐ The shade is the dyestuff document's (`madder.yaml`): unmordanted, it will not hold.
    expect(dyed).toMatch(/comes up a red that will not hold/);
  });

  it.skipIf(!isOwnedTestWorld())('12. restart: the look, the taste, the governments, the signs and the fabric read the same', async () => {
    for (const s of opened.splice(0)) s.close();
    await new Promise((r) => setTimeout(r, 8_000));
    await restartWorld();
    await toHour(10, 14);
    await step1();
    await step3();
    await step5();
    const drinker = await Session.open(kept.drinker!, { startLocation: WARD });
    opened.push(drinker);
    for (let i = 0; i < 3; i++) {
      await hand(drinker, T.whiskey);
      await say(drinker, 'open me:i:whiskey');
      await act(drinker, 'drink me:i:whiskey');
    }
    await advanceWorldClock('20 minutes');
    await step6(drinker);
    await step10();
  }, 1_500_000);
});
