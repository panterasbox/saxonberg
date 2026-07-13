/**
 * WindController — `wind <timepiece>`.
 *
 * Winds a reachable mechanical timepiece's mainspring back to full so it
 * resumes ticking. Gated by the MechanicalMovement capability the same
 * way `adjust`/`switch`/`fold` are: the controller narrows the target
 * with `MixinApi.isMechanicalMovement` and rejects anything else.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { MechanicalMovement } from '../../../lib/time/MechanicalMovement';

interface WindModel extends CommandModel {
  target?: MqlOneResult;
}

export default class WindController extends CommandController<WindModel> {
  execute(model: WindModel, ctx: CommandContext): void {
    const { commandGiver } = ctx;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
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
        .topic('world.narration.action')
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
        MixinApi.isMechanicalMovement(s),
    );
    if (!movement) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
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
      .topic('world.narration.action')
      .toSelf(
        Mml.compose`You wind ${Mml.object(movement as unknown as Stuff)}; the mainspring tightens with a soft ratchet.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} winds ${Mml.object(movement as unknown as Stuff)}.`,
      )
      .send();
  }
}
