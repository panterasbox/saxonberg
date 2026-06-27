/**
 * BalanceController — `balance` (read your balance at this branch).
 *
 * A Law-1 count read: reports the tally on the actor's account here. No
 * account number typed — the account resolves by identity + branch context.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

export default class BalanceController extends BankController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here to check a balance at.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-bank-here",
        detail: "balance",
      });
      return;
    }

    const accountId = await BankingApi.myAccountAt(bank.getBankPath());
    if (!accountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`open\`.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-account",
        detail: "balance",
      });
      return;
    }

    const balance = BankingApi.balanceOf(accountId);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your balance is ${balance.render()}.`)
      .send();
  }
}
