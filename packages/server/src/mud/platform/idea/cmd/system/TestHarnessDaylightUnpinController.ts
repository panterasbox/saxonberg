/**
 * TestHarnessDaylightUnpinController — `testharness daylight-unpin` —
 * release the daylength pin; the sky's own day returns
 * (organism-biology D16; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessDaylightUnpinController extends TestHarnessControllerBase {
  async execute(_model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      await TestHarnessApi.pinDaylight(null);
      TestHarnessControllerBase.say(context, 'The length of the day follows the sky again.');
    });
  }
}
