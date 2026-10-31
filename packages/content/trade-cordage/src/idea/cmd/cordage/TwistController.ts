/**
 * TwistController — `twist <stock> [on <jack>] [--yarns n] [--length m]
 * [--mark <color>]` (cordage D5). The jack plans the twist — the stage is
 * what you twist — and the verb engages it.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import RopeJack from '../../../thing/RopeJack';

interface TwistModel extends CommandModel {
  stock?: MqlManyResult;
  jack?: MqlOneResult;
  yarns?: number;
  length?: string;
  mark?: string;
}

export default class TwistController extends ManualBuildController<TwistModel> {
  async execute(model: TwistModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const jack = model.jack?.stuff ?? null;
    if (!(jack instanceof RopeJack)) {
      this.declineStep(context, Mml.compose`You need a rope jack at the head of a walk to twist rope.`, 'no-jack');
      return;
    }
    const plan = await jack.twistPlan(actor, (model.stock?.stuff ?? []) as Stuff[], {
      yarns: typeof model.yarns === 'number' ? model.yarns : null,
      length: model.length?.toString().trim() || null,
      mark: model.mark?.trim() || null,
    });
    if (!plan.ok) {
      this.declineStep(context, plan.line, plan.reason);
      return;
    }
    await this.engagePlan(context, plan);
  }
}
