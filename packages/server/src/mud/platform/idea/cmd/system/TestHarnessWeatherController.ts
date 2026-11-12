/**
 * TestHarnessWeatherController — `testharness weather [--at <place>]` —
 * read the pin over the Locality, and the weather here (over {@link
 * TestHarnessControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TestHarnessApi } from '../../../../api/test-harness';
import { WeatherApi } from '../../../../api/weather';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import {
  TestHarnessControllerBase,
  type TestHarnessModel,
} from './TestHarnessControllerBase';

export default class TestHarnessWeatherController extends TestHarnessControllerBase {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    return this.staged(context, async () => {
      const where = TestHarnessControllerBase.scopeOf(model, context.commandGiver);
      if (where === null) return this.noLocality(context);
      const read = await TestHarnessApi.weatherPinAt(where);
      const here = await TestHarnessWeatherController.weatherHere(context.commandGiver);
      TestHarnessControllerBase.say(
        context,
        `${read.locality}: ` +
          (read.pin ? `pinned ${read.pin.type} (${read.pin.mode})` : 'no pin') +
          (here ? `. Here: ${here}.` : '.'),
      );
    });
  }

  /** The resolved weather where the giver stands, if a room holds them. */
  private static async weatherHere(giver: Stuff): Promise<string | null> {
    if (!MixinApi.isContainable(giver)) return null;
    const room = (giver as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) return null;
    const w = await WeatherApi.resolveWeatherFor(room as Stuff & Container);
    const falling = w.precipitationHere === 'none' ? '' : `, ${w.precipitationHere} falling`;
    return `${w.sample.type} (${w.provenance})${falling}`;
  }
}
