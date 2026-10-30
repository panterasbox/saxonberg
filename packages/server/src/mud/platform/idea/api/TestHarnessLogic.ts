// TestHarnessLogic — test-world staging, behind TestHarnessApi.
//
// The one implementation behind both doors that move the world for a
// test: the wire harness's routes (`/auth/test-clock`, through
// `TestHooks`) and the in-world `testharness` command. Every static on
// the face is `@TestOnly`, so outside a test world none of this is
// reachable at all. See docs/testing.md § The soak lane.

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistApi } from '../../../api/persist';

const TestHarnessApiCallers = SecurityPolicies.FromModule(
  '/api/test-harness#TestHarnessApi',
);

/** What a clock jump reports. */
export interface ClockJump {
  /** Game-seconds before the jump. */
  readonly before: number;
  /** Game-seconds after it (the clock is held while the world settles). */
  readonly after: number;
  /** Real milliseconds the world took to catch up. */
  readonly settledMs: number;
  /** False when the backlog was still draining at the timeout. */
  readonly quiet: boolean;
}

/**
 * @internal — the logic singleton behind `TestHarnessApi`. Registers at
 * `/platform/idea/api/test-harness`; methods admit only the
 * `TestHarnessApi` face.
 */
export class TestHarnessLogic extends ApiLogic {
  /**
   * ⛔ The line between a blocking drive and the soak lane: one game
   * day. A jump past it is a SPAN step (docs/workflow.md § No merge
   * waits on the clock), refused here unless the caller is a soak run.
   */
  public static readonly BLOCKING_JUMP_CAP_S = 86_400;

  /** See {@link TestHarnessApi.advanceClock}. */
  @CallSecurity(TestHarnessApiCallers)
  public async advanceClock(
    duration: string,
    opts?: { soak?: boolean },
  ): Promise<ClockJump> {
    // ⭐ Refused BEFORE the jump, by the clock's own parser, so the
    // grammar and the line are the same for every door.
    const seconds = WorldClockApi.durationSeconds(duration);
    if (seconds > TestHarnessLogic.BLOCKING_JUMP_CAP_S && !opts?.soak) {
      const days = (seconds / 86_400).toFixed(1);
      throw new Error(
        `test clock: a jump of '${duration}' (${days} game days) is a SPAN ` +
          `step and cannot run in a blocking drive — the line is one game ` +
          `day (docs/workflow.md § No merge waits on the clock). Move the ` +
          `step to a .soak. file (<feature>.soak.wire.test.ts, run by ` +
          '`pnpm wire:soak`), or shorten it to a day or less.',
      );
    }
    const before = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance(duration);
    const after = WorldClockApi.getNow().rawValue();
    console.info(
      `TestHarness: advanced world-time '${duration}' ` +
        `(${Math.round(before)}s → ${Math.round(after)}s)`,
    );
    // ⭐ The jump returns when the world has caught up with it (river D46,
    // pass 17): everything the skipped interval fired queues its reads and
    // writes behind the pool, and a drive that jumps again before they land
    // stacks one jump's backlog on the next — ~21,000 queries at 12 s each,
    // and the process grew until the box went down.
    const t0 = Date.now();
    // ⭐ The clock is HELD while it settles: the world runs at its scale
    // in real time, so a minute's wait would land the jump many game
    // minutes past where the drive asked (pass 18: a quarter of an hour's
    // jump landed past the boat it was for). Held, nothing new fires and
    // the jump lands exactly. Never left held: resumed whatever happens.
    const held = !WorldClockApi.isPaused();
    if (held) WorldClockApi.pause();
    let quiet = false;
    try {
      // Under the wire client's 300 s header timeout, so a slow drain
      // reports rather than drops.
      quiet = await PersistApi.whenQuiet(500, 240_000);
    } finally {
      if (held) WorldClockApi.resume();
    }
    const settledMs = Date.now() - t0;
    console.info(
      `TestHarness: the jump settled in ${settledMs} ms` +
        (quiet
          ? ''
          : ' — NOT quiet at the timeout; the backlog is still draining'),
    );
    return { before, after, settledMs, quiet };
  }

  /** See {@link TestHarnessApi.clockNow}. */
  @CallSecurity(TestHarnessApiCallers)
  public clockNow(): number {
    return WorldClockApi.getNow().rawValue();
  }
}
