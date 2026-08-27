/**
 * WindController — `wind <timepiece>`.
 *
 * Winds a reachable mechanical timepiece's mainspring back to full so it
 * resumes ticking. Gated by the MechanicalMovement content mixin the same
 * way `adjust` is: the controller narrows the target with a local
 * mixin-presence guard (`MixinApi.hasMixin(s, Mixins.MechanicalMovement)`)
 * and rejects anything else. `MechanicalMovement` is locality content, so
 * this gate lives in the bundle, not as a global `MixinApi.is*` predicate.
 */

import { CommandController } from '../../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../../api/mql';
import { MixinApi } from '../../../../../api/mixin';
import { Mixins } from '../../../../../lib/mixin';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { MechanicalMovement } from '../../MechanicalMovement';

interface WindModel extends CommandModel {
  target?: MqlOneResult;
}

export default class WindController extends CommandController<WindModel> {
  execute(model: WindModel, ctx: CommandContext): void {
    const { commandGiver } = ctx;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Wind what?`)
        .send();
      ctx.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'wind what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      ctx.note({
        kind: 'empty-result',
        field: 'target',
        query: target.raw,
      });
      return;
    }

    const movement = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & MechanicalMovement =>
        MixinApi.hasMixin(s, Mixins.MechanicalMovement),
    );
    if (!movement) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't wind that.`)
        .send();
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-windable',
        detail: "can't wind that",
      });
      return;
    }

    movement.wind();

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(
        Mml.compose`You wind ${Mml.thing(movement as unknown as Stuff)}; the mainspring tightens with a soft ratchet.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} winds ${Mml.thing(movement as unknown as Stuff)}.`,
      )
      .send();
  }
}
