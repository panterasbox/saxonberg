/**
 * DouseController — `douse <thing>` / `extinguish` / `snuff`.
 *
 * Puts out any burning Combustible in reach. The controller narrows the
 * target with `MixinApi.isCombustible` and routes the extinguish through the
 * gated `FireApi.douse`, which clears the Burning state and wets the object so
 * it resists re-ignition until dried (the water/wet extinguisher).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { FireApi } from '../../../../api/fire';
import type { Stuff } from '../../../../lib/stuff/Stuff';

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
    // ⚠⚠ **A FURNACE can be doused, and for a long time it could not.**
    //
    // The filter above admits `isCombustible(s) || isFurnace(s)` — and
    // this line then narrowed to `isCombustible` alone and threw the
    // furnace half away. A forge, an oven, a kiln, a campfire: every
    // one of them has a working `FurnaceMixin.douse()`, every one of
    // them was reachable by the verb, and **every one of them answered
    // "that isn't burning"** while burning. The method was unreachable
    // from the only verb that calls it.
    //
    // It surfaced in the envelope build because a lantern is now a
    // furnace, so `douse lantern` hit it on a thing a player carries —
    // but it was never about lanterns. Found by the drive (2026-09-24).
    const doused =
      target2 !== null &&
      (MixinApi.isCombustible(target2) || MixinApi.isFurnace(target2)) &&
      (target2 as Stuff & { douse(): boolean }).douse();
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
