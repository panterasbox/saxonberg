/**
 * MeasureGravityController — handler for `measure gravity
 * [<detail>]`. Reads `BiomeApi.resolveGravityFor` with the
 * actor's container as scope; refuses without a GravityMeter in
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
import { GravityMeter } from '../instrument/GravityMeter';

interface MeasureGravityModel extends CommandModel {
  detail?: string;
}

export class MeasureGravityController extends CommandController<MeasureGravityModel> {
  async execute(
    model: MeasureGravityModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof GravityMeter)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no gravity meter in hand',
      });
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.look)
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
        .topic(MessageApi.Topics.world.perception.look)
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const g = await BiomeApi.resolveGravityFor(
      scope as Stuff & Container,
      model.detail,
    );
    const body = Mml.compose`Gravity: ${g.formatMml()} (${g.tag()})\n`;
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
