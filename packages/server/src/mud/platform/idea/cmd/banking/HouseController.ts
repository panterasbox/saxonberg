/**
 * HouseController — the `house` verb: the house **app**. `house book`
 * reads what the house owes and to whom; `house pnl` reads the venue's
 * profit-and-loss; `house payroll <worker> <amount>` pays a wage from the
 * house account; `house roster` prints the chart.
 *
 * ⚠ `house par`, `house price` and `house stock` are the SHOPKEEPER's and
 * ship in `trade-shopkeeping` (`HouseShopController`), contributed as
 * `controller:` on those three stanzas of the shipped view — the
 * `house freight` shape. Every business has books, a payroll and a chart;
 * a par sheet, an ask and a stock rail are what a shop keeps.
 *
 * ⚠ **Gated on the SEAT, never the wizard axis.** `requiresWizard` is the
 * TypeScript code-trust axis and nothing else; venue authority comes from a
 * position held or the proprietorship (`resolveHouse`). A thief holding the
 * house tablet gets `house stock` (the sheet is what the screen shows) but
 * `wallet use house` and a house-stamped `buy` refuse them — money authority
 * is only ever the wallet's, and the wallet's is the position's.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { BankingApi, Money } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import type { Business } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";

const TOPIC = "act.deed";

interface HouseModel extends CommandModel {
  worker?: MqlOneResult;
  amount?: string;
}

export default class HouseController extends BankingControllerBase<HouseModel> {
  async execute(model: HouseModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case "book":
        return this.book(context);
      case "pnl":
        return this.pnl(context);
      case "payroll":
        return this.payroll(model, context);
      case "roster":
        return this.roster(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`house book\`, \`house pnl\`, \`house payroll <worker> <amount>\` or \`house roster\`. (\`house par\`, \`house price\` and \`house stock\` are the shopkeeper's — trade-shopkeeping.)`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand ?? "" });
    }
  }

  /** The house, or a `not-staff` rejection. */
  private async house(context: CommandContext): Promise<(Stuff & Business) | null> {
    const house = await this.resolveHouse(context);
    if (!house) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't keep any house here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "not-staff", detail: "house" });
    }
    return house;
  }

  /**
   * `house book` — what the house owes and to whom (economic bootstrap
   * D11/D18): every open loan with its creditor and balance (default
   * revealed on the read), supplier terms payable per supplier, and wages
   * in arrears by worker. `finance` is credited for reading it.
   */
  private async book(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
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

  private async pnl(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
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

  private async payroll(model: HouseModel, context: CommandContext): Promise<void> {
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
    const house = await this.house(context);
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

  /**
   * `house roster` — the chart (economic bootstrap D16): every authored
   * position, who holds it (by name where the holder is resident, by key
   * otherwise), on shift or off — or `vacant`. A house that is CLOSED
   * says so first: its keeper is away past the short clock and nobody
   * else is on a position.
   */
  private async roster(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
    if (!house) return;
    // The chart is read CURRENT: absent holders vacated, the sign written.
    await EmploymentApi.bringCurrent(house);
    const lines: string[] = [`The chart at ${EmploymentApi.organizationLabel(house)}${house.isClosed() ? " — CLOSED: its keeper is away" : ""}:`];
    for (const position of house.getPositions()) {
      const holders = house.holdersOf(position.key);
      if (holders.length === 0) {
        lines.push(`  ${position.key}: vacant`);
        continue;
      }
      for (const key of holders) {
        const live = StuffApi.findByTemplatePath(key);
        const who = live?.getPresentation() ?? key;
        const shift = live && MixinApi.isEmployed(live) ? (live.isOnShift() ? "on shift" : "off shift") : "away";
        lines.push(`  ${position.key}: ${who} (${shift})`);
      }
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join("\n")}`).send();
  }

}
