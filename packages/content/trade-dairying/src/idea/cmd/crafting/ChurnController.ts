/**
 * ChurnController — `churn [<churn>]`: work a churn's cream until the
 * butter comes (dairy D5).
 *
 * ⭐ Its own act (controller-liquidity W18, owner 2026-11-10): churning was
 * an arm of `stir` behind the retired `AgitatedMixin`, which stitched three
 * acts — a drink built, a compound kneaded, a charge churned — behind one
 * verb and a union result. Now `stir` is the drink build's, `knead` the
 * compound's, and this verb the churn's.
 *
 * The VESSEL plans the working (`HandWorkedMixin.handWorkPlan` — how long,
 * how hard) and says what came of it in facts; the words are this
 * controller's (controllers-are-io D4).
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActWords } from '@saxonberg/server/mud/lib/command/EngagedActController';
import type { AnyActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { HandWorkFacts } from '@saxonberg/server/mud/lib/craft/HandWorked';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';

interface ChurnModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class ChurnController extends ManualBuildController<ChurnModel> {
  async execute(model: ChurnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const vessel: Stuff | null = model.vessel?.stuff ?? null;
    if (vessel === null || !MixinApi.isHandWorked(vessel)) {
      this.declineStep(
        context,
        vessel === null
          ? Mml.compose`There's no churn here.`
          : Mml.compose`${Mml.thing(vessel)} isn't something you could churn.`,
        'no-vessel',
      );
      return;
    }
    await this.engagePlan(context, vessel.handWorkPlan(), ChurnController.churnWords(vessel, giver));
  }

  /** ⭐ The words for churning `vessel` (D4). */
  protected static churnWords(
    vessel: Stuff,
    giver: Stuff,
  ): ActWords<undefined, HandWorkFacts | null, AnyActRefusal> {
    return {
      beginSelf: () => Mml.compose`You set to with the plunger of ${Mml.thing(vessel)}.`,
      onRefused: () => Mml.compose`You can't churn ${Mml.thing(vessel)} just now.`,
      onDone: (f) => ({
        self:
          f === null
            ? Mml.compose`You work ${Mml.thing(vessel)}, but there is nothing in it to churn.`
            : Mml.compose`You churn hard. ${ChurnController.resultWords(f)}`,
        peers: Mml.compose`${Mml.actor(giver)} churns ${Mml.thing(vessel)}.`,
      }),
    };
  }

  /** ⭐ What churning came to, in words (D4) — exhaustively. */
  protected static resultWords(facts: HandWorkFacts): string {
    switch (facts.result) {
      case 'came':
        return 'The sound changes: it thumps instead of sloshing. The butter has come.';
      case 'came-greasy':
        return 'It comes all at once, soft and greasy — too warm. It is butter, but not good butter.';
      case 'too-cold':
        return 'It slops and thickens and will not come. It is too cold to break.';
      case 'not-cream':
        return 'It sloshes about, and nothing comes of it. Only cream will churn.';
      case 'already-come':
        return 'It has already come — there is butter in there, waiting for the buttermilk to be drawn off.';
      default: {
        const never: never = facts.result;
        return never;
      }
    }
  }
}
