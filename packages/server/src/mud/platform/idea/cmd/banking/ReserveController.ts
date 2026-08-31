/**
 * ReserveController — the `reserve` verb (developer/operator-gated): the
 * central-bank surface. `reserve mint <amount>` mints subsidy into the
 * present venue's account (a logged, visible, accountable faucet — covers
 * the deficit-as-target P&L); `reserve issue <amount>` draws physical
 * currency into the Governor's own hands; `reserve supply` reads the
 * money supply + the reconciliation audit.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

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
    // The house account keys on the BUSINESS operating here (its
    // `getAccountPath`), not on the room — the room path found nothing
    // once venue accounts moved to the Business (the libations live
    // drive: "There's no account here to float" at Dave's Bar).
    const roomPath = context.location?.getTemplatePath() ?? "";
    const business = roomPath ? EmploymentApi.businessAt(roomPath) : null;
    const venuePath = business?.getAccountPath() ?? roomPath;
    const account = await BankingApi.primaryAccountIdOf(venuePath);
    if (!account) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's no account here to float.`).send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "mint" });
      return;
    }
    await BankingApi.mint(account, Money.of(minor, Currency.compact()), "operator subsidy", "subsidy");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The reserve mints ${Money.of(minor, Currency.compact()).render()} of subsidy into the house account.`)
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
    await BankingApi.issueCash(giver, Money.of(minor, Currency.compact()), "float");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The reserve issues ${Money.of(minor, Currency.compact()).render()} in fresh currency into your hands.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} draws fresh currency from the reserve.`,
      )
      .send();
  }

  /**
   * One block per registered currency, from the COMPLETE audit — supply
   * against every reservoir, including vault float and coin captured in
   * `holder_snapshots`.
   *
   * ⚠ It never sums across currencies. There is no rate, so a combined total
   * would be a number nobody can justify — and asking for one is the first
   * step toward an exchange this design deliberately refuses.
   */
  private async supply(context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const r = await BankingApi.fullReconcile(c);
      const amount = (minor: number): string => Money.of(minor, c).render();
      // ⭐ The overdraft line is only printed when there IS one, and it is
      // the Governor's most important number when there is: `accountTotal`
      // NETS, so money paid out of an unfunded account cancels itself out of
      // the supply figure while remaining spendable in the payee's hands.
      // Without this line a world running entirely on unissued credit reads
      // as a world with no money at all — and reconciles clean.
      const overdraft =
        r.overdraft > 0
          ? `\n  of which overdraft: ${amount(r.overdraft)} (unissued credit)`
          : "";
      blocks.push(
        `Money supply (${record.plural}): ${amount(r.supply)}\n` +
          `  in accounts:       ${amount(r.accountTotal)}${overdraft}\n` +
          `  in circulation:    ${amount(r.circulatingCoin)}\n` +
          `  in bank vaults:    ${amount(r.vaultCoin)} (backed on-ledger)\n` +
          `  held offline:      ${amount(r.snapshotCoin)}\n` +
          `  cash in existence: ${amount(r.cashInExistence)}\n` +
          `  reconciliation: ${r.fullyBalanced ? "balanced" : "OUT OF BALANCE"}`,
      );
    }
    const body = blocks.join("\n\n");
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
