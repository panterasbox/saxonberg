/**
 * FlourishController — the self-contained placeholder verb that the
 * Mixology Discipline confers at the `competent` band. Its only job is to
 * prove the knowing→doing seam end-to-end: it exists as a verb but is
 * afforded *only* through competence conferral (it is in no static
 * `commandContributions`), so seeing it in your command set IS the
 * demonstration that advancement opened a door. (Lane 2's real craft verbs
 * replace this placeholder.)
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class FlourishController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const selfBody = Mml.fromMarkup(
      "You spin the shaker behind your back and catch it clean — a practiced flourish."
    );
    const peersBody = Mml.fromMarkup(
      `${Mml.escape(actor.getPresentation())} spins a shaker behind ` +
        "their back and catches it clean — a practiced flourish."
    );
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(selfBody)
      .toPeers(peersBody)
      .send();
  }
}
