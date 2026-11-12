/**
 * StirController — `stir [<vessel>]`: work what is RUNNY — the drink you
 * are building, or a runny compound (a paint pot, a glaze slurry, a wash).
 *
 * ⭐ Owner, 2026-11-10 (controller-liquidity W19): `stir` is for runny
 * stuff, `knead` for stiff. Two hosts, asked by method — no protocol, the
 * two answer different questions in different shapes:
 *
 *  - a BUILD vessel (`ManualBuildMixin.stirPlan`) — the working is the one
 *    the vessel names (D16: a mixing glass stirs; a shaker's technique is
 *    `shaken`, so `stir shaker` shakes it — the same act, working the
 *    build, worked the way the tool works it), the method recorded on the
 *    build;
 *  - a COMPOUNDING vessel (`Compounding.stirPlanFor`) — a few light
 *    minutes folding what is in it into one product. The matter decides
 *    (`Compounding.workVerb`): a stiff mass is refused `wrong-work`, worded
 *    here as "too stiff to stir — knead it".
 *
 * A knead vessel that compounds nothing (a baker's trough) holds a dough,
 * and a dough is stiff: refused the same way. A churn is `churn`ed (the
 * dairying pack's verb).
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { KneadBegin, KneadFacts } from '../../../../lib/craft/KneadVessel';
import type { BuildMethod, StirRefusal } from '../../../../lib/craft/ManualBuild';
import type { CompoundRefusal } from '../../../../lib/material/Compounding';
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
    // ⭐ A compound: the matter decides whether it stirs (W19).
    if (MixinApi.isCompounding(vessel)) {
      const plan = await vessel.stirPlanFor({ actor: giver });
      if (!plan.ok) {
        this.declineStep(context, StirController.compoundRefusalWords(plan, vessel), plan.reason);
        return;
      }
      await this.engagePlan(context, plan, StirController.compoundWords(vessel, giver));
      return;
    }
    // A knead vessel that compounds nothing holds a dough — stiff.
    if (MixinApi.isKneadVessel(vessel)) {
      this.declineStep(context, StirController.tooStiff(vessel), 'wrong-work');
      return;
    }
    if (!MixinApi.isBuildVessel(vessel)) {
      this.declineStep(context, Mml.compose`There is nothing in ${Mml.thing(vessel)} to stir.`, 'no-vessel');
      return;
    }
    const plan = vessel.stirPlan();
    if (!plan.ok) {
      this.declineStep(context, StirController.refusalWords(plan, vessel), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, StirController.stirWords(vessel, giver));
  }

  /** ⭐ The words for stirring a runny compound in `vessel` (D4, W19). */
  protected static compoundWords(
    vessel: Stuff,
    giver: Stuff,
  ): ActWords<
    Extract<KneadBegin, { kind: 'compound' }>,
    Extract<KneadFacts, { kind: 'compounded' }>,
    CompoundRefusal
  > {
    return {
      beginSelf: () => Mml.compose`You begin to stir ${Mml.thing(vessel)}, working what is in it together.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} stirs ${Mml.thing(vessel)}.`,
      onRefused: (r) => StirController.compoundRefusalWords(r, vessel),
      onDone: (f) => ({
        self:
          f.product !== null
            ? Mml.compose`It stirs together into one even mass: ${Mml.thing(f.product)}.`
            : Mml.compose`What is in ${Mml.thing(vessel)} stirs smooth, even all through.`,
        peers: Mml.compose`${Mml.actor(giver)} finishes stirring ${Mml.thing(vessel)}.`,
      }),
    };
  }

  /** ⭐ Every reason stirring a compound is refused, exhaustively. */
  protected static compoundRefusalWords(r: CompoundRefusal, vessel: Stuff): Composed {
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

  /** ⭐ The words for a stir of `vessel` (D4). */
  protected static stirWords(
    vessel: Stuff,
    giver: Stuff,
  ): ActWords<{ method: BuildMethod }, { method: BuildMethod }, StirRefusal> {
    return {
      beginSelf: (b) => Mml.compose`You begin to ${StirController.verbOf(b.method)} ${Mml.thing(vessel)}.`,
      onRefused: (r) => StirController.refusalWords(r, vessel),
      onDone: (f) => {
        const verb = StirController.verbOf(f.method);
        return {
          self: Mml.compose`You ${verb} ${Mml.thing(vessel)} well.`,
          peers: Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`,
        };
      },
    };
  }

  /** ⭐ Every reason, exhaustively. */
  protected static refusalWords(r: StirRefusal, vessel: Stuff): Composed {
    switch (r.reason) {
      case 'empty-build':
        return Mml.compose`${Mml.thing(vessel)} is empty — there's nothing to stir yet.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
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
