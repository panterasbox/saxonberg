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
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import { MixinApi } from "../../api/mixin";
import { SecurityApi } from "../../api/security";

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

/** A consignment listing — a held good offered for **sale** at a price. */
export interface ConsignmentListing extends HeldGood {
  /** The asking price, in minor units. */
  askMinor: number;
}

/**
 * The listing-registry surface — the held-goods base plus the **sale**
 * layer (the ask + the per-consignor cap). A coat-check rack composes only
 * {@link HeldGoodsShelf}; a store shelf composes this.
 */
export interface ConsignmentShelf extends HeldGoodsShelf {
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
  ): ConsignmentListing;
  removeListing(itemChattelId: string): void;
  listingFor(itemChattelId: string): ConsignmentListing | null;
  listingsOf(consignorKey: string): ConsignmentListing[];
  activeListingCount(consignorKey: string): number;
  /** A shelf good, matched by keyword, that carries a live listing. */
  resolveConsigned(keyword: string): (Stuff & Containable) | null;
}

export function ConsignmentShelfMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ConsignmentShelfMixin
    extends HeldGoodsMixin(Base)
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
    ): ConsignmentListing {
      const listing = this.recordHolding(
        itemChattelId,
        consignorKey,
      ) as ConsignmentListing;
      listing.askMinor = askMinor;
      return listing;
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
  }
  return ConsignmentShelfMixin;
}
