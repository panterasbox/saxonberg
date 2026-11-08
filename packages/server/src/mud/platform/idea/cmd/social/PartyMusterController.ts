/**
 * PartyMusterController — `party muster <crew>`: muster a durable crew (over {@link PartyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { PartyControllerBase, type PartyModel } from "./PartyControllerBase";

export default class PartyMusterController extends PartyControllerBase {
  async execute(model: PartyModel, context: CommandContext): Promise<void> {
    const giver = this.memberOf(context);
    if (!giver) return;
    const name = (model.name ?? "").trim();
    if (!name) return this.fail(context, "Muster which crew?", "name-required");
    const res = await giver.muster(name);
    if (!res.ok) return this.fail(context, this.reasonText(res.reason), res.reason);
    this.send(
      context,
      Mml.compose`You muster ${Mml.escape(res.party.getName())}.`,
    );
  }
}
