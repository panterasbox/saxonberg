/**
 * MeasureGravityController — handler for `measure gravity
 * [<detail>]`. Reads `BiomeApi.resolveGravityFor` with the
 * actor's container as scope; refuses without a GravityMeter in
 * hand.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { BiomeApi } from '../../../../api/biome';
import { Mml } from '../../../../api/mml';
import GravityMeter from '../../../thing/instrument/GravityMeter';

interface MeasureGravityModel extends CommandModel {
  detail?: string;
}

export default class MeasureGravityController extends CommandController<MeasureGravityModel> {
  async execute(
    model: MeasureGravityModel,
    ctx: CommandContext,
  ): Promise<void> {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(ctx);
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? (giver as Stuff & Container).getContents()
      : [];
    if (!inv.some((i) => i instanceof GravityMeter)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no gravity meter in hand',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You need a gravity meter in hand.`)
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

    const g = await BiomeApi.resolveGravityFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Gravity: ${g.formatMml(undefined, undefined, { channel: 'gravity', via })} (${g.tag()})\n`;
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(body)
      .send();
  }
}
