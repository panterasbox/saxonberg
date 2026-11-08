/**
 * PartyTransferController — `party transfer <who>`: hand the captaincy on (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyTransferController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Hand leadership to whom?", "empty-result");
    const res = await giver.transferCaptaincy(this.refOf(target));
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You hand the party to ${Mml.actor(target)}.`,
    );
  }
}
