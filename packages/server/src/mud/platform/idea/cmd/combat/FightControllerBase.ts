/**
 * FightControllerBase — what every `fight` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base
 * per noun). `attack <target>` opens a fight; everything you do *inside*
 * one is a `fight` subcommand:
 *
 *   - bare `fight` (or `fight status`) — `FightStatusController`, the
 *     at-a-glance read.
 *   - the eleven gambit words (`strike`, `feint`, `close`, `advance`,
 *     `withdraw`, `disarm`, `subdue`, `shove`, `bash`, `sweep`,
 *     `entangle`) — ONE act, `FightGambitController`, which queues the
 *     word as the gambit (`queueGambit(name)`).
 *   - `fight defend` — `DefendController`, the same act as bare `defend`
 *     (the twelfth gambit word, routed to the verb that owns it).
 *   - `break`, `rush`, `switch`, `draw`, `finish`, `assess`, `yield` —
 *     one controller each (`fight assess` is the costed read of your
 *     opponent; `assess` itself only examines a body).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { MqlOneResult } from "../../../../api/mql";

export const TOPIC = "act.deed";

export interface FightModel extends CommandModel {
  subcommand?: string;
  target?: MqlOneResult;
  /** `fight rush <direction>` — the exit to throw a grappled foe through. */
  direction?: string;
}

export abstract class FightControllerBase extends CommandController<FightModel> {
  protected fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
