/**
 * VolatilityMixin — *it BOILS.*
 *
 * A boiling point and its latent heat, how fast an open vessel of it
 * evaporates and into which gas, and the temperature above which it vaporizes
 * outright.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasVolatility(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Volatility {
  getVapourLPerLPerHour(): number;
  setVapourLPerLPerHour(value: number): void;
  getVapourMaterial(): string;
  setVapourMaterial(value: string): void;
  getVaporizesAboveK(): number;
  setVaporizesAboveK(value: number): void;
  getBoilingPoint(): Quantity<'K'>;
  setBoilingPoint(value: Quantity<'K'>): void;
  getLatentHeatOfVaporization(): Quantity<'J/kg'>;
  setLatentHeatOfVaporization(value: Quantity<'J/kg'>): void;
}

export function VolatilityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class VolatilityMixin extends Base implements Volatility {
    static _mixinName = 'VolatilityMixin';

    static fieldMeta: FieldMeta = {
      boilingPoint: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('K') },
      latentHeatOfVaporization: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('J/kg') },
      vapourLPerLPerHour: { persistent: true, spoiler: 1, spoilerName: 0 },
      vapourMaterial: { persistent: true, spoiler: 1, spoilerName: 0 },
      vaporizesAboveK: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * Boiling point (`K`) — the liquid↔gas transition temperature (water
     * 373, iron ≈ 3134). the host's `reconcilePhase` boils a liquid past it
     * to a gas emission (steam). `0` = does not boil in the modelled range.
     */
    private _boilingPoint: Quantity<'K'> = Quantity.of(0, 'K');

    protected get boilingPoint(): Quantity<'K'> {
      return this._boilingPoint;
    }
    protected set boilingPoint(value: Quantity<'K'>) {
      if (!(value instanceof Quantity) || value.unit !== 'K') {
        throw new TypeError(
          `Material.boilingPoint must be a Quantity<'K'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._boilingPoint = value;
    }

    /**
     * Latent heat of vaporization (`J/kg`) — energy per kilogram to boil the
     * material at its `boilingPoint` (water 2260000). The reserve-clamp
     * plateau for the liquid→gas transition, and the water term ignition must
     * out-heat to dry a wet fuel. `0` = an instantaneous transition.
     */
    private _latentHeatOfVaporization: Quantity<'J/kg'> = Quantity.of(0, 'J/kg');

    protected get latentHeatOfVaporization(): Quantity<'J/kg'> {
      return this._latentHeatOfVaporization;
    }
    protected set latentHeatOfVaporization(value: Quantity<'J/kg'>) {
      if (!(value instanceof Quantity) || value.unit !== 'J/kg') {
        throw new TypeError(
          `Material.latentHeatOfVaporization must be a Quantity<'J/kg'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._latentHeatOfVaporization = value;
    }

    /**
     * ⭐ How fast an open vessel of this liquid gives off its vapour, litres
     * of gas per litre per game-hour (cleanliness D22) — `0` for anything
     * that does not evaporate to speak of. Naphtha's is high; a rag of it by
     * the hearth is a fire.
     */
    protected vapourLPerLPerHour = 0;

    /**
     * ⭐ The VAPOUR this liquid gives off — the gas row its evaporation
     * becomes (naphtha → naphtha vapour). `''` = none.
     */
    protected vapourMaterial = '';
    /** Litres of vapour per litre per game-hour from an open vessel. */
    public getVapourLPerLPerHour(): number {
      return this.vapourLPerLPerHour;
    }
    public setVapourLPerLPerHour(value: number): void {
      this.vapourLPerLPerHour = Number.isFinite(value) && value > 0 ? value : 0;
    }
    /** The gas row this liquid's vapour is, or `''`. */
    public getVapourMaterial(): string {
      return this.vapourMaterial;
    }
    public setVapourMaterial(value: string): void {
      this.vapourMaterial = typeof value === 'string' ? value : '';
    }

    /**
     * ⭐ Above this temperature a lump of this material in a lit chamber
     * becomes VAPOR in the chamber's air (salt at ~1350 K) — what a salt
     * glaze is made from. `0` = never.
     */
    protected vaporizesAboveK = 0;
    public getVaporizesAboveK(): number {
      return this.vaporizesAboveK;
    }
    public setVaporizesAboveK(value: number): void {
      this.vaporizesAboveK = Number.isFinite(value) && value > 0 ? value : 0;
    }

    /** Read boiling point (`Quantity<'K'>`; `0` = does not boil). */
    public getBoilingPoint(): Quantity<'K'> {
      return this._boilingPoint;
    }
    /** Set boiling point. Strict on `Quantity<'K'>`. */
    public setBoilingPoint(value: Quantity<'K'>): void {
      this.boilingPoint = value;
    }

    /** Read latent heat of vaporization (`Quantity<'J/kg'>`; the boil plateau). */
    public getLatentHeatOfVaporization(): Quantity<'J/kg'> {
      return this._latentHeatOfVaporization;
    }
    /** Set latent heat of vaporization. Strict on `Quantity<'J/kg'>`. */
    public setLatentHeatOfVaporization(value: Quantity<'J/kg'>): void {
      this.latentHeatOfVaporization = value;
    }
  };
}
