/**
 * UnfoldController — `unfold <thing>`.
 *
 * Unfolds any Foldable in reach (a folding camp chair), making its
 * posture-bearing slots usable again. Gated by the Foldable capability.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Foldable } from '../../../lib/slot/Foldable';

interface UnfoldModel extends CommandModel {
  target?: MqlOneResult;
}

export default class UnfoldController extends CommandController<UnfoldModel> {
  execute(model: UnfoldModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Unfold what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'unfold what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: target.raw,
      });
      return;
    }

    const foldable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Foldable => MixinApi.isFoldable(s),
    );
    if (!foldable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't unfold that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-foldable',
        detail: "can't unfold that",
      });
      return;
    }

    if (!foldable.isFolded()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It is already unfolded.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-unfolded',
        detail: 'already unfolded',
      });
      return;
    }

    foldable.unfold();

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You unfold ${Mml.thing(foldable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} unfolds ${Mml.thing(foldable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
