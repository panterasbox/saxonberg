/**
 * PartyFormController — `party form <name> [--durable]`: form a party (or a durable crew) (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyFormController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const name = (model.name ?? "").trim();
    if (!name) return this.fail(context, "Name your party.", "name-required");
    const res = await giver.formParty(name, model.durable === true);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    const kind = res.party.isDurable() ? "durable crew" : "party";
    this.send(context, Mml.compose`You form the ${kind} ${Mml.escape(name)}.`);
  }
}
