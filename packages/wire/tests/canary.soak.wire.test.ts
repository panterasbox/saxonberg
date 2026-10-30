/**
 * ⭐ The canary — the soak lane proving itself.
 *
 * One span step and nothing else: jump the clock two game days, which a
 * blocking run is refused (the line is one game day — docs/workflow.md
 * § No merge waits on the clock), and check the world still answers.
 * It runs only under `pnpm wire:soak`, where the harness sends
 * `soak: true` with the jump.
 *
 * The runner (`tools/soak`) adds it to every merge that touches the
 * soak tooling, so a lane that has quietly broken — the refusal
 * refusing everything, the result never written, the issue never filed
 * — fails HERE, on the canary, before it fails silently on a real
 * build's soak drive. It is also the first real soak.
 *
 * Clean: a clock jump consumes nothing the world does not regenerate.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
} from '../src/harness';

declareFile({
  file: 'canary.soak.wire.test.ts',
  packs: ['platform'],
});

const DAY = 86_400;

let player: Session;

beforeAll(async () => {
  player = await Session.open(uniqueHandle('canary'));
}, 120_000);

afterAll(() => {
  player?.close();
});

// The clock route exists only in a world the suite booted (WIRE_BOOT=1).
suite.skipIf(!isOwnedTestWorld())('the lane proves itself', () => {
  it('jumps two game days and the world answers', async () => {
    const before = await worldClockNow();
    const jump = await advanceWorldClock('2 days');
    expect(jump.before).toBeGreaterThanOrEqual(before);
    // The real seconds between the read and the jump run at 12×, so the
    // clock is never BEHIND two days; a minute of slack for the floor.
    expect(jump.after - before).toBeGreaterThanOrEqual(2 * DAY - 60);
    expectOk(await player.cmd('look'));
  });
});
