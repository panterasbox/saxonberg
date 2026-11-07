/**
 * ⭐ A crowded place, measured — the two crowd files' shared staging.
 *
 * The owner: *"the game needs to be able to handle crowded rooms; this isn't
 * just a test-only sort of concern."* (controllers-are-io D27.) Thirty bodies
 * walk into the square one at a time, the way people do, and then speak. What
 * comes back is the record a person reads: how many times each arriver was
 * greeted, how long a line took to round-trip, and whether the server's own
 * loop stalled, read from the server side by sampling `/healthz` (a timer in
 * this process is not the server's loop).
 *
 * The greeting COUNT is deterministic and gates in `crowd.dirty.wire.test.ts`;
 * the TIMING is honest only on an idle box, so its bound lives in
 * `crowd.soak.wire.test.ts`. No `eval`, no wizard: thirty ordinary players.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Session, uniqueHandle, SERVER_URL } from './session';

/** The place a crowd gathers, and the block one walk away it gathers from. */
export const CROWD_PLACE = '/world/terminus/market/square';
const STAGING = '/world/terminus/counting-houses/avenue-block';
const WALK_IN = 'go southwest';

/** The number D27 fixes: the crowd that pegged the core. */
export const CROWD_SIZE = Number(process.env.WIRE_CROWD_SIZE ?? 30);

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
}

export interface CrowdRecord {
  size: number;
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

/** Sample `/healthz` every 500 ms until stopped: the owner's own measure. */
function sampleLoop(): () => Promise<LoopRead> {
  const taken: number[] = [];
  let running = true;
  const loop = (async () => {
    while (running) {
      const start = performance.now();
      await fetch(`${SERVER_URL()}/healthz`).catch(() => undefined);
      const took = performance.now() - start;
      taken.push(took);
      await new Promise((r) => setTimeout(r, Math.max(0, 500 - took)));
    }
  })();
  return async () => {
    running = false;
    await loop;
    return {
      samples: taken.length,
      max: Math.round(Math.max(0, ...taken)),
      over100: taken.filter((t) => t > 100).length,
      over500: taken.filter((t) => t > 500).length,
    };
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
export async function runCrowd(label: string): Promise<CrowdRecord> {
  const statsObjectsBefore = await objectCount();
  const crowd: Session[] = [];
  const logins: number[] = [];
  for (let i = 0; i < CROWD_SIZE; i++) {
    const start = performance.now();
    crowd.push(await Session.open(uniqueHandle(`crowd${i}`), { startLocation: STAGING }));
    logins.push(performance.now() - start);
  }
  const first = crowd[0]!;
  const stop = sampleLoop();
  try {
    // ── arrivals, one at a time. A walk's envelope is the arrival. ──
    const walks: number[] = [];
    for (const s of crowd) walks.push(await timed(s, WALK_IN));
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

    const record: CrowdRecord = {
      size: CROWD_SIZE,
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
      statsObjectsBefore,
      statsObjectsAfter: null,
    };
    for (const s of crowd) s.close();
    await new Promise((r) => setTimeout(r, 3_000));
    record.statsObjectsAfter = await objectCount();
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
