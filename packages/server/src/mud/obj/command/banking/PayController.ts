/**
 * PayController — `pay <who> <amount> [--cash] [--from <corpo>]`.
 *
 * The uniform settlement verb for a **stated** transfer: the method is a
 * parameter (cash hands coin over; default credential routes on-ledger from
 * the implant's active account; `--from <corpo>` routes this one payment
 * from the matching account without disturbing the active setting). The
 * payee is addressed by identity. (A **presented** charge — a drink priced
 * by the bar — is built by the venue and settled through the same
 * `BankingApi.settle`; the bar wires that in the integration phase.)
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge, SettlementMethod } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface PayModel extends CommandModel {
  recipient: MqlOneResult;
  amount: string;
  cash?: boolean;
  from?: string;
}

export default class PayController extends BankController<PayModel> {
  async execute(model: PayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

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

    const payeeKey = payee.getTemplatePath();
    const payeeAccountId = payeeKey
      ? await BankingApi.primaryAccountIdOf(payeeKey)
      : null;

    // Resolve a --from override (a corpo/bank name) to one of the payer's
    // own accounts, routing this payment from it.
    let fromBankPath: string | undefined;
    if (model.from) {
      const mine = await BankingApi.accountsOf();
      const match = mine.find(
        (a) => a.corpoKey === model.from || a.bankPath.includes(model.from!)
      );
      if (!match) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You have no '${model.from}' account to pay from.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "no-such-account", detail: model.from });
        return;
      }
      fromBankPath = match.bankPath;
    }

    const method: SettlementMethod = model.cash
      ? { kind: "cash" }
      : { kind: "credential", ...(fromBankPath ? { fromBankPath } : {}) };

    if (method.kind === "credential" && !payeeAccountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.name(payee)} has no account to receive into. Try \`--cash\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient.raw });
      return;
    }

    const charge: Charge = {
      amount: Money.of(minor),
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
        .toSelf(Mml.compose`You pay ${Money.of(minor).render()} to ${Mml.name(payee)} ${how}.`)
        .toPeers(Mml.compose`${Mml.name(giver)} pays ${Mml.name(payee)}.`)
        .send();
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "pay-refused", detail: model.amount });
    }
  }
}
