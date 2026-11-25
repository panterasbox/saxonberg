/**
 * TestHarnessBodyWoundController — `testharness body-wound <target> <part>
 * <channel> [magnitude]` — wound one part through `ConditionApi.inflict`,
 * the channel's own fold through whatever covers it, exactly as in play
 * (organism-biology D16; over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessBodyWoundController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const r = await TestHarnessApi.woundBody(
        TestHarnessControllerBase.bodyOf(model),
        model.part ?? '',
        model.channel ?? '',
        model.amount === undefined || model.amount === '' ? 1 : Number(model.amount),
      );
      TestHarnessControllerBase.say(
        context,
        `${r.body}: ${r.afflicted ? 'a' : 'no'} ${r.type} at ${r.site} (severity ${r.severity.toFixed(2)}) — ${JSON.stringify(r)}`,
      );
    });
  }
}
