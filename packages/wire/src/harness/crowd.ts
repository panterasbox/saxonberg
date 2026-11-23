/**
 * ⭐ A crowded place, measured — the two crowd files' shared staging.
 *
 * The owner: *"the game needs to be able to handle crowded rooms; this isn't
 * just a test-only sort of concern."* (controllers-are-io D27.) Thirty bodies
 * walk into the plaza one at a time, the way people do, and then speak. What
 * comes back is the record a person reads: how many times each arriver was
 * greeted, how long a line took to round-trip, and whether the server's own
 * loop stalled, read from the server side by sampling `/healthz` (a timer in
 * this process is not the server's loop).
 *
 * The greeting COUNT is deterministic and gates in `crowd.wire.test.ts`;
 * the TIMING is honest only on an idle box, so its bound lives in
 * `crowd.soak.wire.test.ts`. No `eval`, no wizard: thirty ordinary players.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { Worker } from 'worker_threads';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Session, uniqueHandle, SERVER_URL } from './session';
import { APPROACH, EXITS, PLAZA } from './scaffold';

/**
 * The place a crowd gathers — the scaffold's plaza, where the greeter stands
 * — and the place one walk away it gathers from (test-world-lifecycle D8).
 */
export const CROWD_PLACE = PLAZA;
const STAGING = APPROACH;
const WALK_IN = `go ${EXITS.approach.plaza}`;

/** The number D27 fixes: the crowd that pegged the core. */
export const CROWD_SIZE = Number(process.env.WIRE_CROWD_SIZE ?? 30);
const CROWD_SIZE_DEFAULT = CROWD_SIZE;

/** What `runCrowd` may be told (crowded-rooms D11): the crowd's size. */
export interface CrowdOptions {
  size?: number;
  /**
   * ⭐ Run with the crowd STANDING in the square, after the speech and
   * before they leave, with the freeze sampler still running (crowded-rooms
   * W6: the card phases, the mould, the logins into the full square).
   */
  during?: (crowd: Session[]) => Promise<void>;
}

/** p50/p95/max of a set of round trips, in milliseconds. */
export interface Timing {
  n: number;
  p50: number;
  p95: number;
  max: number;
}

/** What the server's loop did while a phase ran. */
export interface LoopRead {
  samples: number;
  max: number;
  over100: number;
  over500: number;
  /**
   * The server's OWN loop-delay histogram across the phase (`/stats.loop`,
   * read at both ends and subtracted) — diagnosis beside the `/healthz` gate,
   * never the argument for a pass (crowded-rooms D12). Null on a server that
   * does not report it.
   */
  server: { count: number; over100: number; maxMs: number; p99Ms: number } | null;
  /** The server process's CPU across the phase, in cores (user + system). */
  serverCores: number | null;
}

/** The box's load around a run: nothing timed is honest without it. */
export interface BoxLoad {
  loadStart: number[];
  loadEnd: number[];
  cores: number;
}

export interface CrowdRecord {
  size: number;
  box: BoxLoad;
  /** One login, socket to first room, with the crowd standing so far. */
  logins: Timing;
  /** speaker → the most times ONE arriver heard that speaker greet them. */
  greetedOwnMax: Record<string, number>;
  /** Every "says to you" any arriver heard. */
  greetingsToArrivers: number;
  /** Every "says to <someone>" the first body overheard. */
  greetingsOverheard: number;
  /** Greetings the first body overheard in the quiet window, nobody arriving. */
  greetingsInQuiet: number;
  arrivalWalk: Timing;
  /** `say` by one body in the full room, 20 times, the envelope. */
  sayOne: Timing;
  /** Everyone says one line, in turn. */
  sayRound: Timing;
  /** Everyone says one line at once. */
  sayBurst: Timing;
  /** Send of the burst to the last line reaching the first body. */
  burstHeardMs: number;
  /** One witness's frames per second while the room stood idle. */
  idleLinesPerMinute: number;
  loop: LoopRead;
  /**
   * The server's uptime (seconds) at each phase boundary — the key a CPU
   * profile is sliced by (crowded-rooms W0).
   */
  marks: Record<string, number | null>;
  /**
   * CPU the box spent OUTSIDE this harness and its server across the run,
   * in cores — over half a core marks a quiet-box phase inconclusive
   * (crowded-rooms D12). Null off Linux.
   */
  foreignCores: number | null;
  /** What the server remembers of bodies after the crowd signed out. */
  statsObjectsBefore: number | null;
  statsObjectsAfter: number | null;
}

/** Sort-based percentile; a small sample's p95 is its next-to-worst. */
function timing(values: number[]): Timing {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number): number =>
    sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? 0;
  return {
    n: sorted.length,
    p50: Math.round(at(0.5)),
    p95: Math.round(at(0.95)),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  };
}

interface ServerStats {
  cpu?: { user: number; system: number };
  loop?: { count: number; over100: number; maxMs: number; p99Ms: number };
  uptime?: number;
  objects?: number;
}

async function serverStats(): Promise<ServerStats | null> {
  const res = await fetch(`${SERVER_URL()}/stats`).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json().catch(() => null)) as ServerStats | null) ?? null;
}

/** `/proc/loadavg`'s three figures; empty off Linux. */
export function boxLoad(): number[] {
  try {
    return readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).map(Number);
  } catch {
    return [];
  }
}

/**
 * The worker's body: fetch `/healthz` every 500 ms and post each round trip.
 * ⭐ It runs on its OWN thread (crowded-rooms D12) — the vitest main thread
 * also holds thirty sockets, and a sampler that shares their loop measures
 * the harness as much as the server.
 */
const SAMPLER = `
const { parentPort, workerData } = require('worker_threads');
let running = true;
parentPort.on('message', (m) => { if (m === 'stop') running = false; });
(async () => {
  while (running) {
    const start = performance.now();
    await fetch(workerData.url + '/healthz').catch(() => undefined);
    const took = performance.now() - start;
    parentPort.postMessage(took);
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - took)));
  }
  parentPort.postMessage('done');
})();
`;

/**
 * Sample `/healthz` every 500 ms until stopped — the owner's own measure —
 * from a worker thread, and read the server's own loop histogram and CPU at
 * both ends.
 */
export function sampleLoop(): () => Promise<LoopRead> {
  const taken: number[] = [];
  const startStats = serverStats();
  const startWall = performance.now();
  const worker = new Worker(SAMPLER, { eval: true, workerData: { url: SERVER_URL() } });
  let finished: () => void = () => undefined;
  const done = new Promise<void>((r) => (finished = r));
  worker.on('message', (m: number | string) => {
    if (m === 'done') finished();
    else if (typeof m === 'number') taken.push(m);
  });
  worker.on('error', () => finished());
  worker.on('exit', () => finished());
  let read: LoopRead | null = null;
  return async () => {
    if (read) return read;
    worker.postMessage('stop');
    await Promise.race([done, new Promise((r) => setTimeout(r, 5_000))]);
    await worker.terminate();
    const [a, b] = [await startStats, await serverStats()];
    const wallS = (performance.now() - startWall) / 1000;
    let server: LoopRead['server'] = null;
    if (a?.loop && b?.loop) {
      server = {
        count: b.loop.count - a.loop.count,
        over100: Math.max(0, b.loop.over100 - a.loop.over100),
        maxMs: b.loop.maxMs,
        p99Ms: b.loop.p99Ms,
      };
    }
    const serverCores =
      a?.cpu && b?.cpu && wallS > 0
        ? Math.round(((b.cpu.user + b.cpu.system - a.cpu.user - a.cpu.system) / 1e6 / wallS) * 1000) / 1000
        : null;
    read = {
      samples: taken.length,
      max: Math.round(Math.max(0, ...taken)),
      over100: taken.filter((t) => t > 100).length,
      over500: taken.filter((t) => t > 500).length,
      server,
      serverCores,
    };
    return read;
  };
}

async function objectCount(): Promise<number | null> {
  const res = await fetch(`${SERVER_URL()}/stats`).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as { objects?: unknown } | null;
  return typeof body?.objects === 'number' ? body.objects : null;
}

async function timed(s: Session, text: string): Promise<number> {
  const start = performance.now();
  await s.cmd(text);
  return performance.now() - start;
}

/** The speakers in `text` of lines saying something TO `whom`. */
function speakersTo(text: string, whom: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const at = line.indexOf(` says to ${whom}`);
    if (at > 0) out.push(line.slice(0, at).trim());
  }
  return out;
}

/**
 * Stage the crowd, take every measure, and sign everybody out. Prints the
 * record and leaves a copy at `.wire/crowd-<label>.json`.
 */
export async function runCrowd(label: string, opts: CrowdOptions = {}): Promise<CrowdRecord> {
  const CROWD_SIZE = opts.size ?? CROWD_SIZE_DEFAULT;
  const loadStart = boxLoad();
  const foreign = foreignMeter();
  const statsObjectsBefore = await objectCount();
  const marks: Record<string, number | null> = {};
  const mark = async (name: string): Promise<void> => {
    marks[name] = (await serverStats())?.uptime ?? null;
  };
  await mark('loginsStart');
  const crowd: Session[] = [];
  const logins: number[] = [];
  for (let i = 0; i < CROWD_SIZE; i++) {
    if (i === CROWD_SIZE - 5) await mark('lastFiveLoginsStart');
    const start = performance.now();
    crowd.push(await Session.open(uniqueHandle(`crowd${i}`), { startLocation: STAGING }));
    logins.push(performance.now() - start);
  }
  await mark('loginsEnd');
  const first = crowd[0]!;
  const stop = sampleLoop();
  try {
    // ── arrivals, one at a time. A walk's envelope is the arrival. ──
    const walks: number[] = [];
    for (const s of crowd) walks.push(await timed(s, WALK_IN));
    await mark('walksEnd');
    // The greeting is a beat; let the last of them land.
    const heardByEach = await Promise.all(
      crowd.map((s) => s.listen(8_000, { sinceDrain: true })),
    );

    const greetedOwnMax: Record<string, number> = {};
    let greetingsToArrivers = 0;
    for (const heard of heardByEach) {
      const counts = new Map<string, number>();
      for (const speaker of speakersTo(heard, 'you')) {
        greetingsToArrivers += 1;
        counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
      }
      for (const [speaker, n] of counts) {
        greetedOwnMax[speaker] = Math.max(greetedOwnMax[speaker] ?? 0, n);
      }
    }
    const greetingsOverheard = speakersTo(heardByEach[0] ?? '', '').length;

    // ── the room stands: nobody arrives, so nobody may be greeted. ──
    const quiet = await first.listen(30_000);
    const greetingsInQuiet = speakersTo(quiet, '').length;
    const idleLinesPerMinute = quiet.split('\n').filter(Boolean).length * 2;

    await mark('quietEnd');
    // ── one person types in a crowd. ──
    const one: number[] = [];
    for (let i = 0; i < 20; i++) one.push(await timed(first, `say hello number ${i}`));

    // ── everyone speaks once, in turn. ──
    const round: number[] = [];
    for (const [i, s] of crowd.entries()) {
      round.push(await timed(s, `say the round line ${i}`));
    }

    // ── everyone speaks at once. The first body hears them all. ──
    await first.drainProse();
    const start = performance.now();
    const burst = await Promise.all(
      crowd.map((s, i) => timed(s, `say the burst line ${i}`)),
    );
    let burstHeardMs = performance.now() - start;
    const deadline = start + 60_000;
    let heardLines = 0;
    while (performance.now() < deadline && heardLines < CROWD_SIZE - 1) {
      const got = await first.listen(250, { sinceDrain: true });
      heardLines += got.split('\n').filter((l) => l.includes('the burst line')).length;
      burstHeardMs = performance.now() - start;
    }

    await mark('speechEnd');
    if (opts.during) await opts.during(crowd);
    await mark('duringEnd');
    const record: CrowdRecord = {
      size: CROWD_SIZE,
      box: { loadStart, loadEnd: [], cores: 0 },
      logins: timing(logins),
      greetedOwnMax,
      greetingsToArrivers,
      greetingsOverheard,
      greetingsInQuiet,
      arrivalWalk: timing(walks),
      sayOne: timing(one),
      sayRound: timing(round),
      sayBurst: timing(burst),
      burstHeardMs: Math.round(burstHeardMs),
      idleLinesPerMinute,
      loop: await stop(),
      marks,
      foreignCores: await foreign(),
      statsObjectsBefore,
      statsObjectsAfter: null,
    };
    for (const s of crowd) s.close();
    await new Promise((r) => setTimeout(r, 3_000));
    record.statsObjectsAfter = await objectCount();
    record.box = { loadStart, loadEnd: boxLoad(), cores: (await import('os')).cpus().length };
    report(label, record);
    return record;
  } finally {
    await stop();
    for (const s of crowd) s.close();
  }
}

function report(label: string, record: CrowdRecord): void {
  console.log(`\n── crowd record [${label}] ──\n${JSON.stringify(record, null, 2)}\n`);
  const here = dirname(fileURLToPath(import.meta.url));
  const file = join(here, '..', '..', '.wire', `crowd-${label}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(record, null, 2));
}

/** Busy and total jiffies across the box, from `/proc/stat`'s first line. */
function boxJiffies(): { busy: number; total: number } | null {
  try {
    const cpu = readFileSync('/proc/stat', 'utf8').split('\n')[0]!.trim().split(/\s+/).slice(1).map(Number);
    const idle = (cpu[3] ?? 0) + (cpu[4] ?? 0);
    const total = cpu.reduce((a, b) => a + b, 0);
    return { busy: total - idle, total };
  } catch {
    return null;
  }
}

/**
 * Start a meter of the CPU the box spends outside this process and its
 * server (crowded-rooms D12): the box's busy time, less the server's own
 * (`/stats.cpu`) and this process's (its workers included).
 */
export function foreignMeter(): () => Promise<number | null> {
  const t0 = performance.now();
  const box0 = boxJiffies();
  const me0 = process.cpuUsage();
  const server0 = serverStats();
  return async () => {
    const box1 = boxJiffies();
    const server1 = await serverStats();
    const s0 = await server0;
    if (!box0 || !box1 || !s0?.cpu || !server1?.cpu) return null;
    const wallS = (performance.now() - t0) / 1000;
    if (!(wallS > 0)) return null;
    const hz = 100; // USER_HZ on Linux
    const boxCores = (box1.busy - box0.busy) / hz / wallS;
    const serverCores = (server1.cpu.user + server1.cpu.system - s0.cpu.user - s0.cpu.system) / 1e6 / wallS;
    const me = process.cpuUsage(me0);
    const meCores = (me.user + me.system) / 1e6 / wallS;
    return Math.round(Math.max(0, boxCores - serverCores - meCores) * 1000) / 1000;
  };
}

/**
 * ⭐ The quiet-box precheck (crowded-rooms D12): a timing run starts only on
 * a box whose 1-minute load is under 1.0 and that runs no other Saxonberg
 * server or vitest outside this process's own tree. Returns the reason the
 * box is NOT quiet, or null.
 */
export function quietBoxRefusal(ownServerPid: number | null): string | null {
  const load = boxLoad()[0];
  if (load !== undefined && load >= 1.0) return `1-minute load ${load} (needs < 1.0)`;
  const ancestors = new Set<number>();
  for (let pid = process.pid; pid > 1; ) {
    ancestors.add(pid);
    try {
      pid = Number(readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1]!.split(' ')[1]);
    } catch {
      break;
    }
  }
  const mine = (pid: number): boolean => {
    for (let p = pid; p > 1; ) {
      if (ancestors.has(p) || p === ownServerPid) return true;
      try {
        p = Number(readFileSync(`/proc/${p}/stat`, 'utf8').split(') ')[1]!.split(' ')[1]);
      } catch {
        return false;
      }
    }
    return false;
  };
  const foreign: string[] = [];
  for (const entry of readdirSync('/proc')) {
    const pid = Number(entry);
    if (!Number.isInteger(pid) || pid <= 1) continue;
    let cmd = '';
    try {
      cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ');
    } catch {
      continue;
    }
    if (!/preload\.js|vitest/.test(cmd)) continue;
    if (mine(pid)) continue;
    foreign.push(`${pid} ${cmd.slice(0, 80)}`);
  }
  return foreign.length > 0 ? `other worlds or suites running: ${foreign.join('; ')}` : null;
}

