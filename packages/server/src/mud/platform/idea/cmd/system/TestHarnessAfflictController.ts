/**
 * TestHarnessAfflictController — `testharness afflict <name> <condition>
 * [stage]` — put a resident character under a condition (anaesthesia
 * dosed to its top band takes them under at once: the size-and-carrying
 * drive's knock-out, step 15; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessAfflictController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const stage = model.cite === undefined || model.cite === '' ? undefined : Number(model.cite);
      if (!model.op || !model.value) {
        return this.refuse(
          context,
          TOPIC,
          'testharness afflict <name> <condition path> [stage] — e.g. `testharness afflict Mara /platform/idea/Condition/metabolism/anaesthesia`.',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.afflict(model.op, model.value, stage);
      TestHarnessControllerBase.say(context, `${r.character} is afflicted with ${r.condition} — ${r.consciousness}.`);
    });
  }
}
