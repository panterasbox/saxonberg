/**
 * TransferController — `transfer <amount> to <who>` (balance → balance).
 *
 * Identity-addressed: the recipient is resolved to *their* primary account
 * (receive-by-identity), the source is the actor's account at this branch.
 * The actor may only transfer from their own account (enforced in the Api).
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface TransferModel extends CommandModel {
  amount: string;
  recipient: MqlOneResult;
}

export default class TransferController extends BankController<TransferModel> {
  async execute(model: TransferModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here to transfer from.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-bank-here",
        detail: "transfer",
      });
      return;
    }

    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Transfer how much? Name a whole amount.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "bad-amount",
        detail: model.amount,
      });
      return;
    }

    const payee = model.recipient.stuff;
    const payeeKey = payee?.getTemplatePath() ?? null;
    if (!payeeKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one called '${model.recipient.raw}' to pay.`)
        .send();
      context.note({
        kind: "empty-result",
        field: "recipient",
        query: model.recipient.raw,
      });
      return;
    }

    const fromAccount = await BankingApi.myAccountAt(bank.getBankPath());
    const toAccount = await BankingApi.primaryAccountIdOf(payeeKey);
    if (!fromAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "transfer" });
      return;
    }
    if (!toAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.name(payee!)} has no account to receive into.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "payee-no-account",
        detail: model.recipient.raw,
      });
      return;
    }

    try {
      await BankingApi.transfer(fromAccount, toAccount, Money.of(minor));
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "transfer-refused",
        detail: model.amount,
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You transfer ${Money.of(minor).render()} to ${Mml.name(payee!)}.`)
      .send();
  }
}
