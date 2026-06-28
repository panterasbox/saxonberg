/**
 * BankController — the `bank` verb: dispatch-on-subcommand over the player's
 * branch operations. Bare `bank` reads your balance; the subcommands are
 * `open`, `deposit <coins>`, `withdraw <amount>`, `transfer <amount> to
 * <who>`, `balance`. One controller, one verb — the `ChatController`/
 * subcommand precedent, not a verb-per-action.
 *
 * Accounts resolve by identity + branch context (no number typed); the actor
 * is the context-derived author throughout.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi, Money } from "../../../api/banking";
import { CorpoApi } from "../../../api/corpo";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Bank } from "../../../lib/banking/Bank";

const TOPIC = "world.narration.action";

interface BankModel extends CommandModel {
  coins?: MqlOneResult;
  amount?: string;
  recipient?: MqlOneResult;
}

export default class BankController extends BankingControllerBase<BankModel> {
  async execute(model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-bank-here", detail: "bank" });
      return;
    }
    switch (model.subcommand) {
      case "open":
        return this.open(bank, context);
      case "deposit":
        return this.deposit(bank, model, context);
      case "withdraw":
        return this.withdraw(bank, model, context);
      case "transfer":
        return this.transfer(bank, model, context);
      // bare `bank` and `bank balance` both read the balance
      case undefined:
      case "balance":
        return this.balance(bank, context);
      default:
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Unknown bank action: ${model.subcommand}.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand });
    }
  }

  private async open(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    await BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey());
    const corpo = CorpoApi.getCorpo(bank.getCorpoKey());
    const house = corpo ? corpo.label : "the bank";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open an account with ${house}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} opens an account.`)
      .send();
  }

  private async balance(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const accountId = await BankingApi.myAccountAt(bank.getBankPath());
    if (!accountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "balance" });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your balance is ${BankingApi.balanceOf(accountId).render()}.`)
      .send();
  }

  private async deposit(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const coins = model.coins?.stuff;
    if (!coins || !MixinApi.isGlobbable(coins)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have any '${model.coins?.raw ?? ""}' to deposit.`)
        .send();
      context.note({ kind: "empty-result", field: "coins", query: model.coins?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.deposit(bank, coins);
    } catch (err) {
      return this.declineScene(context, "deposit-failed", err, "coins");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You deposit ${Mml.item(coins)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a deposit.`)
      .send();
  }

  private async withdraw(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    try {
      await BankingApi.withdraw(bank, Money.of(minor));
    } catch (err) {
      return this.declineScene(context, "withdraw-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You withdraw ${Money.of(minor).render()} in cash.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a withdrawal.`)
      .send();
  }

  private async transfer(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    const payee = model.recipient?.stuff;
    const payeeKey = payee?.getTemplatePath() ?? null;
    if (!payeeKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one called '${model.recipient?.raw ?? ""}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "recipient", query: model.recipient?.raw ?? "" });
      return;
    }
    const fromAccount = await BankingApi.myAccountAt(bank.getBankPath());
    const toAccount = await BankingApi.primaryAccountIdOf(payeeKey);
    if (!fromAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "transfer" });
      return;
    }
    if (!toAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.name(payee!)} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.transfer(fromAccount, toAccount, Money.of(minor));
    } catch (err) {
      return this.declineScene(context, "transfer-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You transfer ${Money.of(minor).render()} to ${Mml.name(payee!)}.`)
      .send();
  }

  private badAmount(context: CommandContext, raw: string | undefined): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Name a whole amount.`)
      .send();
    context.note({ kind: "controller-rejected", reason: "bad-amount", detail: raw ?? "" });
  }

  private declineScene(
    context: CommandContext,
    reason: string,
    err: unknown,
    field?: string
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: field ?? "" });
  }
}
