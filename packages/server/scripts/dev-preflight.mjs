/**
 * dev-preflight — clear stale dev processes before a dev server starts.
 *
 * ## The failure this exists to stop
 *
 * `pnpm dev` builds a five-deep process chain:
 *
 *   pnpm dev → concurrently → pnpm --filter → sh -c → tsx watch → node
 *
 * `tsx watch` terminates cleanly on a SIGTERM delivered *directly to it*,
 * and takes its child with it. But nothing in that chain forwards a
 * signal reliably: kill or lose anything above `tsx watch` — a closed
 * terminal, a `pkill` aimed at the wrapper, WSL reclaiming the session —
 * and the supervisor is re-parented to init and **survives forever**,
 * still holding its child, its port and its file watchers.
 *
 * Measured on this machine 2026-08-02: ten stacked `pnpm dev` launches,
 * 21 orphaned node processes, the oldest running 12.3 hours, one child
 * grown to **1.6 GB**. Roughly 2.1 GB reclaimed by killing them. That
 * accumulation is a far better explanation for a daily WSL OOM than any
 * single leak.
 *
 * It cannot be fixed from inside the chain — a process that is SIGKILLed
 * or whose session vanishes runs no cleanup. So the fix is to make
 * *startup* self-cleaning: orphans may still happen, but they can never
 * accumulate past one generation.
 *
 * ## Why plain `.mjs` and not `.ts` like its neighbours
 *
 * Every other script here runs under `tsx`. This one guards the dev
 * toolchain, so it deliberately depends on nothing that could itself be
 * the thing that is broken — no tsx, no transpile, no node_modules
 * resolution. Plain node, standard library only, ~30 ms.
 *
 * ## Safety
 *
 * Two independent conditions must BOTH hold before anything is killed:
 *
 *   1. the process is listening on the port we are about to claim, or is
 *      a recognized dev supervisor (`tsx watch` / `vite`); AND
 *   2. its working directory or command line sits inside a Saxonberg
 *      checkout.
 *
 * Condition 2 is what keeps this from killing an unrelated project that
 * happens to use port 5173. Nothing is killed on the strength of the
 * port alone.
 *
 * Usage:  node dev-preflight.mjs <port> <label>
 *         node dev-preflight.mjs --all        (clear every dev process)
 */

import { execFileSync } from "child_process";
import { readlinkSync, readFileSync } from "fs";

const REPO_MARKER = "saxonberg";
const GRACE_MS = 2000;

/** Run a command, returning stdout or '' — never throws. */
function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/** A process's cwd, or '' when it is gone / not ours. */
function cwdOf(pid) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return "";
  }
}

/** A process's full command line, NUL-separated in procfs. */
function cmdlineOf(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim();
  } catch {
    return "";
  }
}

/**
 * Every ancestor of `pid`, walking PPIDs to init.
 *
 * This is not a nicety. The dev script runs as
 * `sh -c 'node dev-preflight.mjs 2010 server && AUTH_MODE=test tsx watch
 * src/preload.js'` — so our OWN parent shell's command line contains the
 * supervisor pattern we scan for, sits inside the repo, and therefore
 * satisfies both kill conditions. Without this, preflight kills the
 * shell that is about to start the server, and `pnpm dev` dies with
 * SIGTERM before it launches anything. (Observed, not theorized.)
 */
function ancestorsOf(pid) {
  const out = new Set();
  let cur = pid;
  for (let i = 0; i < 64 && cur > 1; i++) {
    let ppid = 0;
    try {
      // /proc/PID/stat field 4, read past the comm field which may
      // itself contain spaces or parentheses.
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

const SELF_CHAIN = new Set([process.pid, ...ancestorsOf(process.pid)]);

function rssMb(pid) {
  const m = /VmRSS:\s+(\d+)\s+kB/.exec(sh("cat", [`/proc/${pid}/status`]));
  return m ? Math.round(Number(m[1]) / 1024) : 0;
}

/** Is this PID part of a Saxonberg checkout? The safety condition. */
function isOurs(pid) {
  return (
    cwdOf(pid).includes(REPO_MARKER) || cmdlineOf(pid).includes(REPO_MARKER)
  );
}

/** PIDs listening on a TCP port. */
function listenersOn(port) {
  return sh("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"])
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
}

/**
 * Dev supervisors belonging to this repo, whether or not they still hold
 * a port. A `tsx watch` whose child has died keeps its watchers and its
 * memory but listens on nothing, so a port scan alone would miss it —
 * and those are exactly the ones that pile up.
 */
function strayDevSupervisors() {
  const out = sh("ps", ["-eo", "pid=,args="]);
  const pids = [];
  for (const line of out.split("\n")) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const [, pid, args] = m;
    const isSupervisor =
      /tsx[/\\]dist[/\\]cli\.mjs watch/.test(args) ||
      /vite[/\\]bin[/\\]vite\.js/.test(args) ||
      /tsx watch src[/\\]preload\.js/.test(args);
    if (isSupervisor && isOurs(Number(pid))) pids.push(Number(pid));
  }
  return pids;
}

function describe(pid) {
  const cmd = cmdlineOf(pid).slice(0, 60) || "(gone)";
  return `pid ${String(pid).padEnd(7)} ${String(rssMb(pid)).padStart(5)} MB  ${cmd}`;
}

function killAll(pids, label) {
  // Exclude ourselves AND our whole ancestor chain — see `ancestorsOf`.
  const targets = [...new Set(pids)].filter((p) => !SELF_CHAIN.has(p));
  if (targets.length === 0) return 0;

  console.log(`dev-preflight: clearing ${targets.length} stale ${label} process(es):`);
  for (const p of targets) console.log(`  ${describe(p)}`);

  for (const p of targets) {
    try {
      process.kill(p, "SIGTERM");
    } catch {
      /* already gone */
    }
  }

  // SIGTERM reaches `tsx watch` directly and it exits cleanly, so the
  // grace period is usually enough. SIGKILL is the backstop for a child
  // wedged in a syscall.
  const deadline = Date.now() + GRACE_MS;
  let alive = targets;
  while (Date.now() < deadline && alive.length > 0) {
    alive = alive.filter((p) => {
      try {
        process.kill(p, 0);
        return true;
      } catch {
        return false;
      }
    });
  }
  for (const p of alive) {
    try {
      process.kill(p, "SIGKILL");
    } catch {
      /* raced */
    }
  }
  if (alive.length > 0) {
    console.log(`  (${alive.length} needed SIGKILL)`);
  }
  return targets.length;
}

// ── main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args[0] === "--all") {
  const pids = [
    ...listenersOn(2010).filter(isOurs),
    ...listenersOn(5173).filter(isOurs),
    ...strayDevSupervisors(),
  ];
  const n = killAll(pids, "dev");
  console.log(
    n === 0
      ? "dev-preflight: nothing stale — dev environment is clean."
      : `dev-preflight: cleared ${n} process(es).`
  );
  process.exit(0);
}

const port = Number(args[0]);
const label = args[1] ?? `port ${port}`;
if (!Number.isFinite(port) || port <= 0) {
  console.error("dev-preflight: usage — dev-preflight.mjs <port> <label> | --all");
  process.exit(1);
}

// Port holders that belong to us, plus supervisors of the same kind that
// are no longer listening.
const holders = listenersOn(port);
const foreign = holders.filter((p) => !isOurs(p));
const ours = holders.filter(isOurs);
const strays = strayDevSupervisors().filter((p) => {
  const c = cmdlineOf(p);
  return label === "server" ? /preload\.js/.test(c) : /vite/.test(c);
});

killAll([...ours, ...strays], label);

if (foreign.length > 0) {
  // Never killed: something outside the repo owns this port. Say so
  // loudly rather than starting and failing with EADDRINUSE.
  console.error(
    `dev-preflight: port ${port} is held by a process OUTSIDE this repo — ` +
      `not touching it:`
  );
  for (const p of foreign) console.error(`  ${describe(p)}`);
  process.exit(1);
}
