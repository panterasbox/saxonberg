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
import type { Stuff } from "../stuff/Stuff";
import type { Charge } from "../../api/banking";
import { BankingApi } from "../../api/banking";
import { EmploymentApi } from "../../api/employment";
import { MixinApi } from "../../api/mixin";
import { Money } from "../banking/Money";
import { Currency } from "../banking/Currency";

/** What a settled collection reports back. */
export interface Collected {
  /** True when money actually moved. */
  paid: boolean;
  /** A short rendered note (`(4s 2d)`), or null when nothing was taken. */
  note: string | null;
}

/** The public price-list surface a priced-offer venue exposes. */
export interface PricedOffer {
  /** The authored price (minor units) for `key`, or null if unpriced. */
  priceFor(key: string): number | null;
  /** Author/adjust the price for `key`, in minor units. */
  setPrice(key: string, minorUnits: number): void;
  /** The keys this offer prices. */
  pricedKeys(): string[];
  /**
   * ⭐⭐ **Take payment for `key` from `customer`, into the account of
   * whatever business operates where this fixture stands.**
   *
   * The fixture that prices is the fixture that collects — the same
   * settlement path for a bar's `Menu` and a clinic's `Tariff`, because
   * pricing a thing and being paid for it are one act.
   */
  collect(key: string, reason: string): Promise<Collected>;
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

    /**
     * ⭐⭐ **The one settlement path**, lifted out of
     * `OrderController.charge` so a `Menu` and a `Tariff` share it.
     *
     * A controller-private that only the bar could reach was why **no
     * shipped priced key resolved to anything but a recipe or a stock
     * line** — paying for a repair, a treatment or a burial had no path
     * at all, and the one paid *service* in the tree (the TPA fare) was
     * pack code rather than content. Folding it onto the object that
     * carries the price is what makes a priced service authorable.
     *
     * Income keys on the **Business** account (the same account shift
     * wages come out of), so the P&L reflects both sides;
     * `ensureOperatorAt` stands the business up lazily on the first sale.
     * Credential first, then cash — a coin-holder pays with coin — and
     * both remit the demo tax.
     *
     * ⚠ **Every failure is "on the house", never a throw.** No operator,
     * no authored bank, no funds: the customer is served and nothing is
     * taken. A service that errored out mid-treatment because the patient
     * was broke would be a worse world than a free clinic.
     *
     * ⚠⚠ **The payer is the ACTING PRINCIPAL** — `BankingLogic.settle`
     * derives it from execution context and there is no payer parameter.
     * That is a real constraint and a good one: **the customer is the one
     * who asks.** It is why a service is bought through `order` rather
     * than billed to a bystander mid-`treat`; letting one player initiate
     * a debit against another is a consent question far bigger than a
     * priced clinic, and it should not be decided in passing.
     */
    public async collect(key: string, reason: string): Promise<Collected> {
      const price = this.priceFor(key);
      if (price === null || price <= 0) return { paid: false, note: null };
      const self = this as unknown as Stuff;
      const venue = MixinApi.isContainable(self) ? self.getContainer() : null;
      const venuePath = venue?.getTemplatePath();
      if (!venuePath) return { paid: false, note: null };
      const business = await EmploymentApi.ensureOperatorAt(venuePath);
      if (!business) return { paid: false, note: null };
      let venueAccount: string;
      try {
        venueAccount = await EmploymentApi.operatingAccountOf(business);
      } catch {
        return { paid: false, note: null };
      }
      const money = Money.of(price, Currency.compact());
      const charge: Charge = {
        amount: money,
        reason,
        presented: true,
        payeeAccountId: venueAccount,
        category: "sales",
      };
      const splits = await EmploymentApi.flowSplitsFor(business, price);
      if (splits.length > 0) charge.splits = splits;
      let receipt;
      try {
        receipt = await BankingApi.settle(charge, { kind: "credential" });
      } catch {
        try {
          receipt = await BankingApi.settle(charge, { kind: "cash" });
        } catch {
          return { paid: false, note: null };
        }
      }
      await BankingApi.remitDemoTax(venueAccount, money);
      return {
        paid: true,
        note: receipt.corpoKey
          ? `(${money.render()}, ${receipt.corpoKey})`
          : `(${money.render()})`,
      };
    }
  }
  return PricedOfferMixin;
}
