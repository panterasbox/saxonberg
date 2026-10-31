/**
 * Stock — the counter MECHANISM: a container fixture that holds the shelf
 * goods, prices them (via `PricedOfferMixin`, Law 1: worth on the offer),
 * and attends its customers (via `AttendantMixin`, the storefront lease).
 * One fixture, the `BankCounter` precedent (a `Holder` that
 * composes its capability). The `buy` verb resolves this fixture as both the
 * shelf and the attend point.
 *
 * ⚠ **It used to be a `Vessel`, and that was one rung too far.** Since the
 * base-class narrowing (D14) `Vessel` sits on `Good`, which composes
 * `Chattel` and `Concealable`. A shop counter is part of the shop: it is
 * nobody's chattel — the GOODS on it are, which is the whole point of
 * `stampChattel` at the sale — and you cannot hide it. The container
 * behaviour it wanted is one mixin, so it composes that mixin.
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

import Holder from "../stuff/Holder";
import { ContainerMixin } from "../spatial/Container";
import { PricedOfferMixin } from "../commerce/PricedOffer";
import { AttendantMixin } from "../attendant/Attendant";
import { ResettableMixin } from "../residency/Resettable";
import { PersistableMixin } from "../persistence/Persistable";
import { ConsignmentShelfMixin } from "./Consignment";
import { ContainmentApi } from "../../api/containment";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import type { FieldMeta } from "../mixin";
import type { Store } from "../storage/Store";
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
   * ⭐ Where the shelf is refilled from — exactly ONE source, so the line
   * says it once (`from:`), never as two optional fields that must not
   * both be set:
   *
   *   - absent — an **import**: the reset sweep clones it from nothing
   *     (goods, never money — the malt sack nobody produces);
   *   - `{ supplier: <business> }` — **bought**: the keeper's `stocks` beat
   *     walks there and buys the shortfall on terms; never cloned;
   *   - `{ store: <store> }` — **brought up** from a store on the HOUSE'S
   *     claim (storage-and-ice D8), at the sweep and to order; never cloned,
   *     never bought; an empty claim leaves the shelf bare.
   *
   * Read through {@link Stock.sourceOf}, the one place the shape is decoded.
   */
  from?: StockFrom;
  /** How the line is priced; `fixed` by default. */
  pricing?: StockPricing;
  /**
   * ⭐ The house BUYS this good from anyone who brings one (`sell`) — an
   * ice company buys a cutter's blocks. Its bid is derived from the ask,
   * never authored: see {@link Stock.bidFor}. Absent: the house buys none.
   */
  buys?: boolean;
}

/**
 * A line's authored source (`from:`); absent means an import.
 *
 * ⭐ `importBackstop` (ceramics D28): a supplied line may name a DEARER
 * fallback — buy local first, and when the supplier's counter holds none,
 * the reset sweep imports to par, priced at the base × this. An import is
 * derivably *a good nobody here made*: it carries no maker.
 */
export type StockFrom = { supplier: string; importBackstop?: number } | { store: string };

/** A line's source, decoded — the one switch every reader takes. */
export type StockSource =
  | { kind: "import" }
  | { kind: "supplier"; business: string; importBackstop: number | null }
  | { kind: "store"; store: string };

/** What a counter answers when somebody sells it a good (`sell`). */
export type BuyFromOutcome =
  | { ok: true; paidMinor: number; intoStore: boolean }
  | { ok: false; reason: string; line: string };

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
      AttendantMixin(
        PricedOfferMixin(Holder),
      ),
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

  /** The applier's Phase-1 setter: an unknown policy is refused, never read as consignment. */
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

  /**
   * The applier's Phase-1 setter (and a restore's): every line's source is
   * checked here, once. A line naming two sources, or the retired
   * `supplier:` / `source:` keys, is an authoring error and says so.
   */
  public setStockLines(value: unknown): void {
    if (!Array.isArray(value)) throw new Error("Stock.stockLines: expected a list of lines");
    for (const raw of value as Array<Record<string, unknown>>) {
      const at = String(raw?.itemTemplatePath ?? "?");
      for (const retired of ["supplier", "source"]) {
        if (raw && retired in raw) {
          throw new Error(`Stock.stockLines '${at}': '${retired}:' is retired — write from: { ${retired === "source" ? "store" : "supplier"}: … }`);
        }
      }
      const from = raw?.from as Record<string, unknown> | undefined;
      if (from === undefined || from === null) continue;
      const keys = Object.keys(from).filter((k) => k !== "importBackstop");
      const ok =
        keys.length === 1 &&
        (keys[0] === "supplier" || keys[0] === "store") &&
        typeof from[keys[0]!] === "string" &&
        (from[keys[0]!] as string).length > 0 &&
        (from.importBackstop === undefined ||
          (keys[0] === "supplier" && typeof from.importBackstop === "number" && from.importBackstop >= 1));
      if (!ok) {
        throw new Error(`Stock.stockLines '${at}': from: names exactly one of supplier or store (got ${JSON.stringify(from)})`);
      }
    }
    this.stockLines = value as StockLine[];
  }

  /** ⭐ The one decoding of a line's `from:`. */
  public sourceOf(line: StockLine): StockSource {
    const from = line.from;
    if (from && "supplier" in from) {
      return {
        kind: "supplier",
        business: from.supplier,
        importBackstop: typeof from.importBackstop === "number" ? from.importBackstop : null,
      };
    }
    if (from && "store" in from) return { kind: "store", store: from.store };
    return { kind: "import" };
  }

  /** The stock line for a template, or null. */
  public lineFor(itemTemplatePath: string): StockLine | null {
    return this.stockLines.find((l) => l.itemTemplatePath === itemTemplatePath) ?? null;
  }

  /**
   * ⭐ The line a good is bought on: what it is MADE OF before the shape it
   * came in, when its material names its own lump and the house lists that
   * lump. Firing keeps a piece's identity (ceramics M1), so a cake of black
   * salts calcined in the kiln is the same cake — and it is pearl ash now,
   * and sells as pearl ash. Otherwise the good's own row.
   */
  public lineKeyFor(item: Stuff): string {
    const material = MixinApi.isTangible(item) ? item.getMaterial() : null;
    const lump = material?.getCastTemplate() ?? "";
    if (lump !== "" && this.lineFor(lump) !== null) return lump;
    return item.getTemplatePath() ?? "";
  }

  /** The supplied lines currently short of par — what the keeper's `stocks` beat buys. */
  public shortSuppliedLines(): Array<StockLine & { supplier: string; shortfall: number }> {
    const out: Array<StockLine & { supplier: string; shortfall: number }> = [];
    for (const line of this.stockLines) {
      const src = this.sourceOf(line);
      if (src.kind !== "supplier") continue;
      const shortfall = line.par - this.onHand(line.itemTemplatePath);
      if (shortfall > 0) out.push({ ...line, supplier: src.business, shortfall });
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
    const dearer = line !== null ? this.backstopFactor(line) : 1;
    if (line?.pricing !== "stocking" || line.par <= 0) return Math.round(base * dearer);
    const e = Stock.dial(AppSettingKeys.retailStockingElasticity, 0.5);
    return Math.max(1, Math.round(base * dearer * (1 + e * this.scarcityOf(line))));
  }

  /**
   * ⭐ An import is dearer (ceramics D28): when every good of this line on
   * the shelf is one nobody here made (no maker — the reset imported it),
   * the line asks the backstop's multiple of its base. A local piece on
   * the shelf sells at the base.
   */
  private backstopFactor(line: StockLine): number {
    const src = this.sourceOf(line);
    if (src.kind !== "supplier" || src.importBackstop === null) return 1;
    const goods = this.offeredItems().filter((i) => i.getTemplatePath() === line.itemTemplatePath);
    if (goods.length === 0) return 1;
    const anyLocal = goods.some((g) => MixinApi.isCrafted(g) && g.getMaker() !== "");
    return anyLocal ? 1 : src.importBackstop;
  }

  /** Does a supplier business's counter hold any of this good? Loaded on use. */
  private async supplierHolds(business: string, itemTemplatePath: string): Promise<boolean> {
    const supplier = await StuffApi.singleton(business).catch(() => null);
    if (!supplier || !MixinApi.isBusiness(supplier)) return false;
    for (const path of supplier.getOperatingLocations()) {
      const live = StuffApi.findByTemplatePath(path);
      if (live instanceof Stock && live !== (this as unknown as Stock)) {
        if (live.onHand(itemTemplatePath) > 0) return true;
      }
    }
    return false;
  }

  /**
   * ⭐ How short a line is, asked of where it is refilled from — one
   * question, one price formula. A shelf line is short against its par
   * (`1 − onHand/par`: over par reads negative, and asks less). A store-fed
   * line holds one unit at a time, so its shelf says nothing: it is short
   * against the house's own days of supply in the store (D8), measured
   * against `retail.stockingHorizonDays`, between 0 and 1.
   */
  private scarcityOf(line: StockLine): number {
    const src = this.sourceOf(line);
    if (src.kind === "store") {
      const store = this.storeAt(src.store);
      if (store !== null) {
        const days = store.houseDaysOfSupply(line.itemTemplatePath);
        const horizon = Stock.dial(AppSettingKeys.retailStockingHorizonDays, 120) || 120;
        return Math.min(1, Math.max(0, 1 - days / horizon));
      }
    }
    return 1 - this.onHand(line.itemTemplatePath) / line.par;
  }

  /**
   * ⭐ What the house PAYS for a good it buys (`sell`): its own ask less
   * the margin a shop takes on a supplier's good (`retail.termsMargin`,
   * the terms rung's markup run backwards). Derived, never authored — so
   * when ice is short the house both asks and pays more, which is the
   * price a harvester reads. `null` for a line the house does not buy.
   */
  public bidFor(itemTemplatePath: string): number | null {
    const line = this.lineFor(itemTemplatePath);
    if (!line || line.buys !== true) return null;
    const ask = this.priceFor(itemTemplatePath);
    if (ask === null) return null;
    const margin = Stock.dial(AppSettingKeys.retailTermsMargin, 0.25);
    const bid = Math.floor(ask / (1 + margin));
    return bid > 0 ? bid : null;
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
  public override async onCreate(context?: unknown): Promise<void> {
    await super.onCreate(context);
    await this.reset();
  }

  /** The authored stock lines (what the store carries). */
  public stockLines: StockLine[] = [];


  /** The buyable goods currently on the shelf. */
  offeredItems(): (Stuff & Containable)[] {
    return (this as unknown as Stuff & Container).getContents();
  }

  /**
   * Resolve a shelf good by keyword, or null.
   *
   * ⭐ The word the shelf list PRINTS is a name too. `getLong()` lists a
   * line by its template leaf ("rubber-boots (11)"), so a player who
   * types exactly what the slate says must be served — before this, a
   * good whose keywords were "rubber boots" was refused as *"the shelf
   * is bare"* by `carriesLine` (which does match the leaf) while a pair
   * sat on the counter. Keywords first; then the line {@link lineForWord}
   * names — the same matcher the sold-out refusal asks, so the two can
   * never disagree about a word.
   */
  resolveBuy(keyword: string): (Stuff & Containable) | null {
    for (const item of this.offeredItems()) {
      if (MixinApi.isPerceptible(item) && item.hasKeyword(keyword)) {
        return item;
      }
    }
    const line = this.lineForWord(keyword);
    if (line === null) return null;
    return (
      this.offeredItems().find((item) => item.getTemplatePath() === line.itemTemplatePath) ??
      null
    );
  }

  /**
   * ⭐ The line a typed word names — the ONE matcher (`buy`, its sold-out
   * refusal, and the bring-up all ask it; three copies once disagreed and
   * `buy block` was refused at a counter selling ice-blocks). Matched
   * against the template leaf, which is what `getLong()` prints ("On the
   * shelves: float-rod (11)"), or one word of it (`block` for
   * `ice-block`).
   *
   * ⚠ The leaf is the whole vocabulary: a word the shelf list does not
   * print (`cane` for `…/thing/rod`) names no line, and the honest
   * `not-on-shelf` refusal follows. A row's keywords would want the
   * template, an async read the refusal path does not have.
   */
  public lineForWord(word: string): StockLine | null {
    const want = word.trim().toLowerCase().replace(/[-_]/g, " ");
    if (want === "") return null;
    return (
      this.stockLines.find((l) => {
        const leaf = (l.itemTemplatePath.split("/").pop() ?? "").toLowerCase().replace(/[-_]/g, " ");
        return leaf === want || leaf.split(" ").includes(want);
      }) ?? null
    );
  }

  /** Does a stock line carry this word — the shop SELLS it, even with a bare shelf? */
  carriesLine(keyword: string): boolean {
    return this.lineForWord(keyword) !== null;
  }

  /**
   * ⭐ The counter in this place that sells `keyword`: this one when its
   * lines carry it, else another `Stock` standing in the same place that
   * does, else this one (whose refusal then names the good). A market
   * square holds several stalls, and `buy water filter` went to whichever
   * the binder found first and was told it "isn't for sale here" (the
   * ceramics drive). The counter answers, not the controller.
   */
  counterFor(keyword: string): Stock {
    if (this.carriesLine(keyword)) return this;
    const self = this as unknown as Stuff;
    const here = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (here === null || !MixinApi.isContainer(here)) return this;
    for (const other of here.getContents() as Stuff[]) {
      if (other instanceof Stock && other !== this && other.carriesLine(keyword)) return other;
    }
    return this;
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
      if (item.getTemplatePath() !== itemTemplatePath) continue;
      // ⚠⚠ A STACK is its quantity, not one thing. A restocked stackable
      // merges on arrival, so counting objects read a shelf of thirty
      // staves as ONE and cloned twenty-nine more every hour, without
      // bound — found by the assembly drive, whose first forty-day clock
      // jump drained ~28,000 stave clones and wedged the world. Every
      // stackable stock line had the defect; timber was the first to sit
      // on a shelf long enough to show it.
      n += MixinApi.isStackable(item) ? item.getQuantity() : 1;
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
      const src = this.sourceOf(line);
      // ⭐ A SUPPLIED line is bought, never cloned (economic bootstrap
      // D14): the keeper walks to the supplier and buys the shortfall on
      // terms. Only the import lines — goods nobody produces — come from
      // nothing.
      if (src.kind === "supplier") {
        // ⭐ …unless it names a backstop and the supplier has none to sell
        // (ceramics D28): then the shelf is imported to par, dearer.
        if (src.importBackstop === null) continue;
        if (await this.supplierHolds(src.business, line.itemTemplatePath)) continue;
      }
      // ⭐ A STORE-FED line is brought up from the store, never cloned.
      if (src.kind === "store") {
        await this.bringUp(line.itemTemplatePath);
        continue;
      }
      const need = line.par - this.onHand(line.itemTemplatePath);
      for (let i = 0; i < need; i++) {
        const item = await StuffApi.clone<Stuff & Containable>(
          line.itemTemplatePath,
        );
        ContainmentApi.move(item, this as unknown as Stuff & Container);
      }
    }
  }

  /**
   * ⭐ Bring a store-fed line up to par from its store, on the house's
   * claim (D8). Returns how many came up — 0 when the house holds no
   * claim or the store is empty: *an empty store means an empty counter*.
   */
  public async bringUp(itemTemplatePath: string): Promise<number> {
    const line = this.lineFor(itemTemplatePath);
    if (!line) return 0;
    const src = this.sourceOf(line);
    if (src.kind !== "store") return 0;
    const store = this.storeAt(src.store);
    if (store === null) return 0;
    const need = line.par - this.onHand(itemTemplatePath);
    if (need < 1) return 0;
    const goods = await store.drawForHouse(itemTemplatePath, need);
    for (const g of goods) {
      if (MixinApi.isContainable(g)) ContainmentApi.move(g, this as unknown as Stuff & Container);
    }
    return goods.length;
  }

  /**
   * Bring up the store-fed line a buyer's word names — `buy block` as well
   * as `buy ice-block` — before the counter says it is bare. Returns how
   * many came up.
   */
  public async bringUpFor(keyword: string): Promise<number> {
    const line = this.lineForWord(keyword);
    return line === null ? 0 : this.bringUp(line.itemTemplatePath);
  }

  /** The live store at a path, or null. */
  private storeAt(path: string): (Stuff & Store) | null {
    const s = StuffApi.findByTemplatePath<Stuff>(path);
    return s && MixinApi.isStore(s) ? s : null;
  }

  /**
   * ⭐ The house BUYS a good off somebody (`sell`) — the act a counter
   * performs, so the counter owns the sequence and returns its refusals:
   * the line must say the house buys it; somebody is behind the counter;
   * the good is the seller's own; a store-fed line's store has room; the
   * seller has an account; the house can pay. Every gate is asked BEFORE
   * the money moves. Then the house pays its bid as cost of goods (the
   * terms leg: the house paying a supplier), and the good goes where the
   * line is refilled from — into the store on the house's claim, or onto
   * the shelf as the house's.
   */
  public async buyFrom(seller: Stuff, item: Stuff & Containable): Promise<BuyFromOutcome> {
    const no = (reason: string, line: string): BuyFromOutcome => ({ ok: false, reason, line });
    const path = this.lineKeyFor(item);
    const line = this.lineFor(path);
    if (!line || line.buys !== true) return no("not-bought", "The house does not buy that.");
    const venue = (this as unknown as Stuff).getIdentityPath() ?? "";
    const business = await EmploymentApi.ensureOperatorAt(venue);
    const who = seller.getIdentityPath();
    if (!business || !who || this.requestAttention(who).status === "closed") {
      return no("unattended", "There's no one behind the counter just now.");
    }
    if (MixinApi.isChattel(item)) {
      const owner = await item.chattelOwner();
      if ((owner?.kind === "player" || owner?.kind === "organization") && owner.templatePath !== who) {
        return no("not-yours", "That is not yours to sell.");
      }
    }
    const src = this.sourceOf(line);
    const store = src.kind === "store" ? this.storeAt(src.store) : null;
    if (src.kind === "store") {
      if (store === null) return no("no-store", "The house has nowhere to put it.");
      const veto = (MixinApi.isContainer(store) ? store.canAddContainable?.(item) : undefined) ?? { ok: true };
      if (!veto.ok) return no("store-refuses", veto.reason ?? "The house has no room for it.");
    }
    const bid = this.bidFor(path);
    if (bid === null) return no("not-priced", "The house will not put a price on that.");
    const sellerAccount = await BankingApi.primaryAccountIdOf(who);
    if (!sellerAccount) return no("no-account", "You have no bank account to be paid into.");
    try {
      const houseAccount = await EmploymentApi.operatingAccountOf(business);
      await BankingApi.payTerms(houseAccount, sellerAccount, Money.of(bid, BankingApi.compactCurrency()), `bought: ${item.getPresentation()}`);
    } catch {
      this._shortOfMoney = true;
      return no("house-cannot-pay", "The house cannot pay for that just now.");
    }
    this._shortOfMoney = false;
    // The house's from the moment it is paid for — BEFORE the store can
    // adopt it as a line's face, or the seller could `get` it back as
    // theirs and sell it twice (the pre-merge audit).
    if (MixinApi.isChattel(item)) await item.transferChattel(business);
    if (store !== null) {
      const taken = await store.receive(item, store.getBusinessPath());
      if (taken.ok) return { ok: true, paidMinor: bid, intoStore: true };
      // Paid for and refused by the book: the good is the house's either
      // way — it goes on the counter rather than vanish.
    }
    ContainmentApi.move(item, this as unknown as Stuff & Container);
    return { ok: true, paidMinor: bid, intoStore: false };
  }

  /** The shop restocks while browsed — repop-ing a watched room is fine. */
  override resetsWhilePresent(): boolean {
    return true;
  }

  override getLong(): string {
    const base = super.getLong();
    // ⭐ Everything the counter SELLS, not only what it restocks: a house's
    // own goods (the silk house's cocoons, set out by its hand) are priced
    // with no stock line, and a slate that leaves them off tells a buyer
    // the one thing on the table is not for sale (silk's browser walk).
    const keys = [
      ...new Set([
        ...this.stockLines.map((l) => l.itemTemplatePath),
        ...this.pricedKeys(),
      ]),
    ];
    const lines = keys
      .map((key) => {
        const price = this.priceFor(key);
        const name = key.split("/").pop() ?? key;
        return price != null ? `${name} (${price})` : name;
      })
      .join(", ");
    const shelves = lines.length > 0 ? `${base} On the shelves: ${lines}.` : base;
    const buying = this.buyingWords();
    return buying ? `${shelves} ${buying}` : shelves;
  }

  /**
   * ⭐ What the house BUYS, said before anybody makes the trip (the review:
   * a newcomer's sale failed on a limit nobody could see). The bid; or that
   * the store is full; or that the house turned a seller away for want of
   * money (remembered from the last failed sale, cleared by the next good
   * one — a counter cannot read its balance on a look).
   */
  private buyingWords(): string {
    const parts: string[] = [];
    for (const line of this.stockLines) {
      if (line.buys !== true) continue;
      const name = line.itemTemplatePath.split("/").pop() ?? line.itemTemplatePath;
      const src = this.sourceOf(line);
      const store = src.kind === "store" ? this.storeAt(src.store) : null;
      if (store !== null) {
        const cap = store.getCapacityKg();
        const held = store.totalKg();
        if (cap > 0 && held >= cap) {
          parts.push(`The house is buying no ${name} — its store is full.`);
          continue;
        }
      }
      if (this._shortOfMoney) {
        parts.push(`The house is buying no ${name} just now — it is short of money.`);
        continue;
      }
      const bid = this.bidFor(line.itemTemplatePath);
      if (bid !== null) parts.push(`The house buys ${name} at ${Money.of(bid, BankingApi.compactCurrency()).render()}.`);
    }
    return parts.join(" ");
  }

  /** Transient: the last sale to the house failed on its money (cleared by a good one). */
  private _shortOfMoney = false;

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
