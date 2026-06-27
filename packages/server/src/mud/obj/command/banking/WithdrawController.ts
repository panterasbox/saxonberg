/**
 * WithdrawController — `withdraw <amount>` (balance → cash).
 *
 * Debits the actor's account here and hands over coin, bounded by the
 * branch's actual till liquidity (a branch can run low on coin — a diegetic
 * limit, not an arbitrary gate).
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface WithdrawModel extends CommandModel {
  amount: string;
}

export default class WithdrawController extends BankController<WithdrawModel> {
  async execute(model: WithdrawModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here to withdraw from.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-bank-here",
        detail: "withdraw",
      });
      return;
    }

    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Withdraw how much? Name a whole amount.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "bad-amount",
        detail: model.amount,
      });
      return;
    }

    try {
      await BankingApi.withdraw(bank, Money.of(minor));
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "withdraw-refused",
        detail: model.amount,
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You withdraw ${Money.of(minor).render()} in cash.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a withdrawal.`)
      .send();
  }
}
