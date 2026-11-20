/**
 * StirController — `stir [<vessel>]`: work what is RUNNY — the drink you
 * are building, a runny compound (a paint pot, a glaze slurry, a wash), or
 * a liquid in a holder (a cone of strike, a crock of brine).
 *
 * ⭐ `stir` is a protocol the TARGET answers (`StirTargetMixin`,
 * matter-model-overlaps D15): the controller asks `stirPlanFor` once and
 * words what comes back — it never narrows by host. Who answers:
 *
 *  - a BUILD vessel — the working the vessel names (a mixing glass stirs; a
 *    shaker's technique is `shaken`, so `stir shaker` shakes it), the method
 *    recorded on the build;
 *  - a COMPOUNDING vessel — a few light minutes folding what is in it into
 *    one product; a stiff mass is refused `wrong-work`, worded "too stiff to
 *    stir — knead it" (a knead vessel that compounds nothing answers the
 *    same);
 *  - a HOLDER of a liquid — stirred, and told whether that started a crop
 *    (a supersaturated liquor nucleates when it is stirred).
 *
 * `nothing-to-stir` is the reason's row. A churn is `churn`ed (the dairying
 * pack's verb).
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { StirBegin, StirFacts, StirRefusal } from '../../../../lib/craft/StirTarget';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface StirModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class StirController extends ManualBuildController<StirModel> {
  async execute(model: StirModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const vessel: Stuff | null = model.vessel?.stuff ?? null;
    if (vessel === null) {
      this.declineStep(context, Mml.compose`There's nothing here to stir.`, 'no-vessel');
      return;
    }
    // The arg's `requires: StirTargetMixin` already refused anything else.
    if (!MixinApi.isStirTarget(vessel)) {
      this.refuse(context, { ok: false, reason: 'nothing-to-stir', facts: { vessel } });
      return;
    }
    const plan = await vessel.stirPlanFor({ actor: giver });
    if (!plan.ok) {
      if (plan.reason === 'nothing-to-stir') {
        this.refuse(context, plan);
        return;
      }
      this.declineStep(context, StirController.refusalWords(plan, vessel), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, StirController.stirWords(vessel, giver));
  }

  /** ⭐ The words for a stir of `vessel`, by which answer began (D15). */
  protected static stirWords(vessel: Stuff, giver: Stuff): ActWords<StirBegin, StirFacts, StirRefusal> {
    return {
      beginSelf: (b) => {
        switch (b.kind) {
          case 'compound':
            return Mml.compose`You begin to stir ${Mml.thing(vessel)}, working what is in it together.`;
          case 'build':
            return Mml.compose`You begin to ${StirController.verbOf(b.method)} ${Mml.thing(vessel)}.`;
          case 'liquid':
            return Mml.compose`You begin to stir what is in ${Mml.thing(vessel)}.`;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      beginPeers: (b) =>
        b.kind === 'compound' ? Mml.compose`${Mml.actor(giver)} stirs ${Mml.thing(vessel)}.` : null,
      onRefused: (r) => StirController.refusalWords(r, vessel),
      onDone: (f) => {
        switch (f.kind) {
          case 'compounded':
            return {
              self:
                f.product !== null
                  ? Mml.compose`It stirs together into one even mass: ${Mml.thing(f.product)}.`
                  : Mml.compose`What is in ${Mml.thing(vessel)} stirs smooth, even all through.`,
              peers: Mml.compose`${Mml.actor(giver)} finishes stirring ${Mml.thing(vessel)}.`,
            };
          case 'build': {
            const verb = StirController.verbOf(f.method);
            return {
              self: Mml.compose`You ${verb} ${Mml.thing(vessel)} well.`,
              peers: Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`,
            };
          }
          case 'liquid':
            return {
              self: f.started
                ? Mml.compose`You stir ${Mml.thing(vessel)} — and a cloud of fine grain blooms through it. It has started to set.`
                : Mml.compose`You stir ${Mml.thing(vessel)} well.`,
              peers: Mml.compose`${Mml.actor(giver)} stirs ${Mml.thing(vessel)}.`,
            };
          default: {
            const never: never = f;
            return never;
          }
        }
      },
    };
  }

  /** ⭐ Every worded reason a stir is refused, exhaustively. */
  protected static refusalWords(r: StirRefusal, vessel: Stuff): Composed {
    switch (r.reason) {
      case 'empty':
        return Mml.compose`${Mml.thing(vessel)} is empty. Put what you mean to mix into it first.`;
      case 'wrong-work':
        // A compound only ever wants the other work when it is stiff.
        return StirController.tooStiff(vessel);
      case 'came-empty':
        return Mml.compose`You stir ${Mml.thing(vessel)}, but there is nothing in it.`;
      case 'already-compounded':
        return Mml.compose`It is already one even mass. There is nothing to stir in.`;
      case 'mint-failed':
        return Mml.compose`It will not come together — and that is a fault in the books, not in your hands.`;
      case 'nothing-to-stir':
        return Mml.compose`There is nothing in ${Mml.thing(vessel)} to stir.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** The stiff-matter refusal — `knead` is the act. */
  protected static tooStiff(vessel: Stuff): Composed {
    return Mml.compose`What is in ${Mml.thing(vessel)} is too stiff to stir — knead it.`;
  }

  /**
   * The verb a build's working is told by — a stir, or the vessel's own
   * work (a shaker's `shaken` is a pack's technique name, and the kernel's
   * words do not name it).
   */
  protected static verbOf(method: string): string {
    return method === 'stirred' ? 'stir' : 'work';
  }
}
