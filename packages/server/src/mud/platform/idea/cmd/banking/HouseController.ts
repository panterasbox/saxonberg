/**
 * HouseController — the `house` verb: the house **app**. `house pnl` reads
 * the venue's profit-and-loss; `house payroll <worker> <amount>` pays a wage
 * from the house account; `house par <category> <level>` sets a par line
 * on the Business; `house stock` shows the live stock sheet — the rail
 * against par, perception-scoped, as a card ON A SCREEN (the screen's own `show` —
 * resolveFor`: the tablet you hold, one in sight, or one by mind).
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
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { EmploymentApi, PAR_UNITS } from "../../../../api/employment";
import type { Business, ParUnit, StockSheetLine } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import { CardApi } from "../../../../api/card";
import type { Display } from "../../../../lib/display/Display";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";
import Stock from "../../../thing/Stock";

const TOPIC = "act.deed";

interface HouseModel extends CommandModel {
  worker?: MqlOneResult;
  amount?: string;
  category?: string;
  level?: string;
  grade?: string;
  from?: string;
  thing?: MqlOneResult;
  ask?: string;
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
      case "par":
        return this.par(model, context);
      case "price":
        return this.price(model, context);
      case "stock":
        return this.stock(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`house book\`, \`house pnl\`, \`house payroll <worker> <amount>\`, \`house par <category> <level>\`, \`house price <thing> <ask>\` or \`house stock\`.`)
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
   * `house par <category> <level> [--grade <band>] [--from <business>]` —
   * the unit is inferred from the level's suffix (`12L`, `5kg`, bare
   * number = count); a level of `0` removes the line.
   */
  private async par(model: HouseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
    if (!house) return;
    if (!(await this.screen(context))) return;
    const category = (model.category ?? "").trim();
    const parsed = HouseController.parseLevel(model.level ?? "");
    if (!category || !parsed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`house par <category> <level>\` — the level as \`12\` (count), \`6L\` or \`5kg\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-par", detail: `${category} ${model.level ?? ""}` });
      return;
    }
    if (parsed.level === 0) {
      const removed = house.removeParLine(category);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          removed
            ? Mml.compose`You strike ${category} from the par sheet of ${house.getPresentation()}.`
            : Mml.compose`${category} isn't on the par sheet.`,
        )
        .send();
      return;
    }
    house.setParLine({
      category,
      level: parsed.level,
      unit: parsed.unit,
      minGrade: (model.grade ?? "").trim(),
      supplier: (model.from ?? "").trim(),
    });
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Par for ${category} at ${house.getPresentation()}: ${String(parsed.level)} ${parsed.unit}${model.from ? ` from ${model.from}` : ""}.`)
      .send();
  }

  /**
   * `house price <thing> <ask>` — the shop's own ask for a good's kind
   * (economic bootstrap D14): sets the base price on the counter the
   * house operates that holds the thing (else its first counter), keyed
   * by the good's template. A `stocking` line derives from this base; a
   * terms good the house never priced asked the supplier's price plus
   * the Schedule's margin until now. ⚠ The seat's, never the screen's —
   * a price is the house's money policy.
   */
  private async price(model: HouseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
    if (!house) return;
    const thing = model.thing?.stuff ?? null;
    const ask = Number.parseInt((model.ask ?? "").trim(), 10);
    if (!thing || !Number.isFinite(ask) || ask <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`house price <thing> <ask>\` — the ask in whole ${Currency.of(BankingApi.compactCurrency()).plural}.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-price", detail: model.ask ?? "" });
      return;
    }
    const key = thing.getTemplatePath() ?? "";
    const counters = house
      .getOperatingLocations()
      .map((p) => StuffApi.findByTemplatePath(p))
      .filter((c): c is Stock => c instanceof Stock);
    const holding = MixinApi.isContainable(thing) ? thing.getContainer() : null;
    const counter = counters.find((c) => c === holding) ?? counters[0] ?? null;
    if (!counter || !key) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${house.getPresentation()} keeps no counter to price ${Mml.thing(thing)} on.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-counter", detail: key });
      return;
    }
    counter.setPrice(key, ask);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${house.getPresentation()} now asks ${Money.of(ask, BankingApi.compactCurrency()).render()} for ${Mml.thing(thing)} and its kind${counter.lineFor(key)?.pricing === "stocking" ? " — at par; the shelf moves it" : ""}.`)
      .send();
  }

  /** `12` → count, `6L` → L, `5kg` → kg; null when unparsable. */
  private static parseLevel(raw: string): { level: number; unit: ParUnit } | null {
    const m = /^(\d+(?:\.\d+)?)\s*([A-Za-z]*)$/.exec(raw.trim());
    if (!m) return null;
    const level = Number(m[1]);
    const suffix = (m[2] ?? "").toLowerCase();
    const unit: ParUnit | null =
      suffix === "" ? "count"
      : suffix === "l" ? "L"
      : suffix === "kg" ? "kg"
      : PAR_UNITS.includes(suffix as ParUnit) ? (suffix as ParUnit)
      : null;
    if (!Number.isFinite(level) || level < 0 || !unit) return null;
    return { level, unit };
  }

  /**
   * `house stock` — the live sheet as prose **and** the `stock` card: the
   * rows are the perceived bulk holders (MQL, giver-anchored); the par
   * lines ride the prose.
   */
  private async stock(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const screen = await this.resolveScreen(giver);
    // A screen signed in as a principal shows THAT house's sheet to whoever
    // drives it — the thief with the tablet reads it; otherwise the seat's.
    const principal = screen?.display.getPrincipal() ?? "";
    const signedIn = principal ? StuffApi.findByTemplatePath(principal) : null;
    const house =
      signedIn && MixinApi.isBusiness(signedIn) ? signedIn : await this.house(context);
    if (!house) return;
    if (!screen) return void (await this.screen(context));
    const sheet = house.stockSheetFor(giver);
    const body = HouseController.renderSheet(house.getPresentation(), sheet);
    const prose = Mml.compose`${body}`;
    if (screen.mode === "mind") {
      // Driving by mind from elsewhere: the screen shows the sheet to
      // whoever stands before it; the driver sees nothing of it.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You put the stock sheet up on ${screen.display.getPresentation()} — you drive it; you see nothing.`)
        .send();
    } else {
      MessageApi.scene(giver).topic(TOPIC).toSelf(prose).send();
    }
    // The display is the card's birth path when a display is involved:
    // `show` pushes to every viewer who sees the screen, the holder among
    // them — never a second push through `CardApi.open`.
    screen.display.show({
      kind: "card",
      cardId: "stock",
      key: CardApi.keyFor(context, "stock"),
      prose,
    });
  }

  /**
   * The house app runs on a SCREEN: the tablet you hold, one in sight you
   * may drive, or one anywhere by mind. None → `no-display`.
   */
  private async screen(
    context: CommandContext,
  ): Promise<{ display: Stuff & Display; mode: "hand" | "mind" } | null> {
    const screen = await this.resolveScreen(context.commandGiver);
    if (!screen) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You'd need a screen for that — the house tablet, or one you can drive.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-display", detail: "house" });
    }
    return screen;
  }

  private static renderSheet(house: string, sheet: readonly StockSheetLine[]): string {
    if (sheet.length === 0) return `${house} keeps no par sheet yet — \`house par <category> <level>\` starts one.`;
    const lines = sheet.map(({ line, onHand, shortfall }) => {
      const short = shortfall > 0 ? ` — short ${String(shortfall)}` : "";
      return `  ${line.category}: ${String(onHand)} / ${String(line.level)} ${line.unit}${short}`;
    });
    return `Stock at ${house}:\n${lines.join("\n")}`;
  }
}
