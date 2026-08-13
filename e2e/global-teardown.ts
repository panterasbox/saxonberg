import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Remove the characters this run minted.
 *
 * ⚠ **The suite mints an avatar PER TEST by design** — that is what
 * makes it parallel-safe, and it is correct. What was missing was the
 * other half: nothing ever removed them. A sweep on 2026-08-12 found
 * **133 accumulated test characters** against 10 real ones, seven of
 * them standing in the lounge where a live player could see them.
 *
 * ⭐ **The deletion lives in the SERVER package, not here.**
 * `docs/antipatterns.md § A test-only capability added to the BACKEND`
 * ends its ladder with *put it in the harness, not in three layers of
 * production code* — so there is no `/auth/test-purge` route. But the
 * DB schema (the collection vocabulary, the string-vs-ObjectId join
 * between `users` and `google_profiles`) belongs to the server package,
 * and duplicating it here would be a second copy to drift. So the
 * harness owns *when* to clean up and the server script owns *how*,
 * and `e2e/` gains no database dependency.
 *
 * ## Two passes, because a crashed run never reaches teardown
 *
 * 1. **This run's handles** — recorded by `mintSession` as they are
 *    minted. Exact, and safe under concurrent runs.
 * 2. **A stale sweep** — any `e2e-` character older than the window,
 *    which collects orphans from runs that crashed or were killed
 *    (this session killed several). Time-bounded on purpose: two people
 *    running the suite at once cannot reap each other's live
 *    characters.
 *
 * ⚠ Never fails the run. A teardown that turns a green suite red
 * because Mongo blinked is worse than the litter it removes.
 */

/** Orphans older than this are swept. Comfortably longer than a run. */
const STALE_HOURS = 2;

const here = new URL('.', import.meta.url).pathname;
const HANDLES_LOG = resolve(here, '.auth/minted-handles.log');
const SERVER_DIR = resolve(here, '../packages/server');

export default async function globalTeardown(): Promise<void> {
  const handles = existsSync(HANDLES_LOG)
    ? readFileSync(HANDLES_LOG, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const args = [
    'tsx',
    'scripts/purge-test-characters.ts',
    '--stale-hours',
    String(STALE_HOURS),
  ];
  if (handles.length) args.push('--handles', [...new Set(handles)].join(','));

  try {
    const out = execFileSync('npx', args, {
      cwd: SERVER_DIR,
      encoding: 'utf8',
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const line of out.trim().split('\n')) {
      if (line.trim()) console.log(`e2e teardown: ${line.trim()}`);
    }
  } catch (err) {
    console.warn(
      `e2e teardown: character purge skipped (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  } finally {
    // Drop the log either way — a stale list would make the next run
    // ask for handles that are already gone.
    try {
      rmSync(HANDLES_LOG, { force: true });
    } catch {
      /* best effort */
    }
  }
}
