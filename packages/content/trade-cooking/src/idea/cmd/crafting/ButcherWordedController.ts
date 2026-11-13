/**
 * ButcherWordedController — ⭐ **the same breakdown in other words** (the
 * controller-liquidity drive's step 1, after `HarvestWordedController`).
 * A wizard re-points the `butcher` view's `controller:` here: the cuts, the
 * depth, the duration and every refusal reason are exactly what
 * `ButcherController` makes, because the carcass decides them
 * (`Butcherable.butcherPlan`). It keeps the shipped controller's narrowings
 * of the bound kit and says everything else plainly.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import ButcherController, { type ButcherModel } from './ButcherController';

export default class ButcherWordedController extends ButcherController {
  override async execute(model: ButcherModel, context: CommandContext): Promise<void> {
    const body = model.body?.stuff ?? null;
    if (!body) {
      context.note({ kind: 'empty-result', field: 'body', query: model.body?.raw ?? '' });
      return ButcherWordedController.say(context, 'nothing-there', false);
    }
    if (!MixinApi.isOrganism(body)) return ButcherWordedController.say(context, 'not-a-carcass');
    if (!MixinApi.isButcherable(body)) {
      return ButcherWordedController.say(context, await ButcherController.liveReason(body));
    }
    const plan = await body.butcherPlan(context.commandGiver, {
      blade: ButcherController.bladeOf(model.blade),
      tools: model.tools?.stuff ?? [],
      block: ButcherController.blockOf(model.block),
      cut: model.cut ?? '',
    });
    if (plan === null) return;
    if (!plan.ok) return ButcherWordedController.say(context, plan.reason);
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => Mml.compose`The carcass will not come apart that way (${r.reason}).`,
      onDone: (f) => ({ self: Mml.compose`It comes apart into ${String(f.cuts.length)} piece(s).` }),
    });
  }

  protected static say(context: CommandContext, reason: string, note = true): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`The carcass will not come apart that way (${reason}).`)
      .send();
    if (note) context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
