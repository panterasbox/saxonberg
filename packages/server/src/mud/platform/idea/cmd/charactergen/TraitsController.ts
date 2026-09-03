/**
 * TraitsController — the self-view over a character's defining traits.
 *
 * A single-token, zero-arg, self-only, read-only verb (the `chronicle` /
 * `competence` shape). Reads the derived **pronounced** axes
 * (the owner's `pronouncedTraits`) and renders each as **pole label + band** —
 * "Gregarious — entrenched" — never the raw signed magnitude (the same
 * honesty firewall competence keeps: capability and bands, not a number).
 * Near-neutral axes are absent (the unformed floor is implicit); the empty
 * state renders a still-taking-shape line.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import { MixinApi } from "../../../../api/mixin";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { Disposition } from "../../../../lib/trait/Disposition";

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = "act.deed";

export default class TraitsController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const axes = MixinApi.isDispositioned(actor)
      ? await actor.pronouncedTraits()
      : [];

    const blocks: string[] = [Mml.strong("Traits").toString()];

    if (axes.length === 0) {
      blocks.push(Mml.escape("Your character is still taking shape."));
    } else {
      blocks.push(
        Mml.unorderedList(
          axes.map((a) =>
            Mml.fromMarkup(
              `${Mml.escape(
                Disposition.poleLabel(a.disposition, a.position)
              )} — ${Mml.strong(a.band).toString()}`
            )
          )
        ).toString()
      );
    }

    const body = Mml.fromMarkup(blocks.join("\n\n"));
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
