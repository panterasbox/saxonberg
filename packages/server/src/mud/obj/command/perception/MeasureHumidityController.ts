/**
 * MeasureHumidityController — handler for `measure humidity
 * [<detail>]`. Reads `BiomeApi.resolveHumidityFor` with the
 * actor's container as scope; refuses without a Hygrometer in
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
import Hygrometer from '../../instrument/Hygrometer';

interface MeasureHumidityModel extends CommandModel {
  detail?: string;
}

export default class MeasureHumidityController extends CommandController<MeasureHumidityModel> {
  async execute(
    model: MeasureHumidityModel,
    ctx: CommandContext,
  ): Promise<void> {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(ctx);
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? (giver as Stuff & Container).getContents()
      : [];
    if (!inv.some((i) => i instanceof Hygrometer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no hygrometer in hand',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
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
        .topic('sense.reading')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const h = await BiomeApi.resolveHumidityFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Humidity: ${h.formatMml(undefined, undefined, { channel: 'atmosphere', via })} (${h.tag()})\n`;
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(body)
      .send();
  }
}
