/**
 * InterveneController — `intervene <target>`: stay a coup in progress.
 *
 * The stage-2 killing stroke ({@link Coup}) is deliberately slow and
 * telegraphed so a present party can stop it. This verb finds a live coup
 * in the room where `target` is either the fallen (shield them) or the
 * one standing over them (stay their hand) and cancels it — the victim is
 * spared and the room is told (the abort narration fires on cancel). The
 * winner may also intervene on their own victim (mercy).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { CombatApi } from "../../../api/combat";

const TOPIC = "act.deed";

interface InterveneModel extends CommandModel {
  target?: MqlOneResult;
}

export default class InterveneController extends CommandController<InterveneModel> {
  async execute(model: InterveneModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    if (!model.target?.stuff) {
      const raw = model.target?.raw;
      return this.fail(
        context,
        raw
          ? `You don't see any '${raw}' to step in for.`
          : "Intervene for whom?",
        "empty-result",
      );
    }
    const target = model.target.stuff;

    const stopped = CombatApi.intervene(giver as Stuff, target);
    if (!stopped) {
      return this.fail(
        context,
        `There is no killing stroke to stay over ${Mml.thing(target).toString()}.`,
        "no-coup",
      );
    }
    // Success: the coup's abort narration (spared) already reached the
    // room — including this actor. Nothing more to say.
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
