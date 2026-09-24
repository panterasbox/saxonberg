/**
 * Stock — the counter MECHANISM: a container fixture that holds the shelf
 * goods, prices them (via `PricedOfferMixin`, Law 1: worth on the offer),
 * and attends its customers (via `AttendantMixin`, the storefront lease).
 * One fixture, the `BankCounter` precedent (a `Vessel` that composes its
 * capability). The `buy` verb resolves this fixture as both the shelf and
 * the attend point.
 *
 * Stock is authored declaratively: `stockLines` names each line
 * (`itemTemplatePath` + `par` + optional `brandKey`), the shelf inventory is
 * `props`-cloned into the container, and `prices` is keyed by the item
 * template path (the offer key). A buy moves one shelf item to the buyer;
 * the reset sweep (see `ResettableMixin`) tops each line back to `par`.
 * A counter with NO `stockLines` is a pure brokerage — everything on it
 * was consigned (the cash-and-carry distributor).
 *
 * ⭐ **This is substrate: it is never instanced.** The counter is a
 * *vocation's instrument*, so the class a row names ships in that
 * vocation's pack — `/trade/shopkeeping/thing/Stock`, the concrete twin,
 * which adds only the affordance statics. The mechanism stays here
 * because the kernel reads it: the price index, the credit ladder's rung
 * 0 (`termsPriceFor`), the wage engine's par read and four controllers
 * all narrow on this base, and a kernel module may never import a pack.
 * See `docs/subsystems/retail.md § The kernel/pack line` and
 * `lint:counters`.
 */

import { Vessel } from "../stuff/Vessel";
import { DetailedMixin } from "../description/Detailed";
import { PricedOfferMixin } from "../commerce/PricedOffer";
import { AttendantMixin } from "../attendant/Attendant";
import { ResettableMixin } from "../residency/Resettable";
import { PostRegistrationMixin } from "../stuff/PostRegistration";
import { PersistableMixin } from "../persistence/Persistable";
import { ConsignmentShelfMixin } from "./Consignment";
import { ContainmentApi } from "../../api/containment";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import type { FieldMeta } from "../mixin";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../config/AppSettings";
import { EmploymentApi } from "../../api/employment";
import { BankingApi, Money } from "../../api/banking";

/**
 * How a line is priced (economic bootstrap D14). `fixed`: the authored
 * price, as always. `stocking`: the market-maker's ask, derived on read
 * from the shelf against par — `base × (1 + e × (1 − onHand/par))`, an
 * offer never an oracle: an empty shelf asks more, a full one less.
 */
export const STOCK_PRICINGS = ["fixed", "stocking"] as const;
export type StockPricing = (typeof STOCK_PRICINGS)[number];

/**
 * What a counter accepts from a consignor (economic bootstrap D11).
 * `consignment`: the consignor's own ask, the shop takes a commission.
 * `terms`: supplier terms — the SHOP sets the ask and keeps the margin,
 * the supplier is owed its price at sale, title retained until then.
 */
export const STOCK_PURCHASINGS = ["consignment", "terms"] as const;
export type StockPurchasing = (typeof STOCK_PURCHASINGS)[number];

/** One authored stock line: what to shelve, how deep, and any brand. */
export interface StockLine {
  /** The good's clone-source template path (the offer key too). */
  itemTemplatePath: string;
  /** The target shelf depth the reset sweep tops back up to. */
  par: number;
  /** Optional brand key (an independent shelf mark). */
  brandKey?: string;
  /**
   * ⭐ The supplier this line is BOUGHT from (a Business path) — the
   * keeper's `stocks` beat walks there and buys the shortfall on terms.
   * A line with no supplier is an IMPORT: the reset sweep clones it from
   * nothing (goods, never money — the malt sack nobody produces). A line
   * WITH one is never cloned.
   */
  supplier?: string;
  /** How the line is priced; `fixed` by default. */
  pricing?: StockPricing;
}

// One counter is BOTH the house's shelf and a brokerage shelf (libations
// D4): `ConsignmentShelfMixin` holds the listings a consignor (a player,
// or a producer's floor hand consigning AS its business) puts up, so a
// distributor whose counter carries no `stockLines` at all — the
// cash-and-carry — is still a `Stock` (`buy` resolves either). `Persistable`
// is outermost and load-bearing exactly as on `ConsignmentShelf`: a good
// in the shop's custody survives a bounce.
const StockBase = PersistableMixin(
  ConsignmentShelfMixin(
    ResettableMixin(
      AttendantMixin(PricedOfferMixin(DetailedMixin(PostRegistrationMixin(Vessel)))),
    ),
  ),
);

export default class Stock extends StockBase {
  constructor() {
    super();
    // ⭐ Fixed in place. A shop's counter is joinery — the goods ON it
    // are the goods; the counter is not one of them.
    this.fixedInPlace = true;
  }

  static fieldMeta: FieldMeta = {
    stockLines: { persistent: true, authorable: true },
    purchasing: { persistent: true, authorable: true },
  };

  /**
   * ⭐ The counter's policy for what it accepts from a consignor (economic
   * bootstrap D11): `consignment` (the consignor's ask, a commission at
   * sale) or `terms` (supplier terms — this shop prices the good and owes
   * the supplier at sale). Rung 0 of the credit ladder is a counter that
   * says `terms`.
   */
  public purchasing: StockPurchasing = "consignment";

  /** The Hydrator's Phase-1 setter: an unknown policy is refused, never read as consignment. */
  public setPurchasing(value: unknown): void {
    if (!(STOCK_PURCHASINGS as readonly unknown[]).includes(value)) {
      throw new Error(
        `Stock.purchasing: '${String(value)}' is not a policy (expected one of ${STOCK_PURCHASINGS.join(", ")})`,
      );
    }
    this.purchasing = value as StockPurchasing;
  }

  public getPurchasing(): StockPurchasing {
    return this.purchasing;
  }

  /** The authored lines, read-only. */
  public getStockLines(): readonly StockLine[] {
    return this.stockLines;
  }

  /** The stock line for a template, or null. */
  public lineFor(itemTemplatePath: string): StockLine | null {
    return this.stockLines.find((l) => l.itemTemplatePath === itemTemplatePath) ?? null;
  }

  /** The supplied lines currently short of par — what the keeper's `stocks` beat buys. */
  public shortSuppliedLines(): Array<StockLine & { supplier: string; shortfall: number }> {
    const out: Array<StockLine & { supplier: string; shortfall: number }> = [];
    for (const line of this.stockLines) {
      if (!line.supplier) continue;
      const shortfall = line.par - this.onHand(line.itemTemplatePath);
      if (shortfall > 0) out.push({ ...line, supplier: line.supplier, shortfall });
    }
    return out;
  }

  /**
   * ⭐ The shop's ask (economic bootstrap D14). A `stocking` line is the
   * market-maker's: `round(base × (1 + e × (1 − onHand/par)))` with `e`
   * the Schedule's `retail.stockingElasticity` — an empty shelf asks
   * base × (1 + e), a shelf at par asks base, one over par asks less.
   * A `fixed` line (the default) is the authored price. A good with no
   * authored base — a terms listing the shop never priced — asks the
   * supplier's price plus the Schedule's `retail.termsMargin`.
   */
  public override priceFor(key: string): number | null {
    const base = this.basePriceFor(key);
    const line = this.lineFor(key);
    if (base === null) {
      const owed = this.termsPriceFor(key);
      return owed === null ? null : Math.round(owed * (1 + Stock.dial(AppSettingKeys.retailTermsMargin, 0.25)));
    }
    if (line?.pricing !== "stocking" || line.par <= 0) return base;
    const e = Stock.dial(AppSettingKeys.retailStockingElasticity, 0.5);
    const onHand = this.onHand(key);
    return Math.max(1, Math.round(base * (1 + e * (1 - onHand / line.par))));
  }

  /** The supplier's price owed at sale for a terms good of this template, or null. */
  private termsPriceFor(itemTemplatePath: string): number | null {
    let best: number | null = null;
    for (const item of this.offeredItems()) {
      if (item.getTemplatePath() !== itemTemplatePath || !MixinApi.isChattel(item)) continue;
      const listing = this.listingFor(item.getChattelId());
      if (listing?.basis === "terms") best = best === null ? listing.askMinor : Math.max(best, listing.askMinor);
    }
    return best;
  }

  private static dial(key: string, fallback: number): number {
    try {
      const text = AppApi.setting(key);
      if (!text) return fallback; // unseeded: `Number("")` is 0, not absent
      const raw = Number(text);
      return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
    } catch {
      return fallback;
    }
  }

  /** Boot-stock the shelf to par (then the reset sweep maintains it). */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.reset();
  }

  /** The authored stock lines (what the store carries). */
  public stockLines: StockLine[] = [];


  /** The buyable goods currently on the shelf. */
  offeredItems(): (Stuff & Containable)[] {
    return (this as unknown as Stuff & Container).getContents();
  }

  /** Resolve a shelf good by keyword, or null. */
  resolveBuy(keyword: string): (Stuff & Containable) | null {
    for (const item of this.offeredItems()) {
      if (MixinApi.isPerceptible(item) && item.hasKeyword(keyword)) {
        return item;
      }
    }
    return null;
  }

  /**
   * ⭐ Does a stock LINE carry this word — i.e. the shop SELLS it, even
   * with a bare shelf? Matched against the template leaf, which is
   * exactly what `getLong()` prints to the player ("On the shelves:
   * float-rod (11), keepnet (6)"). Without this a sold-out good is
   * refused as *"float-rod" isn't for sale here* while the shop's own
   * description lists it — a flat contradiction the fishing build's
   * live browser drive hit on its second run, because every new tackle
   * line is `par: 1`.
   *
   * ⚠ The leaf is the whole match: a player who types a word the shelf
   * list does not print (`cane` for `…/thing/rod`) still gets the
   * honest `not-on-shelf` refusal. Matching a row's keywords would want
   * the template, which is an async read this refusal path does not
   * have.
   */
  carriesLine(keyword: string): boolean {
    const want = keyword.trim().toLowerCase().replace(/[-_]/g, " ");
    if (want === "") return false;
    return this.stockLines.some((l) => {
      const leaf = (l.itemTemplatePath.split("/").pop() ?? "")
        .toLowerCase()
        .replace(/[-_]/g, " ");
      return leaf === want;
    });
  }

  /** The authored par depth for a line (by item template path). */
  parFor(itemTemplatePath: string): number {
    return (
      this.stockLines.find((l) => l.itemTemplatePath === itemTemplatePath)
        ?.par ?? 0
    );
  }

  /** The shelf count currently on hand for a line (by item template path). */
  onHand(itemTemplatePath: string): number {
    let n = 0;
    for (const item of this.offeredItems()) {
      if (item.getTemplatePath() === itemTemplatePath) n++;
    }
    return n;
  }

  /**
   * Reset (repop): top each stock line back to its authored par by cloning
   * fresh goods from the line's template into the shelf. Notional restock —
   * items, never money (Law 2). The shelf clones are author-owned until
   * bought (they resolve via the chattel author fallback).
   */
  override async reset(): Promise<void> {
    for (const line of this.stockLines) {
      // ⭐ A SUPPLIED line is bought, never cloned (economic bootstrap
      // D14): the keeper walks to the supplier and buys the shortfall on
      // terms. Only the import lines — goods nobody produces — come from
      // nothing.
      if (line.supplier) continue;
      const need = line.par - this.onHand(line.itemTemplatePath);
      for (let i = 0; i < need; i++) {
        const item = await StuffApi.clone<Stuff & Containable>(
          line.itemTemplatePath,
        );
        ContainmentApi.move(item, this as unknown as Stuff & Container);
      }
    }
  }

  /** The shop restocks while browsed — repop-ing a watched room is fine. */
  override resetsWhilePresent(): boolean {
    return true;
  }

  override getLong(): string {
    const base = super.getLong();
    const lines = this.stockLines
      .map((l) => {
        const price = this.priceFor(l.itemTemplatePath);
        const name = l.itemTemplatePath.split("/").pop() ?? l.itemTemplatePath;
        return price != null ? `${name} (${price})` : name;
      })
      .join(", ");
    return lines.length > 0 ? `${base} On the shelves: ${lines}.` : base;
  }

  /**
   * The line `look` appends for a good on this counter (economic bootstrap
   * D11): a terms good says whose it still is — *held on the farm outfit's
   * terms until sold* — and the shop's ask; a consigned good its consignor's
   * ask. A stock good says the shop's ask alone; a good the shop has not
   * priced says nothing.
   */
  public termsLineFor(item: Stuff): string {
    if (!MixinApi.isChattel(item)) return "";
    const listing = this.listingFor(item.getChattelId());
    if (!listing) {
      const ask = this.priceFor(item.getTemplatePath() ?? "");
      return ask === null ? "" : `The shop asks ${Money.of(ask, BankingApi.compactCurrency()).render()}.`;
    }
    const consignor = StuffApi.findByTemplatePath(listing.consignorKey);
    const who = consignor && MixinApi.isOrganization(consignor)
      ? EmploymentApi.organizationLabel(consignor)
      : consignor?.getPresentation() ?? "its supplier";
    if (listing.basis === "terms") {
      const ask = this.priceFor(item.getTemplatePath() ?? "");
      return `Held on ${who}'s terms until sold${ask !== null ? `; the shop asks ${Money.of(ask, BankingApi.compactCurrency()).render()}` : ""}.`;
    }
    return `On consignment for ${who} at ${Money.of(listing.askMinor, BankingApi.compactCurrency()).render()}.`;
  }
}
