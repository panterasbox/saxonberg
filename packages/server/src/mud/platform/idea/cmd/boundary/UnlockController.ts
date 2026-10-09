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

    // ⭐⭐ **Observable state first, the secret second** — see
    // `LockController` for the reasoning. A character can SEE that a
    // door is not locked, so saying so to anybody leaks nothing; the
    // KEY is the secret.
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

    // ⭐⭐⭐ **The authority, and it did not exist.** This controller
    // checked no key, no credential and no title, so conferring `unlock`
    // over the old boolean mixin would have let any player alive open
    // the university gate. The door answers for itself now: `opensFor`
    // is a synchronous scan of the mover's reachable wallet (implant
    // keychain, then a carried physical `Key` — never one lying on the
    // floor).
    //
    // ⚠ The bolt's STATE and the keyway's AUTHORITY are deliberately two
    // calls. `unlock()` moves the bolt and asks nobody; this is the ask.
    // ⭐ And this is the verb's whole point: a key-holder already walks
    // through a locked door, so unlocking is what you do to let everyone
    // ELSE through.
    if (!lockable.opensFor(commandGiver)) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(
          Mml.compose`You have no key that fits ${Mml.thing(lockable)}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-key',
        detail: 'no key that fits',
      });
      return;
    }


    lockable.unlock();

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
