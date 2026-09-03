/**
 * DismountController — vacate the mount slot the actor occupies, set
 * posture to Stand. No-arg only.
 *
 * Validation surface (from `cmd/dismount.yaml`):
 *   - requiresAnimate, requiresPosed, requiresSlottable, requiresMounted
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Postures } from '../../../../lib/slot/Postured';

export default class DismountController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    void _model;
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `DismountController: requiresPosed validator should have caught ${giver.stuffId}`
      );
    }
    if (!MixinApi.isSlottable(giver)) {
      throw new Error(
        `DismountController: requiresSlottable validator should have caught ${giver.stuffId}`
      );
    }
    const occupied = giver.occupiedSlots();
    let mount: Stuff | null = null;
    for (const [host, slotNames] of occupied.entries()) {
      if (!MixinApi.isMountable(host)) continue;
      for (const slotName of slotNames) {
        if (slotName === host.getMountSlot()) {
          host.vacate(slotName, giver);
          mount = host;
          break;
        }
      }
      if (mount) break;
    }
    giver.setPosture(Postures.Stand);
    if (mount) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You dismount ${Mml.thing(mount)}.`)
        .toPeers(
          Mml.compose`${Mml.actor(giver)} dismounts ${Mml.thing(mount)}.`
        )
        .send();
    }
    return;
  }
}
