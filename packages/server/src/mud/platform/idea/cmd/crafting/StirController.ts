/**
 * StirController — `stir [<vessel>]`: work what is in a vessel.
 *
 * ⭐ One act, and the VESSEL plans it (`AgitatedMixin.agitatePlanFor`,
 * controller-liquidity W7c): a compounding vessel answers its knead plan
 * (ceramics R1 — `stir` and `knead` are one act named by the state of the
 * matter), a hand-worked charge (a butter churn, dairy D5) is worked by
 * hand, and a build records the working the vessel names (D16: a shaker
 * shakes, a mixing glass stirs). How long it takes and how hard is the
 * vessel's; this controller engages the plan and writes the words.
 */

import KneadController from './KneadController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { AgitateBegin, AgitateFacts, AgitateRefusal } from '../../../../lib/craft/Agitated';
import type { HandWorkFacts } from '../../../../lib/craft/HandWorked';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface StirModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class StirController extends KneadController<StirModel> {
  override async execute(model: StirModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const vessel: Stuff | null = model.vessel?.stuff ?? null;
    const plan =
      vessel !== null && MixinApi.isAgitated(vessel)
        ? await vessel.agitatePlanFor({ actor: giver })
        : null;
    if (vessel === null || plan === null) {
      this.declineStep(
        context,
        vessel === null
          ? Mml.compose`There's nothing here to stir.`
          : Mml.compose`There is nothing in ${Mml.thing(vessel)} to stir.`,
        'no-vessel',
      );
      return;
    }
    const words = this.stirWords(vessel, giver);
    if (!plan.ok) {
      this.declineStep(context, words.onRefused(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, words);
  }

  /**
   * ⭐ The words for a stir of `vessel` — the knead words for a compounding
   * vessel (the same act, D4), and a build's and a churn's own.
   */
  protected stirWords(vessel: Stuff, giver: Stuff): ActWords<AgitateBegin, AgitateFacts, AgitateRefusal> {
    const knead = this.kneadWords(vessel, giver);
    return {
      beginSelf: (b) => {
        switch (b.kind) {
          case 'build':
            return Mml.compose`You begin to ${StirController.verbOf(b.method)} ${Mml.thing(vessel)}.`;
          case 'hand':
            return Mml.compose`You begin to work ${Mml.thing(vessel)}.`;
          default:
            return knead.beginSelf(b);
        }
      },
      beginPeers: (b) => {
        switch (b.kind) {
          case 'build':
          case 'hand':
            return null;
          default:
            return knead.beginPeers?.(b) ?? null;
        }
      },
      onRefused: (r) =>
        r.reason === 'empty-build'
          ? Mml.compose`${Mml.thing(vessel)} is empty — there's nothing to stir yet.`
          : knead.onRefused(r),
      onDone: (f) => {
        switch (f.kind) {
          case 'built': {
            const verb = StirController.verbOf(f.method);
            return {
              self: Mml.compose`You ${verb} ${Mml.thing(vessel)} well.`,
              peers: Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`,
            };
          }
          case 'hand-worked':
            return {
              self:
                f.result === null
                  ? Mml.compose`You work ${Mml.thing(vessel)}, but there is nothing in it to work.`
                  : Mml.compose`You work ${Mml.thing(vessel)} hard. ${StirController.handWorkWords(f.result)}`,
              peers: Mml.compose`${Mml.actor(giver)} works ${Mml.thing(vessel)}.`,
            };
          default:
            return knead.onDone?.(f) ?? null;
        }
      },
    };
  }

  /** The verb a build's working is told by — a stir, or the vessel's own work. */
  protected static verbOf(method: string): string {
    return method === 'stirred' ? 'stir' : 'work';
  }

  /** ⭐ What working a charge by hand came to, in words (D4) — exhaustively. */
  protected static handWorkWords(facts: HandWorkFacts): string {
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
