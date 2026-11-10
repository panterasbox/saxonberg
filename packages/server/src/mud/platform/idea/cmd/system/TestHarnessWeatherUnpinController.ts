/**
 * TestHarnessWeatherUnpinController — `testharness weather unpin [--at
 * <place>]` — release the Locality's weather (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessWeatherUnpinController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const where = TestHarnessControllerBase.scopeOf(model, context.commandGiver);
      if (where === null) return this.noLocality(context);
      const r = await TestHarnessApi.unpinWeather(where);
      TestHarnessControllerBase.say(context, `The weather over ${r.locality} runs free again.`);
    });
  }
}
