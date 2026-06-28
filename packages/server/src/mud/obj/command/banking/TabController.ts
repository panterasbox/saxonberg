/**
 * TabController — the `tab` verb: run a tab at the venue. Bare `tab` shows
 * what's owed; `tab settle` clears it (by credential); `tab skip` walks out
 * — priced by a regard hit + loss of the privilege, not prevented. The tab
 * is the *house's* receivable: this verb resolves the establishment the
 * actor is in (its `TabMixin` Location) and acts against it.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";

const TOPIC = "world.narration.action";

export default class TabController extends BankingControllerBase<CommandModel> {
  async execute(model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const venue = this.resolveVenue(context);
    if (!venue) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no tab to run here.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue", detail: "tab" });
      return;
    }
    const patronKey = giver.getTemplatePath() ?? "";
    const owed = venue.getTabBalance(patronKey);

    switch (model.subcommand) {
      case "settle":
        return this.settle(venue, patronKey, owed, context);
      case "skip":
        return this.skip(venue, owed, context);
      case undefined:
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            owed.isZero()
              ? Mml.compose`You don't have a tab running.`
              : Mml.compose`Your tab stands at ${owed.render()}.`
          )
          .send();
        return;
      default:
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Unknown tab action: ${model.subcommand}.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand });
    }
  }

  private async settle(
    venue: Stuff & { clearTab(k: string): unknown },
    patronKey: string,
    owed: ReturnType<typeof BankingApi.balanceOf>,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    if (owed.isZero()) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You owe nothing.`).send();
      return;
    }
    const venueAccount = await BankingApi.primaryAccountIdOf(
      (venue as unknown as Stuff).getTemplatePath() ?? ""
    );
    if (!venueAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The house has no account to settle into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "tab" });
      return;
    }
    const charge: Charge = {
      amount: owed,
      reason: "settle tab",
      presented: true,
      payeeAccountId: venueAccount,
      category: "sales",
    };
    try {
      await BankingApi.settle(charge, { kind: "credential" });
      venue.clearTab(patronKey);
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "settle-failed", detail: "tab" });
      return;
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You settle your tab of ${owed.render()}.`).send();
  }

  private skip(
    venue: Stuff & { skipTab(p: Stuff, c: Stuff): void },
    owed: ReturnType<typeof BankingApi.balanceOf>,
    context: CommandContext
  ): void {
    const giver = context.commandGiver;
    const creditor = this.presentBartender(context);
    if (creditor) venue.skipTab(giver, creditor);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You walk out on a tab of ${owed.render()}. That won't be forgotten.`)
      .toPeers(Mml.compose`${Mml.name(giver)} slips out without settling up.`)
      .send();
  }
}
