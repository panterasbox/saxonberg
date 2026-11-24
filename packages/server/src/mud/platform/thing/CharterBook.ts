/**
 * CharterBook — ⭐ **where a ship is chartered**: the book a
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
import type Place from '../../lib/stuff/Place';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import Ship from '../idea/Ship';
import { RelatingMixin, type HeldRelation, type RelatedSet } from '../../lib/relation/Relating';

export default class CharterBook extends RelatingMixin(Good) {
  /** ⭐ The charter is written at the book. */
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
  /**
   * ⭐ The setter returns the LOAD (the resident-by-construction rung): the
   * listed ships stand up with the book, so `book:~ships` — answered from
   * residents, synchronously — finds them at a cold harbor.
   */
  public setShips(v: string[] | null): Promise<void> {
    this.ships = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
    return Promise.all(
      this.ships.map((p) =>
        StuffApi.singleton<Stuff>(p).catch((err: unknown) => {
          console.warn(`CharterBook: listed ship ${p} did not load`, err);
          return null;
        }),
      ),
    ).then(() => undefined);
  }

  /**
   * The ships this book lets that are in the world: the listed ones, or —
   * a book with none listed — the ship whose room it lies in.
   */
  public lets(): Ship[] {
    if (this.ships.length === 0) {
      const room = MixinApi.isContainable(this) ? this.getContainer() : null;
      const s = room && room.isPlace() ? (room as unknown as Place).structureNow() : null;
      return s instanceof Ship ? [s] : [];
    }
    return this.ships
      .map((p) => StuffApi.findByTemplatePath<Stuff>(p))
      .filter((s): s is Ship => s instanceof Ship);
  }

  /** ⭐ `book:~ships` — the ships it lets (naming overhaul D-B5); anyone may ask. */
  public relationsFor(asker: Stuff | null): HeldRelation[] {
    return [{ name: 'ships', meaning: 'the ships this book lets' }, ...super.relationsFor(asker)];
  }

  public relatedBy(name: string, asker: Stuff | null): RelatedSet[] {
    const below = super.relatedBy(name, asker);
    if (name !== 'ships') return below;
    return [{ name, meaning: 'the ships this book lets', members: this.lets() }, ...below];
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
   * The ship a bare `charter` means — the one whose hold the book lies in,
   * else the one ship it lets — or the refusal in words. A NAMED ship is
   * bound by the view through the book's `~ships` (naming overhaul B2), so
   * nothing here reads a word.
   */
  public async shipFor(): Promise<Ship | string> {
    if (this.ships.length === 0) {
      const ship = await this.shipAboard();
      return ship ?? 'This book lets no ship.';
    }
    const listed: Ship[] = [];
    for (const p of this.ships) {
      const s = await StuffApi.singleton<Stuff>(p).catch(() => null);
      if (s instanceof Ship) listed.push(s);
    }
    if (listed.length === 1) return listed[0]!;
    return `Charter which? ${listed.map((s) => s.getPresentation()).join(', ')}.`;
  }

  /** The ship whose room the book lies in, or `null`. */
  private async shipAboard(): Promise<Ship | null> {
    const room = MixinApi.isContainable(this) ? this.getContainer() : null;
    // The room is asked: its warren's ship, else its attachment.
    if (!room || !room.isPlace()) return null;
    const s = await (room as unknown as Place).structure();
    return s instanceof Ship ? s : null;
  }
}

