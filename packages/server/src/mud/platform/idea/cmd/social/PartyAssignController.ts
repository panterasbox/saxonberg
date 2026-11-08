/**
 * PartyAssignController — `party assign <role> <who>`: give a member a formation role (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyAssignController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const role = (model.name ?? "").trim().toLowerCase();
    if (!role) return this.fail(context, "Assign which role?", "name-required");
    const target = model.target?.stuff;
    if (!target) return this.fail(context, "Assign whom?", "empty-result");
    const res = await giver.assignPartyRole(role, this.refOf(target));
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`${Mml.actor(target)} takes the ${Mml.escape(role)} role.`,
    );
  }
}
