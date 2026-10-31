/**
 * PaintController — `paint <thing> [with <pot>] [using <brush>]` (paint
 * build D9). ⭐ Dumb by construction: the TARGET plans the coat
 * (`Faced.coatPlanFor`) and this controller engages the plan it is handed.
 * It picks the pot (the first bound vessel whose liquid lays a coat) and
 * checks the brush is in hand; it never decides how much paint a thing
 * takes, whether a building can be reached, or how a coat sets.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const PAINTING = 'painting';

interface PaintModel extends CommandModel {
  target?: MqlOneResult;
  pot?: MqlManyResult;
  brush?: MqlOneResult;
}

export default class PaintController extends ManualBuildController<PaintModel> {
  async execute(model: PaintModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (target === null) {
      const raw = model.target?.raw;
      this.declineStep(context, raw ? Mml.compose`You don't see any '${raw}' here.` : Mml.compose`Paint what?`, 'no-target');
      return;
    }
    const brush = model.brush?.stuff ?? null;
    if (brush === null || !MixinApi.isTool(brush) || !brush.hasCapability(PAINTING)) {
      this.declineStep(context, Mml.compose`You need a brush in your hand to paint anything.`, 'no-brush');
      return;
    }
    if (!MixinApi.isFaced(target)) {
      this.declineStep(context, Mml.compose`${Mml.thing(target)} has nothing a coat of paint could lie on.`, 'not-faced');
      return;
    }
    const pots = (model.pot?.stuff ?? []).filter(
      (p: Stuff) => p.stuffId !== target.stuffId && p.stuffId !== brush.stuffId,
    );
    const pot = pots.find((p) => this.laysCoat(p)) ?? null;
    if (pot === null) {
      const wet = pots.find((p) => MixinApi.isBulkable(p) && p.hasInteriorBulk() && p.getBulkAmount('interior').rawValue() > 0);
      this.declineStep(
        context,
        wet
          ? Mml.compose`What is in ${Mml.thing(wet)} will not lay a coat — it runs off and leaves nothing behind.`
          : Mml.compose`Paint it with what? There is no pot of paint in reach.`,
        wet ? 'not-paint' : 'no-paint',
      );
      return;
    }
    const answer = await target.coatPlanFor({ actor: giver, source: pot, brush });
    if (!answer.ok) {
      this.declineStep(context, answer.line, answer.reason);
      return;
    }
    await this.engagePlan(context, answer);
  }

  /** Does `pot` hold a liquid that lays a coat? */
  private laysCoat(pot: Stuff): boolean {
    if (!MixinApi.isBulkable(pot) || !pot.hasInteriorBulk()) return false;
    const held = pot.getBulkMaterial('interior');
    return held !== null && held.getLaysCoat() && pot.getBulkAmount('interior').rawValue() > 0;
  }
}
