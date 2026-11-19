/**
 * profile-layer — what the call-security layer costs in a world, read from
 * a V8 `.cpuprofile` (the call-security-performance build, 2026-11).
 *
 * A bench of one gated call cannot rank a world of reads (the slate parked
 * the read trap's inheritance walk as "~55 ns, not worth it" from a bench;
 * the world profile put it first). So the number that decides this layer's
 * work is its SELF time in a profile of the running world, over a window:
 *
 *   the layer = self time in api/proxy.ts · api/security.ts ·
 *               api/execution-context.ts · lib/security/** · the shadow
 *               gate's two entries (`_shadowsFor`, `_consumeBypass`) ·
 *               Node's AsyncLocalStorage (`run`, `getStore`,
 *               `executionAsyncResource`, `lookupPublicResource`)
 *   busy      = all self time less `(idle)`
 *
 * The definition is fixed so a before and an after are comparable;
 * do not widen it to make a number move. Recognition is NOT in it (it is
 * content the layer taxes); `PathTrie.#walk` and `MixinApi.hasMixin` are
 * reported on their own lines and not counted.
 *
 *     pnpm tsx scripts/profile-layer.ts <file.cpuprofile> [--from <s>] [--to <s>] [--top <n>]
 *
 * `--from`/`--to` are the server's UPTIME in seconds (`/stats.uptime`, the
 * wire crowd record's `marks`). A profile taken with `--cpu-prof` starts
 * with the process, so a sample's uptime is its offset from the profile's
 * start — within the half second the runtime takes to start the profiler.
 */

import { readFileSync } from "node:fs";

interface CallFrame {
  functionName: string;
  url: string;
  lineNumber: number;
}
interface ProfileNode {
  id: number;
  callFrame: CallFrame;
}
interface CpuProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** The mud-relative path of a frame's file, or the URL for anything else. */
function fileOf(url: string): string {
  const i = url.indexOf("/src/mud/");
  return i >= 0 ? url.slice(i + "/src/mud/".length) : url;
}

const LAYER_FILES = [
  "api/proxy.ts",
  "api/security.ts",
  "api/execution-context.ts",
];
const SHADOW_GATE = new Set(["_shadowsFor", "_consumeBypass", "shadowsFor", "consumeBypass"]);
const ALS = new Set(["run", "getStore", "executionAsyncResource", "lookupPublicResource"]);

/** Is this frame's self time the layer's? */
function inLayer(cf: CallFrame): boolean {
  const f = fileOf(cf.url);
  if (LAYER_FILES.includes(f)) return true;
  if (f.startsWith("lib/security/") && !f.includes("__tests__")) return true;
  if (f === "api/shadow.ts" && SHADOW_GATE.has(cf.functionName)) return true;
  if (!ALS.has(cf.functionName)) return false;
  if (cf.url.startsWith("node:internal/async_local_storage")) return true;
  // The two async-hooks lookups ALS's store read pays; a native builtin may
  // carry an empty URL. A `run`/`getStore` with an empty URL is not ALS.
  const hookLookup =
    cf.functionName === "executionAsyncResource" || cf.functionName === "lookupPublicResource";
  return hookLookup && (cf.url === "node:internal/async_hooks" || cf.url === "");
}

/** The two out-of-scope rows (non-goals), reported beside the layer. */
function outOfScope(cf: CallFrame): string | null {
  const f = fileOf(cf.url);
  if (cf.functionName.includes("#walk") && f.includes("PathTrie")) return "PathTrie.#walk";
  if (cf.functionName === "hasMixin" && f === "api/mixin.ts") return "MixinApi.hasMixin";
  return null;
}

function main(): void {
  const path = process.argv[2];
  if (!path || path.startsWith("--")) {
    console.error("usage: profile-layer <file.cpuprofile> [--from <s>] [--to <s>] [--top <n>]");
    process.exit(2);
  }
  const from = arg("--from") !== undefined ? Number(arg("--from")) : -Infinity;
  const to = arg("--to") !== undefined ? Number(arg("--to")) : Infinity;
  const top = Number(arg("--top") ?? 25);

  const p = JSON.parse(readFileSync(path, "utf8")) as CpuProfile;
  const nodes = new Map<number, ProfileNode>();
  for (const n of p.nodes) nodes.set(n.id, n);

  // Self time per node, inside the window. A sample's time is its delta
  // (the interval that ended at it), placed at its cumulative offset.
  const self = new Map<number, number>();
  let t = p.startTime;
  for (let i = 0; i < p.samples.length; i++) {
    const d = p.timeDeltas[i] ?? 0;
    t += d;
    const uptime = (t - p.startTime) / 1e6;
    if (uptime < from || uptime > to) continue;
    const id = p.samples[i]!;
    self.set(id, (self.get(id) ?? 0) + d);
  }

  let total = 0;
  let idle = 0;
  let layer = 0;
  const byFile = new Map<string, number>();
  const byFn = new Map<string, number>();
  const oos = new Map<string, number>();
  for (const [id, us] of self) {
    const cf = nodes.get(id)!.callFrame;
    total += us;
    if (cf.functionName === "(idle)") {
      idle += us;
      continue;
    }
    const o = outOfScope(cf);
    if (o) oos.set(o, (oos.get(o) ?? 0) + us);
    if (!inLayer(cf)) continue;
    layer += us;
    const file = cf.url.startsWith("node:") || cf.url === "" ? "node: AsyncLocalStorage" : fileOf(cf.url);
    byFile.set(file, (byFile.get(file) ?? 0) + us);
    const fn = `${cf.functionName || "(anonymous)"}  ${file}:${cf.lineNumber + 1}`;
    byFn.set(fn, (byFn.get(fn) ?? 0) + us);
  }
  const busy = total - idle;
  const ms = (us: number): string => (us / 1000).toFixed(0).padStart(8);
  const pct = (us: number): string => `${((us / busy) * 100).toFixed(1).padStart(5)}%`;

  const win =
    from === -Infinity && to === Infinity ? "whole profile" : `uptime ${from}–${to} s`;
  console.log(`\nprofile-layer — ${path}\n  window: ${win}\n`);
  console.log(`  busy self time        ${ms(busy)} ms   (idle ${ms(idle).trim()} ms)`);
  console.log(`  ⭐ the layer           ${ms(layer)} ms   ${pct(layer)} of busy\n`);
  console.log("  by file:");
  for (const [f, us] of [...byFile].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${ms(us)} ms ${pct(us)}  ${f}`);
  }
  console.log(`\n  top ${top} functions in the layer:`);
  for (const [f, us] of [...byFn].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`    ${ms(us)} ms ${pct(us)}  ${f}`);
  }
  console.log("\n  out of scope (non-goals; reported, not counted):");
  for (const name of ["PathTrie.#walk", "MixinApi.hasMixin"]) {
    const us = oos.get(name) ?? 0;
    console.log(`    ${ms(us)} ms ${pct(us)}  ${name}`);
  }
  console.log("");
}

main();
