/**
 * check-test-bootstrap — which test files need the framework wiring,
 * and do they say so?
 *
 * ## What this replaces
 *
 * The wiring used to be a global `setupFiles` entry: every one of the
 * 966 test files paid `BootstrapManager.installFrameworkWiring()` and
 * its ~30-module import graph, re-evaluated per file because vitest
 * isolates. Measured at ~5.8s of the 6.4s it took to run a file that
 * needed none of it.
 *
 * Now a test that needs a wired world imports `test-bootstrap`
 * explicitly. That is only safe if "needs it" is something we can
 * *check* rather than remember, which is what this script is.
 *
 * ## The heuristic, and why erring wide is correct
 *
 * A file needs wiring if it touches anything `installFrameworkWiring`
 * wires: the Stuff registry, the scheduler / world-clock / event /
 * MQL-subscription registries, the shadow bridge, the glob ripple.
 * `NEEDS_WIRING` below is that list as a source pattern, applied to the
 * file's own text *and* to any `__tests__`-resident helper it imports
 * (fixtures reach the runtime on their importer's behalf).
 *
 * It is a heuristic, and it is deliberately biased:
 *
 *   - **False positive** (flagged, didn't need it): costs one import
 *     line, and the once-guard makes a redundant import free at
 *     runtime. Harmless.
 *   - **False negative** (needed it, not flagged): a red suite.
 *
 * So `--lint` fails only in the direction where being wrong is cheap.
 * The opposite finding — a file that imports the bootstrap but matches
 * nothing — is reported as *advisory* and never auto-removed, because
 * the heuristic cannot prove a file doesn't need wiring. The full
 * suite remains the oracle; this gate stops the obvious cases from
 * reaching it.
 *
 * ## Usage
 *
 *   pnpm lint:test-bootstrap      # CI gate — missing imports fail
 *   tsx scripts/check-test-bootstrap.ts            # full report
 *   tsx scripts/check-test-bootstrap.ts --fix      # insert the imports
 *   tsx scripts/check-test-bootstrap.ts --verify   # walk == what vitest runs
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(SERVER_DIR, "src");
/**
 * `scripts/__tests__` is in the suite too — `combat-gym.test.ts` lives
 * there and is the single slowest file in it. Scanning only `src/`
 * would leave those files without the import and discover it as a red
 * suite. (It did: `find src -name '*.test.ts'` counts 956; vitest runs
 * 966 — 956 `.ts` + 2 `.test.js` under `src/`, plus 8 in
 * `scripts/__tests__`, two of which are the gym benches.)
 */
const TEST_ROOTS = [SRC_DIR, join(SERVER_DIR, "scripts", "__tests__")];

/**
 * Symbols whose use implies a wired world. Each maps to something
 * `BootstrapManager.installFrameworkWiring()` installs; touching one
 * without the wiring is the "Registry class not registered" failure.
 */
const NEEDS_WIRING = [
  "StuffApi", // the Stuff registry itself
  "makeStuff", // constructs + registers a Stuff
  "EventApi", // EventSubscriptions registry class
  "SchedulerApi", // SchedulerRegistry
  "ScheduleApi", // rides the scheduler registry
  "WorldClockApi", // WorldClockRegistry
  "MqlApi", // MqlSubscriptionRegistry
  "ShadowApi", // SecurityApi._registerShadowApi
  "CommandApi", // installShadowBridge
  "GlobbableApi", // installMergeOnArrival
  "PersistenceManager", // the injected scope resolver
];

const NEEDS_RE = new RegExp(`\\b(${NEEDS_WIRING.join("|")})\\b`);

/**
 * How the import reads once inserted. Matched, not just inserted — and
 * deliberately loose about the path, because the two test roots sit at
 * different depths (`../../../test-bootstrap` from under `src/`,
 * `../../src/test-bootstrap` from `scripts/__tests__`).
 */
const IMPORT_RE = /^import\s+["']\.[^"']*\/test-bootstrap["'];?\s*$/m;

/**
 * What vitest considers a test file — its default `include` is
 * `**\/*.{test,spec}.?(c|m)[jt]s?(x)`, so **`.js` counts**.
 *
 * ⚠ This is not pedantry. Scanning only `*.test.ts` missed the two
 * `.test.js` files under `src/services/loader/__tests__/`, and the
 * check that was supposed to catch that — comparing this walk against
 * `vitest list` — was itself filtered through `grep test.ts`, so it
 * confirmed the undercount instead of exposing it. A verification that
 * shares its blind spot with the thing it verifies is not a
 * verification. `--verify` below re-runs it honestly.
 */
const TEST_FILE_RE = /\.(test|spec)\.(c|m)?[jt]sx?$/;

// ── file discovery ───────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || TEST_FILE_RE.test(full)) out.push(full);
  }
  return out;
}

const allTs = TEST_ROOTS.flatMap((root) => {
  try {
    return walk(root);
  } catch {
    return []; // root doesn't exist — nothing to scan
  }
});
const testFiles = allTs.filter((f) => TEST_FILE_RE.test(f));
/** Non-test `.ts` under a `__tests__/` dir: fixtures, harnesses, helpers. */
const helperFiles = new Set(
  allTs.filter((f) => f.includes("__tests__") && !TEST_FILE_RE.test(f))
);

const textOf = new Map<string, string>();
function read(file: string): string {
  let t = textOf.get(file);
  if (t === undefined) {
    t = readFileSync(file, "utf8");
    textOf.set(file, t);
  }
  return t;
}

/**
 * Relative-import specifiers in `src`, resolved to absolute `.ts` paths
 * that actually exist. Extensionless by house rule, so try both the
 * file and its directory index.
 */
function localImports(file: string, src: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\n)\s*import\s+(?:type\s+)?[^;'"]*from\s+["'](\.[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const base = resolve(dirname(file), m[1] as string);
    for (const cand of [`${base}.ts`, join(base, "index.ts")]) {
      try {
        if (statSync(cand).isFile()) {
          out.push(cand);
          break;
        }
      } catch {
        /* not that shape */
      }
    }
  }
  return out;
}

/**
 * Does this file reach the wired runtime — directly, or through a
 * `__tests__` helper it imports? One level of indirection is enough:
 * helpers import each other rarely, and the suite is the backstop.
 */
function needsWiring(file: string): boolean {
  const src = read(file);
  if (NEEDS_RE.test(src)) return true;
  for (const dep of localImports(file, src)) {
    if (helperFiles.has(dep) && NEEDS_RE.test(read(dep))) return true;
  }
  return false;
}

/** The relative specifier from `file` to `src/test-bootstrap`. */
function specifierFor(file: string): string {
  const p = relative(dirname(file), join(SRC_DIR, "test-bootstrap")).replace(
    /\\/g,
    "/"
  );
  return p.startsWith(".") ? p : `./${p}`;
}

// ── classify ─────────────────────────────────────────────────────────

interface Verdict {
  file: string;
  needs: boolean;
  has: boolean;
}

const verdicts: Verdict[] = testFiles.map((file) => ({
  file,
  needs: needsWiring(file),
  has: IMPORT_RE.test(read(file)),
}));

const missing = verdicts.filter((v) => v.needs && !v.has);
const redundant = verdicts.filter((v) => !v.needs && v.has);
const clean = verdicts.filter((v) => !v.needs && !v.has);
const ok = verdicts.filter((v) => v.needs && v.has);

// ── modes ────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const rel = (f: string) => relative(SERVER_DIR, f);

if (argv.includes("--verify")) {
  // Ask vitest what it actually runs, across BOTH configs, and compare
  // with what this script walked. No filtering on the way in — the
  // point is to catch files this script's own patterns cannot see.
  const listed = (config?: string): string[] => {
    const args = ["exec", "vitest", "list", "--filesOnly"];
    if (config) args.push("--config", config);
    try {
      return execFileSync("pnpm", args, {
        cwd: SERVER_DIR,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 32 * 1024 * 1024,
      })
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => relative(SERVER_DIR, s.startsWith("/") ? s : join(SERVER_DIR, s)));
    } catch {
      return [];
    }
  };

  const actual = new Set([...listed(), ...listed("vitest.gym.config.ts")]);
  const walked = new Set(testFiles.map(rel));

  const unseen = [...actual].filter((f) => !walked.has(f));
  const phantom = [...walked].filter((f) => !actual.has(f));

  console.log(`vitest runs ${actual.size}; this script walked ${walked.size}.`);
  for (const f of unseen) console.error(`  ⚠ vitest runs, gate cannot see: ${f}`);
  for (const f of phantom) console.error(`  ⚠ gate sees, vitest never runs: ${f}`);

  if (unseen.length > 0) {
    console.error("");
    console.error("A file the gate cannot see is a file it cannot protect.");
    console.error("Widen TEST_FILE_RE / TEST_ROOTS — do not narrow this check.");
    process.exit(1);
  }
  if (phantom.length > 0) {
    console.error("\nHarmless but stale — the gate is judging dead files.");
    process.exit(1);
  }
  console.log("ok — the gate sees exactly what vitest runs.");
  process.exit(0);
}

if (argv.includes("--fix")) {
  let fixed = 0;
  for (const v of missing) {
    const src = read(v.file);
    const line = `import "${specifierFor(v.file)}";`;
    // After the file's docblock/leading comments but above the first
    // import, so the wiring reads as a precondition rather than as one
    // dependency among many. Falls back to the top of the file when
    // there are no imports at all.
    const firstImport = /^import\s/m.exec(src);
    const at = firstImport?.index ?? 0;
    writeFileSync(v.file, `${src.slice(0, at)}${line}\n${src.slice(at)}`);
    textOf.delete(v.file);
    fixed++;
  }
  console.log(`check-test-bootstrap: inserted ${fixed} import(s).`);
  console.log("Review the diff by eye before committing — 700+ mechanical");
  console.log("edits is exactly the shape that hides one non-mechanical one.");
  process.exit(0);
}

if (argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        missing: missing.map((v) => rel(v.file)),
        redundant: redundant.map((v) => rel(v.file)),
        counts: {
          total: verdicts.length,
          needs: ok.length + missing.length,
          missing: missing.length,
          redundant: redundant.length,
          clean: clean.length,
        },
      },
      null,
      2
    )
  );
  process.exit(0);
}

const lintMode = argv.includes("--lint");

if (!lintMode) {
  console.log("check-test-bootstrap\n");
  console.log(`  test files            ${verdicts.length}`);
  console.log(`  need wiring           ${ok.length + missing.length}`);
  console.log(`    ├─ have the import  ${ok.length}`);
  console.log(`    └─ MISSING it       ${missing.length}`);
  console.log(`  need nothing          ${clean.length + redundant.length}`);
  console.log(`    └─ import it anyway ${redundant.length}  (advisory)`);
  console.log("");

  if (redundant.length > 0) {
    console.log("Advisory — imports the bootstrap, matches no wired symbol.");
    console.log("Candidates to stop paying. NOT auto-removed: the heuristic");
    console.log("cannot prove a file needs nothing; only the suite can.\n");
    for (const v of redundant) console.log(`  ${rel(v.file)}`);
    console.log("");
  }
}

if (missing.length > 0) {
  console.error(
    `check-test-bootstrap: ${missing.length} file(s) touch the wired ` +
      `runtime without importing test-bootstrap:`
  );
  for (const v of missing) console.error(`  ${rel(v.file)}`);
  console.error("");
  console.error("Add the import (or run with --fix). A redundant import is");
  console.error("free — the bootstrap is once-guarded.");
  process.exit(1);
}

if (lintMode) {
  console.log(
    `check-test-bootstrap: ok — ${ok.length} wired, ${clean.length} ` +
      `pay nothing${redundant.length ? `, ${redundant.length} advisory` : ""}.`
  );
}
