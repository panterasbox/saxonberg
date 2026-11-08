/**
 * PartyShowController — `party show` (and bare `party`): your active party (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyApi } from "../../../../api/party";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyShowController extends PartyControllerBase {
  async execute(_model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const party = PartyApi.activePartyOf(giver);
    if (!party) {
      return this.send(context, Mml.fromMarkup("You are not in a party."));
    }
    const captain = party.isCaptain(this.refOf(giver)) ? " (you lead)" : "";
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(
          `${party.getName()} — ${party.size()} member(s)${captain}.`,
        ),
      ),
    );
  }
}
