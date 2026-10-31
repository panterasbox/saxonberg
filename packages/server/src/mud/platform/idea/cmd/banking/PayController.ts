/**
 * PayController — `pay <who> <amount> [--cash] [--from <corpo>]`, and
 * `pay <it>` at something that holds your bills.
 *
 * The uniform settlement verb for a **stated** transfer: the method is a
 * parameter (cash hands coin over; default credential routes on-ledger from
 * the implant's active account; `--from <corpo>` routes this one payment
 * from the matching account without disturbing the active setting). The
 * payee is addressed by identity. (A **presented** charge — a drink priced
 * by the bar — is built by the venue and settled through the same
 * `BankingApi.settle`; the bar wires that in the integration phase.)
 *
 * ⭐ **A recipient that holds your bills** (`Payable` — the harbor office's
 * book, harbors P13) is paid what it says you owe, never an amount you
 * type: each bill settles to the venue it names through
 * `EmploymentApi.settleSale` as you (credential, then cash), in its order,
 * and the first that cannot be paid stops the rest — you are told what was
 * paid and what was not.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import type { Charge, SettlementMethod } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { EmploymentApi } from "../../../../api/employment";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Payable } from "../../../../lib/banking/Payable";

const TOPIC = "act.deed";

interface PayModel extends CommandModel {
  recipient: MqlOneResult;
  amount?: string;
  cash?: boolean;
  from?: string;
}

export default class PayController extends BankingControllerBase<PayModel> {
  async execute(model: PayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐ A recipient that holds your bills is paid what it says (P13).
    const held = model.recipient.stuff;
    if (held && MixinApi.isPayable(held)) {
      await this.payBills(held, model, context);
      return;
    }

    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Pay how much? Name a whole amount.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount });
      return;
    }

    const payee = model.recipient.stuff;
    if (!payee) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one called '${model.recipient.raw}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "recipient", query: model.recipient.raw });
      return;
    }

    const payeeKey = payee.getIdentityPath();
    const payeeAccountId = payeeKey
      ? await BankingApi.primaryAccountIdOf(payeeKey)
      : null;

    // Resolve a --from override (a corpo/bank name) to one of the payer's
    // own accounts, routing this payment from it.
    let fromBank: string | undefined;
    if (model.from) {
      const mine = await BankingApi.accountsOf();
      const match = mine.find(
        (a) => a.corpoKey === model.from || a.bank === model.from
      );
      if (!match) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You have no '${model.from}' account to pay from.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "no-such-account", detail: model.from });
        return;
      }
      fromBank = match.bank;
    }

    const method: SettlementMethod = model.cash
      ? { kind: "cash" }
      : { kind: "credential", ...(fromBank ? { fromBank } : {}) };

    if (method.kind === "credential" && !payeeAccountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(payee)} has no account to receive into. Try \`--cash\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient.raw });
      return;
    }

    const charge: Charge = {
      amount: Money.of(minor, BankingApi.compactCurrency()),
      reason: `pay ${payee.getPresentation()}`,
      presented: false,
      payeeAccountId: payeeAccountId ?? "",
      category: "transfer",
      ...(MixinApi.isContainer(payee) ? { payeeContainer: payee } : {}),
    };

    try {
      const receipt = await BankingApi.settle(charge, method);
      const how =
        receipt.method === "cash"
          ? "in cash"
          : receipt.corpoKey
            ? `from your ${receipt.corpoKey} account`
            : "from your account";
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You pay ${Money.of(minor, BankingApi.compactCurrency()).render()} to ${Mml.actor(payee)} ${how}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} pays ${Mml.actor(payee)}.`)
        .send();
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "pay-refused", detail: model.amount });
    }
  }

  /**
   * ⭐ Pay every bill `holder` keeps for the giver, in order, stopping at
   * the first that fails (P13). A stated amount is refused: what is owed
   * is the holder's to say.
   */
  private async payBills(
    holder: Stuff & Payable,
    model: PayModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const tell = (text: string): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${text}`).send();
    };
    const where = holder.getPresentation();
    if (model.amount !== undefined && model.amount !== "") {
      tell(`${where} takes what is owed, not a sum you name — \`pay ${model.recipient.raw}\`.`);
      context.note({ kind: "controller-rejected", reason: "amount-at-payable", detail: model.amount });
      return;
    }
    const bills = (await holder.billsFor(giver)).filter((b) => b.amountMinor > 0);
    if (bills.length === 0) {
      tell(`You owe nothing at ${where}.`);
      context.note({ kind: "controller-rejected", reason: "nothing-owed", detail: model.recipient.raw });
      return;
    }
    const currency = BankingApi.compactCurrency();
    const paid: string[] = [];
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i]!;
      const money = Money.of(bill.amountMinor, currency).render();
      const settled = await EmploymentApi.settleSale(bill.to, bill.amountMinor, 0, bill.reason);
      if (settled === null) {
        const rest = bills.slice(i).map((b) => `${Money.of(b.amountMinor, currency).render()} ${b.reason}`);
        const before = paid.length > 0 ? `You pay ${paid.join("; ")}. ` : "";
        tell(`${before}You cannot cover ${money} ${bill.reason}; still owed: ${rest.join("; ")}.`);
        context.note({ kind: "controller-rejected", reason: "bill-unpaid", detail: bill.reason });
        if (paid.length > 0) {
          MessageApi.scene(giver).topic(TOPIC).toPeers(Mml.compose`${Mml.actor(giver)} pays at ${Mml.thing(holder)}.`).send();
        }
        return;
      }
      await holder.onPaid(bill, giver);
      paid.push(`${money} ${bill.reason} ${settled.tail}`);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pay ${paid.join("; ")}. Nothing more is owed at ${where}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} pays at ${Mml.thing(holder)}.`)
      .send();
  }
}
