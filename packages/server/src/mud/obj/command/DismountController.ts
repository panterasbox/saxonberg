/**
 * DismountController — vacate the mount slot the actor occupies, set
 * posture to Stand. No-arg only.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Slottable } from '../../lib/slot/Slottable';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { Postures } from '../../lib/slot/Postured';
import { SlotApi } from '../../api/slot';

export class DismountController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): CommandResult {
    void _model;
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      return { success: false, summary: `you aren't mounted` };
    }
    if (giver.getPosture() !== Postures.Mounted) {
      return { success: false, summary: `you aren't mounted` };
    }
    const occupied = SlotApi.findOccupiedSlots(giver as Stuff & Slottable);
    let mount: Stuff | null = null;
    for (const [host, slotNames] of occupied.entries()) {
      if (!MixinApi.isMountable(host)) continue;
      for (const slotName of slotNames) {
        if (slotName === host.getMountSlot()) {
          host.vacate(slotName, giver as Stuff & Slottable);
          mount = host;
          break;
        }
      }
      if (mount) break;
    }
    (giver as unknown as { setPosture(p: string): void }).setPosture(
      Postures.Stand
    );
    if (mount) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.narration.action)
        .toSelf(Mml.compose`You dismount ${Mml.item(mount)}.`)
        .toPeers(
          Mml.compose`${Mml.name(giver)} dismounts ${Mml.item(mount)}.`
        )
        .send();
    }
    return { success: true };
  }
}
