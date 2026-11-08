/**
 * PartyLeaveController — `party leave`: leave your party (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyLeaveController extends PartyControllerBase {
  async execute(_model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const res = await giver.leaveParty();
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.fromMarkup("You leave your party."));
  }
}
