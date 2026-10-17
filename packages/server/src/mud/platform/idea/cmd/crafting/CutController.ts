/**
 * CutController — the ONE `cut` (storage-and-ice D16).
 *
 * ⚠ Dumb by design. It resolves who plans the cut — the TARGET when it is
 * `Cuttable` (the room's floor when the target was a bare word for part of
 * it: `cut marked`, `cut hole`), else the first bound tool that is a
 * `CutPlanner` and knows the target (a tailor's shears and a bolt) — asks
 * for the plan, and either declines in the planner's words or engages the
 * step the plan describes. The kernel never names a pack class.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type {
  CutPlan,
  CutPlanner,
  CutRefusal,
  CutRequest,
  Cuttable,
} from '../../../../lib/craft/Cuttable';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';

interface CutModel extends CommandModel {
  target?: MqlOneResult;
  tools?: MqlManyResult;
  for?: MqlOneResult;
  tight?: boolean;
  generous?: boolean;
}

function isCuttable(x: unknown): x is Stuff & Cuttable {
  return x !== null && typeof (x as { cutPlan?: unknown }).cutPlan === 'function';
}

function isPlanner(x: unknown): x is Stuff & CutPlanner {
  return x !== null && typeof (x as { cutPlanFor?: unknown }).cutPlanFor === 'function';
}

export default class CutController extends ManualBuildController<CutModel> {
  async execute(model: CutModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const target = (model.target?.stuff ?? null) as Stuff | null;
    const raw = model.target?.raw?.trim() || null;
    const tools = (model.tools?.stuff ?? []) as Stuff[];
    const req: CutRequest = {
      actor,
      tools,
      raw: target === null ? raw : null,
      options: {
        for: (model.for?.stuff ?? null) as Stuff | null,
        tight: model.tight === true,
        generous: model.generous === true,
      },
    };

    let plan: CutPlan | CutRefusal | null = null;
    if (target !== null && isCuttable(target)) {
      plan = await target.cutPlan(req);
    } else if (target !== null) {
      for (const tool of tools) {
        if (!isPlanner(tool)) continue;
        plan = await tool.cutPlanFor(target, req);
        if (plan !== null) break;
      }
    } else if (raw !== null) {
      // A bare word: a part of the ground underfoot (`marked`, `hole`).
      const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
      const floor = (room as unknown as { getFloor?(): unknown } | null)?.getFloor?.() ?? null;
      if (isCuttable(floor)) plan = await floor.cutPlan(req);
    }

    if (plan === null) {
      this.declineStep(
        context,
        target !== null
          ? Mml.compose`You have nothing in reach that would cut ${Mml.thing(target)}.`
          : Mml.compose`Cut what?`,
        target !== null ? 'no-cutter' : 'no-target',
      );
      return;
    }
    if (!plan.ok) {
      this.declineStep(context, plan.line, plan.reason);
      return;
    }
    this.engageStep(context, {
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      beginSelf: plan.beginSelf,
      ...(plan.beginPeers ? { beginPeers: plan.beginPeers } : {}),
      onComplete: plan.onComplete,
      ...(plan.onAbort ? { onAbort: plan.onAbort } : {}),
    });
  }
}
