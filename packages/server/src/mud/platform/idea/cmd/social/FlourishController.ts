/**
 * FlourishController — a bit of flair at the rail, and ⭐⭐⭐ **the one
 * place in the game where the refusal IS the progression UI.**
 *
 * ## What this was, and why it had to change
 *
 * `flourish` shipped as the DEMONSTRATION that band-gated verb conferral
 * worked. Its docstring used to say so: *"it is afforded only through
 * competence conferral (it is in no static `commandContributions`), so
 * seeing it in your command set IS the demonstration that advancement
 * opened a door."*
 *
 * ⚠⚠ Band-gated verb conferral was **retired** (MR !285), and nothing
 * came back for this verb. `refreshConferrals` — which
 * `platform/idea/Discipline/wind.yaml`'s own prose still cites — no
 * longer exists in the source, and `mixology.yaml` went on carrying a
 * `conferrals:` entry that pushed nothing to nobody. So `flourish`
 * became a verb whose only conferrer had been deliberately deleted:
 * view, controller and Discipline row all present, and *"I don't
 * understand 'flourish'"* for every player alive. Nothing failed. The
 * reachability census is what found it.
 *
 * ## Why the gate is HERE and the affordance is on the rail
 *
 * The retirement's doctrine is the whole answer, and it is not a
 * preference: **a band must never confer a verb, because the refusal is
 * how a player learns the door is there.** A verb that is simply absent
 * teaches nothing (`command-routing.md:418-420`); a verb that answers
 * *"you are not steady enough yet"* teaches that there is something to
 * get good at, and names it.
 *
 * So: `trade-hospitality`'s `BarStation` affords it, beside the three
 * acts already performed at that surface — *the instrument affords the
 * verb* — and the band is checked right here, on the shape
 * `DoseController` already ships for a prescription licence. A player at
 * a bar gets told. A player in a field gets nothing, because there is no
 * rail to flourish at, which is the correct silence.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { CompetenceBand } from "../../../../lib/advancement/CompetenceBand";

const TOPIC = "act.deed";

/** The band at which the hands stop being a liability. */
const REQUIRED_BAND = "competent";

export default class FlourishController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;

    const band = MixinApi.isAdvancing(actor)
      ? await actor.competenceBandFor("mixology")
      : CompetenceBand.FLOOR;

    if (!CompetenceBand.atOrAbove(band, REQUIRED_BAND)) {
      // ⭐ The refusal names the Discipline and the band, because that is
      // the only thing in this branch a player can act on. "You can't do
      // that" would be the retired conferral's silence with extra steps.
      const line =
        "You go for it, fumble the catch, and settle for setting the " +
        "shaker down. Flair at the rail wants a competent hand at " +
        "Mixology — yours is " +
        band +
        ".";
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(Mml.escape(line)))
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-competent",
        detail: line,
      });
      return;
    }

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
