/**
 * ReserveSupplyController — `reserve supply` — the money supply and the
 * conservation audit, one block per registered currency, from the
 * COMPLETE audit — supply against every reservoir, including vault float
 * and coin captured in `holder_snapshots` (over {@link
 * BankingControllerBase}).
 *
 * ⚠ It never sums across currencies. There is no rate, so a combined total
 * would be a number nobody can justify — and asking for one is the first
 * step toward an exchange this design deliberately refuses.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class ReserveSupplyController extends BankingControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const r = await BankingApi.fullReconcile(c);
      const amount = (minor: number): string => Money.of(minor, c).render();
      // ⭐ The overdraft line is only printed when there IS one — and since
      // the floor (economic bootstrap D3) it is expected to read zero; a
      // non-zero line is a defect report, not a policy.
      const overdraft =
        r.overdraft > 0
          ? `\n  of which overdraft: ${amount(r.overdraft)} (unissued credit — THE FLOOR IS BREACHED)`
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
