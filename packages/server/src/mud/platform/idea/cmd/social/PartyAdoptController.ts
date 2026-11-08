/**
 * PartyAdoptController — `party adopt <formation>`: adopt a formation — a witnessed, reactable beat (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { MessageApi } from "../../../../api/message";
import { ReactionApi } from "../../../../api/reaction";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyAdoptController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const name = (model.name ?? "").trim().toLowerCase();
    if (!name) return this.fail(context, "Adopt which formation?", "name-required");
    const res = await giver.setPartyFormation(name);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    // The witnessed formation-shift beat: adopting is a room-visible,
    // reactable act (a mid-fight switch lands on the very next beat, and
    // everyone present sees the line reform).
    const commandId = context.commandId;
    MessageApi.scene(giver)
      .topic("self.group")
      .meta(commandId ? { commandId } : {})
      .toSelf(
        Mml.compose`Your party adopts the ${Mml.escape(name)} formation.`,
      )
      .toPeers(
        Mml.compose`The line reforms around ${Mml.actor(giver)} — their party adopts the ${Mml.escape(name)} formation.`,
      )
      .send();
    if (commandId) {
      const scope = ReactionApi.locationScopeFor(giver);
      if (scope) {
        ReactionApi.noteReactableAct({ commandId, subject: giver, scope });
      }
    }
  }
}
