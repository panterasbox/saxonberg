/**
 * HouseController — the `house` verb (operator/owner-gated): the venue-owner
 * surface. `house pnl` reads the present venue's profit-and-loss; `house
 * payroll <worker> <amount>` pays a wage from the venue's account to a
 * worker (the P&L's labor line).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { Currency, BankingApi, Money } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface HouseModel extends CommandModel {
  worker?: MqlOneResult;
  amount?: string;
}

export default class HouseController extends BankingControllerBase<HouseModel> {
  async execute(model: HouseModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case "pnl":
        return this.pnl(context);
      case "payroll":
        return this.payroll(model, context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`house pnl\` or \`house payroll <worker> <amount>\`.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand ?? "" });
    }
  }

  /**
   * The house account owner-key: the Business operating here (its account
   * keys on the Business path, so it survives a venue move and matches the
   * order/wage flows), falling back to the giver's own proprietor-business
   * (running `house pnl` from elsewhere), then the raw venue path.
   */
  private houseOwnerKey(context: CommandContext): string {
    const venuePath = context.location?.getTemplatePath() ?? "";
    const here = venuePath ? EmploymentApi.businessAt(venuePath) : null;
    const mine = EmploymentApi.businessOfProprietor(context.commandGiver);
    return (here ?? mine)?.getAccountPath() ?? venuePath;
  }

  private async pnl(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const account = await BankingApi.primaryAccountIdOf(
      this.houseOwnerKey(context),
    );
    if (!account) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no house account here to report on.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "pnl" });
      return;
    }
    const pnl = await BankingApi.profitAndLoss(account);
    const lines = Object.entries(pnl.lines)
      .map(([cat, net]) => `  ${cat}: ${Money.of(net as number, Currency.compact()).render()}`)
      .join("\n");
    const body =
      `P&L:\n${lines || "  (no activity)"}\n` +
      `  running balance: ${Money.of(pnl.balance, Currency.compact()).render()}`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }

  private async payroll(model: HouseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Pay what wage?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    const worker = model.worker?.stuff;
    const workerKey = worker?.getTemplatePath() ?? null;
    if (!workerKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no '${model.worker?.raw ?? ""}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "worker", query: model.worker?.raw ?? "" });
      return;
    }
    const employerAccount = await BankingApi.primaryAccountIdOf(
      this.houseOwnerKey(context),
    );
    if (!employerAccount) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no house account here to pay wages from.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "payroll" });
      return;
    }
    try {
      await BankingApi.payWage(employerAccount, workerKey, Money.of(minor, Currency.compact()));
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({ kind: "controller-rejected", reason: "wage-failed", detail: model.amount ?? "" });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pay ${Mml.name(worker!)} a wage of ${Money.of(minor, Currency.compact()).render()}.`)
      .send();
  }
}
