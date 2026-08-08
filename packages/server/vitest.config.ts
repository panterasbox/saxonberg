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
    // Pre-load the four singleton-Stuff registries so their module-load
    // side effects register their classes with the corresponding Api
    // facades. Production gets these via BootstrapManager; tests
    // would otherwise hit "Registry class not registered" on first
    // touch. See `test-setup-registries.ts` for the rationale.
    setupFiles: ["./src/test-setup-registries.ts"],
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
