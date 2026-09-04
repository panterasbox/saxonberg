/**
 * WaybillRegistry — **the paper**, and the reason it is load-bearing
 * rather than decorative.
 *
 * A **bill of lading** is what a carrier needs to prove what they took
 * and a shipper needs to prove what they sent: *what, how much, from
 * where, to where, whose, and at what declared value*. It is not a
 * reporting feature. It happens to be the datum every freight statistic
 * in this design reads from, which is the whole of D12 — no reporting
 * subsystem, no new store, no aggregate.
 *
 * ## ⭐⭐ It is what makes a fungible shipment nameable
 *
 * The gig substrate's `Condition` refuses `Globbable` outright — *"a
 * merging stack has no stable identity"* — and supply needs are
 * overwhelmingly fungible: litres of gin, kilos of ore. A gig for
 * "twenty bottles" is unpostable. So the consignment is a **discrete,
 * chattel-stamped crate**, and the bill of lading is what says what is
 * in it. No new condition template, no vocabulary edit, no engine seam.
 *
 * ## ⚠⚠ Filed by the CARRIAGE, not by the verb
 *
 * Every completed carriage files one, whatever path produced it —
 * `ship` at a counter, the `hauls` brain, or **a player who claimed a
 * gig and delivered it**. D16 makes the gig the dominant path, so paper
 * filed only by `ship` would leave the whole reporting spine blind to
 * most freight in the realm, and *"edge traffic is a count over the
 * paper"* would count only counter traffic.
 *
 * ## The record IS the coverage
 *
 * Bills are path-keyed under the filing business's own branch, so a
 * depot's records cover **exactly** what it handled and nothing else —
 * read by prefix, structurally (AC17). Which is also the honest
 * consequence of shipping without customs: **private books do not
 * aggregate.** Nobody sees the realm's trade, only their own, and the
 * first institution that can see across is not the state — it is the
 * depot, whose coverage is its market share.
 *
 * See [docs/subsystems/logistics.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { EventApi } from '@saxonberg/server/mud/api/event';
import { Events, type ContractSettledEvent } from '@saxonberg/server/mud/lib/events';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { SecurityApi } from '@saxonberg/server/mud/api/security';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** The platform's document kind for a filed bill. */
export const BILL_OF_LADING_KIND = 'bill-of-lading';
/** The platform's document kind for a bailee's acknowledgement. */
export const WAREHOUSE_RECEIPT_KIND = 'warehouse-receipt';

/** The branch under a business where its bills live. */
const BILLS_DIR = 'bills-of-lading';
/** …and its receipts. */
const RECEIPTS_DIR = 'warehouse-receipts';

/**
 * A bill of lading, as it round-trips through the document store.
 *
 * The six fields the requirements name are the first six here, and they
 * are the ones a dispute is about. `legs` is the seventh and it is the
 * one nobody asks for until they want to know which stretch of road is
 * busy.
 */
export interface BillOfLading {
  /** Durable id, unique within the filing business's branch. */
  billId: string;
  /** WHAT — a presentation phrase, and the crate's template path. */
  what: string;
  goodsPath: string;
  /** HOW MUCH — a count, or a quantity phrase for continuous matter. */
  howMuch: string;
  /** FROM and TO — durable location template paths. */
  from: string;
  to: string;
  /** WHOSE — the shipper's durable key. */
  shipper: string;
  /** The carrier's own durable path — who took it. */
  carrier: string;
  /** AT WHAT DECLARED VALUE — minor units. Zero = undeclared. */
  declaredValueMinor: number;
  /**
   * ⭐ The consecutive node pairs the carriage actually travelled, as
   * `"<from>|<to>"`. **Edge traffic is a count over these**, and there
   * is no traffic counter stored anywhere in the realm (D18/AC16a):
   * the road and the reporting are one system read two ways.
   */
  legs: string[];
  /** Game-seconds when it was filed. */
  filedAtS: number;
  /** How the carriage happened — `ship`, `gig` or `brain`. */
  via: CarriagePath;
}

/**
 * ⚠ The three ways freight moves, and the reason this field exists at
 * all: a spine that could only see one of them would be blind to the
 * dominant one.
 */
export type CarriagePath = 'ship' | 'gig' | 'brain';

/** A bailee's acknowledgement that it holds named goods for a depositor. */
export interface WarehouseReceipt {
  receiptId: string;
  /** What is held, and whose it is. */
  what: string;
  goodsPath: string;
  depositor: string;
  /** The warehouse's own durable path. */
  bailee: string;
  /**
   * ⭐ **Bearer or registered** — the credential split, reused. A bearer
   * receipt is a Thing you can steal and whoever holds it may claim the
   * goods; a registered one is a record naming a person and cannot be
   * taken. The same document of title, two custody models.
   */
  bearer: boolean;
  filedAtS: number;
}

/** What a `house freight` read asks for. */
export interface FreightQuery {
  from?: string;
  to?: string;
  /** Game-seconds; bills filed before this are excluded. */
  sinceS?: number;
}

/** One row of the traffic count — an edge and what crossed it. */
export interface EdgeTraffic {
  from: string;
  to: string;
  crossings: number;
}

export default class WaybillRegistry extends PostRegistrationMixin(Idea) {
  /**
   * ⭐⭐ **Every completed carriage files the paper, whatever path
   * produced it.**
   *
   * `ship` at a counter and the `hauls` brain file directly. **A player
   * who claims a haul gig and delivers it** goes through the contract
   * substrate, which announces `contract.settled` and names no trade —
   * so this is where the third path joins the other two.
   *
   * ⚠ Without it the reporting spine (D12, D18, AC16, AC16a, AC17) is
   * blind to the DOMINANT carriage path: D16 makes the gig where most
   * freight moves, and *"edge traffic is a count over the paper"* would
   * be counting counter traffic and NPC runs only.
   *
   * ⚠ It files only for gigs that named an ORIGIN and a destination —
   * a bounty to fetch something from wherever is not carriage, and a
   * bill with no `from` on it is not a bill.
   */
  public async postRegister(): Promise<void> {
    EventApi.on<ContractSettledEvent>(Events.ContractSettled, (payload) => {
      void this.fileForGig(payload);
    });
  }

  /** File the bill a settled haul gig earns. */
  public async fileForGig(gig: ContractSettledEvent): Promise<void> {
    if (gig.origin === '' || gig.destination === '') return;
    const carrier = await this.resolveBusiness(gig.issuer);
    if (!carrier) return;
    await this.file(carrier, {
      what: leafOf(gig.itemPath) || 'a consignment',
      goodsPath: gig.itemPath,
      howMuch: '1',
      from: gig.origin,
      to: gig.destination,
      shipper: gig.issuer,
      declaredValueMinor: 0,
      // ⚠ The legs are the ONE thing a gig cannot know: nobody recorded
      // which way the carrier went, and inventing a route would put a
      // guess into the traffic count. An honest empty is better than a
      // plausible fiction — the count says what it can see.
      legs: [],
      via: 'gig',
    });
  }

  private async resolveBusiness(
    path: string,
  ): Promise<(Stuff & Business) | null> {
    if (path === '') return null;
    const biz = await StuffApi.singleton<Stuff>(path).catch(() => null);
    return biz && MixinApi.isBusiness(biz) ? biz : null;
  }

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'WaybillRegistry is a system singleton and cannot be destructed',
    };
  }

  /* ─────────────────────────── filing ─────────────────────────── */

  /**
   * File a bill of lading against a carrier, validated.
   *
   * ⚠ Throws with a named cause rather than returning false: filing a
   * malformed bill is a programming error at the caller, and a silent
   * `false` is how a shipment goes missing. The `WaterRightRegistry`
   * shape exactly.
   */
  public async file(
    carrier: Stuff & Business,
    bill: Omit<BillOfLading, 'billId' | 'filedAtS' | 'carrier'> &
      Partial<Pick<BillOfLading, 'billId'>>,
  ): Promise<string> {
    const carrierPath = carrier.getTemplatePath() ?? '';
    const problems: string[] = [];
    if (carrierPath === '') problems.push('the carrier has no durable path');
    if (bill.what.trim() === '') problems.push('it does not say WHAT moved');
    if (bill.howMuch.trim() === '') problems.push('it does not say HOW MUCH');
    if (bill.from.trim() === '') problems.push('it does not say where FROM');
    if (bill.to.trim() === '') problems.push('it does not say where TO');
    if (bill.shipper.trim() === '') problems.push('it does not say WHOSE it is');
    if (!Number.isFinite(bill.declaredValueMinor) || bill.declaredValueMinor < 0) {
      problems.push('its declared value is not a number of minor units');
    }
    if (problems.length > 0) {
      throw new Error(
        `WaybillRegistry.file: refusing a bill — ${problems.join('; ')}`,
      );
    }

    const billId = bill.billId ?? SecurityApi.uuid();
    const record: BillOfLading = {
      ...bill,
      billId,
      carrier: carrierPath,
      filedAtS: WorldClockApi.getNow().rawValue(),
    };
    const path = `${carrierPath}/${BILLS_DIR}/${billId}`;
    // ⚠ `saveAsBusiness`, not `save`: the gate on `save` admits the
    // parcel OWNER, and a bill of lading is issued by a clerk on behalf
    // of a carrier. Making every clerk a landowner is the error the
    // release path's comment names.
    await DocumentApi.saveAsBusiness(
      carrier,
      path,
      BILL_OF_LADING_KIND,
      record as unknown as Record<string, unknown>,
    );
    return path;
  }

  /**
   * Issue a warehouse receipt against a bailee.
   *
   * ⚠ A depot that holds goods **owes a duty of care**, which is the
   * whole of what storage is in this build. It is deliberately NOT a
   * priced scarce good: discrete containment has no capacity in this
   * engine (capacity is a property of a *bearer's body*, and a
   * warehouse has no bearer), so nothing here fills up, charges rent or
   * turns anyone away. See the warehousing non-goal.
   */
  public async issueReceipt(
    bailee: Stuff & Business,
    receipt: Omit<WarehouseReceipt, 'receiptId' | 'filedAtS' | 'bailee'> &
      Partial<Pick<WarehouseReceipt, 'receiptId'>>,
  ): Promise<string> {
    const baileePath = bailee.getTemplatePath() ?? '';
    if (baileePath === '') {
      throw new Error(
        'WaybillRegistry.issueReceipt: the bailee has no durable path',
      );
    }
    if (receipt.depositor.trim() === '') {
      throw new Error(
        'WaybillRegistry.issueReceipt: a receipt with no depositor is a ' +
          'receipt nobody can redeem',
      );
    }
    const receiptId = receipt.receiptId ?? SecurityApi.uuid();
    const record: WarehouseReceipt = {
      ...receipt,
      receiptId,
      bailee: baileePath,
      filedAtS: WorldClockApi.getNow().rawValue(),
    };
    const path = `${baileePath}/${RECEIPTS_DIR}/${receiptId}`;
    await DocumentApi.saveAsBusiness(
      bailee,
      path,
      WAREHOUSE_RECEIPT_KIND,
      record as unknown as Record<string, unknown>,
    );
    return path;
  }

  /* ─────────────────────────── reading ─────────────────────────── */

  /**
   * Every bill a business filed, newest first, optionally narrowed.
   *
   * ⭐ Read **by prefix under the business's own branch**, which is what
   * makes a depot's records cover exactly what it handled and no more
   * (AC17). There is no cross-business read here and there is not meant
   * to be one: private books do not aggregate.
   */
  public async freightOf(
    carrier: Stuff & Business,
    query: FreightQuery = {},
  ): Promise<BillOfLading[]> {
    const carrierPath = carrier.getTemplatePath() ?? '';
    if (carrierPath === '') return [];
    const docs = await DocumentApi.list(`${carrierPath}/${BILLS_DIR}`);
    return docs
      .map((d) => billOf(d.getData()))
      .filter((b): b is BillOfLading => b !== null)
      .filter((b) => (query.from ? b.from === query.from : true))
      .filter((b) => (query.to ? b.to === query.to : true))
      .filter((b) => (query.sinceS ? b.filedAtS >= query.sinceS : true))
      .sort((a, b) => b.filedAtS - a.filedAtS);
  }

  /**
   * ⭐⭐ **Edge traffic, derived from the paper, ranked** — and no
   * traffic counter is stored anywhere (AC16a).
   *
   * Nobody authors that the valley road is busy. It is busy because the
   * ore goes down it, and **if the mine closes it stops being busy on
   * its own**. The road and the reporting are one system read two ways,
   * and the gap between what a road was BUILT for (authored: mode gates,
   * grade, the edge budget) and what it CARRIES (this) is the story
   * engine — a fine road nobody uses, a rut carrying more than it should.
   */
  public async trafficOf(
    carrier: Stuff & Business,
    query: FreightQuery = {},
  ): Promise<EdgeTraffic[]> {
    const counts = new Map<string, number>();
    for (const bill of await this.freightOf(carrier, query)) {
      for (const leg of bill.legs) {
        counts.set(leg, (counts.get(leg) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([leg, crossings]) => {
        const [from, to] = leg.split('|');
        return { from: from ?? '', to: to ?? '', crossings };
      })
      .sort((a, b) => b.crossings - a.crossings);
  }

  /** Every receipt a bailee has outstanding, newest first. */
  public async receiptsOf(
    bailee: Stuff & Business,
  ): Promise<WarehouseReceipt[]> {
    const baileePath = bailee.getTemplatePath() ?? '';
    if (baileePath === '') return [];
    const docs = await DocumentApi.list(`${baileePath}/${RECEIPTS_DIR}`);
    return docs
      .map((d) => receiptOf(d.getData()))
      .filter((r): r is WarehouseReceipt => r !== null)
      .sort((a, b) => b.filedAtS - a.filedAtS);
  }

  /**
   * The route's legs in the shape a bill carries them — `"<from>|<to>"`
   * per consecutive pair.
   */
  public static legsOf(nodes: readonly string[]): string[] {
    const out: string[] = [];
    for (let i = 0; i + 1 < nodes.length; i += 1) {
      out.push(`${nodes[i]}|${nodes[i + 1]}`);
    }
    return out;
  }
}

/* ── module-private readers (the WaterRightRegistry shape) ───────── */

function billOf(data: Record<string, unknown>): BillOfLading | null {
  if (typeof data.billId !== 'string' || data.billId === '') return null;
  return {
    billId: data.billId,
    what: String(data.what ?? ''),
    goodsPath: String(data.goodsPath ?? ''),
    howMuch: String(data.howMuch ?? ''),
    from: String(data.from ?? ''),
    to: String(data.to ?? ''),
    shipper: String(data.shipper ?? ''),
    carrier: String(data.carrier ?? ''),
    declaredValueMinor: Number(data.declaredValueMinor ?? 0),
    legs: Array.isArray(data.legs) ? data.legs.map(String) : [],
    filedAtS: Number(data.filedAtS ?? 0),
    via: (data.via as CarriagePath) ?? 'ship',
  };
}

function receiptOf(data: Record<string, unknown>): WarehouseReceipt | null {
  if (typeof data.receiptId !== 'string' || data.receiptId === '') return null;
  return {
    receiptId: data.receiptId,
    what: String(data.what ?? ''),
    goodsPath: String(data.goodsPath ?? ''),
    depositor: String(data.depositor ?? ''),
    bailee: String(data.bailee ?? ''),
    bearer: data.bearer === true,
    filedAtS: Number(data.filedAtS ?? 0),
  };
}

/** The last path segment, for the prose on the paper. */
function leafOf(path: string): string {
  if (path === '') return '';
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf.replace(/-/g, ' ');
}
