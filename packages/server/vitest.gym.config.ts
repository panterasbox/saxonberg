/**
 * The gym suite — `pnpm test:gym`.
 *
 * The balance regression guards, which drive complete fights through
 * the real engine and cost minutes rather than milliseconds. They are
 * benchmarks shaped like tests: `combat-gym` asserts the fight stays
 * fair (the parry seam stays dead, the feint stays non-degenerate,
 * NPC ≈ PC, matchups stay deterministic), and `waster-spar` proves the
 * blunted delivery form end-to-end through the tissue fold.
 *
 * They were 25% of the suite's test CPU (~880s of ~3475s) in two files
 * and 31 tests, which is why they no longer run in the default loop.
 *
 * They are NOT skipped: CI runs this config as its own job, in
 * parallel with the main suite, so the total CI wall clock goes DOWN
 * while coverage stays exactly the same. Run it locally before
 * touching anything in `lib/combat`, `lib/material`, or the
 * materials-response grids — those are the changes it exists to catch.
 *
 * The file list lives in `vitest.config.ts` as `GYM_TESTS` and is
 * imported here, so the default suite's `exclude` and this suite's
 * `include` cannot drift apart.
 *
 * ⚠ Composed by spreading `sharedTest`, NOT by vitest's `mergeConfig`.
 * Merge concatenates arrays, so merging onto the base config inherits
 * its `exclude` — which lists exactly these two files — and this suite
 * then matches nothing.
 */

import { defineConfig, configDefaults } from "vitest/config";

import { callSecPlugin } from "./src/services/loader/vite-plugin";
import { GYM_TESTS, sharedTest } from "./vitest.config";

export default defineConfig({
  // Same call-security transform as the default suite — these benches
  // drive the real engine through real gates, which is the point.
  plugins: [callSecPlugin()],
  test: {
    ...sharedTest,
    include: GYM_TESTS,
    exclude: [...configDefaults.exclude],
    // A full bout is minutes of engine work; the default 5s per-test
    // timeout is sized for unit tests. The formation-totality test
    // alone runs ~150s.
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
});
