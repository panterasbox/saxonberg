/**
 * ForSaleMixin — ⭐ **a thing that has something for sale**:
 * the ONE protocol `buy` speaks. `buy <thing>` binds the thing in front
 * of you that composes this, asks it which of the sellers standing here
 * offers the word (`sellerFor`), and hands that seller the whole sale
 * (`sell`) — every refusal comes back in words, before any money moves.
 * The controller narrows by this mixin and nothing else, so a new way of
 * selling is a new implementer and never a new branch in `buy`.
 *
 * Shipped implementers:
 *   - **the consignment shelf** (`ConsignmentShelfMixin`) — a good a
 *     consignor left there, sold at their ask;
 *   - **the shop counter** (`Stock`) — goods off its shelf, and a priced good
 *     its house owns lying in its room (a boat on the shingle: too big for
 *     any shelf, sold where she lies);
 *   - **the yard's hull book** (`/system/transport/thing/HullBook`) — title
 *     to a ship from a finite list of hulls on the stocks.
 *
 * ⚠ Worth lives on the OFFER (Law 1) and a sale settles through
 * `EmploymentApi.settleSale` to a venue its house operates — an implementer
 * never invents a payment path. ⛔ Not a price list: `PricedOfferMixin` is
 * the price map a menu, a tariff and a counter share; this is the act.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Note } from "@saxonberg/types";
import type { SettlementReceipt } from "../../api/banking";
import { BankingApi } from "../../api/banking";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { Mml } from "../../api/mml";

/** One sale, as `buy` hands it to the seller. */
export interface SaleRequest {
  /** Who is buying — the one who typed `buy`. */
  buyer: Stuff;
  /** What they asked for, as they typed it. */
  word: string;
  /**
   * Ask the buyer a question in words (a ship's name) — rejects when they
   * will not answer. `null` when there is nobody to ask (a scripted caller).
   */
  ask: ((question: string) => Promise<string>) | null;
}

/** How a sale ended: what the buyer and the room are told, or the refusal. */
export type SaleOutcome =
  | { ok: true; self: Mml; peers: Mml }
  | { ok: false; line: Mml; note: Note };

export interface ForSale {
  /** ⭐ Does this offer what `word` names — even if none is left to sell today? */
  offers(word: string): boolean;
  /**
   * The seller standing here that offers `word`: this one when it does,
   * else another `ForSale` in the same place that does, else this one (whose
   * refusal then names the good). A market square holds several stalls.
   */
  sellerFor(word: string): Stuff & ForSale;
  /** ⭐ The whole sale — every refusal returned, before any money moves. */
  sell(sale: SaleRequest): Promise<SaleOutcome>;
  /**
   * Whom a purchase is for: the live Business whose operating account the
   * receipt routed from (a purchasing holder ran `wallet use house`), else
   * the buyer. Cash always buys personally.
   */
  purchaserOf(buyer: Stuff, receipt: SettlementReceipt): Promise<Stuff>;
}

export function ForSaleMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class ForSaleMixin extends Base implements ForSale {
    static _mixinName: string = "ForSaleMixin";

    /** @hook Override: what this sells. Default: nothing. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public offers(_word: string): boolean {
      return false;
    }

    public sellerFor(word: string): Stuff & ForSale {
      const self = this as unknown as Stuff & ForSale;
      if (this.offers(word)) return self;
      const here = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (here === null || !MixinApi.isContainer(here)) return self;
      for (const other of here.getContents() as Stuff[]) {
        if (other !== self && MixinApi.isForSale(other) && other.offers(word)) return other;
      }
      return self;
    }

    /** @hook Override: the sale. Default: nothing is sold here. */
    public async sell(sale: SaleRequest): Promise<SaleOutcome> {
      return {
        ok: false,
        line: Mml.compose`"${sale.word}" isn't for sale here.`,
        note: { kind: "controller-rejected", reason: "not-on-shelf", detail: sale.word },
      };
    }

    public async purchaserOf(buyer: Stuff, receipt: SettlementReceipt): Promise<Stuff> {
      if (receipt.method !== "credential" || !receipt.accountId) return buyer;
      const ownerKey = await BankingApi.ownerKeyOf(receipt.accountId);
      if (!ownerKey || ownerKey === buyer.getIdentityPath()) return buyer;
      const live = StuffApi.findByTemplatePath(ownerKey);
      return live && MixinApi.isBusiness(live) ? live : buyer;
    }
  }
  return ForSaleMixin;
}
