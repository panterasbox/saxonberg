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
import { SERVER_URL } from './session';

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
  const res = await fetch(`${SERVER_URL()}/auth/test-clock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ advance: duration }),
  });
  const body = (await res.json()) as {
    before?: number;
    after?: number;
    error?: string;
  };
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
  const res = await fetch(`${SERVER_URL()}/auth/test-clock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = (await res.json()) as { now?: number; error?: string };
  if (!res.ok || typeof body.now !== 'number') {
    throw new Error(
      `worldClockNow() failed (${res.status}): ` +
        `${body.error ?? JSON.stringify(body)}`
    );
  }
  return body.now;
}
