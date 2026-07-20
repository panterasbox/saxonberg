/**
 * MeasurePressureController — handler for `measure pressure
 * [<detail>]`. Reads `BiomeApi.resolvePressureFor` with the
 * actor's container as scope; refuses without a Barometer in
 * hand.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { BiomeApi } from '../../../api/biome';
import { Mml } from '../../../api/mml';
import Barometer from '../../instrument/Barometer';

interface MeasurePressureModel extends CommandModel {
  detail?: string;
}

export default class MeasurePressureController extends CommandController<MeasurePressureModel> {
  async execute(
    model: MeasurePressureModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? (giver as Stuff & Container).getContents()
      : [];
    if (!inv.some((i) => i instanceof Barometer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no barometer in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-pressure')
        .toSelf(Mml.compose`You need a barometer in hand.`)
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
        .topic('world.perception.measurement.measure-pressure')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const p = await BiomeApi.resolvePressureFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Pressure: ${p.formatMml()} (${p.tag()})\n`;
    MessageApi.scene(giver)
      .topic('world.perception.measurement.measure-pressure')
      .toSelf(body)
      .send();
  }
}
