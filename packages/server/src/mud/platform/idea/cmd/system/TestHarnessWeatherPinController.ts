/**
 * TestHarnessWeatherPinController — `testharness weather pin <kind>
 * [--at <place>] [--alive]` — hold the Locality's weather (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import {
  TestHarnessControllerBase,
  TOPIC,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessWeatherPinController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const where = TestHarnessControllerBase.scopeOf(model, context.commandGiver);
      if (where === null) return this.noLocality(context);
      if (!model.value) {
        return this.refuse(
          context,
          TOPIC,
          'testharness weather pin <kind> — clear, overcast, rain, storm, fog or snow.',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.pinWeather(
        where,
        model.value,
        model.alive ? 'alive' : 'frozen',
      );
      TestHarnessControllerBase.say(
        context,
        `The weather over ${r.locality} is held at ${model.value}` +
          `${model.alive ? ' (alive)' : ''} until \`testharness weather unpin\`.`,
      );
    });
  }
}
