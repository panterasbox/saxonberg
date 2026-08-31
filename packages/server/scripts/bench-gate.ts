/**
 * bench-gate — what one method call through the call-security proxy costs,
 * and which layer of the gate the cost is in.
 *
 * The engine dispatches every inter-object method call through a Proxy →
 * interceptor → policy → frame push. A live drive found that path at 96%
 * of the server, so it needs a number that survives the session, taken
 * the same way twice.
 *
 * Each layer is measured by SUBTRACTION: the same call is run with that
 * layer stubbed, and the delta is the layer's share. Trials are
 * interleaved and the MEDIAN is reported — a single pass drifts by 40%
 * on a laptop with a browser open, which is enough to invent a win.
 *
 * ⚠ Run with the VS Code auto-attach debugger OFF:
 *
 *     env -u NODE_OPTIONS -u VSCODE_INSPECTOR_OPTIONS pnpm tsx \
 *       scripts/bench-gate-preload.js
 *
 * An attached inspector makes stack capture ~1.6x more expensive, which
 * is exactly the thing being measured. The preload wrapper is required:
 * without the call-security loader hook no class carries a module stamp
 * and every `FromModule` gate denies.
 */

import { loadavg, cpus } from "node:os";

import "../src/test-bootstrap";
import Thing from "../src/mud/lib/stuff/Thing";
import { ProxyApi } from "../src/mud/api/proxy";
import { ModuleApi } from "../src/mud/api/module";
import { SecurityApi } from "../src/mud/api/security";
import { DetailedMixin } from "../src/mud/lib/description/Detailed";
import { ContainableMixin } from "../src/mud/lib/spatial/Containable";
import { PropertiedMixin } from "../src/mud/lib/stuff/Propertied";
import { makeStuff } from "../src/mud/lib/security/__tests__/test-setup";

/** A host with a mixin chain the depth of ordinary shipped content. */
class Probe extends PropertiedMixin(ContainableMixin(DetailedMixin(Thing))) {
  private _n = 0;
  public bump(): number {
    return ++this._n;
  }

  /**
   * Run `fn` `depth` proxied frames down. Each recursion is a real
   * dispatch, so the ExecutionContext stack is genuinely that deep —
   * which is the only way to see the cost that scales with it. A
   * benchmark run from the top of an empty stack measures a call the
   * engine never makes: a command in play is dozens of frames down.
   */
  public descend<T>(depth: number, fn: () => T): T {
    if (depth <= 0) return fn();
    return this.descend(depth - 1, fn);
  }
}

const ITERS = Number(process.env.BENCH_ITERS ?? 100_000);
const TRIALS = Number(process.env.BENCH_TRIALS ?? 5);

/**
 * `--hot` runs ONLY the production path, for a long time, and skips the
 * sweeps. It exists to be profiled: a profile of the full bench is
 * mostly module load and stubbed variants, so the thing you are trying
 * to see is a rounding error in it.
 */
const HOT_ONLY = process.argv.includes("--hot");

/** Median ns/call over interleaved trials. */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

interface Variant {
  label: string;
  /** Install the stub; returns the undo. */
  setup?: () => () => void;
  run: () => void;
}

function bench(variants: Variant[]): Map<string, number> {
  const samples = new Map<string, number[]>();
  for (const v of variants) samples.set(v.label, []);
  for (let t = 0; t < TRIALS; t++) {
    for (const v of variants) {
      const undo = v.setup?.();
      for (let i = 0; i < ITERS / 10; i++) v.run();
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < ITERS; i++) v.run();
      const ns = Number(process.hrtime.bigint() - t0) / ITERS;
      samples.get(v.label)!.push(ns);
      undo?.();
    }
  }
  const out = new Map<string, number>();
  for (const [k, v] of samples) out.set(k, median(v));
  return out;
}

/**
 * Refuse to report a number taken on a busy machine.
 *
 * The same guard `bench-suite` carries, for the same reason: a run that
 * shares eight cores with a vitest fork measures the contention, not the
 * change. Caught here concretely — a gate change measured 4.5 us on a
 * quiet box and 8.7 us while the suite ran beside it, which read as a
 * 2x REGRESSION from an optimisation. `--force` runs anyway and says so.
 */
function assertQuiet(): void {
  // +1 core for this process's own tsx compile: the guard reads load
  // AFTER the import graph is built, so our own warm-up is in the number
  // it is judging. Without the allowance the guard refuses a machine
  // that is quiet apart from us.
  const load = loadavg()[0]! - 1;
  const budget = Math.max(1, cpus().length / 4);
  if (load <= budget) return;
  const msg =
    `bench-gate: the machine is NOT quiet — 1-min load ${(load + 1).toFixed(1)} ` +
    `over a budget of ${budget.toFixed(1)} on ${cpus().length} cores.`;
  if (process.argv.includes("--force")) {
    console.error(`${msg}\n  ⚠ --force: the numbers below are CONTAMINATED.\n`);
    return;
  }
  console.error(`${msg}\n  Wait for it to settle, or pass --force.`);
  process.exit(1);
}

function main(): void {
  assertQuiet();
  const p = makeStuff(() => new Probe());
  const raw = ProxyApi.unwrap(p as never) as unknown as Probe;

  // Stack-walk stub: answers with a URL the frame-mutator allowlist
  // accepts, so the walk's cost disappears but its verdict does not.
  const realWalk = ModuleApi.getImmediateCallerUrl;
  const stubWalk = (): (() => void) => {
    (ModuleApi as unknown as Record<string, unknown>).getImmediateCallerUrl =
      (): string => "file:///x/mud/api/security.ts";
    return () => {
      (ModuleApi as unknown as Record<string, unknown>).getImmediateCallerUrl =
        realWalk;
    };
  };

  // Policy stub: the real resolve walks the prototype chain twice per
  // call; memoise on (constructor, method), which is what the resolve
  // is a pure function of.
  const realResolve = SecurityApi.resolveCallPolicy;
  const stubPolicy = (): (() => void) => {
    const memo = new WeakMap<object, Map<string, unknown>>();
    (SecurityApi as unknown as Record<string, unknown>).resolveCallPolicy =
      function (inst: object, m: string): unknown {
        const key = inst.constructor;
        let byProp = memo.get(key);
        if (!byProp) {
          byProp = new Map();
          memo.set(key, byProp);
        }
        let v = byProp.get(m);
        if (v === undefined) {
          v = realResolve.call(SecurityApi, inst, m);
          byProp.set(m, v);
        }
        return v;
      };
    return () => {
      (SecurityApi as unknown as Record<string, unknown>).resolveCallPolicy =
        realResolve;
    };
  };

  if (HOT_ONLY) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < ITERS; i++) p.bump();
    console.log(
      `  hot path  ${(Number(process.hrtime.bigint() - t0) / ITERS).toFixed(0)} ns/call over ${ITERS} calls`
    );
    process.exit(0);
  }

  const results = bench([
    { label: "raw (no proxy)", run: () => void raw.bump() },
    { label: "proxied (production)", run: () => void p.bump() },
    { label: "  minus stack walk", setup: stubWalk, run: () => void p.bump() },
    { label: "  minus policy resolve", setup: stubPolicy, run: () => void p.bump() },
    {
      label: "  minus both",
      setup: () => {
        const a = stubWalk();
        const b = stubPolicy();
        return () => {
          a();
          b();
        };
      },
      run: () => void p.bump(),
    },
  ]);

  console.log(`\ncall-security gate — median of ${TRIALS} x ${ITERS} calls\n`);
  for (const [k, v] of results) {
    console.log(`  ${k.padEnd(24)} ${v.toFixed(0).padStart(7)} ns/call`);
  }

  const rawNs = results.get("raw (no proxy)")!;
  const prod = results.get("proxied (production)")!;
  const overhead = prod - rawNs;
  console.log(
    `\n  gate overhead            ${overhead.toFixed(0).padStart(7)} ns  (${(prod / rawNs).toFixed(0)}x a raw call)`
  );
  for (const k of ["  minus stack walk", "  minus policy resolve", "  minus both"]) {
    const d = prod - results.get(k)!;
    console.log(
      `  ${k.trim().padEnd(24)} ${d.toFixed(0).padStart(7)} ns  (${((d / overhead) * 100).toFixed(0)}% of overhead)`
    );
  }

  // How the cost scales with call depth. Each frame push copies the
  // whole parent stack, so a dispatch 100 frames down pays 100 pointer
  // copies that a dispatch at the top does not. Play runs deep.
  console.log("\n  by ExecutionContext stack depth (production path):");
  for (const depth of [0, 25, 100, 200]) {
    const ns = p.descend(depth, () => {
      const one = bench([{ label: "d", run: () => void p.bump() }]);
      return one.get("d")!;
    });
    console.log(`    depth ${String(depth).padStart(3)}  ${ns.toFixed(0).padStart(7)} ns/call`);
  }

  // How many stack captures does one dispatch cost? The number the
  // whole investigation turned on: it was 3.
  let walks = 0;
  const undo = ((): (() => void) => {
    (ModuleApi as unknown as Record<string, unknown>).getImmediateCallerUrl =
      (): string => {
        walks++;
        return "file:///x/mud/api/security.ts";
      };
    return () => {
      (ModuleApi as unknown as Record<string, unknown>).getImmediateCallerUrl =
        realWalk;
    };
  })();
  for (let i = 0; i < 10_000; i++) p.bump();
  undo();
  console.log(`\n  stack captures per dispatch  ${(walks / 10_000).toFixed(2)}\n`);
  process.exit(0);
}

main();
