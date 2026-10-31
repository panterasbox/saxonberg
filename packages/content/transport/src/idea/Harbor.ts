/**
 * Harbor — ⭐ **a port's book, and the posted criteria it is kept by**
 * (harbors P7). One persistable singleton per port
 * (`/world/terminus/harbor/idea/harbor`); a second port is a second row.
 *
 * - **The book** (`book`, persistent) is who has been given which quay and
 *   since when: a ship hails the office (`answerHail`), is given a quay or
 *   sent to the roads, comes in on a course to the quay (the quay asks
 *   `admit` before her course is laid), makes fast (`madeFast` — her time
 *   alongside starts), and casts off (`release`). An assignment she never
 *   takes up lapses.
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
 *   is on the book, not on her.
 *
 * ⭐ A seat-holder has no write path to the criteria: they are this row's
 * data, which the harbor works' committee posts through the CMS under its
 * title. A player's authority is never more than the NPC's.
 *
 * The kernel reaches it only through its quays (`HarborQuay`, a
 * `BerthKeeper`) and its office (`HarborOffice`, a `Hailable`): the ship
 * imports no pack.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { DefaultCalendar } from '@saxonberg/server/mud/lib/time/DefaultCalendar';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import BerthExit from '@saxonberg/server/mud/platform/idea/BerthExit';
import type { LineFrame } from '@saxonberg/server/mud/lib/expanse/LineFrame';

/** One quay the harbor keeps, in the order it gives them. */
export interface HarborQuaySpec {
  /** The quay's row path. */
  place: string;
  /** How much ship lies along it, m — ships fit end to end. */
  lengthM: number;
  /** How deep the water lies at the berth, m — a mud berth (P20); `null` when nobody says. */
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

/** The posted rates (P28, grain). */
export interface HarborRates {
  /** Minor units per meter of her length per world's day alongside. */
  duesPerMeterPerDay: number;
}

/** One line of the book. */
export interface BerthRecord {
  /** The ship's durable handle. */
  ship: string;
  /** Her name when it was written. */
  name: string;
  /** Her length when it was written, m. */
  lengthM: number;
  /** The quay she was given, by path. */
  quay: string;
  /** When she was given it, game-seconds. */
  assignedAtS: number;
  /** When she made fast there, or `null` while she is still coming in. */
  sinceS: number | null;
  /** Her dues are paid up to here, game-seconds. */
  paidThroughS: number;
  /**
   * When she cast off still owing, or `null` while she holds the berth —
   * a line kept as a DEBT: it holds no room, and its days stop here.
   */
  leftAtS?: number | null;
}

/** Which posted criterion sent her to the roads. */
export type HarborCriterion = 'closed' | 'bar' | 'no-room' | 'dues';

/** The harbormaster's answer to a hail. */
export type HailAnswer =
  | { kind: 'quay'; quay: string; words: string }
  | { kind: 'roads'; criterion: HarborCriterion; words: string };

const DAY_S = 86_400;
const HOUR_S = 3_600;

/** An assignment she never takes up lapses after this long (grain), s. */
const ASSIGNMENT_HOLDS_S = 12 * HOUR_S;

/** How far ahead the office's next opening is looked for, days. */
const OPENING_LOOKAHEAD_DAYS = 7;

export default class Harbor extends PersistableMixin(SingletonMixin(Idea)) {
  static fieldMeta: FieldMeta = {
    quays: { persistent: true, authorable: true },
    office: { persistent: true, authorable: true, ref: 'identity:relation' },
    seat: { persistent: true, authorable: true },
    rates: { persistent: true, authorable: true },
    exempt: { persistent: true, authorable: true },
    roads: { persistent: true, authorable: true, ref: 'identity:relation' },
    book: { persistent: true, runtimeState: true },
  };

  protected quays: HarborQuaySpec[] = [];
  protected office: string | null = null;
  protected seat: HarborSeat | null = null;
  protected rates: HarborRates = { duesPerMeterPerDay: 0 };
  protected exempt: string[] = [];
  protected roads: string | null = null;
  protected book: BerthRecord[] = [];

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

  /** The book as it stands now (lapsed assignments dropped), a copy. */
  public getBook(nowS: number): BerthRecord[] {
    this.prune(nowS);
    return this.book.map((r) => ({ ...r }));
  }

  /** The spec of a quay this harbor keeps, or `null`. */
  public quaySpec(place: string): HarborQuaySpec | null {
    const q = this.quays.find((x) => x.place === place);
    return q ? { ...q } : null;
  }

  /** ⭐ How deep the water lies at a quay's berth, m (P20), or `null`. */
  public berthDepthOf(place: string): number | null {
    return this.quaySpec(place)?.berthDepthM ?? null;
  }

  /* ───────────────────────── the office ───────────────────────── */

  /**
   * ⭐ Is the office open (P11)? When anybody holding the harbormaster's
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
   * ⭐ A ship hails the office (P7, P8): a berth at a named quay, or the
   * roads and the criterion that sent her there — applied in order: the
   * office open, the water over the bar at the tide, a quay with room by
   * her length, dues owed. A quay given is written in the book.
   */
  public async answerHail(ship: Stuff, nowS: number): Promise<HailAnswer> {
    this.prune(nowS);
    const handle = handleOf(ship);
    const mine = this.currentOf(handle);
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
    const quay = this.quayWithRoom(ship);
    if (quay === null) {
      return {
        kind: 'roads',
        criterion: 'no-room',
        words: `There is no berth long enough for her${isShip(ship) ? ` — she is ${Math.round(ship.hullNow().lengthM)} m` : ''}. Lie in ${roads}.`,
      };
    }
    // 4 — dues owed.
    const owed = this.duesOwedBy(ship, nowS);
    if (owed > 0) {
      return { kind: 'roads', criterion: 'dues', words: `She owes ${owed} in dues. Lie in ${roads} until they are paid.` };
    }
    this.assign(ship, quay, nowS);
    return { kind: 'quay', quay, words: await this.berthWords(quay) };
  }

  /**
   * ⭐ Give `ship` the quay `place` (P7, P11) — the harbormaster's act,
   * whoever holds the seat: a quay the criteria would refuse is refused,
   * citing the criterion. Returns the refusal, or `null` when written.
   */
  public assign(ship: Stuff, place: string, nowS: number): string | null {
    this.prune(nowS);
    const spec = this.quaySpec(place);
    if (spec === null) return 'That is not a quay this harbor keeps.';
    if (!this.fits(ship, spec)) return `There is not room for her at ${place}.`;
    const handle = handleOf(ship);
    this.book = this.book.filter((r) => r.ship !== handle || (r.leftAtS ?? null) !== null);
    this.book.push({
      ship: handle,
      name: nameOfShip(ship),
      lengthM: lengthOf(ship),
      quay: place,
      assignedAtS: nowS,
      sinceS: null,
      paidThroughS: nowS,
    });
    this.save();
    return null;
  }

  /**
   * ⭐ May `ship` come alongside `place` now (P7)? The city's own craft
   * (`exempt`) always; anyone else only at the quay the office gave her —
   * a ship that never hailed is told to.
   */
  public async admit(ship: Stuff, place: string, nowS: number): Promise<string | null> {
    this.prune(nowS);
    const handle = handleOf(ship);
    if (this.exempt.includes(handle)) return null;
    const mine = this.currentOf(handle);
    if (mine === null) return 'The harbor office has not given her a berth. Hail the office first — `hail office`.';
    if (mine.quay !== place) return `The harbor office gave her ${await nameOf(mine.quay)}, not this quay.`;
    return null;
  }

  /** She has made fast at `place`: her time alongside starts (an entry kept as it is when already so). */
  public madeFast(ship: Stuff, place: string, nowS: number): void {
    const handle = handleOf(ship);
    const mine = this.currentOf(handle);
    if (mine !== null && mine.quay === place && mine.sinceS !== null) return;
    if (mine !== null) {
      mine.quay = place;
      mine.sinceS = nowS;
      mine.paidThroughS = nowS;
    } else {
      this.book.push({
        ship: handle,
        name: nameOfShip(ship),
        lengthM: lengthOf(ship),
        quay: place,
        assignedAtS: nowS,
        sinceS: nowS,
        paidThroughS: nowS,
      });
    }
    this.save();
  }

  /**
   * May she leave (P13)? ⚠ Dues are asked from A2 of the build, when the
   * office takes payment (`pay office`); until then every ship is cleared.
   */
  public async clearance(_ship: Stuff, _nowS: number): Promise<string | null> {
    return null;
  }

  /**
   * She has cast off: the berth is free. Her line of the book closes — or,
   * when she leaves owing, stays as a debt that holds no room (P7: dues
   * owed is a posted criterion of her next hail).
   */
  public release(ship: Stuff, nowS: number): void {
    const mine = this.currentOf(handleOf(ship));
    if (mine === null) return;
    if (mine.sinceS !== null && this.owedOn(mine, nowS) > 0) mine.leftAtS = nowS;
    else this.book = this.book.filter((r) => r !== mine);
    this.save();
  }

  /**
   * ⭐ What she owes in dues now (P7, P28): for every day alongside since
   * her dues were paid — a day begun is a day owed — her length at the
   * posted rate, in whole minor units. The city's own craft owe nothing.
   */
  public duesOwedBy(ship: Stuff, nowS: number): number {
    const handle = handleOf(ship);
    if (this.exempt.includes(handle)) return 0;
    let owed = 0;
    for (const r of this.book) if (r.ship === handle) owed += this.owedOn(r, nowS);
    return owed > 0 ? Math.ceil(owed - 1e-9) : 0;
  }

  /** What one line of the book owes now: the days begun since paid, to when she left or now. */
  private owedOn(r: BerthRecord, nowS: number): number {
    if (r.sinceS === null || this.exempt.includes(r.ship)) return 0;
    const end = r.leftAtS ?? nowS;
    if (end <= r.paidThroughS) return 0;
    return Math.ceil((end - r.paidThroughS) / DAY_S) * r.lengthM * this.rates.duesPerMeterPerDay;
  }

  /** Her dues are paid now: the days owed are stamped paid on the book. */
  public settleDues(ship: Stuff, nowS: number): void {
    const handle = handleOf(ship);
    let changed = false;
    for (const r of this.book) {
      if (r.ship !== handle || r.sinceS === null) continue;
      const end = r.leftAtS ?? nowS;
      if (end <= r.paidThroughS) continue;
      r.paidThroughS += Math.ceil((end - r.paidThroughS) / DAY_S) * DAY_S;
      changed = true;
    }
    // A debt paid is a line closed.
    const before = this.book.length;
    this.book = this.book.filter((r) => r.ship !== handle || (r.leftAtS ?? null) === null);
    if (changed || this.book.length !== before) this.save();
  }

  /**
   * ⭐ Tell whoever holds the seat on shift and is a player that `ship` is
   * hailing, and what the office answered (P8, P11) — the NPC's routine
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

  /* ───────────────────────── reads ───────────────────────── */

  /** Her line of the book for the berth she holds or is given — never a debt. */
  private currentOf(handle: string): BerthRecord | null {
    return this.book.find((r) => r.ship === handle && (r.leftAtS ?? null) === null) ?? null;
  }

  /** The first quay, in the order posted, with room for her length and water for her draft. */
  private quayWithRoom(ship: Stuff): string | null {
    for (const spec of this.quays) if (this.fits(ship, spec)) return spec.place;
    return null;
  }

  /** Is there room for her along `spec` — her length against what lies there and what is given? */
  private fits(ship: Stuff, spec: HarborQuaySpec): boolean {
    if (isShip(ship) && spec.maxDraftM != null && ship.hullNow().draftM > spec.maxDraftM) return false;
    return lengthOf(ship) <= this.roomAt(spec, handleOf(ship));
  }

  /**
   * ⭐ Room along a quay, m: its length less every ship the book gives it
   * and every ship made fast there by her own way that the book does not
   * name (a city craft, exempt).
   */
  public roomAt(spec: HarborQuaySpec, except: string | null = null): number {
    let used = 0;
    const counted = new Set<string>();
    for (const r of this.book) {
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
    const word = place.slice(place.lastIndexOf('/') + 1);
    return `Berth at ${await nameOf(place)}. Come in on a course for it — \`course ${word}\`.`;
  }

  /** Lapsed assignments out of the book. */
  private prune(nowS: number): void {
    const before = this.book.length;
    this.book = this.book.filter((r) => r.sinceS !== null || (r.leftAtS ?? null) !== null || nowS - r.assignedAtS < ASSIGNMENT_HOLDS_S);
    if (this.book.length !== before) this.save();
  }

  private save(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) => console.warn('Harbor: capture failed:', err));
    } catch (err) {
      console.warn('Harbor: capture failed:', err);
    }
  }

  /** A port's book stands while its port does. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "a harbor's book is kept while the port stands" };
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
