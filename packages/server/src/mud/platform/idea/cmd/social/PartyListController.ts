/**
 * PartyListController — `party list`: your durable crews (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyApi } from "../../../../api/party";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyListController extends PartyControllerBase {
  async execute(_model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const parties = (await PartyApi.partiesOf(this.refOf(giver))).filter((p) =>
      p.isDurable(),
    );
    if (parties.length === 0) {
      return this.send(context, Mml.fromMarkup("You belong to no durable crews."));
    }
    const lines = parties
      .map((p) => `  ${p.getName()} (${p.size()})`)
      .join("\n");
    this.send(context, Mml.fromMarkup(`Your crews:\n${Mml.escape(lines)}`));
  }
}
