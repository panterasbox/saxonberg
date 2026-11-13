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
import type { Lockable } from '../../../../lib/boundary/Lockable';

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

    // ⭐⭐ The door decides (controller-liquidity D9): `unlock(by)` asks
    // the visible state first and the keyway second, so a replaced
    // controller or a script meets the same order. This controller words
    // the refusal.
    const answer = lockable.unlock(commandGiver);
    if (!answer.ok) {
      const line =
        answer.reason === 'no-key'
          ? Mml.compose`You have no key that fits ${Mml.thing(lockable)}.`
          : Mml.compose`It is already unlocked.`;
      MessageApi.scene(commandGiver).topic('act.deed').toSelf(line).send();
      context.note({
        kind: 'controller-rejected',
        reason: answer.reason,
        detail: answer.reason === 'no-key' ? 'no key that fits' : 'already unlocked',
      });
      return;
    }

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You unlock ${Mml.thing(lockable)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} unlocks ${Mml.thing(lockable)}.`,
      )
      .send();

    return;
  }
}
