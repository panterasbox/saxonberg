/**
 * HousePayrollController — `house payroll <worker> <amount>` — pays a
 * wage from the house account: arrears first, a working-capital draw
 * where the house's ledger has earned one, else a refusal on the book
 * with the reason (over {@link HouseControllerBase}).
 */

import { HouseControllerBase } from "./HouseControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { BankingApi, Money } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface HousePayrollModel extends CommandModel {
  worker?: MqlOneResult;
  amount?: string;
}

export default class HousePayrollController extends HouseControllerBase<HousePayrollModel> {
  async execute(model: HousePayrollModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Pay what wage?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    const worker = model.worker?.stuff;
    const workerKey = worker?.getIdentityPath() ?? null;
    if (!workerKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no '${model.worker?.raw ?? ""}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "worker", query: model.worker?.raw ?? "" });
      return;
    }
    const house = await this.houseKept(context);
    if (!house) return;
    // ⭐ The one way a house pays (economic bootstrap D18): arrears first,
    // a working-capital draw where the house's ledger has earned one, else
    // a refusal on the book with the reason.
    const paid = await EmploymentApi.payHouseWage(house, workerKey, minor);
    if (!paid.ok) {
      const currency = BankingApi.compactCurrency();
      const account = await BankingApi.primaryAccountIdOf(house.getAccountPath());
      const held = account ? BankingApi.balanceOf(account).minor : 0;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          paid.reason === "no-account"
            ? Mml.compose`${Mml.actor(worker!)} has no account to be paid into.`
            : Mml.compose`Payroll refused: the house holds ${Money.of(held, currency).render()} and owes ${Mml.actor(worker!)} ${Money.of(minor, currency).render()}; no working-capital line — ${paid.detail}. The wage stands on the book.`,
        )
        .send();
      context.note({ kind: "controller-rejected", reason: paid.reason, detail: paid.detail });
      return;
    }
    const drew = paid.drewMinor > 0 ? ` (the house drew ${Money.of(paid.drewMinor, BankingApi.compactCurrency()).render()} of working capital to meet it)` : "";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pay ${Mml.actor(worker!)} a wage of ${Money.of(paid.paidMinor, BankingApi.compactCurrency()).render()}${drew}.`)
      .send();
  }
}
