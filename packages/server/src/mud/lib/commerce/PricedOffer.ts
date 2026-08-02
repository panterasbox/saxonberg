/**
 * PricedOfferMixin — the shared **price-list** a venue authors as its
 * stance (Law 1: worth lives on the offer, never on the good). The bar's
 * `Menu` and the general store's `Stock` both compose it, so a priced
 * offer is one abstraction across crafting and retail.
 *
 * It owns only the price map (offer-key → minor units) + its reads; what an
 * offer *key* means (a recipe id for the bar, a stock line / item template
 * path for the store) stays the consumer's concern. Extracted verbatim from
 * `Menu`'s shipped `prices`/`priceFor` surface so the bar keeps behavioral
 * parity.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";

/** The public price-list surface a priced-offer venue exposes. */
export interface PricedOffer {
  /** The authored price (minor units) for `key`, or null if unpriced. */
  priceFor(key: string): number | null;
  /** Author/adjust the price for `key`, in minor units. */
  setPrice(key: string, minorUnits: number): void;
  /** The keys this offer prices. */
  pricedKeys(): string[];
}

export function PricedOfferMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PricedOfferMixin extends Base implements PricedOffer {
    static _mixinName = "PricedOfferMixin";

    static fieldMeta: FieldMeta = {
      prices: { persistent: true },
    };

    /**
     * Authored flat prices per offer key, in minor units (the venue's
     * willingness — an authored stance). A key with no entry is unpriced
     * (served/handled free where the consumer treats null that way — the
     * bar's backward-compatible behavior).
     */
    public prices: Record<string, number> = {};

    public priceFor(key: string): number | null {
      return this.prices[key] ?? null;
    }

    public setPrice(key: string, minorUnits: number): void {
      this.prices[key] = minorUnits;
    }

    public pricedKeys(): string[] {
      return Object.keys(this.prices);
    }
  }
  return PricedOfferMixin;
}
