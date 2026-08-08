/**
 * ExhaleController — release a held breath. Object-free posture-category
 * verb; clears the held-breath grace on `RespirationMixin`. `exhale` on a
 * body not currently holding is a gentle no-op cue.
 *
 * Validation surface (from `cmd/posture/exhale.yaml`):
 *   - requiresAnimate, requiresConscious (verb-level)
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

export default class ExhaleController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isRespiration(giver)) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You exhale.`)
        .send();
      return;
    }
    const wasHolding = giver.isHoldingBreath();
    giver.exhale();
    if (!wasHolding) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You let out a slow breath.`)
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You let your held breath out.`)
      .toPeers(Mml.compose`${Mml.name(giver)} lets out a held breath.`)
      .send();
  }
}
