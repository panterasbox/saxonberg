/**
 * LightController — `light <thing>` / bare `light`.
 *
 * Sets fire to any Combustible (or furnace) in reach. ⭐ The thing decides
 * (`ignitePlanFor`, controller-liquidity W8): the fire-triangle checks
 * (flammable + dry-enough + fuel + air) and a burner's firing starting
 * are the object's; this binds the target and words the answer.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Combustible, IgniteRefusal } from '../../../../lib/fire/Combustible';
import type { Burner } from '../../../../lib/fire/Burner';

type Composed = ReturnType<typeof Mml.compose>;

interface LightModel extends CommandModel {
  target?: MqlOneResult;
}

export default class LightController extends CommandController<LightModel> {
  async execute(model: LightModel, context: CommandContext): Promise<void> {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Light what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'light what?',
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

    const ignitable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & (Combustible | Burner) => MixinApi.isCombustible(s) || MixinApi.isBurner(s),
    );
    if (!ignitable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`That won't burn.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-flammable',
        detail: "that won't burn",
      });
      return;
    }

    const plan = await ignitable.ignitePlanFor(commandGiver);
    await this.engagePlan(context, plan, {
      beginSelf: () => LightController.litSelf(ignitable),
      onRefused: (r) => LightController.refusalWords(r),
      onDone: () => ({
        self: LightController.litSelf(ignitable),
        peers: Mml.compose`${Mml.actor(commandGiver)} sets ${Mml.thing(ignitable)} alight.`,
      }),
    });
  }

  protected static litSelf(ignitable: Stuff): Composed {
    return Mml.compose`You set ${Mml.thing(ignitable)} alight.`;
  }

  /**
   * ⭐⭐ `no-fuel` is a DIFFERENT refusal from `not-flammable`, and the
   * difference is the whole progression: a forge with an empty bed is a
   * fire waiting for somebody to stoke it, and the sentence has to say so
   * or the player has no way to find out what lifts it.
   */
  protected static refusalWords(r: IgniteRefusal): Composed {
    switch (r.reason) {
      case 'already-burning':
        return Mml.compose`It is already burning.`;
      case 'too-wet':
        return Mml.compose`It's too wet to catch.`;
      case 'no-fuel':
        return Mml.compose`There is no fuel in it. Stoke it first.`;
      case 'no-air':
        return Mml.compose`The flame dies as you strike it. There is no air here for a flame.`;
      case 'lining-burnt-through':
        return Mml.compose`Its lining has burnt through — the heat would go straight into the casing. Reline it with firebrick first.`;
      case 'not-flammable':
        return Mml.compose`That won't burn.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
