/**
 * FoldController — `fold <thing>`.
 *
 * Folds any Foldable in reach (a folding camp chair). Refuses to fold a
 * chair someone is sitting on — an occupied posture-bearing slot blocks
 * it. Gated by the Foldable capability; the controller narrows the
 * target with `MixinApi.isFoldable` and rejects anything else.
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

interface FoldModel extends CommandModel {
  target?: MqlOneResult;
}

export default class FoldController extends CommandController<FoldModel> {
  execute(model: FoldModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Fold what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'fold what?',
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
        .toSelf(Mml.compose`You can't fold that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-foldable',
        detail: "can't fold that",
      });
      return;
    }

    if (foldable.isFolded()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It is already folded.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-folded',
        detail: 'already folded',
      });
      return;
    }

    // Refuse to fold a host someone is occupying (a chair being sat on).
    const host = foldable as unknown as Stuff;
    if (MixinApi.isSlotted(host)) {
      for (const slot of host.getSlotNames()) {
        if (host.getOccupantCount(slot) > 0) {
          MessageApi.scene(commandGiver)
            .topic('act.deed')
            .toSelf(
              Mml.compose`You can't fold ${Mml.thing(host)} while it's in use.`,
            )
            .send();
          context.note({
            kind: 'controller-rejected',
            reason: 'occupied',
            detail: 'in use',
          });
          return;
        }
      }
    }

    foldable.fold();

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You fold ${Mml.thing(foldable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} folds ${Mml.thing(foldable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
