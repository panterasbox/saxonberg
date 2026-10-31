/**
 * CharterBook — ⭐ **where a ship is chartered** (harbors P23): the book a
 * ship's company keeps aboard her, or the line keeps at its desk, in which
 * a voyage charter is written. It affords `charter` to whoever stands at it.
 *
 * - **Aboard** (`ships:` empty) it charters the ship it is in — her hold's
 *   book is her company's hand keeping it.
 * - **At a desk** it names the ships it lets (`ships:` — row paths), and
 *   `charter <ship>` picks one; with only one listed, bare `charter` means
 *   her.
 *
 * The charter itself is the SHIP's record (`Ship.charterTo`): the book
 * says only what it costs (`ratePerDay`, minor units per world's day,
 * grain — with a per-ship override in `rates`) and whose books the days
 * are paid into (`payTo`, a venue its house operates — the line's desk).
 * A fixture: its rows author `fixedInPlace: true`.
 */

import Good from './Good';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import Ship from '../idea/Ship';

export default class CharterBook extends Good {
  /** ⭐ The charter is written at the book (P23). */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/work/charter.yaml'],
  };

  static fieldMeta: FieldMeta = {
    ships: { persistent: true, authorable: true },
    ratePerDay: { persistent: true, authorable: true },
    rates: { persistent: true, authorable: true },
    payTo: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** The ships it lets, by row path — empty: the ship it is aboard. */
  protected ships: string[] = [];
  /** Minor units per world's day (grain). */
  protected ratePerDay = 0;
  /** Per-ship day rates, by row path, over `ratePerDay`. */
  protected rates: Record<string, number> = {};
  /** The venue the charter's days are paid to. */
  protected payTo: string | null = null;

  public getShips(): string[] { return [...this.ships]; }
  public setShips(v: string[] | null): void {
    this.ships = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
  }
  public getRatePerDay(): number { return this.ratePerDay; }
  public setRatePerDay(v: number): void {
    const n = Number(v);
    this.ratePerDay = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  public getRates(): Record<string, number> { return { ...this.rates }; }
  public setRates(v: Record<string, number> | null): void {
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v ?? {})) if (Number.isFinite(Number(n)) && Number(n) >= 0) out[k] = Number(n);
    this.rates = out;
  }
  public getPayTo(): string | null { return this.payTo; }
  public setPayTo(v: string | null): void { this.payTo = typeof v === 'string' && v !== '' ? v : null; }

  /** The day rate it posts for `ship`. */
  public rateFor(ship: Ship): number {
    const path = ship.getTemplatePath() ?? '';
    return this.rates[path] ?? this.ratePerDay;
  }

  /**
   * ⭐ The ship `word` names at this book (P23) — or the refusal in words.
   * Aboard, the ship it is in (a word, if given, must name her); at a desk,
   * the listed ship the word names, or the only one listed.
   */
  public async shipFor(word: string | null): Promise<Ship | string> {
    const w = (word ?? '').trim().toLowerCase().replace(/^the\s+/, '');
    if (this.ships.length === 0) {
      const ship = await this.shipAboard();
      if (ship === null) return 'This book lets no ship.';
      if (w !== '' && !answersTo(ship, w)) return `This book lets ${ship.getPresentation()}, and no other.`;
      return ship;
    }
    const listed: Ship[] = [];
    for (const p of this.ships) {
      const s = await StuffApi.singleton<Stuff>(p).catch(() => null);
      if (s instanceof Ship) listed.push(s);
    }
    if (w === '') {
      if (listed.length === 1) return listed[0]!;
      return `Charter which? ${listed.map((s) => s.getPresentation()).join(', ')}.`;
    }
    const hit = listed.find((s) => answersTo(s, w));
    return hit ?? `This book does not let a ship called '${word}'. It lets ${listed.map((s) => s.getPresentation()).join(', ')}.`;
  }

  /** The ship whose room the book lies in, or `null`. */
  private async shipAboard(): Promise<Ship | null> {
    const room = MixinApi.isContainable(this) ? this.getContainer() : null;
    const path = room?.getTemplatePath() ?? '';
    if (path === '') return null;
    const s = await NavigationApi.structureAt(path);
    return s instanceof Ship ? s : null;
  }
}

/** Does `word` name the ship — her way-word, her name or a keyword? */
function answersTo(ship: Ship, word: string): boolean {
  if (ship.berthWord() === word) return true;
  if (ship.getName().toLowerCase().replace(/^the\s+/, '') === word) return true;
  return ship.getKeywords().some((k) => k.toLowerCase() === word);
}
