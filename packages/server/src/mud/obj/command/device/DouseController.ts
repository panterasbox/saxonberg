/**
 * DouseController — `douse <thing>` / `extinguish` / `snuff`.
 *
 * Puts out any burning Combustible in reach. The controller narrows the
 * target with `MixinApi.isCombustible` and routes the extinguish through the
 * gated `FireApi.douse`, which clears the Burning state and wets the object so
 * it resists re-ignition until dried (the water/wet extinguisher).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { FireApi } from '../../../api/fire';
import type { Stuff } from '../../../lib/stuff/Stuff';

interface DouseModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DouseController extends CommandController<DouseModel> {
  execute(model: DouseModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Douse what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'douse what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: target.raw });
      return;
    }

    const target2 = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff => MixinApi.isCombustible(s) || MixinApi.isFurnace(s),
    );
    const doused = target2 !== null && FireApi.douse(target2);
    if (!doused) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`That isn't burning.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-burning',
        detail: "that isn't burning",
      });
      return;
    }

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You douse ${Mml.thing(target2 as Stuff)}; it hisses out.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} douses ${Mml.thing(target2 as Stuff)}; it hisses out.`,
      )
      .send();
  }
}
