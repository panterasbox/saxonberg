/**
 * TestHarnessBodyController — `testharness body <target> [perceiving
 * <other>]` — read one body as a drive asserts on it: stage, sex, names,
 * conditions, wounds, core temperature, capacities, lost parts, and
 * whether it perceives `other` (organism-biology D16). A read: it changes
 * nothing (over {@link TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessBodyController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const other = model.other ? model.other : null;
      const r = await TestHarnessApi.bodyReport(TestHarnessControllerBase.bodyOf(model), other);
      TestHarnessControllerBase.say(context, `Body of ${r.body}: ${JSON.stringify(r)}`);
    });
  }
}
