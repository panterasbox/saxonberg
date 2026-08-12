/**
 * MeasureTemperatureController — handler for `measure temperature
 * [<detail>]`.
 *
 * Reads `BiomeApi.resolveTemperatureFor(actor.getContainer(),
 * detailKey?)` and emits a single self-frame at
 * `sense.survey` with the canonical Kelvin reading plus
 * its thermal tag. Refuses with a controller-rejected note when
 * the actor isn't carrying a Thermometer.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { BiomeApi } from '../../../api/biome';
import { Mml } from '../../../api/mml';
import Thermometer from '../../instrument/Thermometer';

interface MeasureTemperatureModel extends CommandModel {
  detail?: string;
}

export default class MeasureTemperatureController extends CommandController<MeasureTemperatureModel> {
  async execute(
    model: MeasureTemperatureModel,
    ctx: CommandContext,
  ): Promise<void> {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(ctx);
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? (giver as Stuff & Container).getContents()
      : [];
    if (!inv.some((i) => i instanceof Thermometer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no thermometer in hand',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You need a thermometer in hand.`)
        .send();
      return;
    }
    const scope = (giver as Stuff & {
      getContainer?: () => unknown;
    }).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no atmospheric scope',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const t = await BiomeApi.resolveTemperatureFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Temperature: ${t.formatMml(undefined, 'thermal', { channel: 'thermal', via })} (${t.tag('thermal')})\n`;
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(body)
      .send();
  }
}
