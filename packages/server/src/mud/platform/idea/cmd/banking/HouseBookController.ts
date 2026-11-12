/**
 * HouseBookController — `house book` — what the house owes and to whom
 * (economic bootstrap D11/D18): every open loan with its creditor and
 * balance (default revealed on the read), supplier terms payable per
 * supplier, and wages in arrears by worker. `finance` is credited for
 * reading it (over {@link HouseControllerBase}).
 */

import { HouseControllerBase } from "./HouseControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import type { Business } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";

const TOPIC = "act.deed";

export default class HouseBookController extends HouseControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseKept(context);
    if (!house) return;
    const key = house.getAccountPath();
    await ContractApi.reconcileLoans(key);
    const lines: string[] = [];
    const owed = (await ContractApi.instrumentsOf(key)).filter((l) => l.role === "owes");
    lines.push("Loans:");
    if (owed.length === 0) lines.push("  none");
    for (const l of owed) lines.push(`  ${l.words}`);
    const terms = await this.termsPayable(house);
    lines.push("Supplier terms payable:");
    if (terms.length === 0) lines.push("  none");
    for (const t of terms) lines.push(`  owed to ${t.supplier}: ${Money.of(t.minor, BankingApi.compactCurrency()).render()} on ${t.count} unsold`);
    const arrears = house.getPayrollArrears();
    lines.push("Wages in arrears:");
    if (arrears.length === 0) lines.push("  none");
    for (const a of arrears) {
      const who = StuffApi.findByTemplatePath(a.workerKey)?.getPresentation() ?? a.workerKey;
      lines.push(`  ${who}: ${Money.of(a.amountMinor, BankingApi.compactCurrency()).render()}`);
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join("\n")}`).send();
    this.creditFinance(giver);
  }

  /**
   * Supplier terms payable: Σ `askMinor` over unsold `terms` listings on
   * the house's counters, by consignor (economic bootstrap D11). Nothing
   * is owed until sale; a supplier may reclaim an unsold crate.
   */
  private async termsPayable(house: Stuff & Business): Promise<Array<{ supplier: string; minor: number; count: number }>> {
    const byConsignor = new Map<string, { minor: number; count: number }>();
    for (const path of house.getOperatingLocations()) {
      const counter = StuffApi.findByTemplatePath(path);
      if (!counter || !MixinApi.isConsignmentShelf(counter)) continue;
      for (const listing of counter.allListings()) {
        if (listing.basis !== "terms") continue;
        const cur = byConsignor.get(listing.consignorKey) ?? { minor: 0, count: 0 };
        cur.minor += listing.askMinor;
        cur.count += 1;
        byConsignor.set(listing.consignorKey, cur);
      }
    }
    return [...byConsignor].map(([consignorKey, v]) => ({
      supplier: StuffApi.findByTemplatePath(consignorKey)?.getPresentation() ?? consignorKey,
      ...v,
    }));
  }
}
