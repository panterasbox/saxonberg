/**
 * LockController — lock any Lockable the player can reach.
 *
 * Mirrors CloseController over the locked axis. Two resolution shapes
 * arrive: a direct hit on a Lockable (`lock oak door`) or a direction
 * match (`lock north`) where the door is fetched from
 * `via.exit.getDoor()`. `MqlApi.effectiveTarget` tries both and returns
 * the first Lockable.
 *
 * v1 carries no key/credential model — the crossing gate is seeded
 * permanently locked and soft-walled in dialogue, so lock/unlock are
 * minimal no-key verbs. A key model is a future phase.
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
import type { Lockable } from '../../../lib/boundary/Locked';

interface LockModel extends CommandModel {
  target?: MqlOneResult;
}

export default class LockController extends CommandController<LockModel> {
  execute(model: LockModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Lock what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'lock what?',
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
        .toSelf(Mml.compose`You can't lock that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-lockable',
        detail: "can't lock that",
      });
      return;
    }

    if (lockable.isLocked()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It is already locked.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-locked',
        detail: 'already locked',
      });
      return;
    }

    lockable.lock();

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You lock ${Mml.thing(lockable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} locks ${Mml.thing(lockable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
