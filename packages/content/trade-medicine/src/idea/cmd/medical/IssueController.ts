/**
 * IssueController — `issue <type> [to <someone>]` (blood build D7).
 *
 * The window's own staff hand a unit of blood from the bank to a
 * recipient (or to their own hands). Gift-only: the unit is never sold and
 * never a `buy`-able stock line; the window records who got what (D16).
 *
 * ⭐ Seat-gated, NPC-only in v1 BY CONSTRUCTION: the gate is a non-exited
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
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
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

    // ⭐ The seat gate: an on-shift holder of the window's operating
    // business, or its proprietor. No player passes today (the roster has
    // no open seat), which is how v1 stays NPC-run by construction.
    if (!(await this.keepsTheWindow(giver, window))) {
      return this.fail(context, 'You do not keep this window.', 'not-on-the-window');
    }

    const recipient = (model.recipient?.stuff as Stuff | undefined) ?? giver;
    const moved = await window.takeUnit(lot, recipient, giver);
    if (!moved) {
      return this.fail(context, `The window is out of type ${lot}.`, 'lot-empty');
    }
    const who = recipient === giver ? 'yourself' : recipient.getPresentation();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(`You issue a unit of ${lot} to ${who}.`)))
      .toPeers(Mml.compose`${Mml.actor(giver)} issues a unit of blood.`)
      .send();
  }

  /** On-shift at the window's operating business, or its proprietor. */
  private async keepsTheWindow(giver: Stuff, window: Stuff): Promise<boolean> {
    const path = window.getIdentityPath() ?? window.getTemplatePath();
    const business = path ? EmploymentApi.businessAt(path) : null;
    if (!business) return false;
    if (await business.hasProprietor(giver)) return true;
    const orgPath = business.getTemplatePath();
    if (!orgPath || !MixinApi.isEmployed(giver)) return false;
    return giver
      .getActiveEmployments()
      .some((e) => e.organizationPath === orgPath && e.status === 'on-shift');
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
