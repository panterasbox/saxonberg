/**
 * PartyAcceptController — `party accept`: accept your pending invite (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyAcceptController extends PartyControllerBase {
  async execute(_model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const res = await giver.acceptPartyInvite();
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You join ${Mml.escape(res.party.getName())}.`,
    );
  }
}
