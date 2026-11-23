/**
 * TestHarnessBodySeverController — `testharness body-sever <target>
 * <part>` — take a part off by the REAL avulsion: a tearing insult at the
 * sever severity, so the wound and the sever happen as in play. Never a
 * woundless loss (organism-biology D16; over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessBodySeverController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const how = model.sealedBy === 'heat' || model.sealedBy === 'corrosion' ? model.sealedBy : null;
      if (model.sealedBy && how === null) {
        return this.refuse(context, TOPIC, 'testharness body-sever: a stump is sealed by `heat` or `corrosion`.', 'test-usage');
      }
      const r = await TestHarnessApi.severBodyPart(TestHarnessControllerBase.bodyOf(model), model.part ?? '', how);
      TestHarnessControllerBase.say(
        context,
        `${r.body}: ${r.type} at ${r.site} (severity ${r.severity.toFixed(2)}) — ${JSON.stringify(r)}`,
      );
    });
  }
}
