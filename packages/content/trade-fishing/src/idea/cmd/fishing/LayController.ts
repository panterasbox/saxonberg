/**
 * LayController — `lay <trap> [at <shore>]`: the trap goes from your
 * hand into the water, stamped with when, where and by whom.
 *
 * The trap lays itself (`Trap.layIn`) and fills with the reach's own
 * water — what the shore draws here, else the reach's salinity says salt
 * or fresh (C13). This controller finds the reach and says it.
 *
 * ⚠ `lay`, not `set`: `set` is the scripting interpreter's builtin and
 * never reaches dispatch (the drive found it by getting silence).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { FishingController, FISHING_TOPIC } from './FishingController';
import Trap, { type LayRefusal } from '../../../thing/Trap';

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
    const room = this.roomOf(giver);
    const pick = await this.reachFor(giver, model.shore);
    if (pick !== null && 'refusal' in pick) {
      this.decline(context, pick.refusal, pick.reason);
      return;
    }
    if (room === null || pick === null) {
      this.decline(context, LayController.refusalText({ ok: false, reason: 'no-water' }), 'no-water');
      return;
    }
    const water = pick.water ?? (await (await this.waters()).waterIn(pick.reach, WorldClockApi.getNow().rawValue()));
    const out = trap.layIn(giver, room, pick.reach, water);
    if (!out.ok) {
      this.decline(context, LayController.refusalText(out), out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(FISHING_TOPIC)
      .toSelf(Mml.compose`You lay ${Mml.thing(trap)} in the water and mark the spot.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lays ${Mml.thing(trap)} in the water.`)
      .send();
  }

  /** ⭐ Every refusal a trap can give. */
  protected static refusalText(r: LayRefusal): string {
    switch (r.reason) {
      case 'already-set':
        return 'It is already laid.';
      case 'not-held':
        return 'You have to be holding it.';
      case 'no-water':
        return 'There is no water here to set it in.';
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
