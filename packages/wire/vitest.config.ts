/**
 * The wire suite — `pnpm wire`.
 *
 * Flow tests driven over the real WebSocket against a running world.
 * They are not unit tests and share nothing with the server's suite:
 * no bootstrap import, no engine wiring, no database. What they need
 * is a booted server, which is why they can never live in `pnpm test`.
 *
 * ⚠⚠ **This package has no `test` script, deliberately.** The root's
 * `"test": "pnpm --filter='!@saxonberg/e2e' -r test"` runs every
 * workspace package that HAS one — so naming the script `test` here
 * would sweep a suite that needs a booted server straight into the
 * fifteen-minute unit run, and the filter would have to grow a second
 * exclusion that a future edit could drop. No script, no sweep, no
 * filter to maintain. The runner is `wire`.
 *
 * Serial by construction: one database per worktree means one world,
 * so two files cannot act on it at once. That is a consequence of the
 * Mongo policy, not a knob.
 */

import { defineConfig } from 'vitest/config';
import type { WorkspaceSpec } from 'vitest/node';

/**
 * Dirty files last (plan D6).
 *
 * A file named `*.dirty.wire.test.ts` consumes something the world does
 * not regenerate — the cookhouse's only cut of meat, a dossier's first
 * impression — so everything repeatable runs first, against a world no
 * dirty file has touched yet. The flag is the FILENAME, so the ordering
 * needs no import, `ls` is the census, and a rename is a reviewable
 * diff.
 */
class DirtyLastSequencer {
  async shard(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]> {
    return files;
  }
  async sort(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]> {
    const isDirty = (f: WorkspaceSpec): boolean =>
      /\.dirty\.wire\.test\.ts$/.test(typeof f === 'string' ? f : f.moduleId);
    const name = (f: WorkspaceSpec): string =>
      typeof f === 'string' ? f : f.moduleId;
    const clean = files.filter((f) => !isDirty(f)).sort((a, b) => name(a).localeCompare(name(b)));
    const dirty = files.filter(isDirty).sort((a, b) => name(a).localeCompare(name(b)));
    return [...clean, ...dirty];
  }
}

export default defineConfig({
  test: {
    include: ['tests/**/*.wire.test.ts'],
    globalSetup: ['./src/runner/global-setup.ts'],
    // One world, one actor at a time.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // A flow is minutes of game, not milliseconds of arithmetic.
    testTimeout: 300_000,
    hookTimeout: 300_000,
    teardownTimeout: 60_000,
    // Per-file timings, which the suite is required to print.
    reporters: ['verbose'],
    sequence: { sequencer: DirtyLastSequencer },
    retry: 0,
  },
});
