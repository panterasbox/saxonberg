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

/** A brokerage record — a good on the shelf for sale on its owner's behalf. */
export interface ConsignmentListing {
  /** This listing's durable id. */
  listingId: string;
  /** The consigned good's chattel id (the ownership join key). */
  itemChattelId: string;
  /** The consignor's durable key at consign time (payout + cap grouping). */
  consignorKey: string;
  /** The asking price, in minor units. */
  askMinor: number;
  /**
   * A **custody-only** listing — checked, not for sale (the weapons-check
   * rack, the bar-fight build). Custody moved to the shelf and the
   * owner-stamp stayed put exactly as a consignment, but `buy` refuses it:
   * it's held for its owner to reclaim, never brokered. Absent = an
   * ordinary for-sale listing.
   */
  heldOnly?: boolean;
}

/** The listing-registry surface the consignment shelf exposes. */
export interface ConsignmentShelf {
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
    heldOnly?: boolean,
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
  class ConsignmentShelfMixin extends Base implements ConsignmentShelf {
    static _mixinName = "ConsignmentShelfMixin";

    static fieldMeta: FieldMeta = {
      consignmentListings: { persistent: true, runtimeState: true },
      listingCapOverride: { persistent: true, authorable: true },
    };

    /** The active brokerage listings on this shelf. */
    public consignmentListings: ConsignmentListing[] = [];

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

    /** Mint + record a listing (fresh, collision-resistant id). */
    public recordListing(
      itemChattelId: string,
      consignorKey: string,
      askMinor: number,
      heldOnly?: boolean,
    ): ConsignmentListing {
      const listing: ConsignmentListing = {
        listingId: `cl-${SecurityApi.uuid()}`,
        itemChattelId,
        consignorKey,
        askMinor,
      };
      if (heldOnly) listing.heldOnly = true;
      this.consignmentListings.push(listing);
      return listing;
    }

    public removeListing(itemChattelId: string): void {
      this.consignmentListings = this.consignmentListings.filter(
        (l) => l.itemChattelId !== itemChattelId,
      );
    }

    public listingFor(itemChattelId: string): ConsignmentListing | null {
      return (
        this.consignmentListings.find(
          (l) => l.itemChattelId === itemChattelId,
        ) ?? null
      );
    }

    public listingsOf(consignorKey: string): ConsignmentListing[] {
      return this.consignmentListings.filter(
        (l) => l.consignorKey === consignorKey,
      );
    }

    public activeListingCount(consignorKey: string): number {
      return this.listingsOf(consignorKey).length;
    }

    public resolveConsigned(keyword: string): (Stuff & Containable) | null {
      const contents = (this as unknown as Stuff & Container).getContents();
      for (const item of contents) {
        if (
          MixinApi.isPerceptible(item) &&
          item.hasKeyword(keyword) &&
          MixinApi.isChattel(item) &&
          this.listingFor(item.getChattelId())
        ) {
          return item;
        }
      }
      return null;
    }
  }
  return ConsignmentShelfMixin;
}
