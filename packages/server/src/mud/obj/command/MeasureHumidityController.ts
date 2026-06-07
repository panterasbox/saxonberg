/**
 * MeasureHumidityController — handler for `measure humidity
 * [<detail>]`. Reads `BiomeApi.resolveHumidityFor` with the
 * actor's container as scope; refuses without a Hygrometer in
 * hand.
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
import { Hygrometer } from '../instrument/Hygrometer';

interface MeasureHumidityModel extends CommandModel {
  detail?: string;
}

export class MeasureHumidityController extends CommandController<MeasureHumidityModel> {
  async execute(
    model: MeasureHumidityModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof Hygrometer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no hygrometer in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-humidity')
        .toSelf(Mml.compose`You need a hygrometer in hand.`)
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
        .topic('world.perception.measurement.measure-humidity')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const h = await BiomeApi.resolveHumidityFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Humidity: ${h.formatMml()} (${h.tag()})\n`;
    MessageApi.scene(giver)
      .topic('world.perception.measurement.measure-humidity')
      .toSelf(body)
      .send();
  }
}
