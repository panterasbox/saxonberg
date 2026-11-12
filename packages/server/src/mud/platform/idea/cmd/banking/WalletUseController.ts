/**
 * WalletUseController — `wallet use <corpo>` — switches the active
 * account (the implant routes a default `pay` from there) (over {@link
 * BankingControllerBase}).
 *
 * ⭐ **`wallet use house`** — the one rule that makes a business's buying
 * real: *the wallet's active account is the principal you trade as.* A
 * holder of a purchasing position (or the proprietor) links the business's
 * operating account into their own credential and makes it active; while
 * it is, `buy` settles from it and stamps the chattel to the business,
 * `consign` consigns as the business. Authority is the position's —
 * checked here via `EmploymentApi.buysFor` — never a screen's. Leaving the
 * position unlinks it (`fire`/`quit`).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { EmploymentApi } from "../../../../api/employment";

const TOPIC = "act.deed";

interface WalletUseModel extends CommandModel {
  corpo?: string;
}

export default class WalletUseController extends BankingControllerBase<WalletUseModel> {
  async execute(model: WalletUseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const credential = BankingApi.activeCredential();
    if (!credential) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You have no payment implant.`).send();
      context.note({ kind: "controller-rejected", reason: "no-credential", detail: "wallet" });
      return;
    }
    const corpo = model.corpo;
    if (corpo === "house") return this.useHouse(context);
    const mine = await BankingApi.accountsOf();
    const match = mine.find((a) => a.corpoKey === corpo || a.bank === corpo);
    if (!corpo || !match) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You have no '${corpo ?? ""}' account.`).send();
      context.note({ kind: "controller-rejected", reason: "no-such-account", detail: corpo ?? "" });
      return;
    }
    try {
      credential.setActiveAccount(match.accountId);
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${this.refusalWords(err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "switch-failed", detail: corpo });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your wallet now pays from your ${corpo} account.`)
      .send();
  }

  /**
   * `wallet use house` — link + activate the operating account of the
   * business the giver buys for: the one operating **here** if they buy
   * for it, else their single one, else refuse naming the choices.
   */
  private async useHouse(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const credential = BankingApi.activeCredential();
    if (!credential) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You have no payment implant.`).send();
      context.note({ kind: "controller-rejected", reason: "no-credential", detail: "wallet" });
      return;
    }
    const candidates = MixinApi.isEmployed(giver) ? await giver.buysFor() : [];
    if (candidates.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't buy for any house.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "not-staff", detail: "house" });
      return;
    }
    const herePath = context.location?.getTemplatePath() ?? "";
    const here = herePath ? EmploymentApi.businessAt(herePath) : null;
    const business =
      (here && candidates.find((b) => b === here)) ??
      (candidates.length === 1 ? candidates[0] : undefined);
    if (!business) {
      const names = candidates.map((b) => b.getPresentation()).join(", ");
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Which house? You buy for ${names} — stand in one of them.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "ambiguous-house", detail: names });
      return;
    }
    let account: string;
    try {
      account = await EmploymentApi.operatingAccountOf(business);
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${this.refusalWords(err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "house" });
      return;
    }
    credential.linkAccount(account);
    credential.setActiveAccount(account);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your wallet now pays from the house account of ${business.getPresentation()}.`)
      .send();
  }
}
