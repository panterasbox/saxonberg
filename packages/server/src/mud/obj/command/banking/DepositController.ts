/**
 * DepositController — `deposit <coins>` (cash → balance).
 *
 * Hands a coin stack from inventory across the counter: the coin enters the
 * vault and the balance is credited 1:1 (custodial). The account resolves by
 * identity + branch — no number typed.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface DepositModel extends CommandModel {
  coins: MqlOneResult;
}

export default class DepositController extends BankController<DepositModel> {
  async execute(model: DepositModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here to deposit at.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-bank-here",
        detail: "deposit",
      });
      return;
    }

    const coins = model.coins.stuff;
    if (!coins || !MixinApi.isGlobbable(coins)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have any '${model.coins.raw}' to deposit.`)
        .send();
      context.note({
        kind: "empty-result",
        field: "coins",
        query: model.coins.raw,
      });
      return;
    }

    try {
      await BankingApi.deposit(bank, coins);
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`That can't be deposited here. ${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "deposit-failed",
        detail: model.coins.raw,
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You deposit ${Mml.item(coins)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a deposit.`)
      .send();
  }
}
