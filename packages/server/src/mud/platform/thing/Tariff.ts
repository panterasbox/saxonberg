/**
 * ⭐⭐ Tariff — **a priced list of SERVICES**, and the one kernel
 * primitive Movement IV needed.
 *
 * The `Menu`'s sibling. A `Menu` prices **recipes** (make me this) and the
 * retail `Stock` counter prices **items** (sell me that). Neither can
 * price *doing something to a thing you already have*, and that is what a
 * repair shop, a clinic and a necropolis sell.
 *
 * ⚠ **The gap this closes was total.** No shipped priced key resolved to
 * anything but a recipe or a stock line, so paying for a repair, a
 * treatment or a burial had **no path at all** — and the one paid service
 * in the whole tree (the TPA fare) was pack code rather than content. The
 * wreckage a fight leaves could not become anybody's work, which is the
 * whole of "the violent players need the non-violent ones".
 *
 * A tariff is a fixture in a room, exactly like a menu — a slate on a
 * wall, a board by the door. It composes {@link PricedOfferMixin} for the
 * price map and adds one thing: **what each priced key MEANS**, from a
 * closed kernel vocabulary. `order repair` at one smithy and `order
 * repair` at another do the same thing for different money, which is what
 * makes a competitive market for these services possible at all.
 *
 * ⭐ **A second clinic is a `Tariff` row and a `Business` row.** That is
 * the second-instance test, and it is why the vocabulary is closed and
 * the orchestration is the kernel's: a venue that could define its own
 * service kinds would need pack code, and then a second one would need
 * pack code too.
 *
 * ⚠ Not on `Business`: prices live on fixtures (retail.md), and a
 * business with two counters prices them differently.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { PricedOfferMixin } from '../../lib/commerce/PricedOffer';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandContext, CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';

/**
 * ⭐ **The labour index dials** (D13). `LABOUR_INDEX` is how strongly a
 * treatment's price bends with the customer's wage × the harm's shortfall;
 * `REFERENCE_WAGE` is the wage that reads as "1×" (a typical clinic wage).
 * So a wage-`REFERENCE_WAGE` body with a fully-lost capacity pays `2× base`,
 * and an unhurt or unemployed body pays base.
 */
const LABOUR_INDEX = 1;
const REFERENCE_WAGE = 6;

/**
 * ⭐ **The closed vocabulary of what a priced key can DO.** Kernel-owned
 * on purpose: the orchestration for each lives in `OrderController`, so
 * a venue authors rows and never code.
 *
 * - `repair` — mend a damaged thing the customer is carrying.
 * - `treatment` — the house treats what is wrong with the customer.
 * - `burial` — inter a corpse (the necropolis).
 *
 * ⚠⚠ **`revive` is deliberately NOT here, and the reason is doctrine
 * rather than an oversight.** A paid revival was the obvious third
 * service, and it is unbuildable as an `order`: `requiresEmbodied` names
 * *buy* as one of the embodied acts a shade loses, and its own docstring
 * says why — *"Death costs embodied agency and the price of coming back;
 * it never costs a seat as a person."* A shade cannot purchase anything.
 *
 * That leaves two routes, and **both are real design this build should
 * not decide in passing**: a third-party payer (somebody buys your
 * revival for you), which `BankingLogic.settle` cannot express because it
 * derives the payer from execution context — and letting one player
 * initiate a debit against another is a consent question in its own
 * right; or an option on the shade's own `passage`, which is the
 * mortality subsystem's decision. → mortality-slate.
 *
 * ⭐ The clinic still has a product: a wounded person walks in and buys
 * `treatment`, where the customer and the patient are the same body,
 * which is exactly the shape the payer rule allows.
 */
export const SERVICE_KINDS = ['repair', 'treatment', 'burial'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

const TariffBase = PricedOfferMixin(DetailedMixin(Thing));

export default class Tariff extends TariffBase {
  static fieldMeta: FieldMeta = {
    services: { persistent: true, authorable: true },
    labourIndexed: { persistent: true, authorable: true },
  };

  /**
   * Offer key → what it does. A key priced but not mapped here is
   * inert — which `lint:unconsumed-seams`' spirit says is worth catching,
   * so `OrderController` reports an unknown service by name rather than
   * silently declining.
   */
  public services: Record<string, string> = {};

  /**
   * ⭐⭐ **Price a treatment by the labour it restores** (D13). When true,
   * `priceFor` bends a `treatment` service's price by the CUSTOMER's wage ×
   * the harm's shortfall — the clinic near the mine emerges from who walks
   * in, not from an authored surcharge. Default false (a flat tariff).
   */
  public labourIndexed = false;

  public isLabourIndexed(): boolean {
    return this.labourIndexed;
  }
  public setLabourIndexed(value: boolean): void {
    this.labourIndexed = value;
  }

  /**
   * ⭐ The multiplier a labour-indexed treatment applies to `base`, for a
   * given body: `1 + LABOUR_INDEX × (wage / REFERENCE_WAGE) × shortfall`.
   * `wage` is the body's highest current position wage (0 if unemployed →
   * multiplier 1); `shortfall` is `1 − minCapacityScalar` (0 if unhurt →
   * multiplier 1). Unit-tested; `priceFor` composes it.
   */
  public labourIndexFor(body: Stuff): number {
    let wage = 0;
    if (MixinApi.isEmployed(body)) {
      for (const e of body.getEmployments()) {
        if (e.status !== 'on-shift' && e.status !== 'off-shift') continue;
        const org = StuffApi.findByTemplatePath(e.organizationPath);
        if (!org || !MixinApi.isOrganization(org)) continue;
        const rate = org.getPosition(e.positionKey)?.wageRate ?? 0;
        if (rate > wage) wage = rate;
      }
    }
    const shortfall = MixinApi.isVitals(body)
      ? Math.max(0, 1 - body.minCapacityScalar())
      : 0;
    return 1 + LABOUR_INDEX * (wage / REFERENCE_WAGE) * shortfall;
  }

  /**
   * ⭐⭐ A treatment's price is the customer's price when the tariff is
   * labour-indexed (D13). The customer is the acting principal (the one
   * who `order`s), so both the wage and the shortfall are read off them —
   * `menu` therefore quotes YOUR price. Everything else is the flat base.
   */
  public override priceFor(key: string): number | null {
    const base = super.priceFor(key);
    if (base === null) return null;
    if (!this.labourIndexed || this.serviceFor(key) !== 'treatment') {
      return base;
    }
    const customer = ExecutionContextApi.getActingAuthor() as Stuff | null;
    if (!customer) return base;
    return Math.round(base * this.labourIndexFor(customer));
  }

  /** The commerce surface, exactly the `Menu`'s: read it, order off it. */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/retail/menu.yaml', 'platform/cmd/retail/order.yaml'],
    environment: [
      'platform/cmd/retail/menu.yaml',
      'platform/cmd/retail/order.yaml',
    ],
  };

  /** What kind of service `key` is, or null when the key is not a service. */
  public serviceFor(key: string): ServiceKind | null {
    const kind = this.services[key];
    return SERVICE_KINDS.includes(kind as ServiceKind)
      ? (kind as ServiceKind)
      : null;
  }

  /** Every priced key that names a real service. */
  public serviceKeys(): string[] {
    return this.pricedKeys().filter((k) => this.serviceFor(k) !== null);
  }

}
