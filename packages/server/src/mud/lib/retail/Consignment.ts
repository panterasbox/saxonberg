/**
 * Consignment — the store's brokerage layer over **real ownership**. A
 * consigned good moves *custody* to the shop's shelf while its owner-stamp
 * stays with the consignor (custody ≠ ownership, the whole point of the
 * chattel core). The `ConsignmentListing` is a brokerage record — ask price,
 * who to pay, which good — NOT an ownership pointer: "whose is it" is always
 * answered by `ChattelApi.ownerOf`, never by the listing.
 *
 * `ConsignmentShelfMixin` holds the listing registry. Its host composes
 * `Persistable` (see `ConsignmentShelf`), which is **load-bearing, not
 * incidental**: it is what lets a consigned player-owned good and its
 * `_chattelId` survive a relog while in the shop's custody — a transient
 * shelf would drop consigned items on a server bounce.
 *
 * ⭐ A consignment shelf is one implementer of `buy`'s offer protocol
 * (`ForSaleMixin`, harbors review 1): it offers what it holds a live
 * listing for, and sells it at the consignor's ask — settle, split the
 * remainder to the consignor, transfer the title. `Stock` (which composes
 * this) adds its own shelf goods on top.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import { MixinApi } from "../../api/mixin";
import { SecurityApi } from "../../api/security";
import { ContainmentApi } from "../../api/containment";
import { EmploymentApi } from "../../api/employment";
import { BankingApi, Money } from "../../api/banking";
import type { RemittanceSplit, SettlementReceipt } from "../../api/banking";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../config/AppSettings";
import { Mml } from "../../api/mml";
import { ForSaleMixin } from "./ForSale";
import type { ForSale, SaleOutcome, SaleRequest } from "./ForSale";

/**
 * A good held in a shop's custody — the owner-stamp stays with the
 * consignor; this record is just the join that says "X is held here for
 * Y". The shared base of a consignment listing AND a checked weapon (the
 * coat-check rack): custody without a sale.
 */
export interface HeldGood {
  /** This holding's durable id. */
  holdingId: string;
  /** The held good's chattel id (the ownership join key). */
  itemChattelId: string;
  /** Whose it is (the reclaim / payout / cap key). */
  consignorKey: string;
}

/**
 * The custody-registry surface — **the coat check, whole**: move a good
 * into custody (owner-stamp stays put), know whose it is, hand it back to
 * its owner. A {@link ConsignmentShelf} is this plus a sale layer.
 */
export interface HeldGoodsShelf {
  recordHolding(itemChattelId: string, consignorKey: string): HeldGood;
  removeHolding(itemChattelId: string): void;
  holdingFor(itemChattelId: string): HeldGood | null;
  holdingsOf(consignorKey: string): HeldGood[];
  countHeld(consignorKey: string): number;
  /** A held good on this fixture, matched by keyword. */
  resolveHeld(keyword: string): (Stuff & Containable) | null;
}

/** A pure custody rack (the coat check) — the held-goods base, no sale. */
export type RackStuff = Stuff & Container & HeldGoodsShelf;

export function HeldGoodsMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class HeldGoodsMixin extends Base implements HeldGoodsShelf {
    static _mixinName = "HeldGoodsMixin";

    static fieldMeta: FieldMeta = {
      heldGoods: { persistent: true, runtimeState: true },
    };

    /** The goods held in this fixture's custody (owner-stamps stay put). */
    public heldGoods: HeldGood[] = [];

    public recordHolding(
      itemChattelId: string,
      consignorKey: string,
    ): HeldGood {
      const holding: HeldGood = {
        holdingId: `hg-${SecurityApi.uuid()}`,
        itemChattelId,
        consignorKey,
      };
      this.heldGoods.push(holding);
      return holding;
    }

    public removeHolding(itemChattelId: string): void {
      this.heldGoods = this.heldGoods.filter(
        (h) => h.itemChattelId !== itemChattelId,
      );
    }

    public holdingFor(itemChattelId: string): HeldGood | null {
      return (
        this.heldGoods.find((h) => h.itemChattelId === itemChattelId) ?? null
      );
    }

    public holdingsOf(consignorKey: string): HeldGood[] {
      return this.heldGoods.filter((h) => h.consignorKey === consignorKey);
    }

    public countHeld(consignorKey: string): number {
      return this.holdingsOf(consignorKey).length;
    }

    public resolveHeld(keyword: string): (Stuff & Containable) | null {
      const contents = (this as unknown as Stuff & Container).getContents();
      for (const item of contents) {
        if (
          MixinApi.isPerceptible(item) &&
          item.hasKeyword(keyword) &&
          MixinApi.isChattel(item) &&
          this.holdingFor(item.getChattelId())
        ) {
          return item;
        }
      }
      return null;
    }
  }
  return HeldGoodsMixin;
}

/**
 * The basis a good sits on a counter under (economic bootstrap D11).
 * `consignment`: the consignor's own ask; the shop takes a commission at
 * sale. `terms`: supplier terms — the SHOP sets the ask and keeps the
 * margin; `askMinor` is what the supplier is OWED at sale (title retained
 * until paid). Rung 0 of the credit ladder: consignment grown up.
 */
export const LISTING_BASES = ["consignment", "terms"] as const;
export type ListingBasis = (typeof LISTING_BASES)[number];

/** A consignment listing — a held good offered for **sale** at a price. */
export interface ConsignmentListing extends HeldGood {
  /** The asking price (consignment) or the supplier's price owed at sale (terms), in minor units. */
  askMinor: number;
  /** The basis it sits here under; absent on a row written before the bootstrap reads as `consignment`. */
  basis?: ListingBasis;
}

/**
 * The listing-registry surface — the held-goods base plus the **sale**
 * layer (the ask + the per-consignor cap). A coat-check rack composes only
 * {@link HeldGoodsShelf}; a store shelf composes this.
 */
export interface ConsignmentShelf extends HeldGoodsShelf, ForSale {
  /**
   * The authored per-shelf listing cap, or null to ride the global
   * `retail.consignment.listingCap`. A market stall selling LOOSE
   * produce means dozens of listings per seller, so the stall authors a
   * generous cap — an authored, per-venue fact, never a global raise
   * that leaks to every shelf.
   */
  getListingCapOverride(): number | null;
  setListingCapOverride(value: number | null): void;
  recordListing(
    itemChattelId: string,
    consignorKey: string,
    askMinor: number,
    basis?: ListingBasis,
  ): ConsignmentListing;
  removeListing(itemChattelId: string): void;
  listingFor(itemChattelId: string): ConsignmentListing | null;
  listingsOf(consignorKey: string): ConsignmentListing[];
  /** Every live listing on the shelf, any consignor, any basis. */
  allListings(): ConsignmentListing[];
  activeListingCount(consignorKey: string): number;
  /** A shelf good, matched by keyword, that carries a live listing. */
  resolveConsigned(keyword: string): (Stuff & Containable) | null;
}

/** Any fixture that brokers listings — a `ConsignmentShelf`, or a `Stock` counter. */
export type ShelfStuff = Stuff & Container & ConsignmentShelf;

export function ConsignmentShelfMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ConsignmentShelfMixin
    extends HeldGoodsMixin(ForSaleMixin(Base))
    implements ConsignmentShelf
  {
    static _mixinName = "ConsignmentShelfMixin";

    static fieldMeta: FieldMeta = {
      listingCapOverride: { persistent: true, authorable: true },
    };

    // Re-surface the inherited HeldGoodsShelf members for TS — a
    // mixin-extends-mixin composition doesn't propagate the base instance
    // type through the generic. `declare` emits no runtime code; the real
    // members come from `HeldGoodsMixin` at runtime.
    declare heldGoods: HeldGood[];
    declare recordHolding: HeldGoodsShelf["recordHolding"];
    declare removeHolding: HeldGoodsShelf["removeHolding"];
    declare holdingFor: HeldGoodsShelf["holdingFor"];
    declare holdingsOf: HeldGoodsShelf["holdingsOf"];
    declare countHeld: HeldGoodsShelf["countHeld"];
    declare resolveHeld: HeldGoodsShelf["resolveHeld"];
    declare purchaserOf: ForSale["purchaserOf"];
    declare sellerFor: ForSale["sellerFor"];

    /** Authored per-shelf cap; null = the global dial. See the getter. */
    public listingCapOverride: number | null = null;

    public getListingCapOverride(): number | null {
      return this.listingCapOverride;
    }

    public setListingCapOverride(value: number | null): void {
      this.listingCapOverride =
        typeof value === "number" && Number.isFinite(value) && value >= 0
          ? Math.floor(value)
          : null;
    }

    /** Record a holding and offer it for sale at `askMinor` — a listing
     * is a held good with an ask (the sale layer over custody). */
    public recordListing(
      itemChattelId: string,
      consignorKey: string,
      askMinor: number,
      basis: ListingBasis = "consignment",
    ): ConsignmentListing {
      const listing = this.recordHolding(
        itemChattelId,
        consignorKey,
      ) as ConsignmentListing;
      listing.askMinor = askMinor;
      listing.basis = basis;
      return listing;
    }

    public allListings(): ConsignmentListing[] {
      return [...this.heldGoods] as ConsignmentListing[];
    }

    public removeListing(itemChattelId: string): void {
      this.removeHolding(itemChattelId);
    }

    public listingFor(itemChattelId: string): ConsignmentListing | null {
      return this.holdingFor(itemChattelId) as ConsignmentListing | null;
    }

    public listingsOf(consignorKey: string): ConsignmentListing[] {
      return this.holdingsOf(consignorKey) as ConsignmentListing[];
    }

    public activeListingCount(consignorKey: string): number {
      return this.countHeld(consignorKey);
    }

    public resolveConsigned(keyword: string): (Stuff & Containable) | null {
      return this.resolveHeld(keyword);
    }

    /* ──────────────── the offer protocol (`buy`) ──────────────── */

    /** ⭐ A shelf offers what it holds a live listing for. */
    public offers(word: string): boolean {
      return this.resolveConsigned(word) !== null;
    }

    /** ⭐ Sell a consigned good off this shelf at its listing. */
    public async sell(sale: SaleRequest): Promise<SaleOutcome> {
      const item = this.resolveConsigned(sale.word);
      if (item === null) {
        return {
          ok: false,
          line: Mml.compose`"${sale.word}" isn't for sale here.`,
          note: { kind: "controller-rejected", reason: "not-on-shelf", detail: sale.word },
        };
      }
      return this.sellListing(sale, item);
    }

    /**
     * @hook The SHOP's ask for a good held on supplier terms (economic
     * bootstrap D11), or `null` when this shelf sells nothing on terms — a
     * bare shelf sells every listing at the consignor's ask. `Stock`
     * answers its own price.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public termsAskFor(_item: Stuff, _listing: ConsignmentListing): number | null {
      return null;
    }

    /**
     * Buy a listed good — settle the ask, split to the consignor, transfer
     * the owner-stamp to the buyer, hand it over.
     */
    protected async sellListing(sale: SaleRequest, item: Stuff & Containable): Promise<SaleOutcome> {
      const giver = sale.buyer;
      const listing = MixinApi.isChattel(item) ? this.listingFor(item.getChattelId()) : null;
      if (!listing) {
        return this.refused(Mml.compose`${Mml.thing(item)} isn't for sale.`, "no-listing", sale.word);
      }
      // Pay the authoritative current owner (the consignor — the stamp never
      // moved during consignment); refuse if they've since closed their account.
      // Only a `player` owner names a payable account; a good resolving to a
      // parcel/group owner falls back to the listing's recorded consignor.
      const owner = MixinApi.isChattel(item) ? await item.chattelOwner() : null;
      const consignorKey =
        owner?.kind === "player" || owner?.kind === "organization"
          ? owner.templatePath
          : listing.consignorKey;
      const consignorPrimary = await BankingApi.primaryAccountIdOf(consignorKey);
      if (!consignorPrimary) {
        return this.refused(Mml.compose`${Mml.thing(item)} can't be sold right now.`, "consignor-no-account", sale.word);
      }
      // ⭐ The counter's IDENTITY path — a rented stall is minted from one
      // seed row and its house operates the minted counter, not the seed.
      const venuePath = (this as unknown as Stuff).getIdentityPath();
      let paid: { tail: string; receipt: SettlementReceipt } | null;
      const termsAsk = listing.basis === "terms" ? this.termsAskFor(item, listing) : null;
      if (termsAsk !== null) {
        // ⭐ Rung 0 — supplier terms (economic bootstrap D11): the buyer pays
        // the SHOP'S ask in full (the shop's sale, its taxable revenue); the
        // shop then pays the supplier what it is owed — a second, conserving
        // post, kind `payment`, category `terms` (the shop's P&L reads it as
        // cogs, the supplier's as sales; the ladder's rung-1 gate counts it).
        // Two posts, one command — the `remitDemoTax` precedent.
        paid = await EmploymentApi.settleSale(venuePath, termsAsk, termsAsk, "a purchase");
        if (!paid) return this.refusedBroke(item, sale.word);
        await this.settleTerms(venuePath, consignorPrimary, listing.askMinor, item);
      } else {
        const ask = listing.askMinor;
        const commission = Math.round(ask * this.commissionRate());
        const remainder = ask - commission;
        const splits: RemittanceSplit[] =
          remainder > 0
            ? [
                {
                  accountId: consignorPrimary,
                  amount: Money.of(remainder, BankingApi.compactCurrency()),
                  category: "consignment",
                },
              ]
            : [];
        paid = await EmploymentApi.settleSale(
          venuePath,
          ask,
          commission, // only the commission is the store's taxable revenue
          "a purchase",
          splits,
        );
        if (!paid) return this.refusedBroke(item, sale.word);
      }
      const buyer = await this.purchaserOf(giver, paid.receipt);
      if (MixinApi.isChattel(item)) {
        await item.transferChattel(buyer); // stamp → buyer (or their house)
      }
      this.handOver(item, giver); // custody → buyer
      if (MixinApi.isChattel(item)) this.removeListing(item.getChattelId());
      return this.bought(giver, item, paid.tail, buyer);
    }

    /**
     * The shop pays its supplier for a terms good that just sold: one
     * `payment` leg, the shop's account → the supplier's primary, category
     * `terms` (economic bootstrap D11). Posted as the SHOP (the house is the
     * payer — the buyer's transaction already cleared), so it rides the
     * house's own balance and the floor; a shop that cannot cover what it
     * owes keeps the debt on its book (`house book` lists it) rather than
     * failing the sale that funds it.
     */
    private async settleTerms(
      venuePath: string | null,
      supplierAccountId: string,
      owedMinor: number,
      item: Stuff,
    ): Promise<void> {
      if (!venuePath || owedMinor <= 0) return;
      const business = await EmploymentApi.ensureOperatorAt(venuePath);
      if (!business) return;
      try {
        const account = await EmploymentApi.operatingAccountOf(business);
        await BankingApi.payTerms(
          account,
          supplierAccountId,
          Money.of(owedMinor, BankingApi.compactCurrency()),
          `terms: ${item.getPresentation()}`,
        );
      } catch (err) {
        console.warn(
          `ConsignmentShelf: the house could not pay its supplier's terms — ${String(err instanceof Error ? err.message : err)}`,
        );
      }
    }

    private commissionRate(): number {
      try {
        const raw = AppApi.setting(AppSettingKeys.retailConsignmentCommissionRate);
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.15;
      } catch {
        return 0.15;
      }
    }

    /** Custody → the buyer: into their hands. */
    protected handOver(item: Stuff & Containable, giver: Stuff): void {
      if (MixinApi.isContainer(giver)) {
        ContainmentApi.move(item, giver); // narrowed to Stuff & Container
      }
    }

    /** What the buyer and the room are told of a sale. */
    protected bought(giver: Stuff, item: Stuff, paid: string, owner: Stuff, named?: string): SaleOutcome {
      const forHouse = owner === giver ? "" : ` for ${owner.getPresentation()}`;
      // A piece that merged into a stack on arrival is named as it was.
      const what = item.isDestroyed() ? Mml.text(named ?? "it") : Mml.thing(item);
      return {
        ok: true,
        self: Mml.compose`You buy ${what}${forHouse}. ${paid}`,
        peers: Mml.compose`${Mml.actor(giver)} buys ${what}${forHouse}.`,
      };
    }

    /** A refusal in words, with its reason. */
    protected refused(line: Mml, reason: string, detail: string): SaleOutcome {
      return { ok: false, line, note: { kind: "controller-rejected", reason, detail } };
    }

    /**
     * ⚠ ONE piece: the price is per piece, and a stocked heap sits on the
     * shelf as one stack — naming the heap told a broke buyer they had
     * tried to buy all three (found by the assembly browser walk).
     */
    protected refusedBroke(item: Stuff, word: string): SaleOutcome {
      const one = item.presentationPhrase().withCount(1).render();
      return this.refused(Mml.compose`You can't cover ${one} just now.`, "insufficient-funds", word);
    }
  }
  return ConsignmentShelfMixin;
}
