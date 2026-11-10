/**
 * StirController — `stir [<vessel>]`: work the drink you are building.
 *
 * ⭐ One act with one host (controller-liquidity W18, owner 2026-11-10):
 * the build vessel plans it (`ManualBuildMixin.stirPlan`) — the working
 * is the one the VESSEL names (D16: a mixing glass stirs; a shaker's
 * finishing technique is `shaken`, so `stir shaker` shakes it — the same
 * act, working the build, worked the way the tool works it; not a second
 * verb), at the vessel's pace, the method recorded on the build.
 *
 * ⚠ What `stir` no longer does: a compounding vessel is `knead`ed (the
 * matter decides whether that is a stir's few minutes or a knead's
 * quarter-hour), and a churn is `churn`ed (the dairying pack's verb).
 * W7c's `AgitatedMixin` had stitched the three behind this verb with a
 * union result; that false unification is undone.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { BuildMethod, StirRefusal } from '../../../../lib/craft/ManualBuild';
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
    if (vessel === null || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        vessel === null
          ? Mml.compose`There's nothing here to stir.`
          : Mml.compose`There is nothing in ${Mml.thing(vessel)} to stir.`,
        'no-vessel',
      );
      return;
    }
    const plan = vessel.stirPlan();
    if (!plan.ok) {
      this.declineStep(context, StirController.refusalWords(plan, vessel), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, StirController.stirWords(vessel, giver));
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
