/**
 * CoilController — `coil <rope>` (cordage D10): the rope plans the coil
 * (a moment for every two meters); the verb engages it.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { Mml } from '../../../../api/mml';
import Rope from '../../../thing/Rope';

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
      this.declineStep(context, plan.line, plan.reason);
      return;
    }
    await this.engagePlan(context, plan);
  }
}
