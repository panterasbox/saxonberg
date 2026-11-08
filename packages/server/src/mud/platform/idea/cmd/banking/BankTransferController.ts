/**
 * BankTransferController — `bank transfer <amount> to <who>`: pay another
 * account by name, from the giver's account at this branch to the payee's
 * primary account. No account number is ever typed.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankTransferController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    const payee = model.recipient?.stuff;
    const payeeKey = payee?.getIdentityPath() ?? null;
    if (!payee || !payeeKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one called '${model.recipient?.raw ?? ""}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "recipient", query: model.recipient?.raw ?? "" });
      return;
    }
    const fromAccount = await this.accountHere(bank, context, "transfer");
    if (!fromAccount) return;
    const toAccount = await BankingApi.primaryAccountIdOf(payeeKey);
    if (!toAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(payee)} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.transfer(fromAccount, toAccount, Money.of(minor, BankingApi.compactCurrency()));
    } catch (err) {
      return this.declineScene(context, "transfer-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You transfer ${Money.of(minor, BankingApi.compactCurrency()).render()} to ${Mml.actor(payee)}.`)
      .send();
  }
}
