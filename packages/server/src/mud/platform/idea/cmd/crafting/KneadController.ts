/**
 * KneadController — `knead [<vessel>]`. ⭐ Dumb by construction (ceramics
 * D14): the VESSEL plans the knead (`KneadPlanner.kneadPlanFor`) and this
 * controller engages the plan it is handed. It never names a trough, a tub
 * or a pit.
 *
 * Promoted from `trade-baking` (the `dry` precedent): a baker's dough, a
 * brickmaker's clay and a rubber works' compound are one act — working a
 * plastic mass by hand to a window — and a second trade's vessel is a
 * second implementation of the protocol, not a second verb.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { KneadPlanner } from '../../../../lib/craft/Kneadable';
import { Mml } from '../../../../api/mml';

interface KneadModel extends CommandModel {
  vessel?: MqlOneResult;
}

/** Does this vessel plan a knead? Duck-probed — a protocol is not a mixin. */
function isKneadPlanner(s: Stuff): s is Stuff & KneadPlanner {
  return typeof (s as unknown as Partial<KneadPlanner>).kneadPlanFor === 'function';
}

export default class KneadController extends ManualBuildController<KneadModel> {
  async execute(model: KneadModel, context: CommandContext): Promise<void> {
    const vessel = model.vessel?.stuff ?? null;
    if (vessel === null || !isKneadPlanner(vessel)) {
      this.declineStep(
        context,
        vessel === null
          ? Mml.compose`Knead what? There is nothing here you could work by hand.`
          : Mml.compose`There is nothing in ${Mml.thing(vessel)} you could knead.`,
        'no-vessel',
      );
      return;
    }
    const plan = await vessel.kneadPlanFor({
      actor: context.commandGiver,
      commandText: context.commandText,
    });
    if (!plan.ok) {
      this.declineStep(context, plan.line, plan.reason);
      return;
    }
    this.engageStep(context, {
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      beginSelf: plan.beginSelf,
      beginPeers: plan.beginPeers,
      onComplete: plan.onComplete,
      onAbort: plan.onAbort,
    });
  }
}
