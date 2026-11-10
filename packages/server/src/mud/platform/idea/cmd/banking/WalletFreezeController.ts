/**
 * WalletFreezeController — `wallet freeze <card>` — reports a card lost
 * (freeze + reissue, account untouched) (over {@link
 * BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface WalletFreezeModel extends CommandModel {
  card?: MqlOneResult;
}

export default class WalletFreezeController extends BankingControllerBase<WalletFreezeModel> {
  async execute(model: WalletFreezeModel, context: CommandContext): Promise<void> {
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
