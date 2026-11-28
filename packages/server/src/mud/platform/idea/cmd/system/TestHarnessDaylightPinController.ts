/**
 * TestHarnessDaylightPinController — `testharness daylight-pin <fraction>`
 * — hold the length of the day at a fraction of the rotation (0.35 is
 * winter, 0.55 spring), so a drive stands a ewe in winter without waiting
 * for one (organism-biology D16; over {@link TestHarnessControllerBase}).
 * The pin is the world's: whoever pins, unpins.
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessDaylightPinController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const r = await TestHarnessApi.pinDaylight(Number(model.amount));
      TestHarnessControllerBase.say(
        context,
        `The day is held at ${r.pin} of the rotation until \`testharness daylight-unpin\`.`,
      );
    });
  }
}
