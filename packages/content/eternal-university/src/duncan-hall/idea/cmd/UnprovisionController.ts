/**
 * UnprovisionController — the `unprovision <player>` verb (a Duncan Hall
 * *content* verb). Ends a tenant's dorm lease and reclaims the unit.
 * Symmetric with `provision <player>` — you name the tenant; Katie
 * dispatches `unprovision $player` for a move-out.
 *
 * ⭐ **The end of the let is the warren's** (controller-liquidity W13):
 * `DormWarren.endLet(by, tenant)` — the residence pack's `LettingWarren`
 * sequence — asks who may (staff of the college or the hall's committee),
 * revokes the lease, sends the tenant's owned goods to STORAGE (intact,
 * titled, recoverable — C4: this verb used to drop the room with the goods
 * in it), steps any occupant out to the corridor, reverts the room, clears
 * its records and frees the slot.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import DormWarren from '../DormWarren';

const TOPIC = 'act.deed';

interface UnprovisionModel extends CommandModel {
  player?: MqlOneResult;
}

export default class UnprovisionController extends CommandController<UnprovisionModel> {
  async execute(model: UnprovisionModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const target = model.player?.stuff ?? null;
    const warren = await StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
    if (!target) {
      // Who may end a lease is asked before whose (the refusal names the seat).
      if (!(await warren.mayLetFor(actor))) {
        return UnprovisionController.fail(context, UnprovisionController.NOT_AUTHORIZED, 'not-authorized');
      }
      return UnprovisionController.fail(context, 'End whose dorm lease?', 'no-player');
    }
    const answer = await warren.endLet(actor, target);
    if (!answer.ok) {
      const who = target.getPresentation() ?? target.getIdentityPath() ?? 'They';
      const detail =
        answer.reason === 'not-authorized'
          ? UnprovisionController.NOT_AUTHORIZED
          : answer.reason === 'not-housed'
            ? `${who} doesn't hold a dorm.`
            : 'End whose dorm lease?';
      return UnprovisionController.fail(context, detail, answer.reason);
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`\nEnded the lease on ${answer.unitExtent}; the tenant's goods are in storage, the room reverts and its slot is free.\n`,
      )
      .send();
  }

  protected static readonly NOT_AUTHORIZED =
    "Only the college's staff or a member of the hall's committee may end Duncan Hall's leases.";

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
