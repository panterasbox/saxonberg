// TestHarnessApi — test-world staging: move the clock, (W6) pin the
// weather. The thin, gated forwarding shell over TestHarnessLogic.
//
// ⛔ Scaffolding, not fiction. Nothing in the game moves the realm's
// clock or holds its weather; a test harness does, from outside the
// fiction. Every static here is `@TestOnly`, so in a world somebody
// plays in each one is a throwing stub. Two doors reach it in a test
// world — the wire harness's routes (through `backend/TestHooks`) and
// the `testharness` command — and both meet the same rules here, once.
// See docs/testing.md § The soak lane.

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { TestOnly } from '../lib/security/decorators';
import {
  TestHarnessLogic,
  type ClockJump,
} from '../platform/idea/api/TestHarnessLogic';
import { fileURLToPath } from 'url';

export type { ClockJump };

const LOGIC_PATH = '/platform/idea/api/test-harness';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/TestHarnessLogic', import.meta.url),
);

/** Resolve the HMR-able TestHarnessLogic singleton (sync). */
function logic(): TestHarnessLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'TestHarnessLogic',
      ) as typeof TestHarnessLogic | null) ?? TestHarnessLogic)(),
  );
}

export class TestHarnessApi {
  /**
   * ⛔ The line between a blocking drive and the soak lane, in game
   * seconds: one game day.
   */
  public static readonly BLOCKING_JUMP_CAP_S =
    TestHarnessLogic.BLOCKING_JUMP_CAP_S;

  /**
   * Move world-time forward by `duration`, draining every schedule the
   * skipped interval contains, then hold the clock until persistence is
   * quiet (up to four minutes) and resume it.
   *
   * ⛔ **A jump past one game day is refused before it moves anything**
   * unless `opts.soak` — the soak lane's runs set it, nothing else does
   * — with a message naming the rule and the `.soak.` fix.
   *
   * @param duration the clock's grammar (`'2 hours'`, `'1 day'`).
   */
  @TestOnly(
    'In a test world, move the clock with `testharness clock advance ' +
      '<dur>` (or the wire harness’s advanceWorldClock). Nothing in ' +
      'the game moves the realm’s clock.',
  )
  public static advanceClock(
    duration: string,
    opts?: { soak?: boolean },
  ): Promise<ClockJump> {
    return logic().advanceClock(duration, opts);
  }

  /** Game-seconds now — the read half of {@link advanceClock}. */
  @TestOnly(
    'In a test world, read the clock with `testharness clock` (or the ' +
      'wire harness’s worldClockNow).',
  )
  public static clockNow(): number {
    return logic().clockNow();
  }
}

SecurityApi.decorateApiClass(TestHarnessApi);
