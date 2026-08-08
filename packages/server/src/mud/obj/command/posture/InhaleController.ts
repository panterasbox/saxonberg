/**
 * InhaleController — the voluntary breath-hold (the free-diving skill).
 * Object-free posture-category verb; sets/extends the held-breath grace
 * on `RespirationMixin` so a prepared dive crosses a `spo2`-gap an
 * unprepared body cannot. A blacked-out body can't hold its breath —
 * gated by `requiresConscious` at the view.
 *
 * Validation surface (from `cmd/posture/inhale.yaml`):
 *   - requiresAnimate, requiresConscious (verb-level)
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

export default class InhaleController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isRespiration(giver)) {
      // A body that doesn't respire (construct) — gentle no-op cue.
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You breathe, out of habit.`)
        .send();
      return;
    }
    giver.inhale();
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You take a deep breath and hold it.`)
      .toPeers(Mml.compose`${Mml.name(giver)} takes a deep breath.`)
      .send();
  }
}
