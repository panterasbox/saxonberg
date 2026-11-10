/**
 * TestHarnessClockAdvanceController — `testharness clock-advance <dur>` —
 * move the clock, one token (30m, 2h, 1d), a day at most (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

/** The one-token durations the verb takes, in the clock's own grammar. */
const UNIT_WORDS: Record<string, string> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

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
        `The clock moved ${duration}: ${Math.round(jump.before)}s → ` +
          `${Math.round(jump.after)}s (settled in ${jump.settledMs} ms` +
          `${jump.quiet ? '' : ', still draining'}).\n` +
          (await TestHarnessControllerBase.clockLine(context.commandGiver)),
      );
    });
  }

  /** A one-token duration (`30m`, `2h`, `1d`, `90s`) in the clock's grammar. */
  private static durationOf(token: string): string | null {
    const m = /^(\d+(?:\.\d+)?)([smhd])$/.exec(token.trim());
    if (!m) return null;
    return `${m[1]} ${UNIT_WORDS[m[2] as string]}`;
  }
}
