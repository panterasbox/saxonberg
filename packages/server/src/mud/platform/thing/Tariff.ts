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
import { PricedOfferMixin } from '../../lib/commerce/PricedOffer';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandContext, CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import { BulkableApi } from '../../api/bulk';
import { BankingApi } from '../../api/banking';
import { Money } from '../../lib/banking/Money';
import { TemplatePaths } from '../../lib/paths';
import type { Container } from '../../lib/spatial/Container';
import type { WashCleanser } from '../../lib/cleanliness/Soilable';
import type { WashMethod } from '../../lib/cleanliness/WashPolicy';

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
 * - `transfusion` — the house transfuses the customer from its own blood
 *   bank (the clinic's blood window; the fixture also composes
 *   `DonationBankMixin`). Customer and patient are the same body, so the
 *   payer rule is satisfied exactly as `treatment`'s is.
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
export const SERVICE_KINDS = [
  'repair',
  'treatment',
  'burial',
  'transfusion',
  // ⭐ Cleanliness D26: the laundress washes what you bring her (`wash`),
  // the bathhouse draws you a bath (`bath`).
  'wash',
  'bath',
] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

/**
 * ⭐ A repair key a tariff need not price — derived from `repair` by this
 * share (repair D12, grain): tightening a slack joint is a quarter of a
 * mend, re-making a failed part twice one, re-firing a cask one.
 */
const REPAIR_KEY_SHARE: Record<string, number> = {
  repair: 1,
  tighten: 0.25,
  reforge: 2,
  refire: 1,
  // A row of staples across a crack: about a repair's work (ceramics — the
  // tinker's rivet). Unpriced, it quoted "0 zorkmids" (drive C, run 38).
  rivet: 1,
};

/** One line a quote is asked for: a priced key, said as `label`, `qty` times. */
export interface QuoteRequestLine {
  key: string;
  label: string;
  qty: number;
}

/** One line of a quote — `price` is null when the key is unpriced here. */
export interface QuoteLine extends QuoteRequestLine {
  price: number | null;
}

/** A quote: the priced lines and their total, in minor units. */
export interface Quote {
  lines: QuoteLine[];
  total: number;
}

const TariffBase = PricedOfferMixin(Thing);

/** What the house's cover came to (worded by the verb). */
export type CoverOutcome =
  | { paid: true; amount: number }
  | { paid: false; amount: number; reason: string };

export default class Tariff extends TariffBase {
  static fieldMeta: FieldMeta = {
    services: { persistent: true, authorable: true },
    labourIndexed: { persistent: true, authorable: true },
    serviceDisciplines: { persistent: true, authorable: true },
  };

  /**
   * Offer key → what it does. A key priced but not mapped here is
   * inert — which `lint:unconsumed-seams`' spirit says is worth catching,
   * so `OrderController` reports an unknown service by name rather than
   * silently declining.
   */
  public services: Record<string, string> = {};

  /**
   * ⭐ Which trade a service's hand must hold (cleanliness D26) — read off
   * the ROW, never hard-coded: the lavoir's tariff names `{wash:
   * textiles}`, so only a laundress answers; the bathhouse names none, so
   * its attendant washes your clothes too, at whatever her textiles band
   * is. Absent ⇒ any on-shift hand of this house.
   */
  public serviceDisciplines: Record<string, string> = {};

  /** The discipline a service's hand must fulfil, or undefined for any. */
  public disciplineFor(key: string): string | undefined {
    return this.serviceDisciplines[key] || undefined;
  }

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

  /**
   * ⭐ Price a list of lines — a quote BY DIAGNOSIS (repair D12, P1). Each
   * line is its key's price × qty. A repair key the row does not price
   * (`tighten`, `reforge`, `refire`) derives from `repair` by its share;
   * any other unpriced key is unpriced — null, never derived — so a quote
   * never invents a price for something the house did not set one for.
   */
  public quoteFor(lines: readonly QuoteRequestLine[]): Quote {
    const out: QuoteLine[] = [];
    let total = 0;
    for (const l of lines) {
      let unit = this.priceFor(l.key);
      if (unit === null && l.key in REPAIR_KEY_SHARE) {
        const base = this.priceFor('repair');
        unit = base === null ? null : Math.max(1, Math.round(base * REPAIR_KEY_SHARE[l.key]!));
      }
      const price = unit === null ? null : unit * Math.max(1, l.qty);
      if (price !== null) total += price;
      out.push({ ...l, price });
    }
    return { lines: out, total };
  }

  /** Every priced key that names a real service. */
  public serviceKeys(): string[] {
    return this.pricedKeys().filter((k) => this.serviceFor(k) !== null);
  }

  // ── the house's own, where the slate stands (cleanliness B48) ──
  // ⭐ A paid service is done with the HOUSE's things in the house's room —
  // its water, its soap, its copper and tubs — so the tariff, which stands
  // there, answers for them; the verb only words what they did.

  /** The room this tariff is posted in, or `null`. */
  private houseRoom(): (Stuff & Container) | null {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  /** A bulk vessel in the house's room that answers to `keyword`. */
  public houseVessel(keyword: string): Stuff | null {
    for (const s of this.houseRoom()?.getContents() ?? []) {
      const c = s as unknown as Stuff;
      if (MixinApi.isBulkable(c) && MixinApi.isPerceptible(c) && c.hasKeyword(keyword)) return c;
    }
    return null;
  }

  /** The hardness of the water the house's trough or copper holds (°dH). */
  public houseWaterHardness(): number {
    for (const s of this.houseRoom()?.getContents() ?? []) {
      const c = s as unknown as Stuff;
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty() || !slot.getMaterial()?.hasTag('water')) continue;
      return slot.getHardnessDgh() ?? 8;
    }
    return 8;
  }

  /**
   * The house's cleanser in its room — what the hand reaches for (`lye`, or
   * `soap`), else soap, else nothing (a water wash).
   */
  public houseCleansers(reachesFor: 'lye' | 'soap'): WashCleanser[] {
    const room = this.houseRoom();
    if (!room) return [];
    const want = reachesFor === 'lye' ? 'alkali-strong' : 'surfactant';
    let soap: WashCleanser | null = null;
    for (const s of room.getContents()) {
      const c = s as unknown as Stuff;
      const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
      if (!m) continue;
      const row = m.getCleanser();
      if (!row) continue;
      const found = { row, materialPath: m.getTemplatePath() ?? null, source: c };
      if (row.action === want) return [found];
      if (row.action === 'surfactant' && soap === null) soap = found;
    }
    return soap ? [soap] : [];
  }

  /**
   * The quote for laundering: a wash per kind of dirt the hand names, and a
   * hot-wash line when her method boils (cleanliness D26).
   */
  public quoteLaundry(key: string, kinds: readonly string[], method: WashMethod): Quote {
    const lines: QuoteRequestLine[] = [{ key, label: 'wash', qty: Math.max(1, kinds.length) }];
    if (method.waterK >= 333) lines.push({ key: 'hot-wash', label: 'hot', qty: 1 });
    return this.quoteFor(lines);
  }

  /**
   * ⭐ The house pays a customer its posted `cover` for a thing it ruined
   * (cleanliness B26) — through `BankingApi.indemnify`, which refuses to pay
   * the house's own people. The outcome is worded by the verb.
   */
  public async payCover(customer: Stuff, what: string): Promise<CoverOutcome> {
    const cover = this.priceFor('cover') ?? 0;
    if (!(cover > 0)) return { paid: false, amount: 0, reason: 'no-cover' };
    const house = await this.house();
    const account = await this.houseAccount();
    const payeeKey = customer.getIdentityPath() ?? '';
    if (!house || !account || !payeeKey) return { paid: false, amount: cover, reason: 'no-house' };
    const paid = await BankingApi.indemnify({
      houseAccountId: account,
      housePath: house.getOrganizationPath(),
      payeeKey,
      amount: Money.of(cover, BankingApi.compactCurrency()),
      memo: `cover: ${what}`,
    }).catch(() => ({ ok: false as const, reason: 'no-persistence' as const }));
    return paid.ok
      ? { paid: true, amount: cover }
      : { paid: false, amount: cover, reason: paid.reason };
  }

}
