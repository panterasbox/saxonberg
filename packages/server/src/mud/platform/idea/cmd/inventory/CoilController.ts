/**
 * CoilController — `coil <rope>` (cordage D10): the rope plans the coil
 * (a moment for every two meters) and answers facts; the verb engages it
 * and words them (controllers-are-io D4).
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { Mml } from '../../../../api/mml';
import Rope, { type CoilRefusal } from '../../../thing/Rope';

interface CoilModel extends CommandModel {
  target: MqlOneResult;
}

export default class CoilController extends ManualBuildController<CoilModel> {
  async execute(model: CoilModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const target = model.target?.stuff ?? null;
    if (!(target instanceof Rope)) {
      this.declineStep(context, Mml.compose`You can only coil a rope.`, 'not-a-rope');
      return;
    }
    const plan = target.coilPlan(actor);
    if (!plan.ok) {
      this.declineStep(context, CoilController.refusalWords(plan, target), plan.reason);
      return;
    }
    const rope = target as unknown as Stuff;
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You start coiling ${Mml.thing(rope)} down, turn over turn.`,
      beginPeers: () => Mml.compose`${Mml.actor(actor)} coils a rope.`,
      onRefused: (never) => never,
      onDone: (facts) => (facts.coiled ? { self: Mml.compose`${Mml.thing(rope)} lies in a neat coil.` } : null),
    });
  }

  /** ⭐ The words for a refused coil (D4) — every reason, exhaustively. */
  private static refusalWords(out: CoilRefusal, rope: Stuff): ReturnType<typeof Mml.compose> {
    switch (out.reason) {
      case 'tied':
        return Mml.compose`${Mml.thing(rope)} is tied; you cannot coil it down.`;
      case 'coiled':
        return Mml.compose`${Mml.thing(rope)} is already coiled.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }
}
