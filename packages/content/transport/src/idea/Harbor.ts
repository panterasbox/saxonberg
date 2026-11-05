/**
 * Harbor — ⭐ **a port's posted criteria, and their application**. One singleton per port (`/world/terminus/harbor/idea/harbor`); a
 * second port is a second row.
 *
 * - **The book is not here** (*the berth book keeps the harbor's
 *   record*). It is the `HarborBook` on the office desk this row names
 *   (`book:`, followed forward — never searched for): who has been given
 *   which quay and since when, the debts, the hails. The harbor holds no
 *   state of its own and persists nothing; it reads and writes the book.
 *   A ship hails the office (`answerHail`), is given a quay or sent to the
 *   roads, comes in on a course to the quay (the quay asks `admit` before
 *   her course is laid), makes fast (`madeFast` — her time alongside
 *   starts), and casts off (`release`). An assignment she never takes up
 *   lapses (the book's to strike).
 * - **The criteria are posted and closed, applied in order** — the office
 *   open (somebody holds the seat on shift), the water over the bar at the
 *   tide against her draft, a quay with room by length, dues owed — and
 *   the first that fails sends her to the roads, citing itself. Nothing is
 *   rolled; nothing but the clock and the book changes the answer.
 * - **Office hours are who is on shift**: the harbormaster's seat
 *   (`seat`) on the harbor works; its roster IS the cover, and a player
 *   appointed to it holds it beside the NPC.
 * - **Dues** accrue per world's day alongside, by her length, at the
 *   posted rate (`rates.duesPerMeterPerDay`), asleep or awake — the stamp
 *   is on the book's line, not on her.
 *
 * ⭐ A seat-holder has no write path to the criteria: they are this row's
 * data, which the harbor works' committee posts through the CMS under its
 * title. A player's authority is never more than the NPC's.
 *
 * The kernel reaches it only through its quays (`HarborQuay`, a
 * `Berthing`), its office (`HarborOffice`, a `Hailable`) and its book
 * (`HarborBook`, a `Payable`): each names this row (`harbor:`) and asks it;
 * it loads its book once per act and works over it. The ship imports no
 * pack.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { DefaultCalendar } from '@saxonberg/server/mud/lib/time/DefaultCalendar';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import BerthExit from '@saxonberg/server/mud/platform/idea/BerthExit';
import type { LineFrame } from '@saxonberg/server/mud/lib/expanse/LineFrame';
import { Expanse } from '@saxonberg/server/mud/lib/expanse/Expanse';
import type { Bill } from '@saxonberg/server/mud/lib/banking/Payable';
import HarborBook, { type BerthRecord, type HarborCriterion } from '../thing/HarborBook';

export type { BerthRecord, HailRecord, HarborCriterion } from '../thing/HarborBook';

/** One quay the harbor keeps, in the order it gives them. */
export interface HarborQuaySpec {
  /** The quay's row path. */
  place: string;
  /** How much ship lies along it, m — ships fit end to end. */
  lengthM: number;
  /** How deep the water lies at the berth, m — a mud berth; `null` when nobody says. */
  berthDepthM?: number | null;
  /**
   * The deepest draft the harbormaster puts alongside it, m (grain): a
   * river landing up a shallow reach takes only river craft. `null`: any.
   */
  maxDraftM?: number | null;
}

/** The seat that keeps the harbor — a position on a Business. */
export interface HarborSeat {
  business: string;
  positionKey: string;
}

/** The posted rates (grain). */
export interface HarborRates {
  /** Minor units per meter of her length per world's day alongside. */
  duesPerMeterPerDay: number;
}

/** The harbormaster's answer to a hail. */
export type HailAnswer =
  | { kind: 'quay'; quay: string; words: string }
  | { kind: 'roads'; criterion: HarborCriterion; words: string };

const DAY_S = 86_400;
const HOUR_S = 3_600;

/** How far ahead the office's next opening is looked for, days. */
const OPENING_LOOKAHEAD_DAYS = 7;

export default class Harbor extends SingletonMixin(Idea) {
  static fieldMeta: FieldMeta = {
    quays: { persistent: true, authorable: true },
    office: { persistent: true, authorable: true, ref: 'identity:relation' },
    seat: { persistent: true, authorable: true },
    rates: { persistent: true, authorable: true },
    exempt: { persistent: true, authorable: true },
    roads: { persistent: true, authorable: true, ref: 'identity:relation' },
    book: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  protected quays: HarborQuaySpec[] = [];
  protected office: string | null = null;
  protected seat: HarborSeat | null = null;
  protected rates: HarborRates = { duesPerMeterPerDay: 0 };
  protected exempt: string[] = [];
  protected roads: string | null = null;
  /** ⭐ The berth book that keeps this harbor's record, by row path (a `HarborBook` naming this row). */
  protected book: string | null = null;

  /* ───────────────────────── authored ───────────────────────── */

  public getQuays(): HarborQuaySpec[] { return this.quays.map((q) => ({ ...q })); }
  public setQuays(v: HarborQuaySpec[] | null): void {
    this.quays = Array.isArray(v)
      ? v
          .filter((q) => q && typeof q.place === 'string' && Number(q.lengthM) > 0)
          .map((q) => ({
            place: q.place,
            lengthM: Number(q.lengthM),
            berthDepthM: q.berthDepthM == null ? null : Number(q.berthDepthM),
            maxDraftM: q.maxDraftM == null ? null : Number(q.maxDraftM),
          }))
      : [];
  }
  public getOffice(): string | null { return this.office; }
  public setOffice(v: string | null): void { this.office = typeof v === 'string' && v !== '' ? v : null; }
  public getSeat(): HarborSeat | null { return this.seat ? { ...this.seat } : null; }
  public setSeat(v: HarborSeat | null): void {
    this.seat = v && typeof v.business === 'string' && typeof v.positionKey === 'string' ? { ...v } : null;
  }
  public getRates(): HarborRates { return { ...this.rates }; }
  public setRates(v: HarborRates | null): void {
    const n = Number(v?.duesPerMeterPerDay);
    this.rates = { duesPerMeterPerDay: Number.isFinite(n) && n >= 0 ? n : 0 };
  }
  public getExempt(): string[] { return [...this.exempt]; }
  public setExempt(v: string[] | null): void { this.exempt = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  public getRoads(): string | null { return this.roads; }
  public setRoads(v: string | null): void { this.roads = typeof v === 'string' && v !== '' ? v : null; }
  public getBook(): string | null { return this.book; }
  public setBook(v: string | null): void { this.book = typeof v === 'string' && v !== '' ? v : null; }

  /**
   * ⭐ The berth book, loaded — the ref followed forward. A harbor with no
   * book, or a book that is some other harbor's, is an authoring error:
   * nothing the criteria decide can be written, so it throws.
   */
  public async liveBook(): Promise<HarborBook> {
    const path = this.getTemplatePath() ?? '';
    if (this.book === null) throw new Error(`Harbor ${path}: no berth book is authored (book:)`);
    const b = await StuffApi.singleton<Stuff>(this.book);
    if (!(b instanceof HarborBook)) throw new Error(`Harbor ${path}: ${this.book} is not a berth book`);
    if (b.getHarbor() !== path) throw new Error(`Harbor ${path}: the book ${this.book} is kept for ${b.getHarbor() ?? 'no harbor'}`);
    return b;
  }

  /** The spec of a quay this harbor keeps, or `null`. */
  public quaySpec(place: string): HarborQuaySpec | null {
    const q = this.quays.find((x) => x.place === place);
    return q ? { ...q } : null;
  }

  /**
   * The quay the keeper means by `word` — its path's last word
   * (`town-quay`) or its name (`town quay`, `the Town Quay`) — or `null`.
   */
  public async quayNamed(word: string): Promise<string | null> {
    const w = word.trim().toLowerCase().replace(/^the\s+/, '');
    if (w === '') return null;
    const dashed = w.replace(/\s+/g, '-');
    for (const q of this.quays) {
      const leaf = q.place.slice(q.place.lastIndexOf('/') + 1);
      if (leaf === dashed) return q.place;
      const name = (await nameOf(q.place)).toLowerCase().replace(/^the\s+/, '');
      if (name === w) return q.place;
    }
    return null;
  }

  /** Is `word` the harbor's roads (`roads`, `the roads`, or the node's name)? */
  public async isRoadsWord(word: string): Promise<boolean> {
    const w = word.trim().toLowerCase().replace(/^the\s+/, '');
    if (w === 'roads') return true;
    return (await this.roadsName()).toLowerCase().replace(/^the\s+/, '') === w;
  }

  /** ⭐ How deep the water lies at a quay's berth, m, or `null`. */
  public berthDepthOf(place: string): number | null {
    return this.quaySpec(place)?.berthDepthM ?? null;
  }

  /* ───────────────────────── the office ───────────────────────── */

  /**
   * ⭐ Is the office open? When anybody holding the harbormaster's
   * seat is on shift: a rostered hand by the roster's window, an appointed
   * one by their own record.
   */
  public async isOpen(nowS: number): Promise<boolean> {
    return (await this.onShift(nowS)).open;
  }

  /** Who keeps the office now: whether it is open, and the live holders on shift. */
  private async onShift(nowS: number): Promise<{ open: boolean; holders: Stuff[] }> {
    const seat = this.seat;
    if (seat === null) return { open: false, holders: [] };
    const house = await StuffApi.singleton<Stuff>(seat.business).catch(() => null);
    if (house === null || !MixinApi.isOrganization(house)) return { open: false, holders: [] };
    const holders = house.holdersOf(seat.positionKey);
    const roster = house.getRoster();
    const clock = DefaultCalendar.singleton().decompose(Quantity.of(nowS, 's'));
    const rostered = new Set<string>();
    let open = false;
    for (const a of house.getRosterAssignments()) {
      if (a.positionKey !== seat.positionKey || !holders.includes(a.assignee)) continue;
      rostered.add(a.assignee);
      if (roster.evaluate(a, clock) === 'on-shift') open = true;
    }
    const live: Stuff[] = [];
    for (const id of holders) {
      if (rostered.has(id)) continue;
      const who = StuffApi.findByIdentityPath<Stuff>(id)[0] ?? null;
      if (who === null || who.isDestroyed() || !MixinApi.isEmployed(who)) continue;
      if (who.isOnShiftFor(seat.business)) {
        open = true;
        live.push(who);
      }
    }
    return { open, holders: live };
  }

  /** When the office next opens, game-seconds — the first hour a rostered holder is on — or `null`. */
  private async nextOpenS(nowS: number): Promise<number | null> {
    const seat = this.seat;
    if (seat === null) return null;
    const house = await StuffApi.singleton<Stuff>(seat.business).catch(() => null);
    if (house === null || !MixinApi.isOrganization(house)) return null;
    const holders = house.holdersOf(seat.positionKey);
    const roster = house.getRoster();
    const slots = house.getRosterAssignments().filter((a) => a.positionKey === seat.positionKey && holders.includes(a.assignee));
    if (slots.length === 0) return null;
    const startHour = Math.floor(nowS / HOUR_S) + 1;
    for (let h = startHour; h <= startHour + OPENING_LOOKAHEAD_DAYS * 24; h++) {
      const clock = DefaultCalendar.singleton().decompose(Quantity.of(h * HOUR_S, 's'));
      if (slots.some((a) => roster.evaluate(a, clock) === 'on-shift')) return h * HOUR_S;
    }
    return null;
  }

  /* ───────────────────────── the criteria ───────────────────────── */

  /**
   * ⭐ A ship hails the office: a berth at a named quay, or the
   * roads and the criterion that sent her there — applied in order: the
   * office open, the water over the bar at the tide, a quay with room by
   * her length, dues owed. A quay given is written in the book.
   */
  public async answerHail(ship: Stuff, nowS: number): Promise<HailAnswer> {
    const book = await this.liveBook();
    const answer = await this.criteriaAnswer(book, ship, nowS);
    this.noteHail(book, ship, answer, nowS);
    return answer;
  }

  /** The posted criteria applied to her hail, in order. */
  private async criteriaAnswer(book: HarborBook, ship: Stuff, nowS: number): Promise<HailAnswer> {
    const mine = book.lineOf(handleOf(ship), nowS);
    if (mine !== null && mine.sinceS !== null) {
      return { kind: 'quay', quay: mine.quay, words: `She lies at ${await nameOf(mine.quay)} already.` };
    }
    const roads = await this.roadsName();
    // 1 — the office open.
    if (!(await this.isOpen(nowS))) {
      const opens = await this.nextOpenS(nowS);
      const when = opens === null ? 'until the office opens' : `until the office opens ${hoursWords(opens - nowS)}`;
      return { kind: 'roads', criterion: 'closed', words: `The harbor office is closed. Lie in ${roads} ${when}.` };
    }
    // An assignment already given stands while it holds.
    if (mine !== null) {
      return { kind: 'quay', quay: mine.quay, words: await this.berthWords(mine.quay) };
    }
    // 2 — the water over the bar at the tide, against her draft.
    const bar = await this.barRefusal(ship, nowS);
    if (bar !== null) {
      return { kind: 'roads', criterion: 'bar', words: `${bar} Lie in ${roads} until then.` };
    }
    // 3 — a quay with room by her length.
    const quay = this.quayWithRoom(book, ship, nowS);
    if (quay === null) {
      return {
        kind: 'roads',
        criterion: 'no-room',
        words: `There is no berth long enough for her${isShip(ship) ? ` — she is ${Math.round(ship.hullNow().lengthM)} m` : ''}. Lie in ${roads}.`,
      };
    }
    // 4 — dues owed.
    const owed = this.duesOwedIn(book, handleOf(ship), nowS);
    if (owed > 0) {
      return { kind: 'roads', criterion: 'dues', words: `She owes ${owed} in dues. Lie in ${roads} until they are paid.` };
    }
    this.assignIn(book, ship, quay, nowS);
    return { kind: 'quay', quay, words: await this.berthWords(quay) };
  }

  /**
   * ⭐ Give `ship` the quay `place` — the harbormaster's act,
   * whoever holds the seat: a quay the criteria would refuse is refused,
   * citing the criterion. Returns the refusal, or `null` when written.
   */
  public async assign(ship: Stuff, place: string, nowS: number): Promise<string | null> {
    return this.assignIn(await this.liveBook(), ship, place, nowS);
  }

  private assignIn(book: HarborBook, ship: Stuff, place: string, nowS: number): string | null {
    const spec = this.quaySpec(place);
    if (spec === null) return 'That is not a quay this harbor keeps.';
    if (!this.fits(book, ship, spec, nowS)) return `There is not room for her at ${place}.`;
    book.writeLine({
      ship: handleOf(ship),
      name: nameOfShip(ship),
      lengthM: lengthOf(ship),
      quay: place,
      assignedAtS: nowS,
      sinceS: null,
      paidThroughS: nowS,
    });
    return null;
  }

  /**
   * ⭐ May `ship` come alongside `place` now? The city's own craft
   * (`exempt`) always; anyone else only at the quay the office gave her —
   * a ship that never hailed is told to.
   */
  public async admit(ship: Stuff, place: string, nowS: number): Promise<string | null> {
    const handle = handleOf(ship);
    if (this.exempt.includes(handle)) return null;
    const mine = (await this.liveBook()).lineOf(handle, nowS);
    if (mine === null) return 'The harbor office has not given her a berth. Hail the office first — `hail office`.';
    if (mine.quay !== place) return `The harbor office gave her ${await nameOf(mine.quay)}, not this quay.`;
    return null;
  }

  /** She has made fast at `place`: her time alongside starts — written in the book. */
  public async madeFast(ship: Stuff, place: string, nowS: number): Promise<void> {
    (await this.liveBook()).markFast({ ship: handleOf(ship), name: nameOfShip(ship), lengthM: lengthOf(ship), quay: place }, nowS);
  }

  /**
   * ⭐ May she leave? Not while she owes — her dues to the book and
   * any bill she carries (a charter's days) — and the refusal says how much.
   * ⛔ The SHIP is held, never the people: nothing here is asked of anyone
   * going ashore.
   */
  public async clearance(ship: Stuff, nowS: number): Promise<string | null> {
    const dues = await this.duesOwedBy(ship, nowS);
    const carried = isShip(ship) ? ship.owedMinor() : 0;
    if (dues <= 0 && carried <= 0) return null;
    const parts: string[] = [];
    if (dues > 0) parts.push(`${dues} in harbor dues`);
    if (carried > 0) parts.push(`${carried} on her bills`);
    return `She owes ${parts.join(' and ')}, and is not cleared to sail until it is paid at the harbor office — \`pay office\`. Anyone aboard may still go ashore.`;
  }

  /**
   * She has cast off: the berth is free. Her line of the book closes — or,
   * when she leaves owing, stays as a debt that holds no room (dues
   * owed is a posted criterion of her next hail).
   */
  public async release(ship: Stuff, nowS: number): Promise<void> {
    const book = await this.liveBook();
    const handle = handleOf(ship);
    const mine = book.lineOf(handle, nowS);
    if (mine === null) return;
    book.closeLine(handle, nowS, mine.sinceS !== null && this.duesOn(mine, nowS) > 0);
  }

  /**
   * ⭐ What she owes in dues now: for every day alongside since
   * her dues were paid — a day begun is a day owed — her length at the
   * posted rate, in whole minor units. The city's own craft owe nothing.
   */
  public async duesOwedBy(ship: Stuff, nowS: number): Promise<number> {
    return this.duesOwedOn(handleOf(ship), nowS);
  }

  /** What the book's lines for the ship `handle` owe now, whole minor units — read off the book, whether or not she is loaded. */
  public async duesOwedOn(handle: string, nowS: number): Promise<number> {
    return this.duesOwedIn(await this.liveBook(), handle, nowS);
  }

  /** ⭐ The posted rate over `book`'s lines for `handle` (the page reads it, holding its book). */
  public duesOwedIn(book: HarborBook, handle: string, nowS: number): number {
    if (this.exempt.includes(handle)) return 0;
    let owed = 0;
    for (const r of book.getLines(nowS)) if (r.ship === handle) owed += this.duesOn(r, nowS);
    return owed > 0 ? Math.ceil(owed - 1e-9) : 0;
  }

  /** What one line owes now, by the posted rate: the days begun since paid, to when she left or now. */
  private duesOn(r: BerthRecord, nowS: number): number {
    if (r.sinceS === null || this.exempt.includes(r.ship)) return 0;
    const end = r.leftAtS ?? nowS;
    if (end <= r.paidThroughS) return 0;
    return Math.ceil((end - r.paidThroughS) / DAY_S) * r.lengthM * this.rates.duesPerMeterPerDay;
  }

  /** Her dues are paid now: the days owed are stamped paid on the book. */
  public async settleDues(ship: Stuff, nowS: number): Promise<void> {
    (await this.liveBook()).stampPaid(handleOf(ship), nowS);
  }

  /* ───────────────────────── paying at the office ───────────────────────── */

  /**
   * ⭐ What `payer` owes at this office now: for every ship in the
   * book they answer for (`Ship.answersFor` — her master), her dues to the
   * harbor works first, then each bill she carries, in the order billed.
   */
  public async billsFor(payer: Stuff, nowS: number): Promise<Bill[]> {
    const book = await this.liveBook();
    const out: Bill[] = [];
    const seen = new Set<string>();
    for (const r of book.getLines(nowS)) {
      if (seen.has(r.ship)) continue;
      seen.add(r.ship);
      const ship = await this.shipOf(r.ship);
      if (ship === null || !ship.answersFor(payer)) continue;
      const dues = this.duesOwedIn(book, r.ship, nowS);
      if (dues > 0) {
        if (this.office === null) throw new Error(`Harbor ${this.getTemplatePath()}: dues are owed and no office is authored to pay them at`);
        out.push({ to: this.office, amountMinor: dues, reason: `in harbor dues for ${nameOfShip(ship as unknown as Stuff)}`, key: `dues|${r.ship}` });
      }
      ship.getOwed().forEach((b, i) => {
        out.push({ to: b.to, amountMinor: b.amountMinor, reason: b.reason, key: `owed|${r.ship}|${i}` });
      });
    }
    return out;
  }

  /** ⭐ A bill read off the book has been paid: the dues stamped paid, or the ship's bill taken off her. */
  public async onPaid(bill: Bill, nowS: number): Promise<void> {
    const [kind, handle] = bill.key.split('|');
    if (!handle) throw new Error(`Harbor.onPaid: not a bill this book wrote (${bill.key})`);
    const ship = await this.shipOf(handle);
    if (ship === null) throw new Error(`Harbor.onPaid: the ship ${handle} the bill was for does not stand`);
    if (kind === 'dues') {
      await this.settleDues(ship as unknown as Stuff, nowS);
      return;
    }
    if (kind === 'owed') {
      if (!ship.settleOwed({ to: bill.to, amountMinor: bill.amountMinor, reason: bill.reason })) {
        throw new Error(`Harbor.onPaid: ${handle} carries no bill '${bill.reason}' of ${bill.amountMinor}`);
      }
      return;
    }
    throw new Error(`Harbor.onPaid: not a bill this book wrote (${bill.key})`);
  }

  /* ───────────────────────── the harbormaster's call ───────────────────────── */

  /**
   * ⭐ Does `who` keep this harbor now — hold the seat AND be on shift
   * Only a keeper on shift may give a berth (`berth`).
   */
  public keptBy(who: Stuff): boolean {
    const seat = this.seat;
    if (seat === null || !MixinApi.isEmployed(who)) return false;
    if (who.getEmployment(seat.business)?.positionKey !== seat.positionKey) return false;
    return who.isOnShiftFor(seat.business);
  }

  /**
   * ⭐ The ship the keeper means by `word` (her name, the article dropped,
   * or the last word of her handle) among the ships the book knows: in
   * its lines, or hailed lately. `null` when it knows none by that word.
   */
  public async shipNamed(word: string, nowS: number): Promise<Ship | null> {
    const w = word.trim().toLowerCase().replace(/^the\s+/, '');
    if (w === '') return null;
    for (const k of (await this.liveBook()).knownShips(nowS)) {
      const name = k.name.toLowerCase().replace(/^the\s+/, '');
      const leaf = k.ship.split('/').filter((x) => x !== '' && x !== 'structure').pop() ?? '';
      if (name === w || leaf === w) return this.shipOf(k.ship);
    }
    return null;
  }

  /**
   * ⭐ The keeper gives `ship` the quay `place` — the NPC's own
   * call made by whoever keeps the office, and no other: a quay the posted
   * criteria would refuse is refused, citing the criterion. Those aboard
   * her are told. Returns the refusal, or `null` when written.
   */
  public async assignBy(ship: Ship, place: string, by: Stuff, nowS: number): Promise<string | null> {
    if (!this.keptBy(by)) return 'You do not keep this harbor.';
    const book = await this.liveBook();
    const s = ship as unknown as Stuff;
    const handle = handleOf(s);
    const mine = book.lineOf(handle, nowS);
    if (mine !== null && mine.sinceS !== null) {
      return `${nameOfShip(s)} lies alongside ${await nameOf(mine.quay)} already; a berth is not taken from a ship made fast.`;
    }
    const spec = this.quaySpec(place);
    if (spec === null) return `${await nameOf(place)} is not a quay this harbor keeps.`;
    // The criteria, in their posted order (the office is open: you keep it).
    const bar = await this.barRefusal(s, nowS);
    if (bar !== null) return `The bar: ${bar}`;
    const quayName = await nameOf(place);
    if (spec.maxDraftM != null && ship.hullNow().draftM > spec.maxDraftM) {
      return `She draws ${ship.hullNow().draftM.toFixed(1)} m; ${quayName} takes nothing deeper than ${spec.maxDraftM.toFixed(1)} m.`;
    }
    const room = this.roomIn(book, spec, handle, nowS);
    if (lengthOf(s) > room) {
      return `There is no room for her at ${quayName}: ${Math.max(0, Math.round(room))} m is free and she is ${Math.round(lengthOf(s))} m.`;
    }
    const owed = this.duesOwedIn(book, handle, nowS);
    if (owed > 0) return `She owes ${owed} in dues; no berth is given her until they are paid.`;
    const refused = this.assignIn(book, s, place, nowS);
    if (refused !== null) return refused;
    const answer: HailAnswer = { kind: 'quay', quay: place, words: await this.berthWords(place) };
    this.noteHail(book, s, answer, nowS);
    await tellAboard(ship, `The harbor office signals her: ${answer.words}`);
    return null;
  }

  /**
   * ⭐ The keeper sends `ship` to the roads: a berth given her
   * and not yet taken up is taken back — never one she is made fast at.
   * Those aboard her are told. Returns the refusal, or `null`.
   */
  public async sendToRoads(ship: Ship, by: Stuff, nowS: number): Promise<string | null> {
    if (!this.keptBy(by)) return 'You do not keep this harbor.';
    const book = await this.liveBook();
    const s = ship as unknown as Stuff;
    const handle = handleOf(s);
    const mine = book.lineOf(handle, nowS);
    if (mine !== null && mine.sinceS !== null) {
      return `${nameOfShip(s)} lies alongside ${await nameOf(mine.quay)}; a ship made fast is not sent to the roads.`;
    }
    book.strikeLine(handle);
    const answer: HailAnswer = { kind: 'roads', criterion: 'keeper', words: `Lie in ${await this.roadsName()} until the office calls her in.` };
    this.noteHail(book, s, answer, nowS);
    await tellAboard(ship, `The harbor office signals her: ${answer.words}`);
    return null;
  }

  /**
   * The ship a handle names, standing: an authored ship's row,
   * or a kind's minted identity `<row>/<serial>` stood up from her record.
   */
  private async shipOf(handle: string): Promise<Ship | null> {
    const s = await ExpanseApi.standUpCraft(handle);
    if (s === null) console.warn(`Harbor: the ship ${handle} in the book did not load`);
    return s !== null && isShip(s) ? s : null;
  }

  /**
   * ⭐ Tell whoever holds the seat on shift and is a player that `ship` is
   * hailing, and what the office answered — the NPC's routine
   * answers, and a player holder is told and may give another quay within
   * the criteria.
   */
  public async tellKeepers(ship: Stuff, answer: HailAnswer, nowS: number): Promise<void> {
    const { holders } = await this.onShift(nowS);
    const name = nameOfShip(ship);
    for (const who of holders) {
      if (!MixinApi.isHasInteractive(who) || !MixinApi.isSensor(who)) continue;
      try {
        MessageApi.scene(who)
          .topic('speech.comms')
          .toSelf(Mml.compose`${name} hails the harbor office. The book answers: ${answer.words}`)
          .send();
      } catch {
        // decoration: the hail stands whether or not the keeper heard it
      }
    }
  }

  /** Write in the book what she was told. */
  private noteHail(book: HarborBook, ship: Stuff, answer: HailAnswer, nowS: number): void {
    book.noteHail({
      ship: handleOf(ship),
      name: nameOfShip(ship),
      atS: nowS,
      quay: answer.kind === 'quay' ? answer.quay : null,
      criterion: answer.kind === 'roads' ? answer.criterion : null,
      words: answer.words,
    });
  }

  /* ───────────────────────── reads ───────────────────────── */

  /** The first quay, in the order posted, with room for her length and water for her draft. */
  private quayWithRoom(book: HarborBook, ship: Stuff, nowS: number): string | null {
    for (const spec of this.quays) if (this.fits(book, ship, spec, nowS)) return spec.place;
    return null;
  }

  /** Is there room for her along `spec` — her length against what lies there and what is given? */
  private fits(book: HarborBook, ship: Stuff, spec: HarborQuaySpec, nowS: number): boolean {
    if (isShip(ship) && spec.maxDraftM != null && ship.hullNow().draftM > spec.maxDraftM) return false;
    return lengthOf(ship) <= this.roomIn(book, spec, handleOf(ship), nowS);
  }

  /** ⭐ Room along a quay now, m (see {@link roomIn}). */
  public async roomAt(spec: HarborQuaySpec, nowS: number, except: string | null = null): Promise<number> {
    return this.roomIn(await this.liveBook(), spec, except, nowS);
  }

  /**
   * ⭐ Room along a quay, m: its length less every ship the book gives it
   * and every ship made fast there by her own way that the book does not
   * name (a city craft, exempt).
   */
  private roomIn(book: HarborBook, spec: HarborQuaySpec, except: string | null, nowS: number): number {
    let used = 0;
    const counted = new Set<string>();
    for (const r of book.getLines(nowS)) {
      if (r.quay !== spec.place || r.ship === except || (r.leftAtS ?? null) !== null) continue;
      used += r.lengthM;
      counted.add(r.ship);
    }
    const quay = StuffApi.findByTemplatePath<Stuff>(spec.place);
    if (quay && MixinApi.isExitable(quay)) {
      for (const exit of quay.getExits().values()) {
        if (!(exit instanceof BerthExit)) continue;
        const s = exit.ship() as unknown as Stuff | null;
        if (s === null) continue;
        const h = handleOf(s);
        if (h === except || counted.has(h)) continue;
        counted.add(h);
        used += lengthOf(s);
      }
    }
    return spec.lengthM - used;
  }

  /** The bar's refusal for her now, read off the river her quays stand on — `null` inside the bar or with water enough. */
  private async barRefusal(ship: Stuff, nowS: number): Promise<string | null> {
    if (!isShip(ship)) return null;
    const river = await this.river();
    if (river === null) return null;
    // Already inside the bar, on the river: the bar is behind her.
    if (ship.getLine() !== null) return null;
    return ship.barRefusal(river, nowS);
  }

  /** The river the harbor's quays stand on — whose bar a ship from the sea must cross. */
  private async river(): Promise<(Stuff & LineFrame) | null> {
    for (const spec of this.quays) {
      const quay = await StuffApi.singleton<Stuff>(spec.place).catch(() => null);
      if (quay === null || !MixinApi.isFrameSited(quay)) continue;
      const frame = await quay.liveSiteFrame();
      if (frame !== null && MixinApi.isLineFrame(frame as unknown as Stuff)) {
        return frame as unknown as Stuff & LineFrame;
      }
    }
    return null;
  }

  private async roadsName(): Promise<string> {
    if (this.roads === null) return 'the roads';
    const node = await StuffApi.singleton<Stuff>(this.roads).catch(() => null);
    return node !== null && MixinApi.isNamed(node) ? node.getName() : 'the roads';
  }

  /** What the office says when it gives a quay: the quay and the course to it. */
  private async berthWords(place: string): Promise<string> {
    return `Berth at ${await nameOf(place)}. Come in on a course for it — \`course ${await this.courseWord(place)}\`.`;
  }

  /**
   * The word a master lays a course for the quay by: on the chart, the
   * node it lies behind (the island's quay is `course waponi woo`);
   * on a river, the quay's own last word.
   */
  private async courseWord(place: string): Promise<string> {
    const quay = await StuffApi.singleton<Stuff>(place).catch(() => null);
    const site = quay !== null && MixinApi.isFrameSited(quay) ? quay.getFrameSite() : null;
    const frame = site !== null && quay !== null && MixinApi.isFrameSited(quay) ? await quay.liveSiteFrame() : null;
    if (site !== null && frame instanceof Expanse) {
      const node = await frame.node(site.cite);
      if (node !== null) return node.getName().toLowerCase();
    }
    return place.slice(place.lastIndexOf('/') + 1);
  }
}


function isShip(s: Stuff): s is Ship {
  return s instanceof Ship;
}

/** A ship's durable handle — what the book names her by. */
function handleOf(s: Stuff): string {
  return s.getDurableHandle() ?? s.getTemplatePath() ?? '';
}

function nameOfShip(s: Stuff): string {
  return MixinApi.isNamed(s) ? s.getName() : s.getPresentation();
}

function lengthOf(s: Stuff): number {
  return isShip(s) ? s.hullNow().lengthM : 0;
}

async function nameOf(path: string): Promise<string> {
  const s = await StuffApi.singleton<Stuff>(path).catch(() => null);
  return s?.getPresentation() ?? path.slice(path.lastIndexOf('/') + 1);
}

/** `in about three hours`, `within the hour`. */
function hoursWords(dS: number): string {
  const h = Math.max(0, dS / HOUR_S);
  const n = Math.round(h);
  return h < 0.75 ? 'within the hour' : `in about ${n} hour${n === 1 ? '' : 's'}`;
}

/** Everyone aboard `ship` hears the office's signal. */
async function tellAboard(ship: Ship, text: string): Promise<void> {
  for (const who of await ship.aboard()) {
    if (!MixinApi.isSensor(who)) continue;
    try {
      MessageApi.scene(who).topic('speech.comms').toSelf(Mml.compose`${text}`).send();
    } catch {
      // decoration: the berth stands whether or not they heard
    }
  }
}
