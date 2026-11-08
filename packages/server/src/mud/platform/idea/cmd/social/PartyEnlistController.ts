/**
 * PartyEnlistController — `party enlist <who>`: take someone straight into your party (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyEnlistController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Enlist whom?", "empty-result");
    const res = await giver.enlist(target);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You take ${Mml.actor(target)} into your party.`,
    );
  }
}
