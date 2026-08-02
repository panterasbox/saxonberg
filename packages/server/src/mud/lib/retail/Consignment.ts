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
}

/** The listing-registry surface the consignment shelf exposes. */
export interface ConsignmentShelf {
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
  class ConsignmentShelfMixin extends Base implements ConsignmentShelf {
    static _mixinName = "ConsignmentShelfMixin";

    static fieldMeta: FieldMeta = {
      consignmentListings: { persistent: true },
    };

    /** The active brokerage listings on this shelf. @runtimeState */
    public consignmentListings: ConsignmentListing[] = [];

    /** Mint + record a listing (fresh, collision-resistant id). */
    public recordListing(
      itemChattelId: string,
      consignorKey: string,
      askMinor: number,
    ): ConsignmentListing {
      const listing: ConsignmentListing = {
        listingId: `cl-${SecurityApi.uuid()}`,
        itemChattelId,
        consignorKey,
        askMinor,
      };
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
