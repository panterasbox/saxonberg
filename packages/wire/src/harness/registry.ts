/**
 * The run-level registry — the three things a wire file declares about
 * itself, and the one thing the harness counts about it.
 *
 * ⚠⚠ **The report travels on disk, not in memory.** A vitest
 * `globalSetup`/`teardown` module runs in the MAIN process while test
 * files run in a worker, so module state (and `globalThis`) is two
 * separate objects and an in-memory registry would report an empty
 * run — silently, which is the worst shape a reporter can have. So
 * every mutation rewrites a small JSON file named by `WIRE_RUN_REPORT`,
 * and the teardown reads that. The file is a few hundred bytes and is
 * rewritten a few dozen times a run; the cost is not worth optimizing
 * and the alternative failure is invisible.
 */

import { readFileSync, writeFileSync } from 'fs';

/** What a file declares and what the harness observed about it. */
export interface FileRecord {
  /** The file's own name, as vitest reports it. */
  readonly file: string;
  /** Packs the flow needs present in the booted world. */
  readonly packs: string[];
  /** Why this file cannot run twice — dirty files only. */
  readonly dirtyReason: string | null;
  /** How many times the file reached for prose instead of structure. */
  proseReads: number;
}

interface RunStore {
  files: Map<string, FileRecord>;
  current: string | null;
}

const KEY = '__saxonbergWireRun__';

/** Where the run report lives; the runner sets it. */
const reportPath = (): string | null => process.env.WIRE_RUN_REPORT ?? null;

/**
 * Rewrite the run report. Best-effort: a wire run must never fail
 * because its own bookkeeping could not be written.
 */
function flush(s: RunStore): void {
  const path = reportPath();
  if (!path) return;
  try {
    writeFileSync(
      path,
      JSON.stringify({ files: [...s.files.values()] }, null, 2),
      'utf8'
    );
  } catch {
    /* the report is a courtesy, never a gate */
  }
}

function store(): RunStore {
  const g = globalThis as unknown as Record<string, RunStore | undefined>;
  let s = g[KEY];
  if (!s) {
    s = { files: new Map(), current: null };
    g[KEY] = s;
  }
  return s;
}

/**
 * Declare a wire file. Call once at module scope, before the suite.
 *
 * `packs` is CHECKED, not merely written down: `Session.open` fails the
 * file fast when the booted world is missing one, so a flow that
 * silently exercised nothing because its trade was not installed reads
 * as a failure instead of a pass. (D3 — the declaration is validated
 * metadata; it does not choose a boot.)
 *
 * `dirtyReason` is required exactly when the filename says
 * `.dirty.wire.test.ts`, and forbidden otherwise — the filename is what
 * the sequencer sorts on, so the two must agree or the batching is a
 * lie. See D6.
 */
export function declareFile(opts: {
  file: string;
  packs: string[];
  dirtyReason?: string;
}): void {
  const isDirty = /\.dirty\.wire\.test\.ts$/.test(opts.file);
  if (isDirty && !opts.dirtyReason) {
    throw new Error(
      `wire: ${opts.file} is named .dirty but declares no dirtyReason. ` +
        `The reason IS the content finding — say what it consumes.`
    );
  }
  if (!isDirty && opts.dirtyReason) {
    throw new Error(
      `wire: ${opts.file} declares a dirtyReason but is not named ` +
        `.dirty.wire.test.ts. Rename it, or drop the reason.`
    );
  }
  const s = store();
  s.current = opts.file;
  s.files.set(opts.file, {
    file: opts.file,
    packs: opts.packs,
    dirtyReason: opts.dirtyReason ?? null,
    proseReads: 0,
  });
  flush(s);
}

/** The file most recently declared — the one currently executing. */
export function currentFile(): FileRecord | null {
  const s = store();
  return s.current ? (s.files.get(s.current) ?? null) : null;
}

/** Count one prose read against the running file (D1's census). */
export function countProseRead(): void {
  const rec = currentFile();
  if (!rec) return;
  rec.proseReads += 1;
  flush(store());
}

/** Every file this run declared, in declaration order. */
export function allFiles(): FileRecord[] {
  return [...store().files.values()];
}

/** Read the report the workers wrote — the main process's only view. */
export function readRunReport(path: string): FileRecord[] {
  try {
    const raw = readFileSync(path, 'utf8');
    return (JSON.parse(raw) as { files?: FileRecord[] }).files ?? [];
  } catch {
    return [];
  }
}
