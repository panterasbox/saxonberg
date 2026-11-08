/**
 * PartyInviteController — `party invite <who>`: invite someone into your party (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyInviteController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const target = model.target?.stuff;
    if (!target) {
      return this.fail(context, "Invite whom?", "empty-result");
    }
    const res = await giver.inviteToParty(target);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You invite ${Mml.actor(target)} to your party.`,
    );
  }
}
