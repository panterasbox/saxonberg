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
import {
  PricedOfferMixin,
  type CoverOutcome,
  type OrderAnswer,
  type OrderDone,
  type OrderRefusal,
  type OrderRequest,
  type Offering,
} from '../../lib/commerce/PricedOffer';
import { CraftingApi, NOBODY_TO_WORK, type Fault } from '../../api/crafting';
import { ConditionApi } from '../../api/condition';
import { EmploymentApi } from '../../api/employment';
import { BLOOD_DEFAULTS } from '../../lib/vitals/Blood';
import { CompetenceBand } from '../../lib/advancement/CompetenceBand';
import { WashPolicy } from '../../lib/cleanliness/WashPolicy';
import type { ActDone } from '../../lib/craft/ActPlan';
import Garment from './equipment/Garment';
import Tub from './Tub';
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
 * on purpose: the orchestration for each lives in `orderPlanFor` below, so
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

/** What a grave looks like from the outside, for the burial arm. */
const GRAVE_KEYWORDS = /\bgrave\b|\bplot\b|\bcrypt\b|\bniche\b/i;

/**
 * ⭐ The resolution tokens a fully-stocked clinic can supply (D5) — a
 * bandage, a splint, a surgeon's kit, water, a fire. `rest` (a bruise
 * wants time) is deliberately absent: the house cannot sell you time.
 */
const CLINIC_SUPPLIES = new Set(['dressing', 'setting', 'surgery', 'fluid', 'warmth', 'rinsing']);
/** A staffed clinic treats competently — a middling-to-good article. */
const CLINIC_EFFICACY = 0.7;
/** How long a bath takes, ms — the water runs at its own rate. */
const BATH_MS = 12000;

/** The priced line a mendable fault is quoted under (repair D12). */
function quoteLineFor(f: Fault): QuoteRequestLine {
  const key =
    f.action === 'reforged'
      ? 'reforge'
      : f.action === 'tightened'
        ? 'tighten'
        : f.action === 'refired'
          ? 'refire'
          : f.action === 'riveted'
            ? 'rivet'
            : 'repair';
  return { key, label: f.named, qty: 1 };
}

export default class Tariff extends TariffBase {
  static fieldMeta: FieldMeta = {
    services: { persistent: true, authorable: true },
    labourIndexed: { persistent: true, authorable: true },
    serviceDisciplines: { persistent: true, authorable: true },
  };

  /**
   * Offer key → what it does. A key priced but not mapped here is
   * inert — which `lint:unconsumed-seams`' spirit says is worth catching,
   * so `order` reports an unknown service by name rather than
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

  /** ⭐ The services this house does, in key order, each at its price. */
  public override async offerings(_reader: Stuff): Promise<readonly Offering[]> {
    return this.serviceKeys()
      .sort()
      .map((key) => ({ kind: 'service' as const, key, price: this.priceFor(key) }));
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

  /** See {@link PricedOffer.offersOrder}: a key this board does as a service. */
  public override offersOrder(key: string): boolean {
    return this.serviceFor(key) !== null;
  }

  /**
   * ⭐⭐ **Perform one priced service, then collect for it.**
   *
   * Keyed by a closed vocabulary precisely so a venue is rows. A clinic that
   * could define its own service kinds would need pack code, and then a second
   * clinic would need pack code too, which is the second-instance test failing.
   *
   * ⚠ **The customer is the one who asks.** `BankingLogic.settle` derives the
   * payer from execution context and takes no payer parameter, so a service is
   * BOUGHT (`order revive`) rather than billed to a bystander mid-`treat`.
   * That is a real constraint and the right one: letting a player initiate a
   * debit against another player is a consent question far larger than a
   * priced clinic.
   */
  public override async orderPlanFor(req: OrderRequest): Promise<OrderAnswer> {
    const kind = this.serviceFor(req.key);
    if (!kind) return { ok: false, reason: 'not-offered', facts: { phrase: req.phrase } };
    // Stand the operator up first — the same lazy standup a drink does, so a
    // cold venue's first customer finds a roster rather than a decline.
    const venuePath = req.location?.getTemplatePath();
    if (venuePath) await EmploymentApi.ensureOperatorAt(venuePath);
    switch (kind) {
      case 'transfusion':
        return this.transfusionPlan(req);
      case 'bath':
        return this.bathPlan(req);
      case 'wash':
        return this.washPlan(req);
      case 'repair':
        return this.repairPlan(req);
      case 'treatment':
        return this.treatmentPlan(req);
      case 'burial':
        return this.burialPlan(req);
    }
  }

  /** The note's tail: what was taken, in the settlement's own words. */
  private static tailOf(note: string | null): string {
    return note ? ` ${note}` : '';
  }

  /**
   * ⭐ The clinic's product: the house treats what is wrong with you. The
   * customer and the patient are the SAME body, which is the only shape the
   * payer rule allows. What the house supplies is the thing the condition
   * wants (`resolution.by`) — that is what you are paying for. It is not a
   * cure-all: it resolves ONE condition, the worst it can reach, exactly as a
   * `treat` would.
   */
  private treatmentPlan(req: OrderRequest): OrderAnswer {
    const { by, key } = req;
    if (!MixinApi.isVitals(by)) return { ok: false, reason: 'not-a-body', facts: {} };
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: { kind: 'now' },
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const treated = ConditionApi.treatWorstResolvable(by, CLINIC_SUPPLIES, CLINIC_EFFICACY);
        if (!treated) return { ok: false, reason: 'nothing-to-treat', facts: {} };
        const collected = await this.collect(key, 'a treatment');
        return { ok: true, facts: { kind: 'treatment', treated, tail: Tariff.tailOf(collected.note) } };
      },
    };
  }

  private burialPlan(req: OrderRequest): OrderAnswer {
    const body = req.subject;
    if (!body || !MixinApi.isPostmortem(body)) return { ok: false, reason: 'not-a-body', facts: { subject: body ?? undefined, phrase: 'burial' } };
    const loc = req.location;
    const grave =
      loc && MixinApi.isContainer(loc)
        ? ((loc as Stuff & Container)
            .getContents()
            .find(
              (s) => MixinApi.isContainer(s) && GRAVE_KEYWORDS.test(s.getPresentation()),
            ) as (Stuff & Container) | undefined)
        : undefined;
    if (!grave) return { ok: false, reason: 'no-grave', facts: {} };
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: { kind: 'now' },
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const name = body.getPresentation();
        if (!body.interIn(grave)) return { ok: false, reason: 'burial-refused', facts: {} };
        const collected = await this.collect(req.key, 'a burial');
        return { ok: true, facts: { kind: 'burial', body: name, tail: Tariff.tailOf(collected.note) } };
      },
    };
  }

  /**
   * ⭐⭐ The paid mend is somebody's WORK (repair D12): the on-shift hand looks
   * it over, names each fault and its price BEFORE any money is taken, the
   * customer says yes or no, and the hand mends it at THEIR band — their name
   * on the mend, their wage for the piece. Nobody on shift is a refusal, never
   * a free repair; a quote the customer cannot pay is refused before the work,
   * not done on the house.
   */
  private async repairPlan(req: OrderRequest): Promise<OrderAnswer> {
    const item = req.subject;
    if (!item) return { ok: false, reason: 'no-subject', facts: { phrase: 'repair' } };
    const hand = await CraftingApi.fulfillingHand(req.by, this);
    if (!hand) return { ok: false, reason: 'no-hand', facts: { line: NOBODY_TO_WORK } };
    const look = await CraftingApi.diagnose({ item, hand });
    if (!look.ok) return { ok: false, reason: look.reason, facts: { craft: look, stage: 'look' } };
    const who = hand.getPresentation() ?? 'They';
    const mendable = look.faults.filter((f) => f.mendable);
    if (mendable.length === 0) {
      return {
        ok: false,
        reason: look.faults.length > 0 ? 'nothing-mendable' : 'nothing-to-repair',
        facts: { who, faults: look.faults },
      };
    }
    const quote = this.quoteFor(mendable.map(quoteLineFor));
    const named = {
      kind: 'repair' as const,
      who,
      faults: look.faults,
      mendable,
      prices: quote.lines.map((l) => l.price),
      total: quote.total,
    };
    const cannotPay = this.payRefusal(quote.total);
    if (cannotPay) {
      return { ok: false, reason: 'cannot-pay', facts: { quote: named, line: cannotPay } };
    }
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: named,
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const outcome = await CraftingApi.repair({ item, hand });
        if (!outcome.ok) {
          return { ok: false, reason: outcome.reason, facts: { craft: outcome, stage: 'mend' } };
        }
        const collected = await this.collectMinor(quote.total, 'a repair');
        if (collected.paid) await this.payPiecework(hand);
        return {
          ok: true,
          facts: {
            kind: 'repair',
            who,
            item: item.getPresentation(),
            short: outcome.mended.some((o) => o.result === 'short'),
            tail: Tariff.tailOf(collected.note),
          },
        };
      },
    };
  }

  /**
   * ⭐ The laundress (cleanliness D26): the hand reads the garment at her band,
   * names a price, and — on a yes — washes it HER way, in the water in the room
   * with the house's soap. What she does decides what it does to the cloth;
   * when it comes back ruined, the house pays its posted cover (never to one
   * of its own).
   */
  private async washPlan(req: OrderRequest): Promise<OrderAnswer> {
    const { by, key } = req;
    const item = req.subject;
    if (!item || !(item instanceof Garment)) {
      return { ok: false, reason: 'no-subject', facts: { phrase: 'wash' } };
    }
    const hand = await CraftingApi.fulfillingHand(by, this, this.disciplineFor(key));
    if (!hand) return { ok: false, reason: 'no-hand', facts: { line: NOBODY_TO_WORK } };
    const band = MixinApi.isAdvancing(hand)
      ? await hand.competenceBandFor('textiles')
      : CompetenceBand.FLOOR;
    // ⭐ The objects' (B48): what the hand reads of the cloth, her method,
    // the house's quote, its soap and water, the cloth's laundering.
    const policy = new WashPolicy(band);
    const look = item.describeForLaundress(policy);
    const method = policy.methodFor(look.subject);
    const quote = this.quoteLaundry(key, look.kinds, method);
    const who = hand.getPresentation() ?? 'They';
    const named = { kind: 'wash' as const, who, said: look.said, total: quote.total };
    const cannotPay = this.payRefusal(quote.total);
    if (cannotPay) {
      return { ok: false, reason: 'cannot-pay', facts: { quote: named, line: cannotPay } };
    }
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: named,
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const { outcome, ruined } = await item.launderBy(policy, {
          hand,
          customer: by,
          hardnessDgh: this.houseWaterHardness(),
          cleansers: this.houseCleansers(method.reachesFor),
        });
        const what = item.getPresentation();
        const collected = await this.collectMinor(quote.total, 'a wash');
        if (collected.paid) await this.payPiecework(hand);
        const cover: CoverOutcome | null = ruined.length > 0 ? await this.payCover(by, what) : null;
        return {
          ok: true,
          facts: {
            kind: 'wash',
            who,
            what,
            band: outcome.band,
            ruined,
            cover,
            tail: Tariff.tailOf(collected.note),
          },
        };
      },
    };
  }

  /**
   * ⭐ The blood window's product (blood build D6), durative (the
   * time-as-expense pass): the house transfuses the customer from its own bank
   * over `TRANSFUSE_DURATION_S`, engaging the CUSTOMER — the same game-time as
   * doing it themselves, since paying must not buy out of the body-time. We
   * check a match up front (so a no-match refuses at once, not after the wait),
   * resolve who issued it (the custody deed), then take + give + collect at
   * completion. A barge-in gives and charges nothing.
   */
  private transfusionPlan(req: OrderRequest): OrderAnswer {
    const { by, key } = req;
    // Narrowed once and named: the plan's completion runs later, out of `this`'s narrowing.
    const bank = MixinApi.isDonationBank(this) ? this : null;
    if (!bank) return { ok: false, reason: 'no-bank', facts: {} };
    if (!MixinApi.isVitals(by)) return { ok: false, reason: 'not-a-body', facts: { phrase: 'transfusion' } };
    if (!bank.hasCompatibleUnitFor(by)) return { ok: false, reason: 'no-compatible-unit', facts: {} };
    const issuer = this.windowIssuerAt(req.location);
    return {
      ok: true,
      durationMs: BLOOD_DEFAULTS.TRANSFUSE_DURATION_S * 1000,
      effortW: 0,
      facts: { kind: 'transfusion' },
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const outcome = await bank.transfuseInto(by, issuer);
        // The last match went while they waited — honest, and unbilled.
        if (!outcome) return { ok: false, reason: 'no-compatible-unit', facts: {} };
        const collected = await this.collect(key, 'a transfusion');
        return {
          ok: true,
          facts: { kind: 'transfusion', reacted: outcome.reaction > 0, tail: Tariff.tailOf(collected.note) },
        };
      },
    };
  }

  /**
   * ⭐ The bathhouse (cleanliness D28): the attendant on shift fills a tub from
   * the hot copper, and the customer bathes in it — durative on the customer's
   * body, as a transfusion is. ⭐ Paid at the desk, IN the command (found by the
   * browser walk: a fee taken in the completion runs outside the command frame
   * where there is no acting payer). A bath you cannot pay for is refused before
   * the tub is filled for you.
   */
  private async bathPlan(req: OrderRequest): Promise<OrderAnswer> {
    const { by, key } = req;
    const hand = await CraftingApi.fulfillingHand(by, this, this.disciplineFor(key));
    if (!hand) return { ok: false, reason: 'no-hand', facts: { line: NOBODY_TO_WORK } };
    if (!MixinApi.isAttired(by)) return { ok: false, reason: 'not-a-body', facts: { phrase: 'bath' } };
    // ⭐ The house's vessels, and the tub's own draw (B48).
    const copper = this.houseVessel('copper');
    const tub = this.houseVessel('tub');
    if (!copper || !tub || !(tub instanceof Tub)) return { ok: false, reason: 'no-tub', facts: { phrase: 'none' } };
    const price = this.priceFor(key) ?? 0;
    const cannotPay = this.payRefusal(price);
    if (cannotPay) return { ok: false, reason: 'cannot-pay', facts: { line: cannotPay } };
    const drawn = tub.drawFrom(copper, 80);
    if (!drawn.ok) {
      return drawn.reason === 'not-hot' || drawn.reason === 'no-water'
        ? { ok: false, reason: 'not-hot', facts: {} }
        : { ok: false, reason: 'no-tub', facts: {} };
    }
    const collected = await this.collect(key, 'a bath');
    if (price > 0 && !collected.paid) {
      return { ok: false, reason: 'cannot-pay', facts: { line: "You haven't the money for that." } };
    }
    if (collected.paid) await this.payPiecework(hand);
    const cleansers = this.houseCleansers('soap');
    const waterK = drawn.waterK;
    const hardnessDgh = this.houseWaterHardness();
    return {
      ok: true,
      durationMs: BATH_MS,
      effortW: 0,
      facts: { kind: 'bath', who: hand.getPresentation() ?? 'The attendant' },
      onComplete: () => {
        if (!by.isDestroyed() && MixinApi.isHygienic(by)) {
          by.bathe({ waterK, hardnessDgh, cleansers, effort: 2 }, 120);
        }
        return { ok: true, facts: { kind: 'bath', tail: Tariff.tailOf(collected.note) } };
      },
    };
  }

  /**
   * The hand is paid by the seat's basis (repair D12): a piece-rate seat is
   * paid for this piece, out of the house the fee just went to; a time-wage
   * seat is paid by the shift and is not paid twice.
   */
  private async payPiecework(hand: Stuff): Promise<void> {
    const house = await this.house();
    const key = hand.getIdentityPath();
    if (!house || !key || !MixinApi.isEmployed(hand)) return;
    const housePath = house.getOrganizationPath();
    const job = hand.getActiveEmployments().find((e) => e.organizationPath === housePath);
    if (!job || house.getPosition(job.positionKey)?.basis() !== 'per-settlement') return;
    try {
      await EmploymentApi.settlePiecework(house, key, 1);
    } catch (err) {
      console.warn('Tariff: piecework not paid:', err);
    }
  }

  /**
   * The on-shift person who runs this window, for the custody deed (D16).
   * Best-effort: the fixture's operating Business, an employee of it present in
   * the room. Null → the recipient's deed stands alone (an institutional issue;
   * a Business keeps no chronicle).
   */
  private windowIssuerAt(loc: Stuff | null): Stuff | null {
    const path = this.getIdentityPath() ?? this.getTemplatePath();
    const business = path ? EmploymentApi.businessAt(path) : null;
    const orgPath = business?.getTemplatePath();
    if (!orgPath || !loc || !MixinApi.isContainer(loc)) return null;
    const ids = new Set(EmploymentApi.employeesOf(orgPath));
    for (const occ of (loc as Stuff & Container).getContents() as Stuff[]) {
      const id = occ.getIdentityPath();
      if (id && ids.has(id)) return occ;
    }
    return null;
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
