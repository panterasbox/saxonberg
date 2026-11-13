/**
 * FusionMixin — *it MELTS, and sets again.*
 *
 * A phase point read both ways — on a liquid the melting point is its
 * freezing point. Carries what a frozen pool mints (`castTemplate`), how its
 * solid drains in a mould, the chill arrows a cold mould sets a metal by,
 * whether freezing ruins it, and the cast shrinkage it derives.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasFusion(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * ⭐ A metal that sets differently against a cold, conducting mould
 * (ceramics S12 — chill casting): cast iron in an iron mould sets WHITE and
 * hard, in sand GREY and soft. The first arrow whose threshold the mould's
 * thermal conductivity (W/(m·K)) exceeds decides.
 */
export interface ChillArrow {
  mouldConductivityAbove: number;
  becomes: string;
}

export interface Fusion {
  getCastTemplate(): string;
  getChillsTo(): readonly ChillArrow[];
  setChillsTo(value: ChillArrow[] | null): void;
  chilledIn(mouldConductivity: number): string | null;
  castShrinkage(): number;
  isRuinedByFreezing(): boolean;
  getMeltingPoint(): Quantity<'K'>;
  setMeltingPoint(value: Quantity<'K'>): void;
  getLatentHeatOfFusion(): Quantity<'J/kg'>;
  setLatentHeatOfFusion(value: Quantity<'J/kg'>): void;
}

/** Fusion reads one fact of the core: whether a material is tagged a metal. */
type FusionHost = Stuff & { hasTag(tag: string): boolean };

export function FusionMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class FusionMixin extends Base implements Fusion {
    static _mixinName = 'FusionMixin';

    static fieldMeta: FieldMeta = {
      meltingPoint: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('K') },
      latentHeatOfFusion: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('J/kg') },
      // ⭐ What a frozen pool becomes / whether freezing ruins it — material
      // facts an author writes per row (water → ice-block; blood → ruined).
      castTemplate: { persistent: true, authorable: true },
      // ⭐ (ceramics S12, S17) The cure set and the chill arrows — how the
      // matter sets, never the mould's business.
      chillsTo: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0, ref: 'identity:constituent' },
      ruinedByFreezing: { persistent: true, authorable: true },
    };

    private _meltingPoint: Quantity<'K'> = Quantity.of(0, 'K');

    protected get meltingPoint(): Quantity<'K'> {
      return this._meltingPoint;
    }
    protected set meltingPoint(value: Quantity<'K'>) {
      if (!(value instanceof Quantity) || value.unit !== 'K') {
        throw new TypeError(
          `Material.meltingPoint must be a Quantity<'K'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._meltingPoint = value;
    }

    /**
     * Latent heat of fusion (`J/kg`) — energy per kilogram to melt the
     * material at its `meltingPoint` (water 334000, iron ≈ 247000, wax ≈
     * 200000). The reserve-clamp plateau size: temperature holds at the
     * melting point until this much heat per kilogram has been absorbed. `0`
     * = an instantaneous transition (no plateau).
     */
    private _latentHeatOfFusion: Quantity<'J/kg'> = Quantity.of(0, 'J/kg');

    protected get latentHeatOfFusion(): Quantity<'J/kg'> {
      return this._latentHeatOfFusion;
    }
    protected set latentHeatOfFusion(value: Quantity<'J/kg'>) {
      if (!(value instanceof Quantity) || value.unit !== 'J/kg') {
        throw new TypeError(
          `Material.latentHeatOfFusion must be a Quantity<'J/kg'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._latentHeatOfFusion = value;
    }

    /**
     * ⭐ The identity path a frozen pool of this material MINTS when it
     * solidifies — a `Casting`-shaped Thing. Water authors
     * `/stuff/thing/ice-lump`. Authorable per row; empty means the default,
     * which {@link getCastTemplate} derives from the tags (D17).
     */
    public castTemplate: string = '';

    /**
     * ⭐ Whether freezing RUINS this material rather than casting it — blood
     * hemolyses, it does not become a usable ice block. At the solidify edge
     * of such a material no cast is minted: the pool stays liquid at its
     * melting point, its freshness load is stamped ruined, and the latent
     * accumulator clears so a thaw does not re-trigger. Authorable; default
     * false (ordinary matter casts).
     */
    public ruinedByFreezing: boolean = false;

    /**
     * The identity path a frozen pool of this becomes: the authored row,
     * else ⭐ `/stuff/thing/metal-casting` for a material tagged `metal` (a
     * metal lump can be tempered), else the composition-only
     * `/stuff/thing/Casting` (a glass, wax or tallow lump keeps what is
     * dissolved in it and claims no temper).
     */
    public getCastTemplate(): string {
      if (this.castTemplate) return this.castTemplate;
      return (this as unknown as FusionHost).hasTag('metal') ? '/stuff/thing/metal-casting' : '/stuff/thing/Casting';
    }

    /** ⭐ What this sets as against a conducting mould (ceramics S12). */
    public chillsTo: ChillArrow[] = [];
    public getChillsTo(): readonly ChillArrow[] {
      return this.chillsTo;
    }
    public setChillsTo(value: ChillArrow[] | null): void {
      this.chillsTo = (Array.isArray(value) ? value : [])
        .filter(
          (a) =>
            a !== null &&
            typeof a === 'object' &&
            Number.isFinite(a.mouldConductivityAbove) &&
            typeof a.becomes === 'string' &&
            a.becomes !== '',
        )
        .map((a) => ({ mouldConductivityAbove: a.mouldConductivityAbove, becomes: a.becomes }))
        .sort((a, b) => b.mouldConductivityAbove - a.mouldConductivityAbove);
    }
    /** The material this sets as in a mould of conductivity `k`, or `null` (itself). */
    public chilledIn(mouldConductivity: number): string | null {
      // ⚠ No `const` above `static fieldMeta`: the wiki spoiler snapshot
      // names a field's owner by the nearest declaration, and a local here
      // filed every Material field under `a.*`.
      return this.chillsTo.find((arrow) => mouldConductivity > arrow.mouldConductivityAbove)?.becomes ?? null;
    }

    /**
     * ⭐ The pattern-maker's shrink (ceramics D23): how much a casting of this
     * shrinks, linearly, cooling from its melting point to a room —
     * `thermalExpansion × (meltingPoint − 293)`. DERIVED: brass's 1.7 %
     * against a pattern-maker's rule of 1.5 %. `0` for a material that
     * authors neither, or has no mechanical response to expand with.
     */
    public castShrinkage(): number {
      const self = this as unknown as Stuff;
      const alpha = MixinApi.hasSolidity(self) ? self.getThermalExpansion() : 0;
      return FusionMixin.shrinkageOf(alpha, this.getMeltingPoint().rawValue());
    }

    /** `α × (mp − 293)`, capped at 10 %; `0` without both (no locals here — see `chilledIn`). */
    private static shrinkageOf(alpha: number, mp: number): number {
      return !(mp > 293) || !(alpha > 0) ? 0 : Math.min(0.1, alpha * (mp - 293));
    }
    /** Whether freezing ruins this material (blood) rather than casting it. */
    public isRuinedByFreezing(): boolean {
      return this.ruinedByFreezing;
    }

    /** Read melting point (`Quantity<'K'>`; `0` = does not melt). */
    public getMeltingPoint(): Quantity<'K'> {
      return this._meltingPoint;
    }
    /** Set melting point. Strict on `Quantity<'K'>`. */
    public setMeltingPoint(value: Quantity<'K'>): void {
      this.meltingPoint = value;
    }

    /** Read latent heat of fusion (`Quantity<'J/kg'>`; the melt plateau). */
    public getLatentHeatOfFusion(): Quantity<'J/kg'> {
      return this._latentHeatOfFusion;
    }
    /** Set latent heat of fusion. Strict on `Quantity<'J/kg'>`. */
    public setLatentHeatOfFusion(value: Quantity<'J/kg'>): void {
      this.latentHeatOfFusion = value;
    }
  };
}
