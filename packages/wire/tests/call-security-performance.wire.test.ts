/**
 * ⭐⭐ The call-security-performance drive (2026-11; what it measured is in
 * call-security-performance-slate). Every read and every call on a world
 * object passes the call-security layer; this build made that layer
 * cheaper. The drive
 * proves two things: that it is cheaper in the world (timed, quiet box
 * only), and that nothing it decides changed (every MR).
 *
 *   - **Steps 5 and 7 run on every MR.** Five refusals (out-of-module call,
 *     forged frame, destroyed object inert, weak pointer to a destroyed
 *     object, a spy-marked function outside a test run) and hot reload
 *     (a getter edited, a method edited, a method turned into a getter;
 *     a fresh clone sees all three, an old instance none).
 *   - **Steps 1–4, 6 and 8 are TIMED** and run only with `WIRE_QUIET=1`
 *     (and `WIRE_BOOT=1`) on a quiet box (docs/testing.md § The quiet box);
 *     otherwise they report themselves skipped, by name.
 *
 *   CSP_RECORD=1 → write `call-security-performance.baseline.json` (W0, on
 *                  master's code).
 *   otherwise    → compare against it: `say` and in-turn p95 and the
 *                  restart within 10% of the baseline (the box's noise
 *                  bound); idle is absolute, ≤ 0.15 of a core.
 *
 * Step 4 (the layer's own CPU time ≤ half the baseline's) is read from the
 * world's CPU profile with `packages/server/scripts/profile-layer.ts` after
 * the run (`WIRE_CPU_PROF=<dir>`), over the uptime marks this file prints.
 * It is the one checkpoint that is not an `expect` here: the profile is
 * written when the world stops.
 *
 * The probe class (`platform/thing/WireCspProbe.ts`) is written by this
 * file and removed by it; a probe left by a crashed run is removed first,
 * and the name is ignored by git. It is never committed.
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  declareFile,
  runCrowd,
  CROWD_PLACE,
  Session,
  uniqueHandle,
  quietBoxRefusal,
  foreignMeter,
  restartWorld,
  standIn,
  TESTBED,
} from '../src/harness';
import type { CrowdRecord } from '../src/harness';
import { WIRE_PORT } from '../src/runner/boot';

// ⭐ Stands in the scaffold's plaza (test-world-lifecycle D8). Its probe is
// written and removed by the file, its characters are fresh, so it runs twice
// on one world. ⚠ The baseline was recorded among Terminus's cast: a timed run
// in the plaza is not comparable with it until it is re-recorded on a quiet
// box (CSP_RECORD=1) — the numbers move for a reason that is not the code.
declareFile({
  file: 'call-security-performance.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

const QUIET = process.env.WIRE_QUIET === '1';
const RECORD = process.env.CSP_RECORD === '1';

// ── the probe ────────────────────────────────────────────────────────────

const PROBE_CLASS = '/platform/thing/WireCspProbe';
const SERVER_MUD = fileURLToPath(new URL('../../server/src/mud/', import.meta.url));
const PROBE_FILE = join(SERVER_MUD, 'platform/thing/WireCspProbe.ts');

/**
 * The probe's source. `v1` and `v2` differ in exactly the three members
 * step 7 reads: `tone` (a getter, edited), `ring()` (a method, edited) and
 * `shape` (a method in v1, a GETTER of the same name in v2 — the edit a
 * cached getter-or-not answer could get wrong).
 */
function probeSource(v: 'v1' | 'v2'): string {
  const shape =
    v === 'v1'
      ? "  public shape(): string {\n    return 'method';\n  }"
      : "  public get shape(): string {\n    return 'getter';\n  }";
  return `/**
 * ⚠ WIRE PROBE — written and removed by
 * packages/wire/tests/call-security-performance.dirty.wire.test.ts. Never
 * committed.
 */
import Good from './Good';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ExecutionContextApi } from '../../api/execution-context';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';

// Named as well as default: the hot-reload registry is read by the
// file's basename (StuffApi.loadClassByPath).
export class WireCspProbe extends Good {
  static fieldMeta: FieldMeta = {
    _held: { ref: 'instance', lifetime: 'weak' },
  };

  private _held: Stuff | null = null;

  /** 5d: point the weak field at a thing. */
  public hold(s: Stuff): void {
    this._held = s;
  }

  /** 5d: read it back, through the proxy (this === proxy). */
  public held(): Stuff | null {
    return this._held;
  }

  /** 5a, 5e: callable only from this file — never from an eval. */
  @CallSecurity(SecurityPolicies.FromModule('${PROBE_CLASS}'))
  public guarded(): string {
    return 'ran';
  }

  /** 5b: a non-framework file tags the current frame. */
  public forge(): string {
    ExecutionContextApi.tagCurrentFrame('command');
    return 'forged';
  }

  /** 5c: an ordinary method, for a destroyed object. */
  public ping(): string {
    return 'pong';
  }

  public get tone(): string {
    return '${v}';
  }

  public ring(): string {
    return '${v}';
  }

${shape}
}

export default WireCspProbe;
`;
}

function removeProbeFiles(): void {
  rmSync(PROBE_FILE, { force: true });
}

// ── the world ────────────────────────────────────────────────────────────

interface Stats {
  cpu?: { user: number; system: number };
  uptime?: number;
}
async function stats(): Promise<Stats | null> {
  const { SERVER_URL } = await import('../src/harness');
  const res = await fetch(`${SERVER_URL()}/stats`).catch(() => null);
  return res?.ok ? ((await res.json()) as Stats) : null;
}
function p95(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] ?? 0;
}
function listenerPid(): number | null {
  const out = spawnSync('lsof', ['-ti', `tcp:${WIRE_PORT}`, '-sTCP:LISTEN']).stdout?.toString().trim();
  const pid = Number(out?.split('\n')[0] ?? '');
  return pid > 0 ? pid : null;
}
// ── the record ───────────────────────────────────────────────────────────

/** What the timed steps measure, recorded at W0 and compared after. */
interface Measured {
  idleCores?: number;
  sayOneP95?: number;
  sayRoundP95?: number;
  loginP95?: number;
  intoFullP95?: number;
  freezeOver100?: number;
  freezeSamples?: number;
  restartP95?: number;
  marks?: Record<string, number | null>;
}
const BASELINE_PATH = new URL('./call-security-performance.baseline.json', import.meta.url);
const baseline: { measured: Measured } | null = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { measured: Measured })
  : null;
const measured: Measured = {};

/** What the drive found, printed at the end. */
const found: string[] = [];
const say = (line: string): void => {
  found.push(line);
  console.log(`csp: ${line}`);
};

/** "No worse": within the box's 10% noise bound of the baseline. */
function noWorse(name: keyof Measured, now: number): void {
  const was = baseline?.measured[name];
  if (RECORD || typeof was !== 'number') return;
  expect.soft(now, `${String(name)}: ${Math.round(now)} vs baseline ${Math.round(was)} (+10%)`).toBeLessThanOrEqual(
    was * 1.1
  );
}

// ── steps 5 and 7: every MR ──────────────────────────────────────────────

let founder: Session;

/**
 * As a wizard seated on the testbed committee (not `founder`: its seats are
 * world state another drive may have moved), run an eval BODY of statements and read back
 * the value it returned inside `CSP[…]CSP` — the tag tells the answer apart
 * from whatever else the square says while the command runs.
 *
 * ⚠ The command line splits on `;`, so the body is handed to an
 * AsyncFunction as a quoted string (a quoted `;` survives) with the four
 * bindings it uses; it must not contain a double quote.
 */
async function ev(body: string): Promise<string> {
  expect(body, 'an eval body may not contain a double quote').not.toContain('"');
  await founder.drainProse();
  const r = await founder.cmd(
    `eval return await (async () => {}).constructor('StuffApi', 'self', "${body}")(StuffApi, self)`
  );
  const said = await r.said();
  const m = /CSP\[([\s\S]*?)\]CSP/.exec(said);
  if (!m) throw new Error(`eval returned no CSP[…] answer: ${JSON.stringify(said.slice(0, 600))}`);
  // A string answer is printed JSON-quoted: undo its escapes.
  return m[1]!.replace(/\\(["\\])/g, '$1');
}

/** `return 'CSP[' + <expr> + ']CSP'`. */
const ret = (expr: string): string => `return 'CSP[' + (${expr}) + ']CSP'`;

/** Run `expr` and return its value, or the error that refused it. */
const attempt = (expr: string): string =>
  `try { const v = ${expr}; ${ret("'ok: ' + String(v)")} } catch (e) { ${ret("'refused: ' + e.message")} }`;

/**
 * Make a probe from the class as it is installed NOW. No template row: a
 * wizard's eval may not write one (the sandbox holds it inside its own
 * circle), and the class path is what step 7 is about. Returns its id.
 */
async function newProbe(): Promise<string> {
  return ev(
    `const C = await StuffApi.loadClassByPath('${PROBE_CLASS}'); ` +
      `const p = await StuffApi.create(() => new C()); ${ret('p.stuffId')}`
  );
}
const P = (id: string): string => `StuffApi.findById('${id}')`;

suite('steps 5 and 7 — every MR', () => {
  /** Cloned before the hot reload: step 7's "old" instance. */
  let old = '';

  beforeAll(async () => {
    removeProbeFiles();
    writeFileSync(PROBE_FILE, probeSource('v1'));
    founder = await standIn(CROWD_PLACE, 'csp-wizard', { wizard: true, committees: [TESTBED] });
    // A kept world may hold a probe class from an earlier run: install v1.
    const r = await founder.cmd(`reload ${PROBE_CLASS}`);
    expect(await r.said()).toMatch(/reloaded .*WireCspProbe\.ts/);
    old = await newProbe();
    expect(old).toMatch(/^\w{10,}$/);
  }, 240_000);

  afterAll(() => {
    founder?.close();
    removeProbeFiles();
  });

  it('5a — a gated method called from outside its allowed caller is refused', async () => {
    const guarded = await ev(attempt(`${P(old)}.guarded()`));
    say(`5a: guarded() from an eval ${guarded.slice(0, 160)}`);
    expect(guarded).toMatch(/^refused: Policy FromModule.* denied .*guarded/);
  });

  it('5b — a frame tag forged from a non-framework file is refused', async () => {
    const forged = await ev(attempt(`${P(old)}.forge()`));
    expect(forged).toMatch(/^refused: .*tagCurrentFrame/);
    say(`5b: ${forged.slice(0, 160)}`);
  });

  it('5c — a destroyed object is inert', async () => {
    const id = await newProbe();
    const r = await ev(
      `const q = ${P(id)}; StuffApi.destruct(q); ` + attempt('q.ping()')
    );
    expect(r).toBe('ok: undefined');
    say(`5c: a method on a destroyed probe answers ${r}`);
  });

  it('5d — a weak pointer to a destroyed object reads as nothing', async () => {
    const holder = await newProbe();
    const held = await newProbe();
    const r = await ev(
      `const h = ${P(holder)}; const t = ${P(held)}; h.hold(t); ` +
        `const before = h.held() === t; StuffApi.destruct(t); ${ret("String(before) + ' ' + String(h.held())")}`
    );
    expect(r).toBe('true null');
    say(`5d: held before destruct, then ${r.split(' ')[1]}`);
  });

  it('5e — a function marked as a test spy is refused outside a test run', async () => {
    const id = await newProbe();
    const r = await ev(
      `const q = ${P(id)}; const f = function () { return 'unchecked'; }; f._isMockFunction = true; ` +
        `q.guarded = f; ` +
        attempt('q.guarded()')
    );
    say(`5e: a spy-marked guarded() ${r.slice(0, 160)}`);
    expect(r).toMatch(/^refused: /);
  });

  it('7 — hot reload: a fresh clone sees all three edits; an old instance none', async () => {
    // ⚠ The edit is written to the file directly, as `typecheck.wire.test.ts`
    // does: the in-game `cp -s` asks for CODE title over
    // `/platform/thing/`, which the wizard does not hold (so the
    // drive writes it). The install is the in-game `reload`, which is the act
    // under test.
    writeFileSync(PROBE_FILE, probeSource('v2'));
    const r = await founder.cmd(`reload ${PROBE_CLASS}`);
    expect(await r.said()).toMatch(/reloaded .*WireCspProbe\.ts/);
    const fresh = await newProbe();
    const reads = JSON.parse(
      await ev(
        `const f = ${P(fresh)}; const o = ${P(old)}; ` +
          ret(
            "JSON.stringify({ freshTone: f.tone, freshRing: f.ring(), freshShape: f.shape, " +
              "oldTone: o.tone, oldRing: o.ring(), oldShapeKind: typeof o.shape, " +
              "oldShape: typeof o.shape === 'function' ? o.shape() : String(o.shape) })"
          )
      )
    );
    say(`7: ${JSON.stringify(reads)}`);
    expect(reads).toEqual({
      freshTone: 'v2',
      freshRing: 'v2',
      freshShape: 'getter',
      oldTone: 'v1',
      oldRing: 'v1',
      oldShapeKind: 'function',
      oldShape: 'method',
    });
  });
});

// ── steps 1–4, 6, 8: the quiet box ──────────────────────────────────────

(QUIET ? suite : suite.skip)(
  QUIET
    ? 'the timed steps (quiet box)'
    : 'the timed steps — SKIPPED: set WIRE_QUIET=1 on a quiet box (docs/testing.md)',
  () => {
    let thirty: CrowdRecord | null = null;
    const handles: string[] = [];
    const placeBefore = new Map<string, string>();

    it('precheck: the box is quiet', async () => {
      // ⚠ A fresh-database boot is itself the load the precheck reads:
      // the W0 run read 2.06 straight after the boot and 1.9 a minute
      // later, falling. So it waits up to five minutes for the box to
      // settle before refusing — the refusal is still by name.
      let refusal = quietBoxRefusal(listenerPid());
      for (let waited = 0; refusal !== null && waited < 300_000; waited += 15_000) {
        await new Promise((r) => setTimeout(r, 15_000));
        refusal = quietBoxRefusal(listenerPid());
      }
      expect(refusal, `box not quiet: ${refusal}`).toBeNull();
    }, 360_000);

    it('2 — the empty world idles at ≤ 0.15 of a core over ten minutes', async () => {
      const foreign = foreignMeter();
      const a = await stats();
      await new Promise((r) => setTimeout(r, 600_000));
      const b = await stats();
      expect(a?.cpu && b?.cpu).toBeTruthy();
      const cores =
        (b!.cpu!.user + b!.cpu!.system - a!.cpu!.user - a!.cpu!.system) / 1e6 / ((b!.uptime ?? 0) - (a!.uptime ?? 0));
      const f = await foreign();
      measured.idleCores = cores;
      measured.marks = { ...measured.marks, idleFrom: a?.uptime ?? null, idleTo: b?.uptime ?? null };
      say(`2: idle ${cores.toFixed(3)} cores over uptime ${a?.uptime}–${b?.uptime}; foreign ${f}`);
      expect(f ?? 0, 'inconclusive: more than half a core of foreign CPU').toBeLessThanOrEqual(0.5);
      if (!RECORD) expect.soft(cores, '2: idle ≤ 0.15 of a core').toBeLessThanOrEqual(0.15);
    }, 800_000);

    it('3 — thirty in one place: say, look, look at a fellow; then five into the full square', async () => {
      thirty = await runCrowd('csp-30', {
        size: 30,
        during: async (crowd) => {
          for (const s of crowd) handles.push(s.handle);
          for (const s of crowd) {
            const where = await s.queryOne('here', 'ref');
            placeBefore.set(s.handle, String(where?.displayName ?? ''));
          }
          // Each looks, and looks at one of the crowd (recognition: the
          // keyword read and the describe, per viewer per candidate).
          for (const s of crowd) await s.cmd('look');
          for (let i = 0; i < crowd.length; i++) {
            const other = crowd[(i + 1) % crowd.length]!;
            await crowd[i]!.cmd(`look ${other.handle}`);
          }
          const into: number[] = [];
          for (let i = 0; i < 5; i++) {
            const t = performance.now();
            const s = await Session.open(uniqueHandle(`csp-late${i}`), { startLocation: CROWD_PLACE });
            into.push(performance.now() - t);
            s.close();
          }
          measured.intoFullP95 = p95(into);
        },
      });
      const r = thirty;
      measured.sayOneP95 = r.sayOne.p95;
      measured.sayRoundP95 = r.sayRound.p95;
      measured.loginP95 = r.logins.p95;
      measured.freezeOver100 = r.loop.over100;
      measured.freezeSamples = r.loop.samples;
      measured.marks = { ...measured.marks, ...r.marks };
      say(
        `3: say p95 ${Math.round(r.sayOne.p95)} ms · in turn p95 ${Math.round(r.sayRound.p95)} ms · ` +
          `login p95 ${Math.round(r.logins.p95)} ms · five into the full square p95 ${Math.round(measured.intoFullP95 ?? 0)} ms · ` +
          `freeze ${r.loop.over100}/${r.loop.samples} over 100 ms · foreign ${r.foreignCores}`
      );
      say(`4: crowd uptime marks ${JSON.stringify(r.marks)} — read the profile with profile-layer over these`);
      expect(r.foreignCores ?? 0, 'inconclusive: foreign CPU').toBeLessThanOrEqual(0.5);
      noWorse('sayOneP95', r.sayOne.p95);
      noWorse('sayRoundP95', r.sayRound.p95);
    }, 1_800_000);

    it('6 — the thirty come back where they quit, no slower', async () => {
      expect(handles.length).toBe(30);
      await restartWorld();
      const times: number[] = [];
      const back: Session[] = [];
      for (const h of handles) {
        const t = performance.now();
        back.push(await Session.open(h, {}));
        times.push(performance.now() - t);
      }
      for (const s of back) {
        const here = await s.queryOne('here', 'ref');
        expect(String(here?.displayName ?? ''), `${s.handle} stands where they quit`).toBe(
          placeBefore.get(s.handle) ?? '?'
        );
      }
      for (const s of back) s.close();
      measured.restartP95 = p95(times);
      say(`6: logins after restart p95 ${Math.round(measured.restartP95)} ms`);
      noWorse('restartP95', measured.restartP95);
      if (RECORD) {
        writeFileSync(
          BASELINE_PATH,
          `${JSON.stringify(
            {
              _comment:
                'Written by CSP_RECORD=1 on master’s code (W0) on a quiet box; compared on every other quiet run.',
              measured,
            },
            null,
            2
          )}\n`
        );
      }
      console.log(`\n── call-security-performance record ──\n${found.join('\n')}\n`);
    }, 1_200_000);
  }
);
