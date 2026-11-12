/**
 * TestHarnessRemoveController — `testharness vanish #<id>` — take a thing
 * out of the world by id wherever it is: a wizard reaching into a
 * character's shut pack (size and carrying drive, step 14; over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessRemoveController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      if (!model.op) {
        return this.refuse(context, TOPIC, 'testharness vanish #<id> — the thing to take out of the world.', 'test-usage');
      }
      const r = await TestHarnessApi.removeThing(model.op);
      TestHarnessControllerBase.say(context, `Removed ${r.removed}.`);
    });
  }
}
