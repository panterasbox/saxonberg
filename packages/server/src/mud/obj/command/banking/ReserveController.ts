/**
 * ReserveController — the `reserve` verb (developer/operator-gated): the
 * central-bank surface. `reserve mint <amount>` mints subsidy into the
 * present venue's account (a logged, visible, accountable faucet — covers
 * the deficit-as-target P&L); `reserve supply` reads the money supply +
 * the reconciliation audit.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface ReserveModel extends CommandModel {
  amount?: string;
}

export default class ReserveController extends BankingControllerBase<ReserveModel> {
  async execute(model: ReserveModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case "mint":
        return this.mint(model, context);
      case "supply":
        return this.supply(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`reserve mint <amount>\` or \`reserve supply\`.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand ?? "" });
    }
  }

  private async mint(model: ReserveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Mint how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    const venuePath = context.location?.getTemplatePath() ?? "";
    const account = await BankingApi.primaryAccountIdOf(venuePath);
    if (!account) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no account here to float.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "mint" });
      return;
    }
    await BankingApi.mint(account, Money.of(minor), "operator subsidy", "subsidy");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The reserve mints ${Money.of(minor).render()} of subsidy into the house account.`)
      .send();
  }

  private supply(context: CommandContext): void {
    const r = BankingApi.reconcile();
    const body =
      `Money supply: ${Money.of(r.supply).render()}\n` +
      `  in accounts:  ${Money.of(r.accountTotal).render()}\n` +
      `  in circulation: ${Money.of(r.circulatingCoin).render()}\n` +
      `  cash in existence: ${Money.of(r.cashInExistence).render()}\n` +
      `  reconciliation: ${r.balanced ? "balanced" : "OUT OF BALANCE"}`;
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
