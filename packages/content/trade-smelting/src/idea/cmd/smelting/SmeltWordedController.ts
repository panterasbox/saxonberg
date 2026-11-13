/**
 * SmeltWordedController — ⭐ **the same smelt in other words** (the
 * controller-liquidity drive's step 1, after `HarvestWordedController`).
 * A wizard re-points the `smelt` view's `controller:` here and the charge,
 * the yield, the duration and every refusal reason are exactly what
 * `SmeltController` makes, because neither decides any of it — the furnace
 * does. This file exists so the proof has something to run, and so an
 * author has a minimal smelt controller to copy.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import SmeltingFurnace from '../../../thing/SmeltingFurnace';

interface SmeltModel extends CommandModel {
  furnace?: MqlOneResult;
}

export default class SmeltWordedController extends CommandController<SmeltModel> {
  async execute(model: SmeltModel, context: CommandContext): Promise<void> {
    const furnace = model.furnace?.stuff ?? null;
    if (!(furnace instanceof SmeltingFurnace)) return SmeltWordedController.say(context, 'no-furnace');
    const plan = furnace.smeltPlan(context.commandGiver);
    if (!plan.ok) return SmeltWordedController.say(context, plan.reason);
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`The furnace takes its charge.`,
      onRefused: (r) => Mml.compose`The smelt will not go that way (${r.reason}).`,
      onDone: () => ({ self: Mml.compose`The furnace gives up what it made.` }),
    });
  }

  protected static say(context: CommandContext, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`The smelt will not go that way (${reason}).`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
