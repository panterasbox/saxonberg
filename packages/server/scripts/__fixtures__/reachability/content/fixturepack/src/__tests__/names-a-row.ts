/**
 * ⚠ A row named only from inside a `__tests__` directory is NOT
 * reachable, and this file is what proves arm R agrees.
 *
 * `pack-roots.packSrcFiles` skips `__tests__` outright, so nothing in
 * here reaches the literal scan. That is the whole point: a test that
 * MANUFACTURES what the world lacks is how `SwimmableMixin` and
 * `FlyableMixin` stayed invisible for three builds —
 * `locomotion.test.ts` built its own `SwimZoneLocation` and passed, so
 * the absence of any such host in the realm was never a failing
 * assertion anywhere.
 *
 * ⚠ Not named `*.test.ts`: vitest collects by that pattern repo-wide and
 * `lint:test-bootstrap:verify` compares its own walk against vitest's
 * roster, so a fixture wearing the test suffix shows up as a real test
 * file with no tests in it. The gate caught that on the first run.
 */
export const TEST_ONLY = "/fixture/thing/test-named";
