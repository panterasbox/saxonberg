/**
 * PaintController — `paint <thing> [with <pot>] [using <brush>]` (paint
 * build D9). ⭐ Dumb by construction: the TARGET plans the coat
 * (`Faced.coatPlanFor`) and this controller engages the plan it is handed,
 * wording the facts it answers (controllers-are-io D4).
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
import type { CoatRefusal } from '../../../../lib/material/Faced';

type Composed = ReturnType<typeof Mml.compose>;

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
    // ⭐ Every pot that holds a coat-laying liquid is asked in turn (the
    // `dip` precedent): the first the thing painted can take a coat from
    // wins; else the first refusal is said.
    const candidates = pots.filter((p) => this.laysCoat(p));
    const pot = candidates[0] ?? null;
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
    let answer = await target.coatPlanFor({ actor: giver, source: pot, brush });
    for (const next of candidates.slice(1)) {
      if (answer.ok) break;
      const tried = await target.coatPlanFor({ actor: giver, source: next, brush });
      if (tried.ok) answer = tried;
    }
    if (!answer.ok) {
      this.declineStep(context, PaintController.refusalWords(answer, target), answer.reason);
      return;
    }
    await this.engagePlan(context, answer, {
      beginSelf: (f) =>
        Mml.compose`You load the brush from ${Mml.thing(f.source)} and start laying the coat on ${Mml.thing(target)}.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts painting ${Mml.thing(target)}.`,
      onRefused: (r) => PaintController.refusalWords(r, target),
      onDone: (f) =>
        f.kind === 'gone'
          ? null
          : {
              self: Mml.compose`${Mml.thing(target)} stands under a wet coat of ${f.what}. Let it set; keep the rain off it.`,
              peers: Mml.compose`${Mml.actor(giver)} finishes a coat on ${Mml.thing(target)}.`,
            },
    });
  }

  /** ⭐ The words for a refused coat (D4) — every reason, exhaustively. */
  private static refusalWords(r: CoatRefusal, target: Stuff): Composed {
    switch (r.reason) {
      case 'no-landing':
        return Mml.compose`You cannot reach the outside of ${Mml.thing(target)} from here.`;
      case 'not-paint':
        return r.facts.why === 'empty'
          ? Mml.compose`There is nothing in ${Mml.thing(r.facts.source)} to paint with.`
          : Mml.compose`What is in ${Mml.thing(r.facts.source)} will not lay a coat — it runs off and leaves nothing behind.`;
      case 'nothing-to-cover':
        return Mml.compose`There is nothing of ${Mml.thing(target)} a brush could cover.`;
      case 'source-too-low': {
        const want = r.facts.litres >= 1 ? `about ${Math.round(r.facts.litres)} litres` : 'more than that';
        return Mml.compose`There is not enough in ${Mml.thing(r.facts.source)} to give ${Mml.thing(target)} a coat — it would take ${want}.`;
      }
      case 'pot-ran-dry':
        return Mml.compose`The pot runs dry before the coat is on.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** Does `pot` hold a liquid that lays a coat? */
  private laysCoat(pot: Stuff): boolean {
    if (!MixinApi.isBulkable(pot) || !pot.hasInteriorBulk()) return false;
    const held = pot.getBulkMaterial('interior');
    return held !== null && MixinApi.hasCoating(held) && held.getLaysCoat() && pot.getBulkAmount('interior').rawValue() > 0;
  }
}
