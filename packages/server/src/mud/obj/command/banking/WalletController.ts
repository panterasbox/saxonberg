/**
 * WalletController — `wallet [<corpo>]` (switch the implant's active account).
 *
 * With no argument, reports the active routing account. Named with a corpo
 * key, switches the implant wallet's active account to the owner's account
 * with that affiliation — persists, and changes which corpo bank routes a
 * default `pay`.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface WalletModel extends CommandModel {
  corpo?: string;
}

export default class WalletController extends BankController<WalletModel> {
  async execute(model: WalletModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const credential = BankingApi.activeCredential();
    if (!credential) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no payment implant.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-credential", detail: "wallet" });
      return;
    }

    if (!model.corpo) {
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
      return;
    }

    const mine = await BankingApi.accountsOf();
    const match = mine.find(
      (a) => a.corpoKey === model.corpo || a.bankPath.includes(model.corpo!)
    );
    if (!match) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no '${model.corpo}' account.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-such-account", detail: model.corpo });
      return;
    }

    try {
      BankingApi.setActiveAccount(credential, match.accountId);
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "switch-failed", detail: model.corpo });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your wallet now pays from your ${model.corpo} account.`)
      .send();
  }
}
