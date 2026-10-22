/**
 * LieController — `sit`'s `Postures.Lie` sibling. See SitController
 * for the validation + workflow shape.
 *
 * ⭐ In deep water the floor is the water's surface, which bears nobody:
 * lying on it is FLOATING (underwater review — one act, so one verb; the
 * body decides whether it can, and says why not in its own words).
 * `float` names the same act and means nothing out of the water.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Postures } from '../../../../lib/slot/Postured';
import Place from '../../../../lib/stuff/Place';
import WaterSurface from '../../../thing/WaterSurface';

interface LieModel extends CommandModel {
  target: MqlOneResult;
}

export default class LieController extends CommandController<LieModel> {
  async execute(model: LieModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    const floatingAsked = context.verb === 'float';
    if ((target instanceof WaterSurface && !target.supports(giver)) || floatingAsked) {
      if (!MixinApi.isRespiration(giver)) {
        return this.refuse(context, 'act.deed', 'You cannot float.', 'not-a-swimmer');
      }
      const out = await giver.float();
      if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
      // ⭐ In moving water the float is feet-first (river D13): the
      // technique that costs half in rough water and meets a hazard feet on.
      const feet = giver.isFeetFirst();
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(
          feet
            ? Mml.compose`You turn on your back with your feet downstream and let the river carry you, feet first.`
            : Mml.compose`You lie back on the water and let it hold you up.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} lies back and floats.`)
        .send();
      return;
    }
    if (!target) {
      // ⭐ No ground here at all (mid-water): the place says why.
      const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
      const why = room instanceof Place ? room.groundRefusal(model.target.raw) : null;
      if (why !== null) return this.refuse(context, 'act.deed', why, 'no-ground');
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isPostured(target)) {
      throw new Error(
        `LieController: requires: PosturedMixin should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      throw new Error(
        `LieController: requiresPosed/Slottable validators should have caught ${giver.stuffId}`
      );
    }

    const result = giver.transferPosture(target,
      Postures.Lie,
      'lie'
    );
    if (!result.ok) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`${result.summary}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: result.reason,
        detail: result.summary,
      });
      return;
    }

    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You lie down.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lies down.`)
      .send();
    return;
  }
}
