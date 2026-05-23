/**
 * AtmosphericMixin — atmospheric-state surface for `Location` and
 * `Vessel` host classes.
 *
 * Composing this mixin says: "this scope (room or vessel) can carry
 * a biome reference plus per-field atmospheric overrides." Reads
 * dispatch through `BiomeApi.resolve*For` which walks outward
 * through containment ancestors, then the spatial zone, then the
 * root universe biome — the first override found at any layer
 * terminates the walk. Pure containers (Box, Backpack, treasure
 * chest) do NOT compose this mixin and are skipped by the walk.
 *
 * **Sparse storage.** Five room-scope `null`-defaulted fields plus
 * five `Record<string, V>` per-Detail maps (one per atmospheric
 * field). A vessel with no overrides pays the cost of five `null`
 * slots + five empty maps and otherwise resolves identically to a
 * scope that doesn't compose the mixin (the chain walks straight
 * through to the outer container).
 *
 * **Detail overrides** mirror Tangible's prefix-walk pattern: a
 * `hearth.embers` query checks `hearth.embers` first, then
 * `hearth`, then the room/biome/zone/universe chain. Longest-prefix
 * first per `Material.getMaterial`.
 *
 * **Per-field invariants on setters.** Each Quantity-typed setter
 * type-checks the runtime unit and throws TypeError on mismatch —
 * no normalize-at-save hook. Matches `Material.density`'s shape.
 *
 * **Biome reference** is Pattern A: `_biomePath` carries a templatePath
 * string; `getBiome()` re-resolves on each call via
 * `BiomeApi.findByPath` (HMR-safe).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';
import { BiomeApi } from '../../api/biome';
import type { Biome } from './Biome';

export interface Atmospheric {
  // ---------- biome reference ----------

  /** Resolve the host's authored biome, or `null` when no override. */
  getBiome(): Biome | null;
  /** Set the host's authored biome reference. */
  setBiome(value: Biome | null): void;

  // ---------- atmospheric fields ----------

  /**
   * Resolve the temperature at this scope (optionally narrowed by a
   * `detailKey`). Routes through `BiomeApi.resolveTemperatureFor`,
   * which walks innermost-container-outward then biome / zone /
   * universe.
   */
  getTemperature(detailKey?: string): Promise<Quantity<'K'>>;
  /**
   * Override the temperature at the room/vessel scope or at a
   * specific `detailKey`. `null` clears the override (the next read
   * falls through to the chain).
   */
  setTemperature(value: Quantity<'K'> | null, detailKey?: string): void;

  getPressure(detailKey?: string): Promise<Quantity<'Pa'>>;
  setPressure(value: Quantity<'Pa'> | null, detailKey?: string): void;

  getHumidity(detailKey?: string): Promise<Quantity<'%'>>;
  setHumidity(value: Quantity<'%'> | null, detailKey?: string): void;

  getGravity(detailKey?: string): Promise<Quantity<'m/s²'>>;
  setGravity(value: Quantity<'m/s²'> | null, detailKey?: string): void;

  getAtmosphere(detailKey?: string): Promise<string>;
  setAtmosphere(value: string | null, detailKey?: string): void;

  // ---------- derived geometry ----------

  /**
   * Atmospheric-bearing volume of this scope, in m³. Concrete
   * subclasses derive from their topology (`CartesianLocation` from
   * cube `cellSize³`, `SphericalLocation` from `(4/3)πr³`). The
   * default is `null` — a scope with no derivable volume.
   */
  getVolume(): Quantity<'m³'> | null;

  /**
   * Floor-to-ceiling vertical extent, in m. `CartesianLocation`
   * returns `cellSize`; `SphericalLocation` returns the inscribed
   * cube's side (`2r/√3`). Default is `null`.
   */
  getCeilingHeight(): Quantity<'m'> | null;

  // ---------- storage — public so BiomeApi's chain walker can read ----------
  // These are the bag of per-host state the chain walker consults.
  // `BiomeApi` is the only external reader; in-class code reads
  // `this._x` directly. Per CLAUDE.md "Inter-Stuff Contract" the
  // chain-walker reach is the API-layer carve-out (same shape as
  // Hydrator's reflection into persistent fields).

  _biomePath: string | null;
  _temperature: Quantity<'K'> | null;
  _pressure: Quantity<'Pa'> | null;
  _humidity: Quantity<'%'> | null;
  _gravity: Quantity<'m/s²'> | null;
  _atmosphere: string | null;
  _detailTemperatures: Record<string, Quantity<'K'>>;
  _detailPressures: Record<string, Quantity<'Pa'>>;
  _detailHumidities: Record<string, Quantity<'%'>>;
  _detailGravities: Record<string, Quantity<'m/s²'>>;
  _detailAtmospheres: Record<string, string>;
}

export function AtmosphericMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class AtmosphericMixin extends Base implements Atmospheric {
    static _mixinName = 'AtmosphericMixin';

    static persistentFields = [
      '_biomePath',
      '_temperature',
      '_pressure',
      '_humidity',
      '_gravity',
      '_atmosphere',
      '_detailTemperatures',
      '_detailPressures',
      '_detailHumidities',
      '_detailGravities',
      '_detailAtmospheres',
    ];

    /**
     * Field-marshaller bindings for the five Quantity-typed bulk
     * fields. The per-detail maps round-trip via standard JSON
     * (`Quantity.toJSON` / `fromJSON`) — `Record<string, Quantity<U>>`
     * serializes natively without a map marshaller.
     */
    static fieldMarshallers = {
      _temperature: QuantityMarshaller.pathFor('K'),
      _pressure: QuantityMarshaller.pathFor('Pa'),
      _humidity: QuantityMarshaller.pathFor('%'),
      _gravity: QuantityMarshaller.pathFor('m/s²'),
    };

    // ---------- storage ----------

    public _biomePath: string | null = null;
    public _temperature: Quantity<'K'> | null = null;
    public _pressure: Quantity<'Pa'> | null = null;
    public _humidity: Quantity<'%'> | null = null;
    public _gravity: Quantity<'m/s²'> | null = null;
    public _atmosphere: string | null = null;

    public _detailTemperatures: Record<string, Quantity<'K'>> = {};
    public _detailPressures: Record<string, Quantity<'Pa'>> = {};
    public _detailHumidities: Record<string, Quantity<'%'>> = {};
    public _detailGravities: Record<string, Quantity<'m/s²'>> = {};
    public _detailAtmospheres: Record<string, string> = {};

    // ---------- biome reference ----------

    public getBiome(): Biome | null {
      if (this._biomePath === null) return null;
      return BiomeApi.findByPath(this._biomePath);
    }

    public setBiome(value: Biome | null): void {
      if (value === null) {
        this._biomePath = null;
        return;
      }
      const path = value.getTemplatePath();
      this._biomePath = path ?? null;
    }

    // ---------- temperature ----------

    public async getTemperature(detailKey?: string): Promise<Quantity<'K'>> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolveTemperatureFor(self, detailKey);
    }
    public setTemperature(
      value: Quantity<'K'> | null,
      detailKey?: string,
    ): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailTemperatures[detailKey];
          return;
        }
        assertQuantity(value, 'K', 'temperature');
        this._detailTemperatures[detailKey] = value;
        return;
      }
      if (value === null) {
        this._temperature = null;
        return;
      }
      assertQuantity(value, 'K', 'temperature');
      this._temperature = value;
    }

    // ---------- pressure ----------

    public async getPressure(detailKey?: string): Promise<Quantity<'Pa'>> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolvePressureFor(self, detailKey);
    }
    public setPressure(value: Quantity<'Pa'> | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailPressures[detailKey];
          return;
        }
        assertQuantity(value, 'Pa', 'pressure');
        this._detailPressures[detailKey] = value;
        return;
      }
      if (value === null) {
        this._pressure = null;
        return;
      }
      assertQuantity(value, 'Pa', 'pressure');
      this._pressure = value;
    }

    // ---------- humidity ----------

    public async getHumidity(detailKey?: string): Promise<Quantity<'%'>> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolveHumidityFor(self, detailKey);
    }
    public setHumidity(value: Quantity<'%'> | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailHumidities[detailKey];
          return;
        }
        assertQuantity(value, '%', 'humidity');
        this._detailHumidities[detailKey] = value;
        return;
      }
      if (value === null) {
        this._humidity = null;
        return;
      }
      assertQuantity(value, '%', 'humidity');
      this._humidity = value;
    }

    // ---------- gravity ----------

    public async getGravity(detailKey?: string): Promise<Quantity<'m/s²'>> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolveGravityFor(self, detailKey);
    }
    public setGravity(
      value: Quantity<'m/s²'> | null,
      detailKey?: string,
    ): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailGravities[detailKey];
          return;
        }
        assertQuantity(value, 'm/s²', 'gravity');
        this._detailGravities[detailKey] = value;
        return;
      }
      if (value === null) {
        this._gravity = null;
        return;
      }
      assertQuantity(value, 'm/s²', 'gravity');
      this._gravity = value;
    }

    // ---------- atmosphere ----------

    public async getAtmosphere(detailKey?: string): Promise<string> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolveAtmosphereFor(self, detailKey);
    }
    public setAtmosphere(value: string | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailAtmospheres[detailKey];
          return;
        }
        this._detailAtmospheres[detailKey] = value;
        return;
      }
      this._atmosphere = value;
    }

    // ---------- derived geometry (null defaults; concrete subclasses override) ----------

    public getVolume(): Quantity<'m³'> | null {
      return null;
    }

    public getCeilingHeight(): Quantity<'m'> | null {
      return null;
    }
  };
}

/**
 * Strict-on-unit guard. Setters that receive a Quantity with the
 * wrong unit throw a clear TypeError rather than corrupting state.
 * Mirrors `Material.density`'s shape.
 */
function assertQuantity<U extends Unit>(
  value: unknown,
  expectedUnit: U,
  fieldName: string,
): void {
  if (
    !(value instanceof Quantity) ||
    (value as Quantity<Unit>).unit !== expectedUnit
  ) {
    const actualUnit =
      value instanceof Quantity
        ? `Quantity<'${(value as Quantity<Unit>).unit}'>`
        : typeof value;
    throw new TypeError(
      `AtmosphericMixin.set${capitalize(fieldName)} expects ` +
        `Quantity<'${expectedUnit}'> | null; got ${actualUnit}`,
    );
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.substring(1);
}
