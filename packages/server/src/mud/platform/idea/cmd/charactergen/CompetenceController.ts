/**
 * CompetenceController — the bands-only view over a character's
 * competence, their own or somebody else's.
 *
 * Reads the derived per-Discipline bands and renders them as **bands,
 * never a number** — the honesty firewall. Disciplines with no evidence
 * are absent (the floor is implicit).
 *
 * ## ⚠⚠ Why the target had to exist
 *
 * The verb was zero-arg and self-only. Meanwhile `advancement.md` states
 * the read gate is deliberately **asymmetric**: a player's competence is
 * self-only, an NPC's is a fact about the world that any viewer may
 * learn — and the shipped subscription gate already implements exactly
 * that.
 *
 * ⭐ **The permission was open and there was no door.** Nobody could ask
 * what Dave is good at, so the headline goal of the identity build
 * ("a character who does a job reads as being good at it, to anyone who
 * asks") was unreachable no matter how well the seeding worked — the
 * `feel`/`taste` shape exactly: a capability that ships and has never
 * run.
 *
 * ## The refusal is the checkpoint
 *
 * Asking about another **player** is declined, and that is the feature
 * rather than a limitation: your competence is yours. `getPlayerId()` is
 * the discriminator — structural, so a future player-bearing class
 * behaves the same without being enumerated here.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import { MixinApi } from "../../../../api/mixin";
import { MqlApi } from "../../../../api/mql";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = "act.deed";

interface CompetenceModel extends CommandModel {
  subject?: string;
}

export default class CompetenceController extends CommandController<CompetenceModel> {
  async execute(
    model: CompetenceModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const asked = (model.subject ?? "").trim();

    let subject: Stuff = actor;
    if (asked) {
      const found = MqlApi.resolveMany(asked, {
        commandGiver: context.commandGiver,
        scope: "reachable",
      }).stuff[0];
      if (!found) {
        this.fail(context, `Nobody here goes by "${asked}".`, "no-subject");
        return;
      }
      if (found !== actor && found.getPlayerId() !== null) {
        this.fail(
          context,
          `What ${found.getPresentation()} can do is theirs to show you.`,
          "competence-is-their-own",
        );
        return;
      }
      subject = found;
    }

    const isSelf = subject === actor;
    const bands = MixinApi.isAdvancing(subject)
      ? await subject.competenceBands()
      : [];

    const heading = isSelf
      ? "Competence"
      : `${subject.getPresentation()} — competence`;
    const blocks: string[] = [Mml.strong(heading).toString()];

    if (bands.length === 0) {
      blocks.push(
        Mml.escape(
          isSelf
            ? "You have not yet practiced anything."
            : // ⭐ An Extra lands here and should read as a ROLE rather
              // than as a person who happens to be bad at everything.
              `Nothing is on the record about what ${subject.getPresentation()} can do.`,
        ),
      );
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

  private fail(
    context: CommandContext,
    message: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}
