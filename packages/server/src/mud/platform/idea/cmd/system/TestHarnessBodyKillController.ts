/**
 * TestHarnessBodyKillController — `testharness body-kill <target>` — kill
 * a body through the single death transition, `ConditionApi.die`: a
 * carcass is `clone` + `setAge` + this (organism-biology D16; over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessBodyKillController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const r = await TestHarnessApi.killBody(TestHarnessControllerBase.bodyOf(model));
      TestHarnessControllerBase.say(context, `${r.body} is ${r.alive ? 'still alive' : 'dead'}.`);
    });
  }
}
