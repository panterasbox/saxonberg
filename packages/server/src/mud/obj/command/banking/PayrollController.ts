/**
 * PayrollController — `payroll <worker> <amount>` (developer/employer-gated).
 *
 * Pays a wage from the present venue's account to a worker's account — the
 * P&L's labor line. *Who* is employed is authored (the bar's staff draw a
 * wage); this verb is the payment only.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface PayrollModel extends CommandModel {
  worker: MqlOneResult;
  amount: string;
}

export default class PayrollController extends BankController<PayrollModel> {
  async execute(model: PayrollModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Pay what wage?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount });
      return;
    }
    const worker = model.worker.stuff;
    const workerKey = worker?.getTemplatePath() ?? null;
    if (!workerKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no '${model.worker.raw}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "worker", query: model.worker.raw });
      return;
    }
    const venuePath = context.location?.getTemplatePath() ?? "";
    const employerAccount = await BankingApi.primaryAccountIdOf(venuePath);
    if (!employerAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no house account here to pay wages from.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "payroll" });
      return;
    }
    try {
      await BankingApi.payWage(employerAccount, workerKey, Money.of(minor));
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "wage-failed", detail: model.amount });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pay ${Mml.name(worker!)} a wage of ${Money.of(minor).render()}.`)
      .send();
  }
}
