/**
 * TanController — `tan <hide> [in <pit>]`, and ⭐⭐ **the verb is a
 * JUDGEMENT, not a transform.**
 *
 * ## What the act actually is
 *
 * Putting a skin in liquor takes a moment; tanning it takes three weeks.
 * So this verb does almost nothing: it lays the hide in the pit and the
 * hide's own clock does the work, reconciled on read against the liquor
 * it is standing in. `dry`'s twin — *put the thing where the conditions
 * are and come back* — and for the same reason: an engagement would hold
 * the hands for weeks, and a durative act you cannot walk away from is
 * not a trade, it is a cutscene.
 *
 * ⭐ **The decision is WHEN TO PULL IT**, and that is where the skill
 * lives. `look` at the pit is how you check it (the pit's description
 * carries every skin in it — controller-liquidity W11; a second `tan` was
 * the check until then); `get hide from pit` is how you commit. Too early and it
 * is thin; too late and the bark has eaten into the grain and nothing
 * brings it back.
 *
 * ## ⭐ The lift is the hide's (controllers-are-io D10)
 *
 * This verb lays in, and only lays in. Coming out is the hide's own rule on
 * leaving the pit (`TanningMixin.onLiftedFrom`), so no verb has to remember it.
 *
 * ⭐ The laying-in is the PIT's (`Tanpit.layInPlan`): its refusals, the
 * move, the clock stamp, the soil and the deed. This controller narrows
 * the bound containers to a pit and words the plan.
 *
 * ## What it credits
 *
 * `leatherwork`, which this pack mints. Putting a skin down is `easy`;
 * **judging it out is `standard`**, and that asymmetry is the whole
 * pedagogy of the trade in one line.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Tanpit, { type LayInRefusal } from '../../../thing/Tanpit';
import type Hide from '../../../thing/Hide';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface TanModel extends CommandModel {
  hide: MqlOneResult;
  pit?: MqlManyResult;
}

export default class TanController extends CommandController<TanModel> {
  async execute(model: TanModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const hide = model.hide?.stuff as (Stuff & Hide) | null;
    if (!hide) {
      this.decline(context, Mml.compose`You don't see any '${model.hide?.raw ?? ''}' to tan.`, 'no-hide');
      return;
    }
    const pit = TanController.findPit(model.pit, hide);
    if (!pit) {
      this.decline(context, Mml.compose`You would need a tanpit for that.`, 'no-pit');
      return;
    }
    if (!MixinApi.isContainable(hide)) {
      this.decline(context, Mml.compose`${Mml.thing(hide)} will not go in.`, 'not-containable');
      return;
    }
    const plan = pit.layInPlan(hide, giver);
    if (!plan.ok) {
      this.decline(context, TanController.refusalWords(plan, hide, pit), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You lay ${Mml.thing(hide)} in.`,
      onRefused: (r: LayInRefusal) => TanController.refusalWords(r, hide, pit),
      onDone: (f: { pitLine: string }) => ({
        self: Mml.compose`You slide ${Mml.thing(hide)} down into ${Mml.thing(pit)} and weight it under. ${f.pitLine}`,
        peers: Mml.compose`${Mml.actor(giver)} lays a skin into ${Mml.thing(pit)}.`,
      }),
    });
  }

  protected static refusalWords(r: LayInRefusal, hide: Stuff, pit: Tanpit): Composed {
    switch (r.reason) {
      case 'already-in-pit':
        return Mml.compose`${Mml.thing(hide)} is down in ${Mml.thing(pit)} already. \`look\` at the pit to see how it is coming on, and \`get\` it out when it is through.`;
      case 'already-tanned':
        return Mml.compose`${Mml.thing(hide)} is already tanned.`;
      case 'pit-dry':
        return Mml.compose`${Mml.thing(pit)} is empty. ${pit.pitReport().line}`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /**
   * The pit — a NARROWING over what the binder bound, never a search. With
   * no pit named, the one the hide is already in (so `tan hide` on a skin
   * that is down says where to look).
   */
  protected static findPit(bound: MqlManyResult | undefined, hide: Stuff): Tanpit | null {
    for (const candidate of bound?.stuff ?? []) {
      if (candidate instanceof Tanpit) return candidate;
    }
    if (MixinApi.isContainable(hide)) {
      const where = hide.getContainer();
      if (where instanceof Tanpit) return where;
    }
    return null;
  }

  private decline(context: CommandContext, line: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
