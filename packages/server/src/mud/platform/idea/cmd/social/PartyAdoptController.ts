/**
 * PartyAdoptController — `party adopt <formation>`: adopt a formation — a witnessed, reactable beat (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { MessageApi } from "../../../../api/message";
import { ReactionApi } from "../../../../api/reaction";
import { PartyApi } from "../../../../api/party";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyAdoptController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const typed = (model.name ?? "").trim();
    if (!typed) return this.fail(context, "Adopt which formation?", "name-required");
    // ⭐ A formation is a document named by its keywords — `wedge`, `the
    // wedge` — through the one rule (naming overhaul D-C5 rule 3).
    const pick = await this.named(context, await PartyApi.formations().named(typed), "formation", typed);
    if (!pick) return;
    const name = pick.value.name;
    const res = await giver.setPartyFormation(pick.path);
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
