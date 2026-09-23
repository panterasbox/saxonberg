/**
 * LayController — `lay <trap> [at <shore>]`: the trap goes from your
 * hand into the water, stamped with when, where and by whom.
 *
 * ⚠ `lay`, not `set`: `set` is the scripting interpreter's builtin and
 * never reaches dispatch (the drive found it by getting silence).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { FishingController, FISHING_TOPIC } from './FishingController';
import Trap from '../../../thing/Trap';

const WATER = '/stuff/idea/material/bulk/water';

interface LayModel extends CommandModel {
  trap: MqlOneResult;
  shore?: MqlOneResult;
}

export default class LayController extends FishingController<LayModel> {
  async execute(model: LayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const trap = model.trap?.stuff as Stuff | undefined;
    if (!trap || !(trap instanceof Trap)) {
      this.decline(context, "That isn't something you can set in the water.", 'not-a-trap');
      return;
    }
    if (trap.isSet()) {
      this.decline(context, 'It is already laid.', 'already-set');
      return;
    }
    if (!MixinApi.isContainable(trap) || (trap.getContainer() as Stuff | null) !== (giver as Stuff)) {
      this.decline(context, 'You have to be holding it.', 'not-held');
      return;
    }
    const room = this.roomOf(giver);
    const reach = await this.reachFor(giver, model.shore);
    if (room === null || reach === null || !MixinApi.isContainer(room)) {
      this.decline(context, 'There is no water here to set it in.', 'no-water');
      return;
    }
    ContainmentApi.move(trap as Stuff & Containable, room as Stuff & Container);
    trap.markSet(WorldClockApi.getNow().rawValue(), reach, giver.getIdentityPath() ?? '');
    // ⭐ A laid trap with an interior is full of the water it lies in —
    // which is what keeps a keepnet's fish alive (B8).
    if (trap.hasInteriorBulk()) {
      const capacity = trap.getInteriorCapacity();
      const water = StuffApi.findByTemplatePath<Material>(WATER);
      if (capacity !== null && water) {
        trap.setBulkMaterial('interior', water);
        trap.setBulkAmount('interior', capacity);
      }
    }
    MessageApi.scene(giver)
      .topic(FISHING_TOPIC)
      .toSelf(Mml.compose`You lay ${Mml.thing(trap)} in the water and mark the spot.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lays ${Mml.thing(trap)} in the water.`)
      .send();
  }
}
