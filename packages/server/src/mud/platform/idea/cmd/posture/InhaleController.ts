/**
 * InhaleController — the voluntary breath-hold (the free-diving skill).
 * Object-free posture-category verb; fills the breath store on
 * `RespirationMixin` so a prepared dive lasts longer than a surprised one
 * (underwater D10). Under water there is nothing to breathe — refused. A blacked-out body can't hold its breath —
 * gated by `requiresConscious` at the view.
 *
 * Validation surface (from `cmd/posture/inhale.yaml`):
 *   - requiresAnimate, requiresConscious (verb-level)
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class InhaleController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isRespiration(giver)) {
      // A body that doesn't respire (construct) — gentle no-op cue.
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You breathe, out of habit.`)
        .send();
      return;
    }
    // ⭐ The body decides: under water there is nothing to breathe (#94).
    const out = await giver.inhale();
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(
        out.hyperventilating
          ? Mml.compose`You breathe fast and deep, and your head swims.`
          : Mml.compose`You take a deep breath and hold it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} takes a deep breath.`)
      .send();
  }
}
