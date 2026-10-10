/**
 * Band — a region of an expanse with a width, a direction and a
 * character: a current, a trade wind, a fog, a race over a shoal.
 *
 * ⭐⭐ **A band confers cost and character, NEVER connectivity.** No band
 * is ever required to get between two nodes, and removing every band
 * from a sea leaves it fully crossable (requirements AC 4). What a band
 * changes is how the crossing goes: a current sets you (`setKn` along
 * `direction`), a wind leans the sea (`lean`), a fog thickens it, a
 * race wears gear (`gearHardness`).
 *
 * ⭐ **The boundary is the activity.** Inside a band or not is a single
 * containment question (`BandExtent`), so crossing into or out of one is
 * exact, deterministic and reportable — and drifting out of one is
 * detectable from the water alone.
 *
 * `endpoints` are optional and only a PLANNING affordance (*the
 * Westerlies join the mouth and Gannet Rock*); a belt has none. Where
 * bands overlap, a field value comes from the narrowest (smallest area)
 * and placed things (`hazards`, `stock`) union — `Expanse.fieldAt`.
 *
 * A band authors only what is TRUE in it; nothing here is a script hook.
 * Leaf data, a row under its expanse's path.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { BandExtent, type BandExtentRecord, type BandCrossing } from '../../lib/expanse/BandExtent';
import type { GeoPosition } from '../../lib/expanse/GeoPosition';
import type { FieldMeta } from '../../lib/mixin';

/** A band's wind lean: a direction it blows FROM and an added strength. */
export interface BandLean {
  directionDeg: number;
  strengthMps: number;
}

/** What passing through a band costs, beyond the set. */
export interface BandCost {
  /** Multiplies the craft's way through the water (a foul tide < 1). */
  wayFactor?: number;
}

export default class Band extends NamedMixin(SingletonMixin(Idea)) {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    direction: { persistent: true, authorable: true },
    cost: { persistent: true, authorable: true },
    lean: { persistent: true, authorable: true },
    traffic: { persistent: true, authorable: true },
    hazards: { persistent: true, authorable: true },
    stock: { persistent: true, authorable: true },
    outsideDescription: { persistent: true, authorable: true },
    endpoints: { persistent: true, authorable: true },
    setKn: { persistent: true, authorable: true },
    gearHardness: { persistent: true, authorable: true },
    confined: { persistent: true, authorable: true },
    // ⓘ `reputation` joins with the pilot who repeats it (B1).
  };

  protected extent: BandExtentRecord | null = null;
  /** The set / trend, degrees true — the way the water or wind goes. */
  protected direction = 0;
  protected endpoints: [string, string] | null = null;
  protected cost: BandCost = {};
  protected lean: BandLean | null = null;
  /** The current's speed along `direction`, knots; `0` for a wind band. */
  protected setKn = 0;
  /** 0..1 — how busy this water is (the seeded traffic field's weight). */
  protected traffic: number | null = null;
  /** Row paths of hazards placed in this band. */
  protected hazards: string[] = [];
  /** What lives in it: stock key → abundance (0..1). */
  protected stock: Record<string, number> = {};
  /** What people SAY about it — the reputation a pilot repeats. */
  protected reputation = '';
  /** 0..1 — how hard this water is on gear. */
  protected gearHardness = 0;
  /** A confined corridor (a channel over a bar): a linear node rides it. */
  protected confined = false;
  /** What it looks like from outside — a fogbank seen from clear water. */
  protected outsideDescription = '';

  private cachedExtent: BandExtent | null = null;

  public setExtent(value: BandExtentRecord | null): void {
    this.extent = value ?? null;
    this.cachedExtent = value ? new BandExtent(value) : null;
  }
  /** The extent as a value; `null` when the row authored none. */
  public getExtent(): BandExtent | null {
    if (this.cachedExtent === null && this.extent !== null) {
      this.cachedExtent = new BandExtent(this.extent);
    }
    return this.cachedExtent;
  }

  public getDirection(): number { return this.direction; }
  public setDirection(v: number): void { this.direction = Number(v) || 0; }

  public getEndpoints(): [string, string] | null { return this.endpoints; }
  public setEndpoints(v: [string, string] | null): void {
    this.endpoints = Array.isArray(v) && v.length === 2 ? [v[0], v[1]] : null;
  }

  public getCost(): BandCost { return { ...this.cost }; }
  public setCost(v: BandCost | null): void { this.cost = v ?? {}; }

  public getLean(): BandLean | null { return this.lean; }
  public setLean(v: BandLean | null): void { this.lean = v ?? null; }

  public getSetKn(): number { return this.setKn; }
  public setSetKn(v: number): void { this.setKn = Number(v) || 0; }

  public getTraffic(): number | null { return this.traffic; }
  public setTraffic(v: number | null): void {
    this.traffic = v === null || v === undefined ? null : Math.max(0, Math.min(1, Number(v)));
  }

  public getHazards(): string[] { return [...this.hazards]; }
  public setHazards(v: string[] | null): void { this.hazards = Array.isArray(v) ? [...v] : []; }

  public getStock(): Record<string, number> { return { ...this.stock }; }
  public setStock(v: Record<string, number> | null): void { this.stock = { ...(v ?? {}) }; }

  public getReputation(): string { return this.reputation; }
  public setReputation(v: string): void { this.reputation = (v ?? '').trim(); }

  public getGearHardness(): number { return this.gearHardness; }
  public setGearHardness(v: number): void {
    this.gearHardness = Math.max(0, Math.min(1, Number(v) || 0));
  }

  public isConfined(): boolean { return this.confined; }
  public setConfined(v: boolean): void { this.confined = v === true; }

  public getOutsideDescription(): string { return this.outsideDescription; }
  public setOutsideDescription(v: string): void { this.outsideDescription = (v ?? '').trim(); }

  /** Is `pos` inside this band? */
  public contains(pos: GeoPosition): boolean {
    return this.getExtent()?.contains(pos) ?? false;
  }

  /** Square nautical miles; `Infinity` for a band with no extent. */
  public area(): number {
    return this.getExtent()?.area() ?? Infinity;
  }

  /** Where a straight track enters and leaves this band. */
  public crossings(a: GeoPosition, b: GeoPosition): BandCrossing[] {
    return this.getExtent()?.crossings(a, b) ?? [];
  }
}
