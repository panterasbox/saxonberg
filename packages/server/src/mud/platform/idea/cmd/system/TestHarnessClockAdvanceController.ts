/**
 * TestHarnessClockAdvanceController — `testharness clock-advance <dur>` —
 * move the clock, one token (30m, 2h, 1d), a day at most (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { GrammarApi } from '../../../../api/grammar';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';


export default class TestHarnessClockAdvanceController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      if (!model.value) {
        return this.refuse(
          context,
          TOPIC,
          'testharness clock: read it with `testharness clock`, or move it with ' +
            '`testharness clock-advance <dur>` (30m, 2h, 1d).',
          'test-usage',
        );
      }
      const duration = TestHarnessClockAdvanceController.durationOf(model.value);
      if (duration === null) {
        return this.refuse(
          context,
          TOPIC,
          `testharness clock: '${model.value}' is not a duration — one token, ` +
            'a number and a unit: 30m, 2h, 1d.',
          'test-usage',
        );
      }
      const jump = await TestHarnessApi.advanceClock(duration);
      TestHarnessControllerBase.say(
        context,
        `The clock moved ${model.value}: ${Math.round(jump.before)}s → ` +
          `${Math.round(jump.after)}s (settled in ${jump.settledMs} ms` +
          `${jump.quiet ? '' : ', still draining'}).\n` +
          (await TestHarnessControllerBase.clockLine(context.commandGiver)),
      );
    });
  }

  /** A duration (`30m`, `2h`, `1d`, `a week`) as the clock's `N seconds` — the one grammar (D-C6). */
  private static durationOf(token: string): string | null {
    const seconds = GrammarApi.parseDuration(token);
    return seconds === null ? null : `${seconds} seconds`;
  }
}
