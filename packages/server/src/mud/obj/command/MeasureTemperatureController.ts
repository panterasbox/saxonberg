/**
 * MeasureTemperatureController — handler for `measure temperature
 * [<detail>]`.
 *
 * Reads `BiomeApi.resolveTemperatureFor(actor.getContainer(),
 * detailKey?)` and emits a single self-frame at
 * `world.perception.vision` with the canonical Kelvin reading plus
 * its thermal tag. Refuses with a controller-rejected note when
 * the actor isn't carrying a Thermometer.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { BiomeApi } from '../../api/biome';
import { Mml } from '../../api/mml';
import { Thermometer } from '../instrument/Thermometer';

interface MeasureTemperatureModel extends CommandModel {
  detail?: string;
}

export class MeasureTemperatureController extends CommandController<MeasureTemperatureModel> {
  async execute(
    model: MeasureTemperatureModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof Thermometer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no thermometer in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.vision')
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
        .topic('world.perception.vision')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const t = await BiomeApi.resolveTemperatureFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Temperature: ${t.formatMml(undefined, 'thermal')} (${t.tag('thermal')})\n`;
    MessageApi.scene(giver)
      .topic('world.perception.vision')
      .toSelf(body)
      .send();
  }
}
