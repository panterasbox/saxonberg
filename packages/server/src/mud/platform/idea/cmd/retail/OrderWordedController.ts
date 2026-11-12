/**
 * OrderWordedController — ⭐ **the same order in other words** (the
 * controller-liquidity drive's step 1, after `HarvestWordedController`).
 * A wizard re-points the `order` view's `controller:` here: what the board
 * makes, what it charges, how long it takes and every refusal reason are
 * exactly what `OrderController` gets, because the board decides them
 * (`PricedOffer.orderPlanFor`). It still asks before money moves — a price
 * is a question — and says everything plainly.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';

interface OrderModel extends CommandModel {
  counter?: MqlManyResult;
  menu?: MqlOneResult;
  cocktail: string;
  subject?: MqlOneResult;
  brand?: string;
}

export default class OrderWordedController extends ManualBuildController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (MixinApi.isVocal(giver)) {
      const voice = giver.canVocalize();
      if (!voice.ok) return OrderWordedController.say(context, voice.reason);
    }
    const phrase = (model.cocktail ?? '').trim();
    const key = (phrase.split(/\s+/)[0] ?? '').toLowerCase();
    const taking = (model.counter?.stuff ?? []).filter((b) => MixinApi.isPricedOffer(b) && b.offersOrder(key));
    const picked = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' },
      taking,
      'counter',
      context,
      { raw: key },
    );
    if (picked === null) return;
    const board = picked[0] ?? model.menu?.stuff ?? null;
    if (!board || !MixinApi.isPricedOffer(board)) {
      context.note({ kind: 'empty-result', field: 'cocktail', query: model.cocktail });
      return OrderWordedController.say(context, 'nowhere-to-order', false);
    }
    const plan = await board.orderPlanFor({
      by: giver,
      phrase,
      key,
      subject: model.subject?.stuff ?? null,
      ...(model.brand ? { brand: model.brand } : {}),
      location: context.location ?? null,
    });
    if (!plan.ok) return OrderWordedController.say(context, plan.reason);
    const begun = plan.facts;
    if (begun.kind === 'repair' || begun.kind === 'wash') {
      const asker = context.requireInteractive(`a yes to pay ${String(begun.total)}`);
      if (!asker) return OrderWordedController.say(context, 'needs-input');
      const yes = await asker.promptConfirm(`Pay ${String(begun.total)}?`, 'no').catch(() => false);
      if (!yes) return OrderWordedController.say(context, 'declined');
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => Mml.compose`The order will not go that way (${r.reason}).`,
      onDone: () => ({ self: Mml.compose`Your order is done.` }),
    });
  }

  protected static say(context: CommandContext, reason: string, note = true): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`The order will not go that way (${reason}).`)
      .send();
    if (note) context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
