/**
 * FreezeController — `freeze <card>` (report a card lost).
 *
 * Revokes the credential (sets it frozen — the account and balance are
 * untouched) and issues a fresh replacement card linked to the same
 * account, with the same cap. A lost card is thus a real-but-recoverable
 * stake, pointedly unlike cash.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface FreezeModel extends CommandModel {
  card: MqlOneResult;
}

export default class FreezeController extends BankController<FreezeModel> {
  async execute(model: FreezeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const card = model.card.stuff;
    if (!card || !MixinApi.isPaymentCredential(card)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no '${model.card.raw}' card to report.`)
        .send();
      context.note({ kind: "empty-result", field: "card", query: model.card.raw });
      return;
    }

    const account = card.getActiveAccount();
    const cap = card.getSpendCap();
    BankingApi.freezeCredential(card);
    if (account) {
      await BankingApi.issueCard(account, cap);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You report ${Mml.item(card)} lost. It's frozen; a fresh card is issued.`
      )
      .send();
  }
}
