/**
 * HeldGoods — **custody without a sale**: the coat check, whole. A held
 * good moves *custody* to a fixture while its owner-stamp stays with its
 * owner (custody ≠ ownership, the whole point of the chattel core). The
 * record is a join — "X is held here for Y" — never an ownership pointer:
 * "whose is it" is always answered by `ChattelApi.ownerOf`.
 *
 * `HeldGoodsMixin` is the base a coat-check rack composes alone and a
 * consignment shelf composes under its sale layer
 * (`ConsignmentShelfMixin`, `./ConsignmentShelf`).
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import { MixinApi } from "../../api/mixin";
import { SecurityApi } from "../../api/security";
import { BankingApi } from "../../api/banking";
import { StuffApi } from "../../api/stuff";
import type { Organization } from "../employment/Organization";


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
  /**
   * The Business `actor` acts as right now — the one whose operating
   * account is active in the wallet AND that `actor` buys for — or `null`
   * (acting personally). The principal a consign or reclaim is made as.
   */
  actingHouseOf(actor: Stuff): Promise<Stuff | null>;
  /**
   * ⭐⭐ May `actor` dispose of `item` here — list it, or take it back?
   * (controller-liquidity D9, C63.) ONE rule for both acts, so whatever a
   * hand may put up it may take down: the good is titled to `actor`, to the
   * house `actor` acts as, or to an organization above that house; or this
   * fixture's own record says that principal left it here.
   */
  mayDisposeOf(actor: Stuff, item: Stuff): Promise<boolean>;
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

    public async actingHouseOf(actor: Stuff): Promise<Stuff | null> {
      const active = BankingApi.activeCredential()?.getActiveAccount() ?? null;
      if (!active) return null;
      const ownerKey = await BankingApi.ownerKeyOf(active);
      if (!ownerKey || ownerKey === actor.getIdentityPath()) return null;
      const live = StuffApi.findByTemplatePath(ownerKey);
      if (!live || !MixinApi.isBusiness(live)) return null;
      const mine = MixinApi.isEmployed(actor) ? await actor.buysFor() : [];
      return mine.includes(live) ? live : null;
    }

    public async mayDisposeOf(actor: Stuff, item: Stuff): Promise<boolean> {
      const house = await this.actingHouseOf(actor);
      const keys = new Set<string>();
      const self = actor.getIdentityPath();
      if (self) keys.add(self);
      const housePath = house?.getIdentityPath();
      if (housePath) keys.add(housePath);
      // This fixture's own book: who left it here.
      if (MixinApi.isChattel(item)) {
        const held = this.holdingFor(item.getChattelId());
        if (held && keys.has(held.consignorKey)) return true;
      }
      const owner = MixinApi.isChattel(item) ? await item.chattelOwner() : null;
      if (owner?.kind !== "player" && owner?.kind !== "organization") return false;
      if (keys.has(owner.templatePath)) return true;
      // A corpo's yard sells the corpo's goods: title held ABOVE the house.
      if (owner.kind === "organization" && house) {
        const chain = await (house as Stuff & Organization).organizationChain();
        return chain.some((o) => o.getOrganizationPath() === owner.templatePath);
      }
      return false;
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
