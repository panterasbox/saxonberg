/**
 * PracticeController — the developer harness that fabricates one
 * Transcript deed, standing in for the real (lane-2) craft verbs so the
 * advancement loop (practice → Transcript → derived band → conferred verb)
 * is exercisable on its own branch.
 *
 * `practice <discipline> [difficulty] [outcome]`. Records a single
 * `{discipline, difficulty, outcome}` deed on the actor's own Transcript
 * via `AdvancementApi.recordDeed` (which re-evaluates conferrals), then
 * echoes the resulting competence band. Developer-gated (the yaml's
 * `requiresWizard` validator) on top of the AuthorMixin visibility.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { AdvancementApi } from "../../../../api/advancement";
import {
  DIFFICULTIES,
  OUTCOMES,
  type Difficulty,
  type Outcome,
} from "../../../../lib/advancement/ActSignature";

const TOPIC = "act.deed";

interface PracticeModel extends CommandModel {
  discipline?: string;
  difficulty?: string;
  outcome?: string;
}

export default class PracticeController extends CommandController<PracticeModel> {
  async execute(model: PracticeModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;

    const discipline = model.discipline?.trim();
    if (!discipline) {
      return this.fail(context, "practice needs a <discipline>", "no-discipline");
    }

    const difficulty = (model.difficulty ?? "standard") as Difficulty;
    if (!DIFFICULTIES.includes(difficulty)) {
      return this.fail(
        context,
        `difficulty must be one of ${DIFFICULTIES.join(", ")}`,
        "bad-difficulty"
      );
    }

    const outcome = (model.outcome ?? "success") as Outcome;
    if (!OUTCOMES.includes(outcome)) {
      return this.fail(
        context,
        `outcome must be one of ${OUTCOMES.join(", ")}`,
        "bad-outcome"
      );
    }

    await AdvancementApi.recordDeed(actor, { discipline, difficulty, outcome });
    const band = await AdvancementApi.bandFor(actor, discipline);

    const body = Mml.fromMarkup(
      `You practice ${Mml.escape(discipline)} ` +
        `(${difficulty} / ${outcome}). Your competence reads ` +
        `${Mml.strong(band).toString()}.`
    );
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = "unspecified"
  ): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
