/**
 * PartySideController — `party side <side>`: name the side your party stands with (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartySideController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const side = (model.name ?? "").trim();
    if (!side) return this.fail(context, "Name the side.", "name-required");
    const res = await giver.setPartySide(side);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(context, Mml.compose`Your party stands with ${Mml.escape(side)}.`);
  }
}
