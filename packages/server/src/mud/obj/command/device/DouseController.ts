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
import type { Combustible } from '../../../lib/fire/Combustible';

interface DouseModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DouseController extends CommandController<DouseModel> {
  execute(model: DouseModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
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
        .topic('world.narration.action')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: target.raw });
      return;
    }

    const combustible = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Combustible => MixinApi.isCombustible(s),
    );
    const obj = combustible as unknown as Stuff | null;
    if (!combustible || !combustible.isBurning()) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`That isn't burning.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-burning',
        detail: "that isn't burning",
      });
      return;
    }

    FireApi.douse(combustible);
    MessageApi.scene(commandGiver)
      .topic('world.narration.action')
      .toSelf(Mml.compose`You douse ${Mml.object(obj as Stuff)}; it hisses out.`)
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} douses ${Mml.object(obj as Stuff)}; it hisses out.`,
      )
      .send();
  }
}
