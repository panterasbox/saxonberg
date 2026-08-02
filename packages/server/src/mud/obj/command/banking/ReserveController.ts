/**
 * ReserveController — the `reserve` verb (developer/operator-gated): the
 * central-bank surface. `reserve mint <amount>` mints subsidy into the
 * present venue's account (a logged, visible, accountable faucet — covers
 * the deficit-as-target P&L); `reserve issue <amount>` draws physical
 * currency into the Governor's own hands; `reserve supply` reads the
 * money supply + the reconciliation audit.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
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
      case "issue":
        return this.issue(model, context);
      case "supply":
        return this.supply(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`reserve mint <amount>\`, \`reserve issue <amount>\` or \`reserve supply\`.`)
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

  /**
   * Draw physical currency into the Governor's own hands.
   *
   * The counterpart `reserve mint` was missing: mint credits a **venue
   * account**, so the central bank could subsidise a business but could
   * not put a coin in anybody's pocket. The only other production caller
   * of `issueCash` is char-gen's 20-credit onboarding stipend, which
   * meant currency had exactly one way into the world and no authority
   * could add another — a hole in the monetary story, not just a gap in
   * the verb table.
   *
   * Into the Governor's OWN hands, deliberately. A `--to <player>` form
   * would be a transfer wearing a mint's clothes; issuing and then
   * handing over is two acts, and the second one is `give`, which
   * already exists and already leaves its own trail.
   *
   * Rides `BankingApi.issueCash`, the conserved supply faucet — the coins
   * are denominated, massed, encumbrance-bearing, and the mint is logged
   * against the central bank exactly as the audit expects.
   */
  private async issue(
    model: ReserveModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Issue how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    if (!MixinApi.isContainer(giver)) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You have nowhere to put it.`).send();
      context.note({ kind: "controller-rejected", reason: "no-hands", detail: "issue" });
      return;
    }
    await BankingApi.issueCash(giver, Money.of(minor), "float");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The reserve issues ${Money.of(minor).render()} in fresh currency into your hands.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} draws fresh currency from the reserve.`,
      )
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
