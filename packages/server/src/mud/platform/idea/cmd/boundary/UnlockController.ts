/**
 * UnlockController — unlock any Lockable the player can reach.
 *
 * Mirrors LockController inverted. See LockController for the two
 * resolution shapes and the v1 no-key note.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Lockable } from '../../../../lib/boundary/Locked';

interface UnlockModel extends CommandModel {
  target?: MqlOneResult;
}

export default class UnlockController extends CommandController<UnlockModel> {
  execute(model: UnlockModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Unlock what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'unlock what?',
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

    const lockable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Lockable => MixinApi.isLockable(s),
    );
    if (!lockable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't unlock that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-lockable',
        detail: "can't unlock that",
      });
      return;
    }

    if (!lockable.isLocked()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It is already unlocked.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-unlocked',
        detail: 'already unlocked',
      });
      return;
    }

    lockable.unlock();

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You unlock ${Mml.thing(lockable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} unlocks ${Mml.thing(lockable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
