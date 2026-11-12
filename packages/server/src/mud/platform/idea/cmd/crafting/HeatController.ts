/**
 * HeatController — `heat [<thing>]`: take it to the fire in reach and hold
 * it there until it has taken the heat.
 *
 * ⭐ One act, and the THING says what taking the heat does to it
 * (`HeatedMixin`, controller-liquidity W7c): a build — the ingot in the
 * tongs, the cook pot — latches the hottest heat it reached, which the
 * terminal mint's reverse-match reads against each recipe's
 * `requiresHeatK` (and a tempered piece loses its temper); an instrument
 * held in a dry flame is sterilized past 433 K for a minute (cleanliness
 * D14). The plan needs a fire in reach (`reachableHeatK > 0`) and re-reads
 * it at the finish.
 *
 * ⚠ The placing arm RETIRED (the owner's call, 2026-11-09): a vat or a
 * pail of milk is warmed by SETTING IT ON the fire — `put vat on hearth` —
 * and the furnace couple makes the fire's held temperature its ambient.
 * That was never heating; it is `put`'s act, and the view binds only what
 * is `HeatedMixin`, so `heat vat` is refused with the `put` it means.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { HeatBegin, HeatRefusal, HeatTaken } from '../../../../lib/fire/Heated';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface HeatModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HeatController extends ManualBuildController<HeatModel> {
  async execute(model: HeatModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target: Stuff | null = model.target?.stuff ?? null;
    if (target === null || !MixinApi.isHeated(target)) {
      this.declineStep(
        context,
        Mml.compose`Heat what? You need a workpiece or a pot to work.`,
        'no-vessel',
      );
      return;
    }
    const plan = target.heatPlanFor(giver);
    if (!plan.ok) {
      this.declineStep(context, HeatController.refusalWords(plan, target), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, HeatController.heatWords(target, giver));
  }

  /** ⭐ The words for taking `target` to the fire (D4). */
  protected static heatWords(target: Stuff, giver: Stuff): ActWords<HeatBegin, HeatTaken, HeatRefusal> {
    return {
      beginSelf: (b) =>
        b.manner === 'work'
          ? Mml.compose`You bring ${Mml.thing(target)} to the fire and let it take the heat.`
          : Mml.compose`You hold ${Mml.thing(target)} in the flame, turning it.`,
      beginPeers: (b) =>
        b.manner === 'work'
          ? Mml.compose`${Mml.actor(giver)} brings ${Mml.thing(target)} to the fire.`
          : Mml.compose`${Mml.actor(giver)} holds ${Mml.thing(target)} in the flame.`,
      onRefused: (r) => HeatController.refusalWords(r, target),
      onDone: (f) => {
        const temper = f.annealed
          ? ` The hardness goes out of it as it comes up to colour. Whatever the quench put in, the fire has taken back out.`
          : '';
        if (f.sterile !== undefined) {
          return {
            self: f.sterile
              ? Mml.compose`${Mml.thing(target)} comes out of the flame too hot to touch. Nothing lives on it.${temper}`
              : Mml.compose`${Mml.thing(target)} comes out of the flame warm — not hot enough to kill what is on it.${temper}`,
            peers: Mml.compose`${Mml.actor(giver)} draws ${Mml.thing(target)} out of the flame.`,
          };
        }
        return {
          self: Mml.compose`${Mml.thing(target)} takes the heat, glowing with it.${temper}`,
          peers: Mml.compose`${Mml.actor(giver)} works ${Mml.thing(target)} in the heat.`,
        };
      },
    };
  }

  /** ⭐ Every reason, exhaustively. */
  protected static refusalWords(r: HeatRefusal, target: Stuff): Composed {
    switch (r.reason) {
      case 'insufficient-heat':
        return Mml.compose`There's no fire here hot enough to work ${Mml.thing(target)} in.`;
      case 'fire-out':
        return Mml.compose`The fire has gone out from under ${Mml.thing(target)}; it took nothing from it.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}
