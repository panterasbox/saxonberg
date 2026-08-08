/**
 * bench-suite — run the server test suite and record what it cost.
 *
 * ## Why this exists
 *
 * The suite is slow, and every attempt to make it faster is worthless
 * without a number to compare against. This script produces that number
 * in a form that survives the session: an appended row in
 * `docs/testing-bench.jsonl`, so the history IS the regression detector.
 *
 * ## The guard is the point
 *
 * A wall-clock measurement taken while a dev server or a second vitest
 * is competing for the same eight cores is not a measurement. This
 * cycle already produced phantom test *failures* from contention; it
 * would produce phantom *wins* just as readily. So the script refuses
 * to run on a busy machine and says what it found.
 *
 * `--force` runs anyway, but stamps the row `"quiet": false` — a
 * contaminated number is recorded as contaminated rather than
 * discarded, so it can never later be quoted as clean.
 *
 * ## Usage
 *
 *   pnpm bench                          # one run, label "adhoc"
 *   pnpm bench -- --label baseline -n 3 # the baseline: three runs
 *   pnpm bench -- --label threads       # after a lever
 *   pnpm bench -- --summary             # print the history table
 *   pnpm bench -- --only Metabolic      # one file, NOT recorded
 *
 * `--only` measures a subset for investigation. Such a run is printed
 * but never appended: a partial run is not a suite measurement, and a
 * history whose rows measure different things is worse than no history.
 *
 * ⚠ **Do not touch the tree while this is running.** Editing a test
 * file mid-baseline changes what the later runs measure — caught the
 * hard way here: run 1 saw 965 files, runs 2-3 saw 966 because a test
 * was added between them, and the rows were no longer comparable.
 *
 * Coverage is checked for free: every row carries `tests`, so a lever
 * that made the suite faster by running less is visible in the same
 * table that shows the win.
 */

import { execFileSync, spawnSync } from "child_process";
import { readFileSync, appendFileSync, existsSync, mkdtempSync } from "fs";
import { tmpdir, cpus, totalmem } from "os";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(SERVER_DIR, "..", "..");
const HISTORY = join(REPO_ROOT, "docs", "testing-bench.jsonl");
const REPO_MARKER = "saxonberg";

/** One recorded run. */
interface BenchRow {
  /** ISO timestamp — the row's identity. */
  at: string;
  /** Which lever this run measures ("baseline", "threads", …). */
  label: string;
  /** False when `--force` overrode the busy-machine guard. */
  quiet: boolean;
  /** Whether every test passed. A red suite's timing means nothing. */
  green: boolean;
  git: string;
  node: string;
  cores: number;
  memGb: number;
  /**
   * Free RAM and swap-in-use (GB) at the moment the run started.
   *
   * Not decoration. Eight forks at ~700 MB each is 5.6 GB on a 15 GB
   * box, so a second consecutive run starts with swap already dirty and
   * pays for it: measured 1238s fresh, 1804s immediately after — a 46%
   * spread with no code change between them. Without this column that
   * looks like wild variance instead of the memory pressure it is.
   */
  memory: { freeGb: number; swapUsedGb: number };
  /** Vitest config facts that change the meaning of the number. */
  config: { pool: string; isolate: boolean; setupFiles: boolean };
  files: number;
  tests: number;
  failed: number;
  /** Seconds. `wall` is the number that matters; the rest explain it. */
  wall: number;
  phases: Record<string, number>;
  /** Ten slowest files by test time, seconds. */
  slowest: Array<{ file: string; seconds: number; tests: number }>;
  /**
   * Every failing test, by name. "green: false" alone sends the next
   * reader back to re-run a 20-minute suite to learn what broke; the
   * suite whose flake history is 5 → 4 → 7 on identical commits needs
   * the names recorded, not the count.
   */
  failures: Array<{ file: string; test: string }>;
  /** The raw vitest JSON, kept for post-hoc digging. */
  report: string;
}

// ── the busy-machine guard ───────────────────────────────────────────

function sh(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function cmdlineOf(pid: number): string {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8")
      .replace(/\0/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function cwdOf(pid: number): string {
  try {
    return readFileSync(`/proc/${pid}/cwd`, "utf8");
  } catch {
    try {
      return sh("readlink", [`/proc/${pid}/cwd`]).trim();
    } catch {
      return "";
    }
  }
}

/**
 * Our own process and every ancestor. Without this the scan finds the
 * shell that launched us and reports the machine busy with itself —
 * the same trap `dev-preflight` documents.
 */
function selfChain(): Set<number> {
  const out = new Set<number>([process.pid]);
  let cur = process.pid;
  for (let i = 0; i < 64 && cur > 1; i++) {
    let ppid = 0;
    try {
      const stat = readFileSync(`/proc/${cur}/stat`, "utf8");
      const after = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      ppid = Number(after[1]);
    } catch {
      break;
    }
    if (!Number.isFinite(ppid) || ppid <= 0) break;
    out.add(ppid);
    cur = ppid;
  }
  return out;
}

/** Processes that would contend for cores. Empty means quiet. */
function contenders(): string[] {
  const mine = selfChain();
  const found: string[] = [];

  // A dev server: a listener on either dev port that sits in a
  // Saxonberg checkout. Foreign holders of 2010/5173 are somebody
  // else's business and do not block a benchmark.
  for (const port of [2010, 5173]) {
    for (const raw of sh("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"])
      .split("\n")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)) {
      if (mine.has(raw)) continue;
      const cmd = cmdlineOf(raw);
      if (!cmd.includes(REPO_MARKER) && !cwdOf(raw).includes(REPO_MARKER)) {
        continue;
      }
      found.push(`dev server on :${port} — pid ${raw}  ${cmd.slice(0, 70)}`);
    }
  }

  // Another vitest, anywhere. A second suite on another worktree
  // competes for exactly the same cores as one on this branch, so the
  // check is deliberately not scoped to this checkout.
  for (const line of sh("ps", ["-eo", "pid=,args="]).split("\n")) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const pid = Number(m[1]);
    const args = m[2] ?? "";
    if (mine.has(pid)) continue;
    if (!/vitest/.test(args)) continue;
    // `pnpm bench` itself is tsx, not vitest, so anything matching here
    // is a genuinely separate suite.
    found.push(`vitest — pid ${pid}  ${args.slice(0, 70)}`);
  }

  return found;
}

// ── parsing vitest's output ──────────────────────────────────────────

/**
 * The summary line, e.g.
 *   Duration  1358.12s (transform 63.00s, setup 3651.00s, tests 5059.00s)
 *
 * Phase totals are CPU across workers, not wall — setup exceeding wall
 * is expected, not a parse bug.
 */
function parseDuration(stdout: string): { wall: number; phases: Record<string, number> } {
  const m = /Duration\s+([\d.]+)(m?s)\s*(?:\(([^)]*)\))?/.exec(stdout);
  if (!m) return { wall: 0, phases: {} };
  const wall = toSeconds(m[1] ?? "0", m[2] ?? "s");
  const phases: Record<string, number> = {};
  for (const part of (m[3] ?? "").split(",")) {
    const p = /([a-z]+)\s+([\d.]+)(m?s)/.exec(part.trim());
    if (p) phases[p[1] as string] = toSeconds(p[2] ?? "0", p[3] ?? "s");
  }
  return { wall, phases };
}

function toSeconds(value: string, unit: string): number {
  const n = Number(value);
  return unit === "ms" ? round(n / 1000) : round(n);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Free RAM + swap in use, GB, from procfs. Zeroes if unreadable. */
function memoryNow(): { freeGb: number; swapUsedGb: number } {
  const kb = (key: string): number => {
    const m = new RegExp(`^${key}:\\s+(\\d+) kB`, "m").exec(meminfo);
    return m ? Number(m[1]) : 0;
  };
  let meminfo = "";
  try {
    meminfo = readFileSync("/proc/meminfo", "utf8");
  } catch {
    return { freeGb: 0, swapUsedGb: 0 };
  }
  const gb = (n: number) => Math.round((n / 1024 / 1024) * 10) / 10;
  return {
    freeGb: gb(kb("MemAvailable")),
    swapUsedGb: gb(kb("SwapTotal") - kb("SwapFree")),
  };
}

/** Vitest's own view of its config, so a row explains itself. */
function readConfig(): BenchRow["config"] {
  const src = readFileSync(join(SERVER_DIR, "vitest.config.ts"), "utf8");
  const pool = /^\s*pool:\s*["']([a-z]+)["']/m.exec(src)?.[1] ?? "forks";
  const isolate = !/^\s*isolate:\s*false/m.test(src);
  const setupFiles = /^\s*setupFiles:/m.test(src);
  return { pool, isolate, setupFiles };
}

// ── the run ──────────────────────────────────────────────────────────

function runOnce(label: string, quiet: boolean, only?: string): BenchRow {
  const jsonPath = join(mkdtempSync(join(tmpdir(), "bench-")), "run.json");
  const memory = memoryNow();

  const started = Date.now();
  const proc = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      ...(only ? [only] : []),
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${jsonPath}`,
    ],
    { cwd: SERVER_DIR, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
  );
  const wallFallback = round((Date.now() - started) / 1000);

  const stdout = `${proc.stdout ?? ""}\n${proc.stderr ?? ""}`;
  const { wall, phases } = parseDuration(stdout);

  let files = 0;
  let tests = 0;
  let failed = 0;
  let slowest: BenchRow["slowest"] = [];
  let failures: BenchRow["failures"] = [];

  if (existsSync(jsonPath)) {
    const report = JSON.parse(readFileSync(jsonPath, "utf8"));
    files = report.testResults?.length ?? 0;
    tests = report.numTotalTests ?? 0;
    failed = report.numFailedTests ?? 0;
    failures = (report.testResults ?? []).flatMap(
      (f: { name: string; assertionResults?: Array<{ status: string; fullName: string }> }) =>
        (f.assertionResults ?? [])
          .filter((a) => a.status === "failed")
          .map((a) => ({ file: relative(SERVER_DIR, f.name), test: a.fullName }))
    );
    slowest = (report.testResults ?? [])
      .map((f: { name: string; startTime: number; endTime: number; assertionResults?: unknown[] }) => ({
        file: relative(SERVER_DIR, f.name),
        seconds: round((f.endTime - f.startTime) / 1000),
        tests: f.assertionResults?.length ?? 0,
      }))
      .sort((a: { seconds: number }, b: { seconds: number }) => b.seconds - a.seconds)
      .slice(0, 10);
  }

  return {
    at: new Date().toISOString(),
    label,
    quiet,
    green: proc.status === 0 && failed === 0,
    git: sh("git", ["rev-parse", "--short", "HEAD"]).trim() || "unknown",
    node: process.version,
    cores: cpus().length,
    memGb: Math.round(totalmem() / 1024 ** 3),
    memory,
    config: readConfig(),
    files,
    tests,
    failed,
    wall: wall || wallFallback,
    phases,
    slowest,
    failures,
    report: jsonPath,
  };
}

// ── reporting ────────────────────────────────────────────────────────

function printRow(row: BenchRow): void {
  const phases = Object.entries(row.phases)
    .map(([k, v]) => `${k} ${v}s`)
    .join(", ");
  console.log("");
  console.log(`  ${row.label}${row.quiet ? "" : "  ⚠ NOT QUIET"}`);
  console.log(`  wall      ${row.wall}s`);
  console.log(`  phases    ${phases}`);
  console.log(`  files     ${row.files}`);
  console.log(`  tests     ${row.tests}${row.failed ? `  (${row.failed} FAILED)` : ""}`);
  console.log(`  green     ${row.green ? "yes" : "NO — timing is not meaningful"}`);
  console.log(`  config    pool=${row.config.pool} isolate=${row.config.isolate} setupFiles=${row.config.setupFiles}`);
  console.log(
    `  memory    ${row.memory.freeGb}GB free, ${row.memory.swapUsedGb}GB swap in use at start` +
      (row.memory.swapUsedGb > 0.5 ? "  ⚠ already swapping" : "")
  );
  console.log("");
  console.log("  slowest files (test time):");
  for (const s of row.slowest) {
    console.log(`    ${String(s.seconds).padStart(8)}s  ${String(s.tests).padStart(4)} tests  ${s.file}`);
  }
  if (row.failures.length > 0) {
    console.log("");
    console.log("  FAILURES — re-run these in isolation before believing");
    console.log("  they are yours. Contention flakes look exactly like bugs.");
    for (const f of row.failures) {
      console.log(`    ${f.file}`);
      console.log(`      ${f.test}`);
    }
    console.log(`\n  full report: ${row.report}`);
  }
}

function printSummary(): void {
  if (!existsSync(HISTORY)) {
    console.log("bench-suite: no history yet — run `pnpm bench` first.");
    return;
  }
  const rows: BenchRow[] = readFileSync(HISTORY, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  console.log(
    "| date | label | wall | setup | tests phase | files | tests | swap@start | green |"
  );
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const flag = r.quiet ? "" : " ⚠busy";
    const swap = r.memory ? `${r.memory.swapUsedGb}GB` : "—";
    console.log(
      `| ${r.at.slice(0, 16).replace("T", " ")} | ${r.label}${flag} | ${r.wall}s | ` +
        `${r.phases.setup ?? "—"}s | ${r.phases.tests ?? "—"}s | ${r.files} | ${r.tests} | ` +
        `${swap} | ${r.green ? "✔" : `✘ ${r.failed}`} |`
    );
  }

  // Coverage check, criterion 3: any row whose test count differs from
  // the first recorded baseline is called out here rather than left for
  // someone to notice.
  const baseline = rows.find((r) => r.label.startsWith("baseline"));
  if (baseline) {
    const drift = rows.filter((r) => r.tests !== baseline.tests && r.tests > 0);
    if (drift.length > 0) {
      console.log("");
      console.log(`⚠ test count differs from baseline (${baseline.tests}):`);
      for (const r of drift) {
        console.log(`   ${r.at.slice(0, 16)} ${r.label}: ${r.tests} (${r.tests - baseline.tests})`);
      }
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function flag(name: string): boolean {
  return argv.includes(name);
}
function opt(name: string, short?: string): string | undefined {
  const i = argv.findIndex((a) => a === name || a === short);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (flag("--summary")) {
  printSummary();
  process.exit(0);
}

const label = opt("--label", "-l") ?? "adhoc";
const runs = Number(opt("--runs", "-n") ?? 1);
const force = flag("--force");
const only = opt("--only");
const settleSec = Number(opt("--settle") ?? 90);

const busy = contenders();
let quiet = true;
if (busy.length > 0) {
  console.error("bench-suite: the machine is NOT quiet —");
  for (const b of busy) console.error(`  ${b}`);
  if (!force) {
    console.error("");
    console.error("A timing taken under contention is not a measurement.");
    console.error("Stop them (`pnpm dev:clean`) and re-run, or pass --force");
    console.error("to record anyway — the row will be stamped `quiet: false`.");
    process.exit(1);
  }
  console.error("--force given: recording anyway, stamped NOT QUIET.");
  quiet = false;
}

console.log(
  `bench-suite: ${runs} run(s), label "${label}", ` +
    `${cpus().length} cores${only ? `, only "${only}"` : ""}. This takes a while.`
);

for (let i = 1; i <= runs; i++) {
  if (i > 1 && settleSec > 0) {
    // Eight forks at ~700 MB do not disappear the instant vitest exits,
    // and a run that starts on a dirty page cache pays for the last
    // one. Measured: back-to-back runs came in 1238s then 1804s, same
    // code. Cooling off between runs is what makes run N comparable to
    // run 1 rather than to "run 1 plus whatever it left behind".
    console.log(`\n(settling ${settleSec}s before the next run)`);
    execFileSync("sleep", [String(settleSec)], { stdio: "ignore" });
  }
  const runLabel = runs > 1 ? `${label}-${i}` : label;
  console.log(`\n── run ${i}/${runs} (${runLabel}) ──`);
  const row = runOnce(runLabel, quiet, only);
  if (!only) appendFileSync(HISTORY, `${JSON.stringify(row)}\n`);
  printRow(row);
}

console.log(
  only
    ? "\nPartial run — NOT recorded. Only whole-suite runs enter the history."
    : `\nAppended to ${relative(REPO_ROOT, HISTORY)}. \`pnpm bench -- --summary\` for the table.`
);
