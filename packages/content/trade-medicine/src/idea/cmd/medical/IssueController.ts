/**
 * IssueController — `issue <type> [to <someone>]` (blood build D7).
 *
 * The window's own staff hand a unit of blood from the bank to a
 * recipient (or to their own hands). Gift-only: the unit is never sold and
 * never a `buy`-able stock line; the window records who got what (D16).
 *
 * ⭐ Seat-gated, NPC-only in v1 BY CONSTRUCTION: the gate — the window's
 * own `keptBy`, which `takeUnit` asks itself — is a non-exited
 * on-shift employment at the window's operating business (or its
 * proprietor). The window's roster has no player-fillable seat (D11), so
 * only the NPC registrar passes today — but the verb EXISTS so the
 * deferred player-operator ceiling can open the seat later with no new
 * plumbing. The `banks` floor beat forces this verb; it is not dead.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { DonationBank } from '@saxonberg/server/mud/lib/commerce/DonationBank';

const TOPIC = 'act.deed';

interface IssueModel extends CommandModel {
  lot?: string;
  recipient?: MqlOneResult;
  window?: MqlOneResult;
}

export default class IssueController extends CommandController<IssueModel> {
  async execute(model: IssueModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const window = model.window?.stuff as (Stuff & DonationBank) | undefined;
    if (!window || !MixinApi.isDonationBank(window)) {
      return this.fail(context, 'There is no blood window here to issue from.', 'no-window');
    }
    const lot = (model.lot ?? '').trim().toUpperCase();
    if (!lot) {
      return this.fail(context, 'Issue which type? Name one — O, A, B, or AB.', 'no-lot');
    }

    // ⭐ The seat gate is the window's (`takeUnit` asks `keptBy` of the
    // issuer, who must be who is acting): an on-shift holder of the
    // window's operating business, or its proprietor. No player passes
    // today (the roster has no open seat) — v1 stays NPC-run by construction.
    const recipient = (model.recipient?.stuff as Stuff | undefined) ?? giver;
    const taken = await window.takeUnit(lot, recipient, giver);
    if (!taken.ok) return this.refuse(context, taken);
    const who = recipient === giver ? 'yourself' : recipient.getPresentation();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(`You issue a unit of ${lot} to ${who}.`)))
      .toPeers(Mml.compose`${Mml.actor(giver)} issues a unit of blood.`)
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
