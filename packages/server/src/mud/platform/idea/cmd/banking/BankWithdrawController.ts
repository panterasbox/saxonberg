/**
 * BankWithdrawController — `bank withdraw <amount>`: cash across the
 * counter, till-bounded (the refusal is the logic's).
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankWithdrawController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    try {
      await bank.withdraw(Money.of(minor, BankingApi.compactCurrency()));
    } catch (err) {
      return this.declineScene(context, "withdraw-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You withdraw ${Money.of(minor, BankingApi.compactCurrency()).render()} in cash.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} makes a withdrawal.`)
      .send();
  }
}
