/**
 * What is actually installed in the world the suite is talking to.
 *
 * A file declares the packs its flow needs (`declareFile({ packs })`)
 * and the harness checks them before the first session opens, so a
 * flow that would have exercised NOTHING because its trade is absent
 * fails immediately and says which pack is missing — rather than
 * failing twenty commands later on "I don't understand 'ret'".
 *
 * ⚠⚠ **There is no pack-roster read an ordinary player can make**, and
 * this build does not add one. `pack status` is restricted to the
 * executive (`requiresPackInstaller`), and no HTTP route lists packs.
 * Inventing an endpoint would be the engine change the requirements
 * rule out ("nothing about the engine changes"), so the check reads the
 * best evidence available and SAYS WHICH:
 *
 *   1. `WIRE_PACKS` — an explicit list. The operator's own assertion,
 *      and what owned boot sets from the `SAXONBERG_PACKS` it used.
 *   2. `WIRE_SERVER_LOG` — the booted server's log, parsed for the
 *      installer's own `PackApi: '<id>' installed` lines. **This is a
 *      true read of the world**, and owned boot always has one.
 *   3. The workspace roster — every `@saxonberg/content-*` dependency
 *      in the root `package.json`, which is what a default boot
 *      installs. INFERRED, and any failure message says so.
 *
 * Tier 3 can be wrong in exactly one direction: it can believe a pack
 * is present when the attached server booted with a narrowed
 * `SAXONBERG_PACKS`. That misses a check; it never invents a failure.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { allFiles, currentFile } from './registry';
import { SERVER_URL, type Session } from './session';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');

type Source = 'declared' | 'boot log' | 'workspace (inferred)';

let cached: { packs: Set<string>; source: Source } | null = null;

function fromWorkspace(): Set<string> {
  const raw = readFileSync(join(REPO_ROOT, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };
  const ids = Object.keys(pkg.dependencies ?? {})
    .filter((n) => n.startsWith('@saxonberg/content-'))
    .map((n) => n.slice('@saxonberg/content-'.length));
  return new Set(ids);
}

function fromBootLog(path: string): Set<string> | null {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const ids = [...text.matchAll(/PackApi: '([^']+)' installed/g)].map(
    (m) => m[1]!
  );
  return ids.length > 0 ? new Set(ids) : null;
}

/** The installed pack set, and where the answer came from. */
export function installedPacks(): { packs: Set<string>; source: Source } {
  if (cached) return cached;
  const declared = process.env.WIRE_PACKS;
  if (declared && declared.trim()) {
    cached = {
      packs: new Set(declared.split(',').map((s) => s.trim()).filter(Boolean)),
      source: 'declared',
    };
    return cached;
  }
  const logPath = process.env.WIRE_SERVER_LOG;
  if (logPath) {
    const fromLog = fromBootLog(resolve(REPO_ROOT, logPath));
    if (fromLog) {
      cached = { packs: fromLog, source: 'boot log' };
      return cached;
    }
  }
  cached = { packs: fromWorkspace(), source: 'workspace (inferred)' };
  return cached;
}

/**
 * Fail the running file if a pack it declared is absent. Called by
 * `Session.open`, so no file can skip it by forgetting.
 */
export async function assertPacksPresent(): Promise<void> {
  const rec = currentFile();
  if (!rec || rec.packs.length === 0) return;
  const { packs, source } = installedPacks();
  const missing = rec.packs.filter((p) => !packs.has(p));
  if (missing.length === 0) return;
  throw new Error(
    `wire: ${rec.file} needs pack(s) [${missing.join(', ')}] and the ` +
      `world does not have them (read from: ${source}). ` +
      (source === 'workspace (inferred)'
        ? `⚠ That reading is inferred from the workspace, not read off ` +
          `the world — set WIRE_PACKS to assert the truth. `
        : '') +
      `Boot with those packs, or fix the file's packs: declaration.`
  );
}

/** Every pack any declared file asked for — used by the run report. */
export function declaredPacks(): string[] {
  const all = new Set<string>();
  for (const f of allFiles()) for (const p of f.packs) all.add(p);
  return [...all].sort();
}

/**
 * ⭐ Did the suite BOOT this world, or merely attach to one?
 *
 * Only a world the suite booted is a test fixture
 * (`SAXONBERG_TEST_WORLD` — see `runner/boot.ts`), and only in such a
 * world do `@TestOnly` Api statics exist. The one that matters today is
 * `WorldClockApi.advance`: in an attached world — somebody's dev server
 * — the static is deleted from the class, and a checkpoint that jumps
 * the clock must skip rather than fail. It would otherwise age every
 * reconcile-on-read system in a world the operator is playing in.
 *
 * Set by `globalSetup` before the workers spawn. A file gates a
 * clock-dependent checkpoint with `it.skipIf(!isOwnedTestWorld())`.
 */
export function isOwnedTestWorld(): boolean {
  return process.env.WIRE_TEST_WORLD === '1';
}

/* ──────────────────────── the clock ──────────────────────── */

/**
 * POST to a test-only route, retried ONCE on a connection reset: a kept-alive
 * socket the server had already closed is reset before the request is read
 * (run 31: `fetch failed` / ECONNRESET on a clock read, the server healthy).
 */
async function postTestRoute(path: string, body: unknown): Promise<Response> {
  const send = (): Promise<Response> =>
    fetch(`${SERVER_URL()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  try {
    return await send();
  } catch (err) {
    const code = (err as { cause?: { code?: string } }).cause?.code;
    if (code !== 'ECONNRESET' && code !== 'UND_ERR_SOCKET') throw err;
    return send();
  }
}

/**
 * ⭐⭐ **Move world-time, from OUTSIDE the fiction.**
 *
 * A game day is about two real hours, so nothing a seasonal system does
 * is observable to a test that finishes. This posts to
 * `/auth/test-clock`, a route mounted only when `AUTH_MODE === 'test'`
 * and backed by `TestHooks.advanceClock`.
 *
 * ⛔ **Not an `eval`, and that is the whole point.** The taps build
 * first reached for `WorldClockApi` on the sandbox allowlist, which was
 * a category error twice over: it dressed scaffolding as an in-world
 * authoring act, and it could not work anyway — an `eval` always runs
 * inside a sandbox boundary (a quarantined circle, or a parcel-bound
 * jurisdiction), and a GLOBAL clock jump is the one thing a bounded
 * context must not do. It failed for three review rounds while the
 * drive reported 15/15, because the throw landed as neither a note nor
 * matching prose.
 *
 * ⭐ Returns the game-seconds either side of the jump, so a caller
 * asserts the clock MOVED rather than trusting a 200.
 *
 * @throws if the world refuses — the server's own message, not a bare
 *   status, because that message is the diagnosis.
 */
export async function advanceWorldClock(
  duration: string
): Promise<{ before: number; after: number }> {
  // ⛔ Soak mode is the one thing that lets a jump past a game day
  // through: the server refuses a longer one as a SPAN step in a blocking
  // drive. Only `pnpm wire:soak` sets it.
  const payload = {
    advance: duration,
    ...(process.env.WIRE_SOAK === '1' ? { soak: true } : {}),
  };
  // ⚠ The world holds its clock while a jump settles (river D46): a jump
  // asked for while another is still settling — a drive stopped mid-jump,
  // the next file starting at once (run 35) — finds it paused. Wait it out.
  let res = await postTestRoute('/auth/test-clock', payload);
  let body = (await res.json()) as {
    before?: number;
    after?: number;
    error?: string;
  };
  for (let wait = 0; wait < 60 && !res.ok && /clock is paused/i.test(body.error ?? ''); wait++) {
    await new Promise((r) => setTimeout(r, 5_000));
    res = await postTestRoute('/auth/test-clock', payload);
    body = (await res.json()) as typeof body;
  }
  if (!res.ok || typeof body.after !== 'number') {
    throw new Error(
      `advanceWorldClock('${duration}') failed (${res.status}): ` +
        `${body.error ?? JSON.stringify(body)}`
    );
  }
  return { before: body.before as number, after: body.after };
}

/** Game-seconds now, read through the same test-only route. */
export async function worldClockNow(): Promise<number> {
  const res = await postTestRoute('/auth/test-clock', {});
  const body = (await res.json()) as { now?: number; error?: string };
  if (!res.ok || typeof body.now !== 'number') {
    throw new Error(
      `worldClockNow() failed (${res.status}): ` +
        `${body.error ?? JSON.stringify(body)}`
    );
  }
  return body.now;
}

/**
 * ⭐ **Meals between a drive's checkpoints.** A clock jump integrates a
 * body's whole gap at once, and a body integrates honestly: hydration
 * runs out in about two game days (dehydration kills in eight hours
 * more), satiation in about three and a half. A drive that jumps a week
 * while a brick dries is a person who ate and drank through that week,
 * and the ceramics drives found what happens when nobody says so — the
 * potter died of starvation and the brickmaker of hyperthermia (no water,
 * no sweat). Setup, not the act under test: `POST /auth/test-nourish`
 * tops `satiation`, `hydration` and `vitamin-c` up to capacity (fed bread
 * and water through a game year, run 20's people died of scurvy).
 *
 * ⛔ Not an `eval`, for the clock's reason: topping a reserve up
 * reconciles the body, the reconcile reads the biome, and a parcel-bound
 * eval may not (`getDefaultHumidity()` denied, run 18).
 *
 * @throws if the world refuses — a silent miss is a body that dies later.
 */
export async function nourish(s: Session): Promise<void> {
  await nourishHandle(s.handle);
}

/** {@link nourish} by handle — for a character the drive holds no session for. */
async function nourishHandle(handle: string): Promise<void> {
  const res = await postTestRoute('/auth/test-nourish', { handle });
  const body = (await res.json()) as { satiation?: number; error?: string };
  if (!res.ok || typeof body.satiation !== 'number') {
    throw new Error(`nourish(${handle}) failed (${res.status}): ${body.error ?? JSON.stringify(body)}`);
  }
}

/** The commons' warmest honest garment — the coat the dorm footlocker offers. */
export const WINTER_COAT = '/stuff/thing/clothes/greatcoat';

/**
 * ⭐ Dress a drive character for the season: the garment is handed over
 * ({@link hand}) and the character WEARS it (its own act, so the
 * slot rules decide). A drive that stands its people outdoors through a
 * year must: the realm's winter dawn is 268 K, a body in its default
 * loadout is on the hypothermia line at 8 °C, and run 26 lost the
 * brickmaker and the founder to one night at the brickfield. Setup, like
 * {@link nourish}: a new player finds this coat in the dorm footlocker,
 * which a test-login character never visits. Handed by {@link hand}.
 *
 * @throws if the world refuses or the garment will not go on.
 */
export async function dress(s: Session, template: string = WINTER_COAT): Promise<void> {
  const id = await hand(s, template);
  const worn = await s.cmd(`wear #${id}`);
  await worn.said();
  if (worn.status !== 'ok') throw new Error(`dress(${s.handle}): 'wear #${id}' was ${worn.status}`);
}

/** {@link dress} for the founder, wherever it is resident — every drive's setup opens it. */
export async function dressFounder(template: string = WINTER_COAT): Promise<void> {
  const { Session: SessionClass } = await import('./session');
  const gov = await SessionClass.open('founder', { wizard: true });
  try {
    // Once: every drive's setup asks, and a founder with four coats is
    // carrying fourteen kilograms of them.
    const keyword = template.split('/').pop() ?? template;
    const has = await gov.query(`me:i:${keyword}`, { fields: ['displayName'] }).catch(() => []);
    // ⚠ Best effort: a founder an earlier file left dead (a shade wears
    // nothing) must not take the next file's setup down with it (run 27's
    // drive B skipped all six checkpoints on it).
    if (has.length === 0) {
      await dress(gov, template).catch((err: unknown) => {
        // eslint-disable-next-line no-console -- a setup warning, not a failure
        console.warn(`wire: the founder could not be dressed — ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  } finally {
    gov.close();
  }
}

/**
 * ⭐ Hand a drive character a thing of `template`'s kind (setup, by name):
 * `POST /auth/test-hand` clones it into the character's hands and returns
 * its id; `data` is a per-instance overlay on the clone (a lump of ore
 * handed with the grade its face would stamp at `hew`). ⚠ Not the founder's clone-and-drop: a founder resident elsewhere
 * is not moved by a session's start location, so what it dropped landed
 * wherever it was (drive B's ore, run 26).
 *
 * @throws if the world refuses.
 */
export async function hand(
  s: Session,
  template: string,
  data?: Record<string, unknown>
): Promise<string> {
  return handHandle(s.handle, template, data);
}

async function handHandle(
  handle: string,
  template: string,
  data?: Record<string, unknown>
): Promise<string> {
  const res = await postTestRoute('/auth/test-hand', data ? { handle, template, data } : { handle, template });
  const body = (await res.json()) as { id?: string; error?: string };
  if (!res.ok || typeof body.id !== 'string') {
    throw new Error(`hand(${handle}, ${template}) failed (${res.status}): ${body.error ?? JSON.stringify(body)}`);
  }
  return body.id;
}

/**
 * ⭐ Advance the world clock by `duration` as LIVED time: in jumps of at
 * most four game hours (the heat regulation's gap window), the `living`
 * sessions fed and watered — and brought current — before each
 * ({@link nourish}). A duration the parser does not recognize is one jump.
 * Returns the game-seconds either side of the whole advance.
 */
export async function advanceLiving(
  duration: string,
  living: readonly (Session | undefined)[],
): Promise<{ before: number; after: number }> {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day|week)s?\s*$/i.exec(duration);
  const per: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86_400, week: 604_800 };
  const total = m ? Number(m[1]) * per[m[2]!.toLowerCase()]! : null;
  const feed = async (): Promise<void> => {
    // A drive may advance before its first session opens (B's `[k]`).
    for (const s of living) if (s?.isOpen()) await nourish(s);
    // ⭐ And the founder: every drive's settle probe and setup opens it
    // where the drive works, and through a game year it bled to death of
    // scurvy at the weathering ground (run 20). Not resident is fine.
    await nourishHandle('founder').catch(() => undefined);
  };
  if (total === null) {
    await feed();
    return advanceWorldClock(duration);
  }
  let before: number | null = null;
  let after = 0;
  for (let left = total; left > 0; ) {
    // ≤ 4 h: a body's heat regulation treats a longer gap as absence and
    // sheds nothing over it, while a condition it carried runs on. With no
    // drive body open (a season reached in setup, before anyone is made),
    // a day a jump: only the founder is fed, and the world settles a day
    // as cheaply as four hours (ceramics run 34 — 4 h steps crossed two
    // game days a minute, and 5b's move to winter outran its timeout).
    const anyoneLiving = living.some((s) => s?.isOpen());
    const step = Math.min(left, (anyoneLiving ? 4 : 24) * 3600);
    await feed();
    const jump = await advanceWorldClock(`${step} seconds`);
    before ??= jump.before;
    after = jump.after;
    left -= step;
  }
  return { before: before ?? after, after };
}

/**
 * ⭐ Bring the world to its working season — late spring through summer
 * (day 60–170 of the 360-day year; day 0 is the northern vernal equinox)
 * — as LIVED time ({@link advanceLiving}), or do nothing if it is there.
 * A drive that makes wet ware must: an unheated shop holds the winter's
 * air, and green ware left wet across a frost bursts (the ceramics
 * drives' B and C began wherever in the year A left the clock, and run 31
 * froze their firebricks and jugs on the shop floor). A potter's year has
 * a season for making for the same reason.
 */
export async function toWarmSeason(living: readonly (Session | undefined)[] = []): Promise<void> {
  await toSeasonDay(60, 170, living);
}

/**
 * Bring the world (as LIVED time, {@link advanceLiving}) to the next day
 * of the 360-day year in `[from, to)` — day 0 is the northern vernal
 * equinox, so winter is 270–360 — or do nothing if it is already there.
 */
export async function toSeasonDay(
  from: number,
  to: number,
  living: readonly (Session | undefined)[] = []
): Promise<void> {
  const DAY = 86_400;
  const YEAR = 360;
  const now = await worldClockNow();
  const dayOfYear = ((Math.floor(now / DAY) % YEAR) + YEAR) % YEAR;
  if (dayOfYear >= from && dayOfYear < to) return;
  const toDay = (from - dayOfYear + YEAR) % YEAR;
  await advanceLiving(`${toDay} days`, living);
}

/** What the weather pin route reports. */
export interface WeatherPinResult {
  /** The Locality the pin landed on — the one covering the scope. */
  locality: string;
  pin: { type: string; mode: 'frozen' | 'alive' } | null;
}

async function postWeather(
  what: string,
  body: Record<string, unknown>
): Promise<WeatherPinResult> {
  const res = await postTestRoute('/auth/test-weather', body);
  const out = (await res.json()) as Partial<WeatherPinResult> & { error?: string };
  if (!res.ok || typeof out.locality !== 'string') {
    throw new Error(`${what} failed (${res.status}): ${out.error ?? JSON.stringify(out)}`);
  }
  return out as WeatherPinResult;
}

/**
 * ⭐ Hold the weather — the staged twin of searching the sky for it.
 *
 * Pins `type` on the Locality covering `scope` (a place's or a
 * Locality's template path) and applies it AT ONCE, as a segment
 * boundary would: rooms restamp, puddles accrue, rain wets whoever is
 * out in it. Only in a world this run owns (the route is test-only).
 *
 * ⚠ The pin persists on the Locality: a drive that pins, unpins.
 */
export async function pinWeather(
  type: string,
  scope: string,
  mode: 'frozen' | 'alive' = 'frozen'
): Promise<WeatherPinResult> {
  return postWeather(`pinWeather('${type}', '${scope}')`, { scope, type, mode });
}

/** Release a pin {@link pinWeather} set; the procedural weather returns. */
export async function unpinWeather(scope: string): Promise<WeatherPinResult> {
  return postWeather(`unpinWeather('${scope}')`, { scope, type: null });
}
