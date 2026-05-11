/**
 * StandController — slot-less posture flip per § 12 asymmetry.
 * Vacates any current posture-bearing slot and sets posture to Stand.
 * With an argument (`stand <X>`), occupies a slot on X accepting the
 * Stand posture (e.g., standing on a chair or table) via
 * `PostureApi.transferPosture`.
 *
 * Validation surface (from `cmd/stand.yaml`):
 *   - requiresAnimate, requiresPosed (verb-level)
 *   - mustBeVisible, mustBePostured (target-level — only with arg)
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { Postures } from '../../lib/slot/Postured';
import { PostureApi } from '../../api/posture';

interface StandModel extends CommandModel {
  target?: MqlOneResult;
}

export class StandController extends CommandController<StandModel> {
  execute(model: StandModel, context: CommandContext): CommandResult {
    if (model.target?.stuff) {
      return PostureApi.transferPosture({
        verb: 'stand',
        posture: Postures.Stand,
        target: model.target,
        context,
        successSelf: 'You stand on it.',
        successPeersTail: 'stands on it.',
      });
    }
    // Slot-less form: just vacate any current posture-bearing slot.
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `StandController: requiresPosed validator should have caught ${giver.stuffId}`
      );
    }
    PostureApi.vacatePostureBearingSlots(giver);
    giver.setPosture(Postures.Stand);
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You stand up.`)
      .toPeers(Mml.compose`${Mml.name(giver)} stands up.`)
      .send();
    return { success: true };
  }
}
