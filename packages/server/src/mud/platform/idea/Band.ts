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
 * `endpoints` are optional and a PLANNING affordance (*the Westerlies
 * join the roads and Gannet Rock*); a belt has none. ⭐ A corridor that
 * names them and no `from`/`to` is DRAWN between them (maritime review,
 * 2026-10-13) — the extent is authored on the graph, relative to the
 * expanse's origin like a node, and answered on the chart
 * (`BandExtent.resolve`), so moving a node moves the edges that join it. Where
 * bands overlap, a field value comes from the narrowest (smallest area)
 * and placed things (`hazards`, `stock`) union — `Expanse.fieldAt`.
 *
 * A band authors only what is TRUE in it; nothing here is a script hook.
 * Leaf data, a row under its expanse's path.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { BAND_EXTENT_KINDS, BandExtent, type BandExtentAuthored, type BandCrossing } from '../../lib/expanse/BandExtent';
import { M_PER_NM } from '../../lib/expanse/GeoPosition';
import { Expanse } from '../../lib/expanse/Expanse';
import type { GeoPosition } from '../../lib/expanse/GeoPosition';
import type { FieldMeta } from '../../lib/mixin';
import type { ClimateLean, WeatherType } from '../../lib/weather/WeatherType';

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
    weatherLean: { persistent: true, authorable: true },
    traffic: { persistent: true, authorable: true },
    hazards: { persistent: true, authorable: true },
    stock: { persistent: true, authorable: true },
    endpoints: { persistent: true, authorable: true },
    setKn: { persistent: true, authorable: true },
    gearHardness: { persistent: true, authorable: true },
    confined: { persistent: true, authorable: true },
  };

  protected extent: BandExtentAuthored | null = null;
  /** The set / trend, degrees true — the way the water or wind goes. */
  protected direction = 0;
  protected endpoints: [string, string] | null = null;
  protected cost: BandCost = {};
  protected lean: BandLean | null = null;
  /**
   * ⭐ How this water leans the WEATHER (maritime R10) — the shipped
   * per-type multiplier a Locality authors, multiplied over the
   * Locality's own while a craft is inside the band. A haar is
   * `{ fog: 8 }`: nothing authors *foggy*; the weather field rolls fog
   * more often here, and the sky, the crossing report and the range of
   * sight all follow from the roll.
   */
  protected weatherLean: ClimateLean | null = null;
  /** The current's speed along `direction`, knots; `0` for a wind band. */
  protected setKn = 0;
  /** 0..1 — how busy this water is (the seeded traffic field's weight). */
  protected traffic: number | null = null;
  /** Row paths of hazards placed in this band. */
  protected hazards: string[] = [];
  /** What lives in it: stock key → abundance (0..1). */
  protected stock: Record<string, number> = {};
  /** 0..1 — how hard this water is on gear. */
  protected gearHardness = 0;
  /** A confined corridor (a channel over a bar): a linear node rides it. */
  protected confined = false;

  private cachedExtent: BandExtent | null = null;
  /** Runtime only: the expanse that compiled this band (else its zone). */
  private frame: Expanse | null = null;

  public setExtent(value: BandExtentAuthored | null): void {
    if (value) this.checkExtent(value);
    this.extent = value ?? null;
    this.cachedExtent = null;
  }

  /** The expanse that compiled this band names itself its frame. */
  public setFrame(expanse: Expanse | null): void {
    this.frame = expanse;
    this.cachedExtent = null;
  }

  private getFrame(): Expanse | null {
    if (this.frame !== null) return this.frame;
    const zone = this.getZone();
    return zone instanceof Expanse ? zone : null;
  }

  /**
   * The extent on the chart; `null` when the row authored none, its
   * expanse has no origin, or an endpoint it is drawn to has no position
   * yet (a failed resolve is not cached, so the next read tries again).
   */
  public getExtent(): BandExtent | null {
    if (this.cachedExtent !== null || this.extent === null) return this.cachedExtent;
    const frame = this.getFrame();
    const origin = frame?.getOrigin() ?? null;
    if (frame === null || origin === null) return null;
    const ends = this.endpoints;
    const endpointAt = (i: 0 | 1) => {
      const path = ends?.[i];
      if (!path) return null;
      return frame.peekNodes().find((n) => n.getTemplatePath() === path)?.getExpansePosition() ?? null;
    };
    this.cachedExtent = this.resolveExtent(this.extent, origin, endpointAt);
    return this.cachedExtent;
  }

  /** Is `authored` a well-formed authored extent? Throws when not. */
  private checkExtent(authored: BandExtentAuthored): void {
    if (!authored || !BAND_EXTENT_KINDS.includes(authored.kind)) {
      throw new Error(
        `Band: extent kind must be one of ${BAND_EXTENT_KINDS.join(', ')}; ` +
          `got ${JSON.stringify(authored?.kind)}`,
      );
    }
    if (authored.kind === 'corridor' && !(authored.widthM > 0)) {
      throw new Error('Band: a corridor needs a positive widthM');
    }
    if (authored.kind === 'belt' && (!authored.from || !authored.to)) {
      throw new Error('Band: a belt needs two corners, from and to');
    }
  }

  /**
   * ⭐ The authored extent on the chart: each point is `origin` + its
   * focus; a corridor's missing end is its endpoint node's position.
   * `null` while a needed endpoint has no position yet.
   *
   * ⚠ A belt's corners are taken as a box the short way round; a sea that
   * straddles the antimeridian would need its belt split in two.
   */
  private resolveExtent(
    authored: BandExtentAuthored,
    origin: GeoPosition,
    endpointAt: (i: 0 | 1) => GeoPosition | null,
  ): BandExtent | null {
    if (authored.kind === 'corridor') {
      const from = authored.from ? origin.atFocus(authored.from) : endpointAt(0);
      const to = authored.to ? origin.atFocus(authored.to) : endpointAt(1);
      if (from === null || to === null) return null;
      return new BandExtent({
        kind: 'corridor',
        from: from.toJSON(),
        to: to.toJSON(),
        widthNm: authored.widthM / M_PER_NM,
      });
    }
    const a = origin.atFocus(authored.from);
    const b = origin.atFocus(authored.to);
    return new BandExtent({
      kind: 'belt',
      latMinDeg: Math.min(a.latDeg, b.latDeg),
      latMaxDeg: Math.max(a.latDeg, b.latDeg),
      lonMinDeg: Math.min(a.lonDeg, b.lonDeg),
      lonMaxDeg: Math.max(a.lonDeg, b.lonDeg),
    });
  }

  public getDirection(): number { return this.direction; }
  public setDirection(v: number): void { this.direction = Number(v) || 0; }

  public getEndpoints(): [string, string] | null { return this.endpoints; }
  public setEndpoints(v: [string, string] | null): void {
    this.endpoints = Array.isArray(v) && v.length === 2 ? [v[0], v[1]] : null;
    this.cachedExtent = null;
  }

  public getCost(): BandCost { return { ...this.cost }; }
  public setCost(v: BandCost | null): void { this.cost = v ?? {}; }

  public getWeatherLean(): ClimateLean | null {
    return this.weatherLean ? { ...this.weatherLean } : null;
  }
  public setWeatherLean(v: ClimateLean | null): void {
    if (v === null || v === undefined) {
      this.weatherLean = null;
      return;
    }
    // Keys are not checked against the weather vocabulary (the Locality's
    // `climateLean` precedent, and `lint:closed-vocabularies`): a key that
    // names no weather type simply never matches a roll.
    const out: ClimateLean = {};
    for (const [k, n] of Object.entries(v)) {
      const x = Number(n);
      if (!Number.isFinite(x) || x < 0) throw new Error(`Band: weatherLean.${k} must be a non-negative number`);
      out[k as WeatherType] = x;
    }
    this.weatherLean = out;
  }

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

  public getGearHardness(): number { return this.gearHardness; }
  public setGearHardness(v: number): void {
    this.gearHardness = Math.max(0, Math.min(1, Number(v) || 0));
  }

  public isConfined(): boolean { return this.confined; }
  public setConfined(v: boolean): void { this.confined = v === true; }

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
