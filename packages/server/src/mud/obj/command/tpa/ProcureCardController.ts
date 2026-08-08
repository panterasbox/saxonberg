/**
 * ProcureCardController — the `procure card` verb. Obtain a fresh Teleport
 * Authority `TravelCard` from the terminal clerk, free of charge.
 *
 * The verb is afforded by a present clerk (`TicketClerk.commandContributions`),
 * so the clerk is `context.commandSource` (the `RegisterController` precedent).
 * The card is an **instrument, not a fare** — no `Money`, no banking, no fee
 * gate. It clones a bare `TravelCard` (born with a floored `travel` record
 * that satisfies the instrument gate) into the giver's inventory.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { TpaPaths } from "../../../domain/common/tpa/paths";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Containable } from "../../../lib/spatial/Containable";

export default class ProcureCardController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      return this.fail(
        context,
        "you have nowhere to keep a card",
        "no-inventory",
      );
    }
    const clerk = context.commandSource;
    const card = await StuffApi.clone<Stuff & Containable>(TpaPaths.travelCard);
    ContainmentApi.move(card, giver);

    const who = clerk ? Mml.actor(clerk) : Mml.fromMarkup("the clerk");
    MessageApi.scene(giver)
      .topic("act.deed")
      .toSelf(
        Mml.compose`${who} slides a fresh Teleport Authority travel card across the counter. "On the house. Mind you don't lose this one."`,
      )
      .toPeers(
        Mml.compose`${who} hands ${Mml.actor(giver)} a fresh travel card.`,
      )
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = "unspecified",
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic("act.deed")
      .toSelf(Mml.fromMarkup(`\n${detail}\n`))
      .send();
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
