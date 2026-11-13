/**
 * TestHarnessClockController — `testharness clock` — read game time,
 * day, hour and season (over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessClockController extends TestHarnessControllerBase {
  async execute(_model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      TestHarnessControllerBase.say(
        context,
        await TestHarnessControllerBase.clockLine(context.commandGiver),
      );
    });
  }
}
