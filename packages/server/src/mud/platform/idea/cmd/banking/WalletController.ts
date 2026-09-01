/**
 * WalletController — the `wallet` verb: manage your payment credential. Bare
 * `wallet` shows the active account; `wallet use <corpo>` switches it (the
 * implant routes a default `pay` from there); `wallet freeze <card>` reports
 * a card lost (freeze + reissue, account untouched).
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
import type { MqlOneResult } from "../../../../api/mql";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { EmploymentApi } from "../../../../api/employment";

const TOPIC = "act.deed";

interface WalletModel extends CommandModel {
  corpo?: string;
  card?: MqlOneResult;
}

export default class WalletController extends BankingControllerBase<WalletModel> {
  async execute(model: WalletModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case "use":
        return this.use(model, context);
      case "freeze":
        return this.freeze(model, context);
      case undefined:
        return this.show(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Unknown wallet action: ${model.subcommand}.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand });
    }
  }

  private async show(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const credential = BankingApi.activeCredential();
    if (!credential) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You have no payment implant.`).send();
      context.note({ kind: "controller-rejected", reason: "no-credential", detail: "wallet" });
      return;
    }
    const active = credential.getActiveAccount();
    const corpo = active ? await BankingApi.corpoKeyOf(active) : null;
    const ownerKey = active ? await BankingApi.ownerKeyOf(active) : null;
    const house =
      ownerKey && ownerKey !== giver.getIdentityPath()
        ? BankingControllerBase.businessNamed(ownerKey)
        : null;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        !active
          ? Mml.compose`Your wallet has no active account yet.`
          : house
            ? Mml.compose`Your wallet is set to the house account of ${house}.`
            : Mml.compose`Your wallet is set to your ${corpo ?? "bank"} account.`
      )
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
    const candidates = await EmploymentApi.buysFor(giver);
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
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
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

  private async use(model: WalletModel, context: CommandContext): Promise<void> {
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
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "switch-failed", detail: corpo });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your wallet now pays from your ${corpo} account.`)
      .send();
  }

  private async freeze(model: WalletModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const card = model.card?.stuff;
    const pay =
      card && MixinApi.isCredentialWallet(card)
        ? card.getCredential("payment")
        : undefined;
    if (!card || !pay) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no '${model.card?.raw ?? ""}' card to report.`)
        .send();
      context.note({ kind: "empty-result", field: "card", query: model.card?.raw ?? "" });
      return;
    }
    const account = pay.getActiveAccount();
    const cap = pay.getSpendCap();
    pay.setFrozen(true);
    if (account) await BankingApi.issueCard(account, cap);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You report ${Mml.thing(card)} lost. It's frozen; a fresh card is issued.`)
      .send();
  }
}
