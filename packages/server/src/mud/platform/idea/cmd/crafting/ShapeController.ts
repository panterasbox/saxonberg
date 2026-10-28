/**
 * ShapeController — `shape [<material>] [with <instrument>] [into <form>]`.
 * ⭐ Dumb by construction (ceramics D14): the INSTRUMENT plans the shape
 * (`FormingMixin.shapePlanFor` — a wheel, a brick table, a blowpipe); when
 * none has anything to say, the MATERIAL plans it by hand
 * (`ShapeableMixin.shapePlanFor`). This controller never names clay or
 * glass.
 *
 * Promoted from `trade-glass` (the `dry` precedent): a gather on a pipe
 * and clay on a wheel are one act, and a second trade's instrument is a
 * second implementation of the protocol, not a second verb.
 *
 * ⚠ `shape bottle` keeps working word for word: with no `into`, the word
 * the material arg bound IS the form.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ShapeRequest } from '../../../../lib/craft/Shapeable';
import type { ActPlan, ActRefusal } from '../../../../lib/craft/ActPlan';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface ShapeModel extends CommandModel {
  material?: MqlOneResult;
  instrument?: MqlManyResult;
  form?: string;
}

export default class ShapeController extends ManualBuildController<ShapeModel> {
  async execute(model: ShapeModel, context: CommandContext): Promise<void> {
    let material: Stuff | null = model.material?.stuff ?? null;
    let formText = (model.form ?? '').trim();
    if (formText === '' && model.material?.raw) {
      // `shape bottle`: the word is the form, not a thing to shape.
      formText = model.material.raw.trim();
      material = null;
    }
    const req: ShapeRequest = {
      actor: context.commandGiver,
      material,
      formText,
      commandText: context.commandText,
    };

    let plan: ActPlan | ActRefusal | null = null;
    for (const tool of model.instrument?.stuff ?? []) {
      if (tool === material || !MixinApi.isForming(tool)) continue;
      plan = await tool.shapePlanFor(req);
      if (plan !== null) break;
    }
    if (plan === null && material !== null && MixinApi.isShapeable(material)) {
      plan = await material.shapePlanFor(req);
    }
    if (plan === null) {
      this.declineStep(
        context,
        material === null
          ? Mml.compose`Shape what? You have nothing soft enough to work, and nothing here to work it on.`
          : Mml.compose`${Mml.thing(material)} will not take a shape.`,
        'nothing-to-shape',
      );
      return;
    }
    if (!plan.ok) {
      this.declineStep(context, plan.line, plan.reason);
      return;
    }
    await this.engagePlan(context, plan);
  }
}
