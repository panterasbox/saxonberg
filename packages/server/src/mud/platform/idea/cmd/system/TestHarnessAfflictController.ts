/**
 * TestHarnessAfflictController — `testharness afflict <target> <condition>
 * [stage]` — put a body under a condition (anaesthesia dosed to its top
 * band takes them under at once: the size-and-carrying drive's knock-out,
 * step 15); stage `0` relieves it (organism-biology D16: a cow out of
 * milk). The target is an object the binder resolves — a person by name,
 * an animal by its words — never a name matched here (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessAfflictController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const stage = model.amount === undefined || model.amount === '' ? undefined : Number(model.amount);
      const r = await TestHarnessApi.afflict(TestHarnessControllerBase.bodyOf(model), model.condition ?? '', stage);
      TestHarnessControllerBase.say(
        context,
        stage === 0
          ? `${r.character} is relieved of ${r.condition} — ${r.consciousness}.`
          : `${r.character} is afflicted with ${r.condition} — ${r.consciousness}.`,
      );
    });
  }
}
