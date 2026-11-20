/**
 * ⭐⭐ The db-performance drive (2026-11; MR !636 — its
 * record and what it left are in db-performance-slate § What db-performance
 * left, and the subsystem docs it names). The world
 * talks to a hosted database ~100 ms away; this build makes it ask less, ask
 * in batches, save everything when it stops, and key participation on the
 * person. The drive proves it against the running world.
 *
 *   - **Steps 2, 4, 5 and 7 run on every MR.** Counts and decisions — no
 *     timing — read off `/stats.db` (the database's own numbers) and the
 *     verbs a player types.
 *   - **Steps 3 and 6 are TIMED** and run only with `WIRE_QUIET=1` (and
 *     `WIRE_BOOT=1`) on a quiet box (docs/testing.md § The quiet box);
 *     otherwise they report themselves skipped, by name. Step 1 — the
 *     baseline — is this file run with `DBP_RECORD=1` on W0's code.
 *
 *   DBP_RECORD=1 → write `db-performance.baseline.json`. A checkpoint that
 *                  the build exists to fix (participation keyed on the
 *                  lineage, a connected body not saved at shutdown) is
 *                  RECORDED as it falls rather than asserted.
 *   DBP_TRACE=1  → the world runs with `SAXONBERG_QUERY_TRACE=1` (set it
 *                  for the runner too) and the caller table is read back
 *                  from `/stats.db.callers` per phase. Untimed.
 *   otherwise    → compare with the baseline: timed p95s within 10%; the
 *                  hot paths this build took at most half their round
 *                  trips per command.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  declareFile,
  runCrowd,
  Session,
  uniqueHandle,
  quietBoxRefusal,
  SERVER_URL,
  hand,
  stopWorldWithin,
  restartWorld,
  stageStandingHistory,
} from '../src/harness';
import type { CrowdRecord, TimedStop } from '../src/harness';
import { WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'two hundred past players are appended to the three standing ledgers; ' +
  'thirty characters are created, appointed tellers, paid, and consign a ' +
  'watch each to the bakery shelf; a player dies; the world is stopped ' +
  'and restarted mid-file.';

declareFile({
  file: 'db-performance.dirty.wire.test.ts',
  packs: ['platform', 'terminus'],
  dirtyReason: DIRTY_REASON,
});

const QUIET = process.env.WIRE_QUIET === '1';
const RECORD = process.env.DBP_RECORD === '1';
const TRACE = process.env.DBP_TRACE === '1';
/**
 * Steps 3 and 6 for their COUNTS on a box that is not quiet: round trips,
 * pool waits, what came back after the stop. The timed figures are taken
 * (and compared) only with WIRE_QUIET=1.
 */
const WORK = QUIET || process.env.DBP_WORK === '1';

const LOUNGE = '/world/lounge';
const BAR = '/world/lounge/location/bar';
const TERMINUS = '/world/terminus';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BAKERY = '/world/terminus/market/bakery';
const COUNTING_HOUSES = '/world/terminus/counting-houses/business';
const WATCH = '/world/terminus/general-store/thing/pocket-watch';
const RAG = '/stuff/thing/rag';
const FARM_YARD = '/world/terminus/eternal/campus-farm/location/yard';
/** The three scoring services' collections: what an idle world must not touch. */
const SCORING = /^\S+ (participation|participation_events|renown|renown_events|producer|producer_events)$/;
/** One scheduled scoring pass, and a margin. */
const PASS_MS = 65_000;

// ── the database's numbers ───────────────────────────────────────────────

interface DbStats {
  pool: { max: number; inUse: number; waiting: number; waited: number; waitMs: number; peakWaiting: number };
  roundTrips: number;
  ops: { n: number; ms: number };
  byOp: Record<string, { n: number; ms: number }>;
  callers?: Array<{ key: string; n: number; ms: number }>;
}
interface Stats {
  uptime?: number;
  db?: DbStats;
}
async function stats(): Promise<Stats> {
  const res = await fetch(`${SERVER_URL()}/stats`).catch(() => null);
  if (!res?.ok) throw new Error('/stats did not answer');
  return (await res.json()) as Stats;
}
/** Ops per byOp key between two reads (keys that moved only). */
function opsBetween(a: Stats, b: Stats): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(b.db?.byOp ?? {})) {
    const d = v.n - (a.db?.byOp[k]?.n ?? 0);
    if (d > 0) out[k] = d;
  }
  return out;
}
const sumWhere = (ops: Record<string, number>, re: RegExp): number =>
  Object.entries(ops).reduce((acc, [k, n]) => (re.test(k) ? acc + n : acc), 0);

/**
 * The hot paths (db-performance D11), by the byOp keys that are theirs. A path's cost
 * is its ops per command typed in the working phase.
 */
const PATHS: Record<string, RegExp> = {
  'H1 taps dedup': /^find (participation_events|producer_events)$/,
  'H2 accounts and ledger': /^find (bank_accounts|bank_ledger)$/,
  'H3 competence bands': /^find transcripts$/,
  'H4 chattel place and stamp': /^(find|save|saveMany) (chattel|chattel_events)$/,
  'H5 frames': /^(save|saveMany) player_frames$/,
  'captures': /^(find|save|saveMany) holder_snapshots$/,
  // Found by W0, not among the planned paths: the producer tap's
  // "who authored this place" on every command (P1 line in the plan).
  'H6 authorship read': /^find authoring_events$/,
};

function p95(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] ?? 0;
}
function listenerPid(): number | null {
  const out = spawnSync('lsof', ['-ti', `tcp:${WIRE_PORT}`, '-sTCP:LISTEN']).stdout?.toString().trim();
  const pid = Number(out?.split('\n')[0] ?? '');
  return pid > 0 ? pid : null;
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── the record ───────────────────────────────────────────────────────────

interface Measured {
  /** Scoring ops while nobody acts, over the idle window. */
  idleScoringOps?: number;
  idleWindowS?: number;
  idleScoringByOp?: Record<string, number>;
  /** Scoring ops while one player acts across a pass. */
  actingScoringOps?: number;
  actingScoringByOp?: Record<string, number>;
  /** Step 3. */
  workCommands?: number;
  workOps?: Record<string, number>;
  workPathPerCmd?: Record<string, number>;
  workRoundTrips?: number;
  poolWaited?: number;
  poolPeakWaiting?: number;
  poolWaitMs?: number;
  paidP95?: number;
  sayOneP95?: number;
  sayRoundP95?: number;
  lookP95?: number;
  box?: unknown;
  foreignCores?: number | null;
  /** Step 6. */
  stop?: TimedStop;
  /** Steps 4/6 checkpoints the build fixes: true = held, false = fell. */
  claims?: Record<string, boolean>;
  /** Step 7: what each check decided. */
  decisions?: Record<string, string>;
  /** DBP_TRACE: the top callers per phase. */
  callers?: Record<string, Array<{ key: string; n: number; ms: number }>>;
}
const BASELINE_PATH = new URL('./db-performance.baseline.json', import.meta.url);
const baseline: { measured: Measured } | null = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { measured: Measured })
  : null;
const measured: Measured = { claims: {}, decisions: {}, callers: {} };

const found: string[] = [];
const say = (line: string): void => {
  found.push(line);
  console.log(`dbp: ${line}`);
};

/**
 * A checkpoint the build exists to make true. Recording on W0's code, it is
 * written down as it falls (step 4 is expected to fall there — the B2 proof
 * that the checkpoint can fail); otherwise it is asserted.
 */
function claim(name: string, ok: boolean, why: string): void {
  measured.claims![name] = ok;
  say(`${ok ? 'HOLDS' : 'FALLS'} ${name}: ${why}`);
  if (!RECORD) expect(ok, `${name}: ${why}`).toBe(true);
}

/** "No worse": within the box's 10% noise bound of the baseline (quiet box only). */
function noWorse(name: keyof Measured, now: number): void {
  const was = baseline?.measured[name];
  if (RECORD || !QUIET || typeof was !== 'number') return;
  expect.soft(now, `${String(name)}: ${Math.round(now)} vs baseline ${Math.round(was)} (+10%)`).toBeLessThanOrEqual(
    was * 1.1
  );
}

/** The traced run's caller table for a phase (DBP_TRACE only). */
function keepCallers(phase: string, s: Stats): void {
  if (TRACE && s.db?.callers) measured.callers![phase] = s.db.callers.slice(0, 40);
}

/**
 * A step 7 decision, recorded on W0 and compared after. Digits and names
 * vary per run, so the comparison is on the words.
 */
function decided(name: string, value: string): void {
  const norm = value.replace(/\s+/g, ' ').replace(/\d+/g, '#').trim();
  measured.decisions![name] = norm;
  const was = baseline?.measured.decisions?.[name];
  say(`7 ${name}: ${norm.slice(0, 200)}`);
  if (!RECORD && was !== undefined) expect(norm, `7 ${name}: unchanged from the baseline`).toBe(was);
}

/** Every recorded line, and the JSON when recording. Called once, last. */
function writeRecord(): void {
  if (RECORD) {
    // A run records what it measured and keeps the rest: the timed figures
    // come from a quiet-box run, the counts from any run.
    const merged: Measured = { ...(baseline?.measured ?? {}) };
    for (const [k, v] of Object.entries(measured) as [keyof Measured, unknown][]) {
      if (v === undefined) continue;
      if (typeof v === 'object' && v !== null && !Array.isArray(v) && typeof merged[k] === 'object' && merged[k] !== null) {
        (merged as Record<string, unknown>)[k] = { ...(merged[k] as object), ...(v as object) };
      } else {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(
        {
          _comment:
            'Written by DBP_RECORD=1 on W0’s code (master’s behavior plus the instrument) — compared on every other run. ' +
            'Timed figures only from a quiet-box run (WIRE_QUIET=1).',
          measured: merged,
        },
        null,
        2
      )}\n`
    );
  }
  console.log(`\n── db-performance record ──\n${found.join('\n')}\n`);
}

// ── sessions ─────────────────────────────────────────────────────────────

let founder: Session;

/** As `s` (a wizard on the lounge), read one expression's value. */
async function evalSelf(s: Session, expr: string): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(`eval --parcel ${LOUNGE} return 'DBP[' + (${expr}) + ']DBP'`);
  const m = /DBP\[([\s\S]*?)\]DBP/.exec(await r.said());
  if (!m) throw new Error(`eval returned no DBP[…]: ${JSON.stringify((await r.said()).slice(0, 400))}`);
  return m[1]!;
}
/** The participation figure `s`'s person reads under — what every reader asks. */
async function participationOf(s: Session): Promise<number> {
  return Number(await evalSelf(s, 'ConsumerApi.participationOf(self.getIdentityPath())'));
}
/** `standing`'s play band and its presence line. */
async function standingOf(s: Session): Promise<{ band: string; presence: string; prose: string }> {
  const prose = await s.prose('standing');
  return {
    band: /Play \(engagement\): ([^.\n]+)\./.exec(prose)?.[1]?.trim() ?? '?',
    presence: /You (have not yet shown up|show up and take part)/.exec(prose)?.[0] ?? '?',
    prose,
  };
}

beforeAll(async () => {
  founder = await Session.open('founder', {
    startLocation: BAR,
    wizard: true,
    committees: [LOUNGE, TERMINUS, '/corpo/goodkin'],
  });
}, 240_000);

afterAll(async () => {
  await founder?.cmd('config participation.bucketSeconds 600').catch(() => undefined);
  founder?.close();
});

// ── step 5: the operator's view (first: it needs nothing staged) ─────────

suite('5 — the operator reads the database on /stats', () => {
  it('5 — /stats.db has the pool, round trips and time, and they move when someone acts', async () => {
    const a = await stats();
    expect(a.db, '/stats has a db field').toBeTruthy();
    for (const k of ['inUse', 'waiting', 'waited', 'waitMs', 'peakWaiting'] as const) {
      expect(typeof a.db!.pool[k], `pool.${k}`).toBe('number');
    }
    expect(a.db!.pool.max).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) await founder.cmd(`say the operator counts ${i}`);
    await sleep(2_000); // the frame drain's second
    const b = await stats();
    say(
      `5: ten commands → round trips +${b.db!.roundTrips - a.db!.roundTrips}, ops +${b.db!.ops.n - a.db!.ops.n} ` +
        `(+${b.db!.ops.ms - a.db!.ops.ms} ms in the database); pool now ${JSON.stringify(b.db!.pool)}`
    );
    expect(b.db!.roundTrips).toBeGreaterThan(a.db!.roundTrips);
    expect(b.db!.ops.ms).toBeGreaterThanOrEqual(a.db!.ops.ms);
    expect(b.db!.ops.n).toBeGreaterThan(a.db!.ops.n);
  }, 120_000);
});

// ── step 2: a long-lived, quiet world ────────────────────────────────────

suite('2 — a long-lived, quiet world', () => {
  it('2a — two hundred past players are staged; idle, the scoring services touch the database not at all', async () => {
    const subjects = await stageStandingHistory(founder, 200);
    expect(subjects).toBe(200);
    // Two scheduled passes fold what was staged (a full pass after a start).
    await sleep(2 * PASS_MS);
    const a = await stats();
    const idleMs = 180_000;
    await sleep(idleMs);
    const b = await stats();
    keepCallers('idle', b);
    const ops = opsBetween(a, b);
    const scoring = Object.fromEntries(Object.entries(ops).filter(([k]) => SCORING.test(k)));
    measured.idleScoringOps = sumWhere(ops, SCORING);
    measured.idleWindowS = idleMs / 1000;
    measured.idleScoringByOp = scoring;
    say(`2a: idle ${idleMs / 1000} s → scoring ops ${measured.idleScoringOps} ${JSON.stringify(scoring)}`);
    // A pass with nothing to do makes NO round trip; a whole-history pass
    // reads three ledgers and writes every subject, every minute.
    // "No round trips beyond a constant" (the requirement): the passes
    // write nothing, and what is left does not scale with the 200 — a
    // whole-history pass was ~600 ops a service a minute.
    const passWrites = sumWhere(ops, /^(save|saveMany) (participation|renown|producer)$/);
    claim(
      '2a idle scoring is constant',
      passWrites === 0 && measured.idleScoringOps <= 10,
      `${measured.idleScoringOps} scoring ops (${passWrites} standing writes) in ${idleMs / 1000} s idle`,
    );
  }, 600_000);

  it('2b — one player acts across a pass: only that player is re-scored, and reads their own participation', async () => {
    const p = await Session.open(uniqueHandle('dbp-one'), {
      startLocation: BAR,
      wizard: true,
      committees: [LOUNGE],
    });
    try {
      const a = await stats();
      await p.cmd('say good evening');
      await sleep(PASS_MS / 2);
      await p.cmd('say is anybody about');
      await sleep(PASS_MS / 2);
      await p.cmd('say well then');
      await sleep(PASS_MS);
      const b = await stats();
      keepCallers('acting', b);
      const ops = opsBetween(a, b);
      measured.actingScoringOps = sumWhere(ops, SCORING);
      measured.actingScoringByOp = Object.fromEntries(Object.entries(ops).filter(([k]) => SCORING.test(k)));
      say(`2b: one player, three lines, ~two passes → scoring ops ${measured.actingScoringOps} ${JSON.stringify(measured.actingScoringByOp)}`);
      // The PASSES' cost, not the acts': a player's own appends
      // (`save *_events`, the dedup reads) are what acting is.
      const passOps = sumWhere(ops, /^(saveMany|save) (participation|renown|producer)$|^find (participation|renown|producer)$/) +
        sumWhere(ops, /^find (participation_events|renown_events|producer_events)$/);
      claim('2b one act costs a few scoring ops', passOps <= 12, `${passOps} pass ops of ${measured.actingScoringOps} scoring ops (≤ 12)`);
      const st = await standingOf(p);
      const fig = await participationOf(p);
      say(`2b: standing "${st.presence}", play ${st.band}; participation by person ${fig.toFixed(3)}`);
      claim('2b the player reads their own participation', fig > 0 && /show up and take part/.test(st.presence), `participation ${fig}, "${st.presence}"`);
    } finally {
      p.close();
    }
  }, 600_000);
});

// ── step 4: each person's own standing, across death ─────────────────────

suite('4 — each person’s own standing, across death', () => {
  let a: Session;
  let b: Session;

  beforeAll(async () => {
    a = await Session.open(uniqueHandle('dbp-alice'), { startLocation: BAR, wizard: true, committees: [LOUNGE] });
    b = await Session.open(uniqueHandle('dbp-bram'), { startLocation: BAR, wizard: true, committees: [LOUNGE] });
    // A participation row is one per person per bucket: short buckets, so
    // a death inside the step shows (db-performance D13). Restored in afterAll.
    expect(await founder.prose('config participation.bucketSeconds 2')).toMatch(/participation\.bucketSeconds/);
  }, 240_000);

  afterAll(async () => {
    await founder.cmd('config participation.bucketSeconds 600');
    a?.close();
    b?.close();
  });

  it('4 — two players read two figures; dying and acting as a shade continues one; the roster reads the person', async () => {
    for (let i = 0; i < 5; i++) {
      await a.cmd(`say the first life, line ${i}`);
      await sleep(3_000);
    }
    await b.cmd('say I was only listening');
    await sleep(PASS_MS);
    const aLiving = await participationOf(a);
    const bLiving = await participationOf(b);
    const aStand = await standingOf(a);
    say(`4: alive — A ${aLiving.toFixed(3)} (${aStand.presence}, ${aStand.band}), B ${bLiving.toFixed(3)}`);
    claim('4 two players are two figures', aLiving > 0 && bLiving > 0 && aLiving !== bLiving, `A ${aLiving}, B ${bLiving}`);

    // Death: the body's own method through the eval receiver; the scheduler
    // performs the death outside the eval (mortality.spec.ts).
    await a.cmd(`eval --parcel ${LOUNGE} this.beginDying("exsanguination", 1)`);
    let shade = false;
    for (let i = 0; i < 45 && !shade; i++) {
      await a.cmd('assess');
      const got = await a.prose('get all');
      shade = /passes through/i.test(got);
      if (!shade) await sleep(2_000);
    }
    expect(shade, 'A reads as a shade (get passes through) within 90 s').toBe(true);
    for (let i = 0; i < 5; i++) {
      await a.cmd(`say the second life, line ${i}`);
      await sleep(3_000);
    }
    await sleep(PASS_MS);
    const aShade = await participationOf(a);
    const aShadeStand = await standingOf(a);
    say(`4: as a shade — A ${aShade.toFixed(3)} (${aShadeStand.presence}, ${aShadeStand.band})`);
    claim('4 a shade continues the person', aShade > aLiving, `living ${aLiving} → shade ${aShade}`);

    // The roster reads the person: logged out, A's band on the roster is
    // the band `standing` printed.
    const handle = a.handle;
    a.close();
    await sleep(3_000);
    const { session: roster } = await Session.openAtRoster(handle, { wizard: true, committees: [LOUNGE] });
    try {
      const band = String(roster.rosterCharacters()[0]?.playStanding ?? '?');
      say(`4: roster play band "${band}" vs standing "${aShadeStand.band}"`);
      claim('4 the roster reads the person', band === aShadeStand.band, `roster "${band}", standing "${aShadeStand.band}"`);
    } finally {
      roster.close();
    }
  }, 900_000);

  it('4 — a login screen earns nothing', async () => {
    const { session: parked } = await Session.openAtRoster(uniqueHandle('dbp-parked'), {});
    try {
      const before = await stats();
      for (let i = 0; i < 3; i++) await parked.cmd('cockpit').catch(() => undefined);
      await sleep(1_000);
      const after = await stats();
      const appended = sumWhere(opsBetween(before, after), /^(find|save) participation_events$/);
      say(`4: three commands at the roster → participation ledger ops ${appended}`);
      claim('4 a login screen earns nothing', appended === 0, `${appended} participation ledger ops from a login screen`);
    } finally {
      parked.close();
    }
  }, 240_000);
});

// ── step 7: nothing a check decided changed ──────────────────────────────

/** `competence`'s own block — the ambient lines a body hears around it (a shiver) are not it. */
function competenceBlock(prose: string): string {
  const i = prose.indexOf('Competence');
  return i < 0 ? prose.trim() : prose.slice(i).trim();
}

let checker: Session;
let competenceBefore = '';

suite('7 — nothing a check decided changed', () => {
  afterAll(() => checker?.close());

  it('7a — a payment past what the payer holds is refused, in the same words', async () => {
    checker = await Session.open(uniqueHandle('dbp-checker'), {
      startLocation: BANK_HALL,
      wizard: true,
      committees: [LOUNGE, TERMINUS],
    });
    await checker.cmd('bank open');
    // A draw past the balance: the banking chokepoint's refusal (W5 caches
    // the account reads in front of it; the decision must not move).
    const r = await checker.cmd('bank withdraw 100000');
    const reason = r.notes.find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined;
    decided('payment refused', `${r.status} ${reason?.reason ?? '-'} ${(await r.said()).slice(0, 240)}`);
  }, 180_000);

  it('7b — a consigned watch: its consignor reclaims it; a third player may not', async () => {
    const owner = await Session.open(uniqueHandle('dbp-consignor'), { startLocation: BANK_HALL });
    await owner.cmd('bank open');
    owner.close();
    await sleep(1_500);
    const at = await Session.open(owner.handle, { startLocation: BAKERY });
    const other = await Session.open(uniqueHandle('dbp-other'), { startLocation: BAKERY });
    try {
      const watch = await hand(at, WATCH);
      const on = await at.cmd(`shelf consign #${watch} --ask 5`);
      decided('consign', on.status);
      const theirs = await other.cmd('shelf reclaim watch');
      const why = theirs.notes.find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined;
      decided('reclaim by another', `${theirs.status} ${why?.reason ?? '-'}`);
      const back = await at.cmd('shelf reclaim watch');
      decided('reclaim by the consignor', back.status);
    } finally {
      at.close();
      other.close();
    }
  }, 240_000);

  it('7c — competence bands read the same twice for an unchanged transcript', async () => {
    const one = competenceBlock(await checker.prose('competence'));
    const two = competenceBlock(await checker.prose('competence'));
    expect(two).toBe(one);
    competenceBefore = one;
    decided('competence', one.slice(0, 400));
  }, 120_000);
});

// ── steps 3 and 6: the quiet box ─────────────────────────────────────────

(WORK ? suite : suite.skip)(
  WORK
    ? `steps 3 and 6 (${QUIET ? 'quiet box: timed' : 'DBP_WORK: counts only'})`
    : 'steps 3 and 6 — SKIPPED: set WIRE_QUIET=1 on a quiet box (docs/testing.md), or DBP_WORK=1 for counts',
  () => {
    let thirty: CrowdRecord | null = null;
    const workers: Session[] = [];
    const before = new Map<string, { place: string; holds: string; band: string }>();

    it('precheck: the box is quiet', async () => {
      if (!QUIET) return;
      let refusal = quietBoxRefusal(listenerPid());
      for (let waited = 0; refusal !== null && waited < 300_000; waited += 15_000) {
        await sleep(15_000);
        refusal = quietBoxRefusal(listenerPid());
      }
      expect(refusal, `box not quiet: ${refusal}`).toBeNull();
    }, 360_000);

    it('3 — thirty at work: appointed, paid, banking, consigning, reading their standing — no wait for a connection', async () => {
      const paid: number[] = [];
      const looks: number[] = [];
      let commands = 0;
      const timed = async (s: Session, line: string, into?: number[]): Promise<void> => {
        const t = performance.now();
        await s.cmd(line);
        commands++;
        into?.push(performance.now() - t);
      };
      thirty = await runCrowd('dbp-30', {
        size: 30,
        during: async (crowd) => {
          // To the banking hall: the thirty re-enter there.
          const handles = crowd.map((s) => s.handle);
          for (const s of crowd) s.close();
          await sleep(1_500);
          for (const h of handles) workers.push(await Session.open(h, { startLocation: BANK_HALL }));
          await founder.cmd(`goto ${BANK_HALL}`);
          await founder.cmd(`house appoint me to officer at ${COUNTING_HOUSES}`);
          const names = await Promise.all(
            workers.map(async (w) => String((await w.queryOne('me', ['displayName']))?.displayName ?? ''))
          );

          const a = await stats();
          // Everyone at once: an account, and their name.
          await Promise.all(workers.map(async (w) => {
            await timed(w, 'bank open');
            await timed(w, 'introduce');
            await timed(w, 'look', looks);
          }));
          // The house appoints and pays each — the payroll and the venue's
          // account, one paid act per worker.
          for (const n of names) {
            await timed(founder, `house appoint "${n}" to teller at ${COUNTING_HOUSES}`);
            await timed(founder, `house payroll "${n}" 5`, paid);
          }
          // Everyone at once: draw some, bank it back, read it.
          await Promise.all(workers.map(async (w) => {
            await timed(w, 'bank withdraw 2', paid);
            await timed(w, 'bank deposit coins', paid);
            await timed(w, 'bank');
          }));
          // To the bakery: each consigns a watch and reads their standing,
          // while the farm hand's consignment beat runs.
          for (const w of workers) w.close();
          await sleep(1_500);
          workers.length = 0;
          for (const h of handles) workers.push(await Session.open(h, { startLocation: BAKERY }));
          const npc = (async () => {
            await founder.cmd(`goto ${FARM_YARD}`);
            await founder.cmd(`eval --parcel ${TERMINUS} --on hand return this.fireBeat('/lib/behavior/consigns')`);
          })();
          await Promise.all(workers.map(async (w) => {
            const watch = await hand(w, WATCH);
            await hand(w, RAG);
            await timed(w, `shelf consign #${watch} --ask 5`, paid);
            await timed(w, 'standing');
            await timed(w, 'look', looks);
          }));
          await npc;
          await sleep(2_000);
          const b = await stats();
          keepCallers('work', b);
          const ops = opsBetween(a, b);
          measured.workCommands = commands;
          measured.workOps = ops;
          measured.workRoundTrips = b.db!.roundTrips - a.db!.roundTrips;
          measured.poolWaited = b.db!.pool.waited - a.db!.pool.waited;
          measured.poolWaitMs = b.db!.pool.waitMs - a.db!.pool.waitMs;
          measured.poolPeakWaiting = b.db!.pool.peakWaiting;
          measured.workPathPerCmd = Object.fromEntries(
            Object.entries(PATHS).map(([name, re]) => [name, sumWhere(ops, re) / Math.max(1, commands)])
          );
          if (QUIET) {
            measured.paidP95 = p95(paid);
            measured.lookP95 = p95(looks);
          }
          say(`3: paid p95 ${Math.round(p95(paid))} ms · look p95 ${Math.round(p95(looks))} ms${QUIET ? '' : ' (not quiet: not recorded)'}`);
        },
      });
      const r = thirty;
      if (QUIET) {
        measured.sayOneP95 = r.sayOne.p95;
        measured.sayRoundP95 = r.sayRound.p95;
        measured.box = r.box;
        measured.foreignCores = r.foreignCores;
      }
      say(
        `3: ${measured.workCommands} commands, ${measured.workRoundTrips} round trips; pool waited ` +
          `${measured.poolWaited} (${measured.poolWaitMs} ms; peak ${measured.poolPeakWaiting}); paid p95 ` +
          `${Math.round(measured.paidP95 ?? 0)} ms · look p95 ${Math.round(measured.lookP95 ?? 0)} ms · say p95 ` +
          `${Math.round(r.sayOne.p95)} ms · foreign ${r.foreignCores}`
      );
      say(`3: per command by path ${JSON.stringify(measured.workPathPerCmd)}`);
      const top = Object.entries(measured.workOps ?? {}).sort((x, y) => y[1] - x[1]).slice(0, 25);
      say(`3: top ops ${JSON.stringify(top)}`);
      if (QUIET) expect(r.foreignCores ?? 0, 'inconclusive: foreign CPU').toBeLessThanOrEqual(0.5);
      claim('3 no command waits for a connection', (measured.poolWaited ?? 1) === 0, `${measured.poolWaited} waited`);
      noWorse('paidP95', measured.paidP95 ?? 0);
      noWorse('sayOneP95', r.sayOne.p95);
      noWorse('lookP95', measured.lookP95 ?? 0);
      // Each path this build took: at most half its baseline per command.
      const was = baseline?.measured.workPathPerCmd ?? {};
      for (const name of TAKEN) {
        const now = measured.workPathPerCmd?.[name] ?? 0;
        if (!RECORD && typeof was[name] === 'number') {
          expect.soft(now, `3 ${name}: ${now.toFixed(3)} vs baseline ${was[name]!.toFixed(3)} per command (≤ half)`).toBeLessThanOrEqual(
            was[name]! / 2
          );
        }
      }
    }, 2_400_000);

    it('6 — the loaded world stops inside 30 s having saved everything, and comes back with all of it', async () => {
      expect(workers.length).toBe(30);
      for (const w of workers) {
        const here = await w.queryOne('here', ['displayName']);
        const holds = (await w.query('me:i', { fields: ['displayName'] }))
          .map((x) => String((x as { displayName?: string }).displayName ?? ''))
          .sort()
          .join(' | ');
        before.set(w.handle, { place: String(here?.displayName ?? ''), holds, band: (await standingOf(w)).band });
      }
      // Still connected: the stop is an operator's, with a deadline.
      const stop = await stopWorldWithin(30_000);
      measured.stop = stop;
      say(`6: stop ${JSON.stringify(stop)}`);
      for (const w of workers) w.close();
      claim('6 the stop fits 30 s', !stop.killed, `exited in ${stop.exitedMs} ms, killed ${stop.killed}`);
      claim('6 nothing failed to save', (stop.report?.failed ?? 0) === 0 && stop.report !== null, JSON.stringify(stop.report));
      await restartWorld();
      let wrongPlace = 0;
      let wrongHolds = 0;
      let wrongBand = 0;
      for (const [h, was] of before) {
        const s = await Session.open(h, {});
        try {
          const here = await s.queryOne('here', ['displayName']);
          const holds = (await s.query('me:i', { fields: ['displayName'] }))
            .map((x) => String((x as { displayName?: string }).displayName ?? ''))
            .sort()
            .join(' | ');
          if (String(here?.displayName ?? '') !== was.place) wrongPlace++;
          if (holds !== was.holds) {
            wrongHolds++;
            say(`6: ${h} held "${was.holds}", holds "${holds}"`);
          }
          if ((await standingOf(s)).band !== was.band) wrongBand++;
        } finally {
          s.close();
        }
      }
      say(`6: after the restart — ${wrongPlace} elsewhere, ${wrongHolds} holding otherwise, ${wrongBand} with another band`);
      claim('6 everyone back in place', wrongPlace === 0, `${wrongPlace} of 30 elsewhere`);
      claim('6 everyone holds what they held', wrongHolds === 0, `${wrongHolds} of 30 holding otherwise`);
      claim('6 everyone has the standing they had', wrongBand === 0, `${wrongBand} of 30 with another band`);
      // 7c again, across the restart.
      const c = await Session.open(checker.handle, {});
      try {
        const after = competenceBlock(await c.prose('competence'));
        expect(after, '7c competence reads the same after the restart').toBe(competenceBefore);
      } finally {
        c.close();
      }
    }, 1_800_000);
  }
);

/**
 * The hot paths this build took (db-performance D11): the frame drain (W2), the
 * capture write (W4), and W5's four cuts in W0's rank order.
 */
const TAKEN: string[] = [
  'H5 frames',
  // ⚠ Not 'captures': its keys also count the logins' RESTORE reads (≈ 90
  // of W0's 121 `find holder_snapshots` are the thirty workers logging in,
  // in both runs). The capture's own cost went from a read and a write to
  // one write — proved per capture in PersistableShutdownSweep.test.ts.
  'H2 accounts and ledger',
  'H3 competence bands',
  'H4 chattel place and stamp',
  'H1 taps dedup',
  'H6 authorship read',
];

suite('record', () => {
  it('prints the record (and writes the baseline when recording)', () => {
    writeRecord();
  });
});
