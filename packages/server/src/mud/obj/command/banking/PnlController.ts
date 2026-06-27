/**
 * PnlController — `pnl` (read the venue's profit-and-loss).
 *
 * A categorized read of the present venue's ledger: the flows (sales, cogs,
 * wages, subsidy, tax) and a running balance that sits red by design — a
 * count, never a worth-assertion (Law 1).
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

export default class PnlController extends BankController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const venuePath = context.location?.getTemplatePath() ?? "";
    const account = await BankingApi.primaryAccountIdOf(venuePath);
    if (!account) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no house account here to report on.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "pnl" });
      return;
    }
    const pnl = await BankingApi.profitAndLoss(account);
    const lines = Object.entries(pnl.lines)
      .map(([cat, net]) => `  ${cat}: ${Money.of(net as number).render()}`)
      .join("\n");
    const body =
      `P&L:\n${lines || "  (no activity)"}\n` +
      `  running balance: ${Money.of(pnl.balance).render()}`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
