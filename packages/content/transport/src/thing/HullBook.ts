/**
 * HullBook — ⭐ **the yard's hull book** (harbors review 1): the hulls a
 * shipyard has on the stocks, each one a ship it will sell — title, not a
 * good off a shelf. The farmstead pattern: the plat book lists named lots
 * and a desk fronts the sale; here the book IS the fixture you buy at (it
 * lies in the yard's shed and affords `buy`), and it lists a FINITE,
 * authored set of hulls — `{slot, kind, priceMinor}` — each sold once.
 *
 * `buy smack` at the book (the offer protocol, `ForSaleMixin`):
 *   1. the yard's house is brought current — a closed yard sells nothing;
 *   2. the first hull of that kind still on the stocks — none left, *"the
 *      yard has no hull on the stocks"*;
 *   3. the register her flag is entered in — the one the government over
 *      the yard keeps (`Government.shipRegister`); none, no sale;
 *   4. her NAME, asked of the buyer, refused and asked again while the
 *      register has it — all before any money moves;
 *   5. the money (`settleSale` to this book, a venue of the yard's house);
 *   6. she is COMMISSIONED: her identity minted `<kind>/<serial>`, her
 *      record seeded, then `Ship.commission` — named, entered in the
 *      register in the buyer's name (her deed: all sixty-four shares),
 *      keyway + key, her buyer her master, stood up from her kind's plan and
 *      brought alongside the yard's quay (`quay:`);
 *   7. the slot is SOLD — kept in this book's own record, so a sold-out
 *      yard stays sold out across a restart. No faucet: nothing restocks.
 *
 * ⭐ The slot is claimed synchronously before the money awaits, and given
 * back if the money does not come — two buyers naming at once cannot both
 * be sold the last hull.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import ShipRegister from '@saxonberg/server/mud/platform/idea/ShipRegister';
import { ForSaleMixin, type SaleOutcome, type SaleRequest } from '@saxonberg/server/mud/lib/retail/ForSale';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { SecurityApi } from '@saxonberg/server/mud/api/security';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** How many names a buyer is asked for before the sale is given up. */
const NAME_TRIES = 5;

/** One hull on the stocks, as the book's row authors it. */
export interface HullSlot {
  /** Where she lies in the yard, in words — `the near stocks`. Unique in the book. */
  slot: string;
  /** Her kind — a `Ship` row of a kind (`/stuff/idea/Ship/smack`). */
  kind: string;
  /** Her price, whole minor units. */
  priceMinor: number;
}

/** A hull sold off the book — the line the book keeps. */
export interface HullSale {
  /** The slot she was built on. */
  slot: string;
  /** Her identity (`<kind>/<serial>`). */
  ship: string;
  /** Her name in the register. */
  name: string;
  /** Who bought her (an identity path). */
  buyer: string;
  /** The world second she was sold. */
  soldAtS: number;
}

export default class HullBook extends PersistableMixin(ForSaleMixin(Good)) {
  /** ⭐ A ship is bought at the book. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/retail/buy.yaml'],
  };

  static fieldMeta: FieldMeta = {
    hulls: { persistent: true, authorable: true },
    quay: { persistent: true, authorable: true, ref: 'identity:relation' },
    sold: { persistent: true, runtimeState: true },
  };

  /** The hulls on the stocks — authored, finite. */
  protected hulls: HullSlot[] = [];
  /** The landing a commissioned hull is brought alongside. */
  protected quay: string | null = null;
  /** The hulls sold off this book. */
  protected sold: HullSale[] = [];

  public getHulls(): HullSlot[] {
    return this.hulls.map((h) => ({ ...h }));
  }

  /** The applier's Phase-1 setter: every hull names its slot (unique), a kind and a whole positive price. */
  public setHulls(value: unknown): void {
    if (value === null || value === undefined) {
      this.hulls = [];
      return;
    }
    if (!Array.isArray(value)) throw new Error('HullBook.hulls: expected a list of { slot, kind, priceMinor }');
    const out: HullSlot[] = [];
    for (const [i, raw] of value.entries()) {
      const h = raw as Partial<HullSlot> | null;
      if (!h || typeof h.slot !== 'string' || h.slot.trim() === '') throw new Error(`HullBook.hulls[${i}]: a hull names the slot she lies on`);
      if (typeof h.kind !== 'string' || h.kind === '') throw new Error(`HullBook.hulls[${i}] '${h.slot}': a hull names her kind`);
      if (typeof h.priceMinor !== 'number' || !Number.isInteger(h.priceMinor) || h.priceMinor <= 0) {
        throw new Error(`HullBook.hulls[${i}] '${h.slot}': a price is a positive whole number of minor units`);
      }
      if (out.some((o) => o.slot === h.slot)) throw new Error(`HullBook.hulls: two hulls on '${h.slot}'`);
      out.push({ slot: h.slot.trim(), kind: h.kind, priceMinor: h.priceMinor });
    }
    this.hulls = out;
  }

  public getQuay(): string | null {
    return this.quay;
  }

  public setQuay(v: string | null): void {
    this.quay = typeof v === 'string' && v !== '' ? v : null;
  }

  /** The hulls sold off this book, a copy. */
  public getSold(): HullSale[] {
    return this.sold.map((s) => ({ ...s }));
  }

  /** The hulls still on the stocks. */
  public onTheStocks(): HullSlot[] {
    return this.hulls.filter((h) => !this.isSold(h.slot)).map((h) => ({ ...h }));
  }

  /* ──────────────── the offer protocol (`buy`) ──────────────── */

  /** ⭐ The book offers every hull it lists — sold out or not (the refusal then says so). */
  public override offers(word: string): boolean {
    return this.hulls.some((h) => answersTo(h, word));
  }

  public override async sell(sale: SaleRequest): Promise<SaleOutcome> {
    const { buyer, word } = sale;
    const venue = (this as unknown as Stuff).getIdentityPath() ?? '';
    const house = await EmploymentApi.ensureOperatorAt(venue);
    if (house !== null && MixinApi.isBusiness(house) && house.isClosed()) {
      return no(Mml.compose`There's nobody in the yard just now.`, 'unattended', 'closed');
    }
    if (!this.hulls.some((h) => answersTo(h, word))) return no(Mml.compose`"${word}" isn't for sale here.`, 'not-on-shelf', word);
    const first = this.firstOnTheStocks(word);
    if (first === null) return no(Mml.compose`The yard has no hull on the stocks.`, 'sold-out', word);
    const leaf = leafOf(first.kind);
    if (this.quay === null) throw new Error(`HullBook ${venue}: a hull is sold with nowhere to bring her alongside (quay:)`);
    const cls = await StuffApi.classForRef(first.kind).catch(() => null);
    if (cls === null || !(cls === Ship || cls.prototype instanceof Ship)) {
      throw new Error(`HullBook ${venue}: '${first.kind}' on ${first.slot} is not a ship of a kind`);
    }

    // ── her register first, her name, then the money, then her ──
    const register = await this.registerHere();
    if (register === null) {
      return no(Mml.compose`Nobody here keeps a register of ships, and a ship is sold into one.`, 'no-register', word);
    }
    if (sale.ask === null || !buyer.getIdentityPath()) {
      return no(Mml.compose`A ship is named by the one who buys her.`, 'no-namer', word);
    }
    if (!BankingApi.canSettle(Money.of(first.priceMinor, BankingApi.compactCurrency()))) {
      return no(Mml.compose`You can't cover a ${leaf} just now.`, 'insufficient-funds', word);
    }
    const flag = register.getGovernmentKey();
    const polity = GovernmentApi.getGovernment(flag)?.name ?? flag;
    let name = '';
    for (let tries = 0; tries < NAME_TRIES && name === ''; tries++) {
      let asked: string;
      try {
        asked = (await sale.ask(`Name her — the name she will be entered under in the register of ${polity}:`)).trim();
      } catch {
        return no(Mml.compose`Unnamed, she is not entered, and not sold.`, 'unnamed', word);
      }
      const bare = asked.replace(/^the\s+/i, '').trim();
      if (bare === '') continue;
      if (await register.isNameTaken(bare)) {
        MessageApi.scene(buyer).topic('act.deed').toSelf(Mml.compose`There is a ship in the register of ${polity} named ${bare} already. Another name.`).send();
        continue;
      }
      name = bare;
    }
    if (name === '') return no(Mml.compose`She needs a name the register does not have.`, 'name-taken', word);

    // ⭐ Claimed before the money awaits (another buyer may have been naming
    // too): the slot is re-read and held synchronously, and given back if
    // the money does not come.
    const hull = this.firstOnTheStocks(word);
    if (hull === null) return no(Mml.compose`The yard has no hull on the stocks — the last one was sold while you were naming her.`, 'sold-out', word);
    const serial = SecurityApi.uuid();
    const identity = `${hull.kind}/${serial}`;
    const buyerPath = buyer.getIdentityPath() ?? '';
    const line: HullSale = { slot: hull.slot, ship: identity, name, buyer: buyerPath, soldAtS: WorldClockApi.getNow().rawValue() };
    this.sold = [...this.sold, line];
    const paid = await EmploymentApi.settleSale(venue, hull.priceMinor, hull.priceMinor, 'a purchase');
    if (!paid) {
      this.sold = this.sold.filter((s) => s !== line);
      return no(Mml.compose`You can't cover a ${leaf} just now.`, 'insufficient-funds', word);
    }
    this.save();
    // ⭐ A ship of a kind is a minted identity under her kind: `<kind
    // row>/<serial>`, her company's scheme — her handle, what her register
    // entry, her berth's way, the landing's roll and her charters name her
    // by. Her record is `(identity, serial)`, stood up again by
    // `ExpanseApi.standUpCraft`.
    const ship = await StuffApi.clone<Ship>(hull.kind, undefined, {
      // identity-keyed-by: own-record — her `holder_snapshots` record is
      // filed under it, and her register entry's `key` names it.
      asIdentityPath: identity,
    });
    await PersistableApi.restoreOrSeed(ship as unknown as Stuff, serial);
    const words = await ship.commission(buyer, name, this.quay, register);
    return {
      ok: true,
      self: Mml.compose`You buy a ${leaf}. ${paid.tail} ${words}`,
      peers: Mml.compose`${Mml.actor(buyer)} buys a ${leaf} and names her the ${name}.`,
    };
  }

  override getLong(): string {
    const base = super.getLong();
    const page = this.pageWords();
    return page === '' ? base : base ? `${base} ${page}` : page;
  }

  /** What is on the stocks and at what price, and what was sold off them. */
  private pageWords(): string {
    const parts: string[] = [];
    const left = this.onTheStocks();
    parts.push(
      left.length === 0
        ? 'Every hull in it is sold.'
        : `On the stocks: ${left.map((h) => `a ${leafOf(h.kind)} on ${h.slot} (${h.priceMinor})`).join(', ')}.`,
    );
    for (const s of this.sold) {
      const kind = this.hulls.find((h) => h.slot === s.slot)?.kind ?? '';
      parts.push(`Sold off ${s.slot}: the ${leafOf(kind)} ${s.name}.`);
    }
    return parts.join(' ');
  }

  private isSold(slot: string): boolean {
    return this.sold.some((s) => s.slot === slot);
  }

  /** The first hull the word names that is still on the stocks. */
  private firstOnTheStocks(word: string): HullSlot | null {
    return this.hulls.find((h) => answersTo(h, word) && !this.isSold(h.slot)) ?? null;
  }

  /**
   * The register a ship bought here is entered in: the one the first
   * government over the yard keeps (`Government.shipRegister` — the
   * government names its register; nothing is searched).
   */
  private async registerHere(): Promise<ShipRegister | null> {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    for (const g of await GovernmentApi.subjectTo(room)) {
      if (!g.shipRegister) continue;
      const reg = await StuffApi.singleton<Stuff>(g.shipRegister).catch((err) => {
        console.warn(`HullBook: ${g.key}'s register '${g.shipRegister}' did not stand up:`, err);
        return null;
      });
      if (reg instanceof ShipRegister) return reg;
    }
    return null;
  }

  private save(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) => console.warn('HullBook: capture failed:', err));
    } catch (err) {
      console.warn('HullBook: capture failed:', err);
    }
  }
}

/** A refusal in words. */
function no(line: Mml, reason: string, detail: string): SaleOutcome {
  return { ok: false, line, note: { kind: 'controller-rejected', reason, detail } };
}

/** A kind row's last segment — `smack`. */
function leafOf(kind: string): string {
  return kind.slice(kind.lastIndexOf('/') + 1);
}

/** Does `word` name this hull — her kind (`smack`), or the slot she lies on (`near stocks`)? */
function answersTo(h: HullSlot, word: string): boolean {
  const w = word.trim().toLowerCase().replace(/^(?:a|an|the)\s+/, '').replace(/[-_]/g, ' ');
  if (w === '') return false;
  if (leafOf(h.kind).toLowerCase().replace(/[-_]/g, ' ') === w) return true;
  return h.slot.toLowerCase().replace(/^the\s+/, '') === w;
}
