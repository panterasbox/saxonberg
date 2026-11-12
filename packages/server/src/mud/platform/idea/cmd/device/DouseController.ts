/**
 * DouseController — `douse <thing>`.
 *
 * Puts out any burning Combustible (or furnace) in reach. ⭐ The thing
 * decides (`extinguishPlanFor`, controller-liquidity W8): the dousing clears
 * the Burning state and wets the object so it resists re-ignition until
 * dried (the water/wet extinguisher). This binds and words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Combustible } from '../../../../lib/fire/Combustible';
import type { Burner } from '../../../../lib/fire/Burner';

interface DouseModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DouseController extends CommandController<DouseModel> {
  async execute(model: DouseModel, context: CommandContext): Promise<void> {
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
      (s): s is Stuff & (Combustible | Burner) => MixinApi.isCombustible(s) || MixinApi.isBurner(s),
    );
    // ⚠⚠ **A FURNACE can be doused, and for a long time it could not.**
    //
    // The filter above admits `isCombustible(s) || isBurner(s)` — and the
    // dousing once narrowed to `isCombustible` alone and threw the furnace
    // half away: a forge, an oven, a kiln, a campfire each answered "that
    // isn't burning" while burning. Both answer `extinguishPlanFor` now.
    // Found by the drive (2026-09-24).
    if (target2 === null) {
      DouseController.notBurning(context);
      return;
    }
    const doused = target2 as Stuff;
    const plan = await target2.extinguishPlanFor(commandGiver);
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You douse ${Mml.thing(doused)}; it hisses out.`,
      onRefused: () => Mml.compose`That isn't burning.`,
      onDone: () => ({
        self: Mml.compose`You douse ${Mml.thing(doused)}; it hisses out.`,
        peers: Mml.compose`${Mml.actor(commandGiver)} douses ${Mml.thing(doused)}; it hisses out.`,
      }),
    });
  }

  protected static notBurning(context: CommandContext): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`That isn't burning.`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'not-burning',
      detail: "that isn't burning",
    });
  }
}
