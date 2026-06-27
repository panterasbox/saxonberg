/**
 * CompetenceController — the bands-only self-view over a character's
 * competence.
 *
 * A single-token, zero-arg, self-only, read-only verb (the `chronicle`
 * shape). Reads the derived per-Discipline bands
 * (`AdvancementApi.bandsFor`) and renders them as **bands, never a
 * number** — the honesty firewall. Disciplines with no evidence are
 * absent (the floor is implicit); the empty state renders a beginning
 * line.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { AdvancementApi } from "../../../api/advancement";

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = "world.identity";

export default class CompetenceController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const bands = await AdvancementApi.bandsFor(actor);

    const blocks: string[] = [Mml.strong("Competence").toString()];

    if (bands.length === 0) {
      blocks.push(Mml.escape("You have not yet practiced anything."));
    } else {
      blocks.push(
        Mml.unorderedList(
          bands.map((b) =>
            Mml.fromMarkup(
              `${Mml.escape(b.discipline)} — ${Mml.strong(b.band).toString()}`
            )
          )
        ).toString()
      );
    }

    const body = Mml.fromMarkup(blocks.join("\n\n"));
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
