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
 * book) is paid what it says you owe, never an amount you
 * type: the holder pays its bills (`Payable.payBillsBy`, controller-liquidity
 * W7c) — each to the venue it names, as you, in its order, the first that
 * cannot be paid stopping the rest — and this words what was paid and what
 * was not.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import type { Charge, SettlementMethod } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Payable, PaidBill, PayBillsRefusal } from "../../../../lib/banking/Payable";

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

    // ⭐ A recipient that holds your bills is paid what it says.
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
        .toSelf(Mml.compose`${this.refusalWords(err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "pay-refused", detail: model.amount });
    }
  }

  /**
   * ⭐ Pay every bill `holder` keeps for the giver — the holder pays them
   * (`Payable.payBillsBy`, controller-liquidity W7c); this words it.
   */
  private async payBills(
    holder: Stuff & Payable,
    model: PayModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const stated = model.amount === undefined || model.amount.trim() === "" ? null : Number(model.amount);
    const out = await holder.payBillsBy(giver, stated);
    if (!out.ok) {
      this.refuse(context, TOPIC, PayController.billsRefusal(out, holder, model.recipient.raw), out.reason,
        out.reason === "bill-unpaid" ? out.facts.stuck.reason : model.amount ?? model.recipient.raw);
      if (out.reason === "bill-unpaid" && out.facts.paid.length > 0) {
        MessageApi.scene(giver).topic(TOPIC).toPeers(Mml.compose`${Mml.actor(giver)} pays at ${Mml.thing(holder)}.`).send();
      }
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pay ${PayController.paidLine(out.facts.paid)}. Nothing more is owed at ${holder.getPresentation()}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} pays at ${Mml.thing(holder)}.`)
      .send();
  }

  /** The bills paid, as one list. */
  protected static paidLine(paid: readonly PaidBill[]): string {
    const currency = BankingApi.compactCurrency();
    return paid.map((p) => `${Money.of(p.bill.amountMinor, currency).render()} ${p.bill.reason} ${p.tail}`).join("; ");
  }

  /** Why paying here stopped, in words. */
  protected static billsRefusal(r: PayBillsRefusal, holder: Stuff, raw: string): string {
    const where = holder.getPresentation();
    switch (r.reason) {
      case "amount-at-payable":
        return `${where} takes what is owed, not a sum you name — \`pay ${raw}\`.`;
      case "nothing-owed":
        return `You owe nothing at ${where}.`;
      case "bill-unpaid": {
        const currency = BankingApi.compactCurrency();
        const rest = r.facts.owed.map((b) => `${Money.of(b.amountMinor, currency).render()} ${b.reason}`);
        const before = r.facts.paid.length > 0 ? `You pay ${PayController.paidLine(r.facts.paid)}. ` : "";
        return `${before}You cannot cover ${Money.of(r.facts.stuck.amountMinor, currency).render()} ${r.facts.stuck.reason}; still owed: ${rest.join("; ")}.`;
      }
      default: {
        const unworded: never = r;
        throw new Error(`PayController: no words for ${String(unworded)}`);
      }
    }
  }
}
