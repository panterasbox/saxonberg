import { defineConfig } from "vitest/config";
import { callSecPlugin } from "./src/services/loader/vite-plugin";

export default defineConfig({
  // Plugin runs `enforce: 'post'` so it sees source after Vite's TS
  // transform. Appends a `ModuleApi.stamp(...)` call to every `mud/**`
  // module, giving every exported class a tamper-resistant module-id
  // used by `FromModule(...)` and `ApiOnly` policies.
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
    // NO `setupFiles`. The framework wiring used to live here, which
    // meant all 964 test files paid for `installFrameworkWiring()` and
    // its ~30-deep import graph — re-evaluated per file, because vitest
    // isolates. Measured at 5.79s of the 6.38s it took to run a file
    // that needed none of it. It is now an explicit import:
    //
    //     import "../../../test-bootstrap";
    //
    // A test that needs a wired world says so; 156 files that need
    // none of it stop paying. `pnpm lint:test-bootstrap` keeps the two
    // in sync so a new test file can't silently regress.
    //
    // ⚠⚠ `isolate: false` — DO NOT. It is the single biggest lever
    // left (it would let a worker share the module graph across files,
    // reclaiming most of what remains), and it is declined on
    // evidence, not taste.
    //
    // This codebase has global mutable registries — StuffApi's indexes,
    // the catalogues — and its tests depend on `StuffApi.clearAll()` in
    // teardown for a clean world. Without isolation every one of those
    // becomes a cross-file leak. The precedent is specific and recent:
    // the weather flake fixed in MR !175 was exactly this failure mode
    // (one test's pending work landing inside another's assertion
    // window), and it survived months because that class of bug is so
    // hard to attribute. This suite already flakes 4-13 tests per run
    // under load; the fix for that is not to remove the last barrier
    // between test files.
    //
    // A slow suite you trust beats a fast suite you don't, at any
    // speed. If you are here because the suite is still slow, the
    // honest targets are in docs/testing.md § What is left.
    //
    // `pool: 'threads'` — MEASURED AND REJECTED, 2026-08-08. Left here
    // as a comment because it is the obvious next thing to try, and
    // re-running a 20-minute suite to rediscover this is the waste.
    //
    //   forks (quiet)   1238.6s / 1165.5s      setup 3172s CPU
    //   threads         1183.6s / 1063.0s      setup 2982s CPU
    //
    // ~7% faster — inside this machine's measured noise floor (two
    // forks runs on identical code differ by 6%, and a third came in
    // 50% high), so it is not distinguishable from variance.
    //
    // The mechanism says why it can't be more: with `isolate: true`,
    // vitest re-evaluates the module graph per test FILE regardless of
    // pool, so threads share nothing that matters here — setup CPU fell
    // only 6%. Threads buy process-spawn overhead, and that is all.
    // The setup tax is pool-independent, which is why the lever that
    // actually moved this suite was scoping the wiring (see
    // docs/testing.md), not the pool.
    //
    // It also flaked two sandbox files that three forks runs did not
    // (sandbox.wardrobe, crossing.escape) — the security-boundary tests
    // are where fork/thread module-scope semantics differ, and the
    // acceptance bar was "faster AND green", not "faster".
  },
});
