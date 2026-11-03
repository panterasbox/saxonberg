/**
 * HarborBook — ⭐ **the berth book on the harbor office's desk** (harbors
 * P11; review 2: *the book keeps the harbor's record*): who has been given
 * which quay and since when, who left owing, and what each ship hailing the
 * office was told. `look book` reads today's page.
 *
 * ⭐ The record is HERE, on the thing players act on and an author places
 * (lens 2 — a second port is a second book on a second desk, rows only).
 * Its `Harbor` keeps only the posted rules and applies them, reading and
 * writing this book through the record's own methods below; the book
 * knows nothing of the criteria, and the harbor holds no state of its own.
 *
 * - **`lines`** — one line per ship given a quay (`sinceS` null while she
 *   is still coming in), and a line kept as a DEBT when she cast off owing
 *   (`leftAtS`): it holds no room, and its days stop there. Dues are stamped
 *   paid forward on the line (`paidThroughS`), so a ship nobody has loaded
 *   since she made fast still owes every day begun.
 * - **`hails`** — the last answer given each ship (A2): what lets the
 *   harbormaster name a ship lying in the roads (`berth corrigan at
 *   town-quay`), and what the page shows of her.
 * - An assignment she never takes up, and a hail, lapse after twelve hours
 *   (grain).
 *
 * A fixture (its rows author `fixedInPlace: true`) and persistable: a
 * path-string `props:` entry stands it up through `StuffApi.singleton`,
 * which restores its record — the same call its harbor makes (`book:`).
 * It is where the harbormaster's acts are afforded (`berth <ship> at
 * <quay>`, `berth <ship> roads` — the verb refuses anyone not keeping the
 * harbor on shift) and what dues are paid at (`Payable`, P13: `pay book`;
 * the office answers `pay office` with the same bills).
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { PayableMixin, type Bill } from '@saxonberg/server/mud/lib/banking/Payable';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import Harbor from '../idea/Harbor';

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

/** Which posted criterion sent her to the roads — or `keeper`: the harbormaster's own call. */
export type HarborCriterion = 'closed' | 'bar' | 'no-room' | 'dues' | 'keeper';

/**
 * ⭐ The last hail a ship made and what she was told (A2) — what lets the
 * harbormaster name a ship lying in the roads and what the book's page
 * shows of her. It lapses as an assignment does.
 */
export interface HailRecord {
  /** The ship's durable handle. */
  ship: string;
  /** Her name when she hailed. */
  name: string;
  /** When she hailed, game-seconds. */
  atS: number;
  /** The quay she was given, or `null` when she was sent to the roads. */
  quay: string | null;
  /** What sent her to the roads, or `null` when she was given a quay. */
  criterion: HarborCriterion | null;
  /** What she was told. */
  words: string;
}

const DAY_S = 86_400;
const HOUR_S = 3_600;

/** An assignment she never takes up, and a hail, lapse after this long (grain), s. */
const ASSIGNMENT_HOLDS_S = 12 * HOUR_S;

export default class HarborBook extends PersistableMixin(PayableMixin(Good)) {
  /** ⭐ The harbormaster's call is made at the book (P11). */
  static commandContributions: CommandContributions = {
    peers: ['system/transport/cmd/harbor/berth.yaml'],
  };

  static fieldMeta: FieldMeta = {
    harbor: { persistent: true, authorable: true, ref: 'identity:relation' },
    lines: { persistent: true, runtimeState: true },
    hails: { persistent: true, runtimeState: true },
  };

  /** ⭐ The book's page, read off its own lines (derived — never written by a look). */
  static markupAugmenters: MarkupAugmenter[] = [bookAugmenter];

  /** The port whose book this is, by row path — whose posted rules it is kept by. */
  protected harbor: string | null = null;
  /** The book's lines: berths given, ships alongside, debts. */
  protected lines: BerthRecord[] = [];
  /** The last answer given each ship that hailed. */
  protected hails: HailRecord[] = [];

  public getHarbor(): string | null { return this.harbor; }
  public setHarbor(v: string | null): void { this.harbor = typeof v === 'string' && v !== '' ? v : null; }

  /** Its harbor, loaded (the berth verb and the bill are uses). */
  public async liveHarbor(): Promise<Harbor | null> {
    if (this.harbor === null) return null;
    const h = await StuffApi.singleton<Stuff>(this.harbor).catch(() => null);
    return h instanceof Harbor ? h : null;
  }

  /* ───────────────────────── the record ───────────────────────── */

  /** Every line as it stands at `nowS` (lapsed assignments struck), copies. */
  public getLines(nowS: number): BerthRecord[] {
    this.prune(nowS);
    return this.lines.map((r) => ({ ...r }));
  }

  /** Her line for the berth she holds or is given — never a debt — a copy, or `null`. */
  public lineOf(handle: string, nowS: number): BerthRecord | null {
    this.prune(nowS);
    const r = this.current(handle);
    return r ? { ...r } : null;
  }

  /** ⭐ Write her a berth given: her standing line replaced (her debts kept). */
  public writeLine(line: BerthRecord): void {
    this.lines = this.lines.filter((r) => r.ship !== line.ship || (r.leftAtS ?? null) !== null);
    this.lines.push({ ...line, leftAtS: null });
    this.save();
  }

  /**
   * ⭐ She has made fast at `quay`: her time alongside starts — her line
   * given there, or a fresh line when she came in without one (an exempt
   * craft). A line already fast there is kept as it is.
   */
  public markFast(line: Omit<BerthRecord, 'assignedAtS' | 'sinceS' | 'paidThroughS' | 'leftAtS'>, nowS: number): void {
    const mine = this.current(line.ship);
    if (mine !== null && mine.quay === line.quay && mine.sinceS !== null) return;
    if (mine !== null) {
      mine.quay = line.quay;
      mine.sinceS = nowS;
      mine.paidThroughS = nowS;
    } else {
      this.lines.push({ ...line, assignedAtS: nowS, sinceS: nowS, paidThroughS: nowS, leftAtS: null });
    }
    this.save();
  }

  /** ⭐ She has cast off: her line closes — or, `owing`, stays as a debt that holds no room. */
  public closeLine(handle: string, nowS: number, owing: boolean): void {
    const mine = this.current(handle);
    if (mine === null) return;
    if (owing) mine.leftAtS = nowS;
    else this.lines = this.lines.filter((r) => r !== mine);
    this.save();
  }

  /** A berth given and not yet taken up is struck (the keeper sends her to the roads). */
  public strikeLine(handle: string): void {
    const mine = this.current(handle);
    if (mine === null || mine.sinceS !== null) return;
    this.lines = this.lines.filter((r) => r !== mine);
    this.save();
  }

  /** ⭐ Her dues are paid now: every day begun is stamped paid on her lines, and a debt paid is a line closed. */
  public stampPaid(handle: string, nowS: number): void {
    let changed = false;
    for (const r of this.lines) {
      if (r.ship !== handle || r.sinceS === null) continue;
      const end = r.leftAtS ?? nowS;
      if (end <= r.paidThroughS) continue;
      r.paidThroughS += Math.ceil((end - r.paidThroughS) / DAY_S) * DAY_S;
      changed = true;
    }
    const before = this.lines.length;
    this.lines = this.lines.filter((r) => r.ship !== handle || (r.leftAtS ?? null) === null);
    if (changed || this.lines.length !== before) this.save();
  }

  /** ⭐ Write what she was told (one record per ship, the latest). */
  public noteHail(hail: HailRecord): void {
    this.hails = this.hails.filter((h) => h.ship !== hail.ship);
    this.hails.push({ ...hail });
    this.save();
  }

  /** The last hail answered for her, by handle — `null` when none stands. */
  public lastHail(handle: string, nowS: number): HailRecord | null {
    this.prune(nowS);
    const h = this.hails.find((x) => x.ship === handle);
    return h ? { ...h } : null;
  }

  /** The ships lately sent to the roads, for the page (copies). */
  public roadsHails(nowS: number): HailRecord[] {
    this.prune(nowS);
    return this.hails.filter((h) => h.quay === null).map((h) => ({ ...h }));
  }

  /** Every ship this book knows — in its lines, or hailed lately — by handle and name. */
  public knownShips(nowS: number): Array<{ ship: string; name: string }> {
    this.prune(nowS);
    return [...this.lines.map((r) => ({ ship: r.ship, name: r.name })), ...this.hails.map((h) => ({ ship: h.ship, name: h.name }))];
  }

  /* ───────────────────────── paying at the book (P13) ───────────────────────── */

  /** ⭐ What `payer` owes at this book — its harbor's rules, read over this book. */
  public override async billsFor(payer: Stuff): Promise<Bill[]> {
    const harbor = await this.liveHarbor();
    return harbor === null ? [] : harbor.billsFor(payer, WorldClockApi.getNow().rawValue());
  }

  public override async onPaid(bill: Bill, _payer: Stuff): Promise<void> {
    const harbor = await this.liveHarbor();
    if (harbor === null) throw new Error(`HarborBook ${this.getTemplatePath()}: paid a bill with no harbor to mark it in`);
    await harbor.onPaid(bill, WorldClockApi.getNow().rawValue());
  }

  /* ───────────────────────── the page ───────────────────────── */

  /** The book's lines as they stand now, in words; the dues are its harbor's rate, read while it is loaded. */
  public pageLines(): string[] {
    const nowS = WorldClockApi.getNow().rawValue();
    const live = this.harbor === null ? null : StuffApi.findByTemplatePath<Stuff>(this.harbor);
    const harbor = live instanceof Harbor ? live : null;
    const lines = this.getLines(nowS).map((r) => {
      const quay = StuffApi.findByTemplatePath<Stuff>(r.quay)?.getPresentation() ?? r.quay.slice(r.quay.lastIndexOf('/') + 1);
      if ((r.leftAtS ?? null) !== null) return `${r.name}: left ${quay} with dues owing.`;
      if (r.sinceS === null) return `${r.name}: given ${quay}, coming in.`;
      if (harbor === null) return `${r.name}: alongside ${quay}.`;
      const owed = harbor.duesOwedIn(this, r.ship, nowS);
      return owed > 0 ? `${r.name}: alongside ${quay}, ${owed} in dues owing.` : `${r.name}: alongside ${quay}, dues paid.`;
    });
    // ⭐ Who was sent to the roads, and why (A2) — the harbormaster names them from here.
    for (const h of this.roadsHails(nowS)) lines.push(`${h.name}: sent to the roads — ${h.words}`);
    return lines;
  }

  /* ───────────────────────── keeping it ───────────────────────── */

  private current(handle: string): BerthRecord | null {
    return this.lines.find((r) => r.ship === handle && (r.leftAtS ?? null) === null) ?? null;
  }

  /** Lapsed assignments and hails out of the book. */
  private prune(nowS: number): void {
    const before = this.lines.length;
    this.lines = this.lines.filter((r) => r.sinceS !== null || (r.leftAtS ?? null) !== null || nowS - r.assignedAtS < ASSIGNMENT_HOLDS_S);
    const hailsBefore = this.hails.length;
    this.hails = this.hails.filter((h) => nowS - h.atS < ASSIGNMENT_HOLDS_S);
    if (this.lines.length !== before || this.hails.length !== hailsBefore) this.save();
  }

  private save(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) => console.warn('HarborBook: capture failed:', err));
    } catch (err) {
      console.warn('HarborBook: capture failed:', err);
    }
  }
}

/** Today's page: every ship in the book, or that it is empty. */
function bookAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof HarborBook)) return text;
  const lines = host.pageLines();
  const page = lines.length === 0 ? "Today's page is empty." : `Today's page:\n${lines.join('\n')}`;
  return text && text.length > 0 ? `${text}\n\n${page}` : page;
}
