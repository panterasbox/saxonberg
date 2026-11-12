/**
 * HousePnlController — `house pnl` — the venue's profit-and-loss:
 * categorized flows, the running balance, and wages in arrears when there
 * are any (over {@link HouseControllerBase}).
 */

import { HouseControllerBase } from "./HouseControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class HousePnlController extends HouseControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseKept(context);
    if (!house) return;
    const account = await BankingApi.primaryAccountIdOf(house.getAccountPath());
    if (!account) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no house account here to report on.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "pnl" });
      return;
    }
    const pnl = await BankingApi.profitAndLoss(account);
    const lines = Object.entries(pnl.lines)
      .map(([cat, net]) => `  ${cat}: ${Money.of(net as number, BankingApi.compactCurrency()).render()}`)
      .join("\n");
    const arrears = house.getPayrollArrears().reduce((n, a) => n + a.amountMinor, 0);
    const body =
      `P&L:\n${lines || "  (no activity)"}\n` +
      `  running balance: ${Money.of(pnl.balance, BankingApi.compactCurrency()).render()}` +
      (arrears > 0 ? `\n  wages in arrears: ${Money.of(arrears, BankingApi.compactCurrency()).render()} (see \`house book\`)` : "");
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
