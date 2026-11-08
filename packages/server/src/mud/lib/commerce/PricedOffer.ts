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
import type { Fault } from "../../api/crafting";
import type { ActPlan } from "../craft/ActPlan";
import type { CraftingFailure } from "../craft/CraftingDecline";
import { BankingApi } from "../../api/banking";
import { EmploymentApi, type BusinessStuff } from "../../api/employment";
import { MixinApi } from "../../api/mixin";
import { Money } from "../banking/Money";
import { Currency } from "../banking/Currency";

/**
 * ⭐ `order`, asked of the board that prices it (controllers-are-io D11): the
 * subject is a view arg, and the words are the controller's.
 */
export interface OrderRequest {
  /** Who asks — the customer, and the payer (`settle` derives no other). */
  by: Stuff;
  /** The whole phrase (`old fashioned`). */
  phrase: string;
  /** Its first word, lowercase — a service key (`repair`). */
  key: string;
  /** `for <subject>` — what the service acts on. */
  subject: Stuff | null;
  /** `with <brand>`. */
  brand?: string;
  /** Where it is asked. */
  location: Stuff | null;
}

/** Why an order was refused — the note's reason, and the switch's census. */
export type OrderReason =
  | 'not-offered'
  | 'unattended'
  | 'not-on-menu'
  | 'no-bank'
  | 'not-a-body'
  | 'no-compatible-unit'
  | 'nothing-to-treat'
  | 'no-grave'
  | 'burial-refused'
  | 'no-subject'
  | 'no-hand'
  | 'nothing-mendable'
  | 'nothing-to-repair'
  | 'cannot-pay'
  | 'no-tub'
  | 'not-hot';

/** What an order refused with needs for its words. */
export interface OrderRefusalFacts {
  /** The phrase, for what is not on the menu. */
  phrase?: string;
  /** The thing that was refused. */
  subject?: Stuff;
  /** The hand who looked it over. */
  who?: string;
  /** The hand's findings, when none of them can be mended. */
  faults?: readonly Fault[];
  /** The quote already named, when the refusal is that they cannot pay it. */
  quote?: OrderQuote;
  /** Why they cannot pay, as the banking surface says it. */
  line?: string;
  /** A craft's refusal, or a mend's, in the crafting surface's own terms. */
  craft?: CraftingFailure;
  /** Whose refusal `craft` is: the look before a mend, the mend, or a make. */
  stage?: 'look' | 'mend' | 'make';
}

/** A refused order. */
export interface OrderRefusal {
  ok: false;
  /** {@link OrderReason}, or a crafting failure's own reason (`facts.craft`). */
  reason: OrderReason | CraftingFailure['reason'];
  facts: OrderRefusalFacts;
}

/** A price the customer must say yes to, named before the money moves. */
export type OrderQuote =
  | {
      kind: 'repair';
      who: string;
      faults: readonly Fault[];
      mendable: readonly Fault[];
      /** The price of each `mendable` line, in step; null when unpriced. */
      prices: readonly (number | null)[];
      total: number;
    }
  | { kind: 'wash'; who: string; said: string; total: number };

/** What an order's begin words need (a durative service), or its quote. */
export type OrderBegin =
  | { kind: 'now' }
  | OrderQuote
  | { kind: 'transfusion' }
  | { kind: 'bath'; who: string };

/** What came of an order. */
export type OrderDone = { tail: string } & (
  | { kind: 'drink'; drink: Stuff }
  | { kind: 'treatment'; treated: string }
  | { kind: 'burial'; body: string }
  | { kind: 'repair'; who: string; item: string; short: boolean }
  | { kind: 'wash'; who: string; what: string; band: string; ruined: readonly string[]; cover: CoverOutcome | null }
  | { kind: 'transfusion'; reacted: boolean }
  | { kind: 'bath' }
);

/** What the house did about a thing it ruined (`Tariff.payCover`). */
export type CoverOutcome =
  | { paid: true; amount: number }
  | { paid: false; amount: number; reason: string };

/** What an order answers. */
export type OrderAnswer = ActPlan<OrderBegin, OrderDone, OrderRefusal> | OrderRefusal;

/** What a settled collection reports back. */
export interface Collected {
  /** True when money actually moved. */
  paid: boolean;
  /** A short rendered note (`(4s 2d)`), or null when nothing was taken. */
  note: string | null;
}

/** The public price-list surface a priced-offer venue exposes. */
export interface PricedOffer {
  /**
   * Is `key` an order this board takes? ⭐ What the binder's several tariffs
   * are narrowed by (blood build D6: two houses share a ward). Default no.
   */
  offersOrder(key: string): boolean;
  /**
   * ⭐⭐ `order`: what this board does when asked. The default refuses — a
   * thing that only prices (a shelf, a fare) has no orders to take; `Tariff`
   * and `CommerceMenu` override it.
   */
  orderPlanFor(req: OrderRequest): Promise<OrderAnswer>;
  /** The ask (minor units) for `key`, or null if unpriced — derived by a Stock's stocking rule, authored elsewhere. */
  priceFor(key: string): number | null;
  /** The AUTHORED base price for `key` (what `priceFor` derives from), or null. */
  basePriceFor(key: string): number | null;
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
  /**
   * ⭐ Take a COMPUTED charge (minor units) — a quote by diagnosis, not a
   * row's flat price (repair D12). `collect(key)` is this with the key's
   * price. The same house, the same settlement, the same "on the house"
   * on any failure.
   */
  collectMinor(amount: number, reason: string): Promise<Collected>;
  /**
   * The house this offer's money goes to — the fixture's own operator
   * first (a blood window), else whoever operates the room it stands in.
   * Null when nobody does.
   */
  house(): Promise<BusinessStuff | null>;
  /** The house's operating account, or null when there is none. */
  houseAccount(): Promise<string | null>;
  /**
   * ⭐ Can the person asking pay `amount` (minor units) — by credential or
   * coin? Asked BEFORE a service is performed (repair P1): a mend nobody
   * can pay for is refused, not done on the house.
   */
  canSettle(amount: number): boolean;
  /**
   * ⭐ Why the person asking could NOT pay `amount` now, in words — or
   * `null` when they can. Honest about the one case that is not poverty:
   * the implant's payment credential is session-durable, so after a
   * restart a returning player's implant carries no linked account until
   * `bank open` re-links it (found by the cleanliness browser walk: a
   * player with 397 in the bank was told they had no money).
   */
  payRefusal(amount: number): string | null;
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

    /** See {@link PricedOffer.offersOrder}. */
    public offersOrder(_key: string): boolean {
      return false;
    }

    /** See {@link PricedOffer.orderPlanFor}. */
    public async orderPlanFor(req: OrderRequest): Promise<OrderAnswer> {
      return { ok: false, reason: 'not-offered', facts: { phrase: req.phrase } };
    }

    public priceFor(key: string): number | null {
      return this.prices[key] ?? null;
    }

    public basePriceFor(key: string): number | null {
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
     * the bar's old `charge` so a `Menu` and a `Tariff` share it.
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
      return this.collectMinor(price, reason);
    }

    public async house(): Promise<BusinessStuff | null> {
      return (await this.houseAndVenue())?.business ?? null;
    }

    public async houseAccount(): Promise<string | null> {
      const business = await this.house();
      if (!business) return null;
      try {
        return await EmploymentApi.operatingAccountOf(business);
      } catch {
        return null;
      }
    }

    public canSettle(amount: number): boolean {
      if (amount <= 0) return true;
      return BankingApi.canSettle(Money.of(amount, BankingApi.compactCurrency()));
    }

    public payRefusal(amount: number): string | null {
      if (this.canSettle(amount)) return null;
      const cred = BankingApi.activeCredential();
      if (cred && cred.getActiveAccount() === null) {
        return "Your implant has no account linked to it — `bank open` at your bank links it again.";
      }
      return "You haven't the money for that.";
    }

    /** The house, and the place the fee is attributed to. */
    private async houseAndVenue(): Promise<{ business: BusinessStuff; venue: Stuff } | null> {
      const self = this as unknown as Stuff;
      // ⭐ Self-first (blood build D6): when the priced fixture is ITSELF an
      // operating location (a blood window whose Business names the fixture,
      // not the room), the fee attributes to that fixture's house — the same
      // fixture-first rule `operatorsAt`/`resolveHouse` already use. This is
      // what lets two houses share one room (the practice keeps the ward;
      // the window keeps its counter). Fall back to the container otherwise,
      // byte-identical for every single-house room.
      const selfPath = self.getIdentityPath() ?? self.getTemplatePath();
      const own = selfPath ? await EmploymentApi.ensureOperatorAt(selfPath) : null;
      if (own) return { business: own, venue: self };
      const container = MixinApi.isContainable(self) ? self.getContainer() : null;
      const venuePath = container?.getTemplatePath();
      if (!container || !venuePath) return null;
      const business = await EmploymentApi.ensureOperatorAt(venuePath);
      return business ? { business, venue: container } : null;
    }

    public async collectMinor(amount: number, reason: string): Promise<Collected> {
      if (!Number.isFinite(amount) || amount <= 0) return { paid: false, note: null };
      const price = Math.round(amount);
      const found = await this.houseAndVenue();
      if (!found) return { paid: false, note: null };
      const { business, venue } = found;
      let venueAccount: string;
      try {
        venueAccount = await EmploymentApi.operatingAccountOf(business);
      } catch {
        return { paid: false, note: null };
      }
      const money = Money.of(price, BankingApi.compactCurrency());
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
      await BankingApi.remitDemoTax(venueAccount, money, venue ?? undefined);
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
