/**
 * WalletController — the `wallet` verb: manage your payment credential. Bare
 * `wallet` shows the active account; `wallet use <corpo>` switches it (the
 * implant routes a default `pay` from there); `wallet freeze <card>` reports
 * a card lost (freeze + reissue, account untouched).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";

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
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        active
          ? Mml.compose`Your wallet is set to your ${corpo ?? "bank"} account.`
          : Mml.compose`Your wallet has no active account yet.`
      )
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
