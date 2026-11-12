/**
 * LockController — lock any Lockable the player can reach.
 *
 * Mirrors CloseController over the locked axis. Two resolution shapes
 * arrive: a direct hit on a Lockable (`lock oak door`) or a direction
 * match (`lock north`) binding the exit — itself lockable for the keyed
 * exits, else the door hung in it. `MqlApi.effectiveTarget` is that one
 * rule.
 *
 * The authority is the door's: `Lockable.lock(by)` refuses
 * `already-locked`, then `no-key`; this controller words the refusal.
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
import type { Lockable } from '../../../../lib/boundary/Lockable';

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

    // ⭐⭐ The door decides (controller-liquidity D9): `lock(by)` asks
    // the visible state first and the keyway second, so a replaced
    // controller or a script meets the same order. This controller words
    // the refusal.
    const answer = lockable.lock(commandGiver);
    if (!answer.ok) {
      const line =
        answer.reason === 'no-key'
          ? Mml.compose`You have no key that fits ${Mml.thing(lockable)}.`
          : Mml.compose`It is already locked.`;
      MessageApi.scene(commandGiver).topic('act.deed').toSelf(line).send();
      context.note({
        kind: 'controller-rejected',
        reason: answer.reason,
        detail: answer.reason === 'no-key' ? 'no key that fits' : 'already locked',
      });
      return;
    }

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You lock ${Mml.thing(lockable)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} locks ${Mml.thing(lockable)}.`,
      )
      .send();

    return;
  }
}
