/**
 * BankBalanceController — bare `bank` and `bank balance`: the giver's
 * balance at this branch.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankBalanceController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, _model: BankModel, context: CommandContext): Promise<void> {
    const accountId = await this.accountHere(bank, context, "balance");
    if (!accountId) return;
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your balance is ${BankingApi.balanceOf(accountId).render()}.`)
      .send();
  }
}
