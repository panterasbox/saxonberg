/**
 * TabController — `tab [settle|skip]` (run a tab at the venue).
 *
 * The tab is the *house's* receivable: this verb resolves the establishment
 * the actor is in (its `TabMixin` Location) and acts against it. `tab` shows
 * what's owed; `tab settle` clears it (by credential); `tab skip` walks out
 * — priced by a regard hit + loss of the privilege, not prevented. Accrual
 * happens when you order on a tab (the bar loop); a tab is recognition-gated
 * — a privilege of being known to the present bartender.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { ContainmentApi } from "../../../api/containment";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Tab } from "../../../lib/banking/Tab";

const TOPIC = "world.narration.action";

interface TabModel extends CommandModel {
  action?: string;
}

export default class TabController extends BankController<TabModel> {
  async execute(model: TabModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const venue = this.resolveVenue(context);
    if (!venue) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no tab to run here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue", detail: "tab" });
      return;
    }
    const patronKey = giver.getTemplatePath() ?? "";
    const owed = venue.getTabBalance(patronKey);

    const action = (model.action ?? "").toLowerCase();
    if (action === "settle") {
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
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You settle your tab of ${owed.render()}.`)
        .send();
      return;
    }

    if (action === "skip") {
      const creditor = this.presentBartender(context);
      if (creditor) venue.skipTab(giver, creditor);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You walk out on a tab of ${owed.render()}. That won't be forgotten.`)
        .toPeers(Mml.compose`${Mml.name(giver)} slips out without settling up.`)
        .send();
      return;
    }

    // show
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        owed.isZero()
          ? Mml.compose`You don't have a tab running.`
          : Mml.compose`Your tab stands at ${owed.render()}.`
      )
      .send();
  }

  /** The establishment the actor is in (a TabMixin Location), or null. */
  private resolveVenue(context: CommandContext): (Stuff & Tab) | null {
    const loc = context.location;
    if (loc && MixinApi.isTab(loc)) return loc as Stuff & Tab;
    return null;
  }

  /** A present bartender (a MakerMixin agent) — the house's representative. */
  private presentBartender(context: CommandContext): Stuff | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const c of ContainmentApi.getContents(loc)) {
      if (MixinApi.isMaker(c)) return c;
    }
    return null;
  }
}
