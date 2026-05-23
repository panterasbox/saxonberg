/**
 * Biome — taxonomic scope unit for atmospheric defaults + ambient
 * sensory texture.
 *
 * `Biome extends Zone` (parallel to `Clade extends Zone`). The biome
 * template tree is rooted at `/lib/biome/`, which is itself a `Biome`
 * template — the **universe biome** — carrying the five universal
 * atmospheric defaults (temperature, pressure, humidity, gravity,
 * atmosphere). Every path beneath is a sub-Biome that may carry its
 * own defaults; un-set fields inherit through the chain-walk's
 * templatePath ancestry to the root.
 *
 * Folder + leaf at every path. The folder/leaf invariant exists to
 * prevent nested coordinate systems on `SpatialZone` — it does NOT
 * apply to taxonomic Zone subclasses. Biome plays both roles: a path
 * carries data AND may have children. `ZoneApi.isFolderClass(Biome)`
 * returns true; `isSpatialZoneClass(Biome)` returns false. There is
 * no separate `Biorealm` class; the root is just a Biome.
 *
 * Singleton intentionally NOT composed in v1, leaving room for future
 * procedural / time-of-day variance per clone. `BiomeApi.findByPath`
 * works either way (delegates to `StuffApi.findByTemplatePath`).
 *
 * Atmospheric defaults round-trip through `QuantityMarshaller`s at
 * the four Quantity-typed fields. The atmosphere tag is a plain
 * string. The two ambient-sensory fields carry MML strings for
 * biome-shaped prose rendering and are consumed by future sound /
 * scent slates.
 */

import { Zone } from '../zone/Zone';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';

export class Biome extends Zone {
  /**
   * Default temperature for descendants that don't override (room
   * scope or per-Detail). `null` means "fall through to the next
   * ancestor in the chain walk."
   */
  protected _defaultTemperature: Quantity<'K'> | null = null;

  /** Default atmospheric pressure. `null` falls through. */
  protected _defaultPressure: Quantity<'Pa'> | null = null;

  /** Default relative humidity. `null` falls through. */
  protected _defaultHumidity: Quantity<'%'> | null = null;

  /** Default gravitational acceleration. `null` falls through. */
  protected _defaultGravity: Quantity<'m/s²'> | null = null;

  /**
   * Default atmosphere tag (`'air'`, `'water'`, `'vacuum'`, …).
   * String per requirements decision 4 — atmosphere isn't a scalar.
   * `null` falls through.
   */
  protected _defaultAtmosphere: string | null = null;

  /**
   * Ambient sound MML — biome-shaped prose rendered when a sound-
   * slate consumer asks. Consumer is deferred; the field ships so
   * authoring can begin.
   */
  protected _ambientSoundMml: string | null = null;

  /** Ambient smell MML. Same shape as `_ambientSoundMml`. */
  protected _ambientSmellMml: string | null = null;

  static persistentFields = [
    '_defaultTemperature',
    '_defaultPressure',
    '_defaultHumidity',
    '_defaultGravity',
    '_defaultAtmosphere',
    '_ambientSoundMml',
    '_ambientSmellMml',
  ];

  static fieldMarshallers = {
    _defaultTemperature: QuantityMarshaller.pathFor('K'),
    _defaultPressure: QuantityMarshaller.pathFor('Pa'),
    _defaultHumidity: QuantityMarshaller.pathFor('%'),
    _defaultGravity: QuantityMarshaller.pathFor('m/s²'),
  };

  // ---------- atmospheric defaults ----------

  public getDefaultTemperature(): Quantity<'K'> | null {
    return this._defaultTemperature;
  }
  public setDefaultTemperature(value: Quantity<'K'> | null): void {
    if (value === null) {
      this._defaultTemperature = null;
      return;
    }
    Biome.assertQuantity(value, 'K', 'defaultTemperature');
    this._defaultTemperature = value;
  }

  public getDefaultPressure(): Quantity<'Pa'> | null {
    return this._defaultPressure;
  }
  public setDefaultPressure(value: Quantity<'Pa'> | null): void {
    if (value === null) {
      this._defaultPressure = null;
      return;
    }
    Biome.assertQuantity(value, 'Pa', 'defaultPressure');
    this._defaultPressure = value;
  }

  public getDefaultHumidity(): Quantity<'%'> | null {
    return this._defaultHumidity;
  }
  public setDefaultHumidity(value: Quantity<'%'> | null): void {
    if (value === null) {
      this._defaultHumidity = null;
      return;
    }
    Biome.assertQuantity(value, '%', 'defaultHumidity');
    this._defaultHumidity = value;
  }

  public getDefaultGravity(): Quantity<'m/s²'> | null {
    return this._defaultGravity;
  }
  public setDefaultGravity(value: Quantity<'m/s²'> | null): void {
    if (value === null) {
      this._defaultGravity = null;
      return;
    }
    Biome.assertQuantity(value, 'm/s²', 'defaultGravity');
    this._defaultGravity = value;
  }

  public getDefaultAtmosphere(): string | null {
    return this._defaultAtmosphere;
  }
  public setDefaultAtmosphere(value: string | null): void {
    this._defaultAtmosphere = value;
  }

  // ---------- ambient sensory texture ----------

  public getAmbientSoundMml(): string | null {
    return this._ambientSoundMml;
  }
  public setAmbientSoundMml(value: string | null): void {
    this._ambientSoundMml = value;
  }

  public getAmbientSmellMml(): string | null {
    return this._ambientSmellMml;
  }
  public setAmbientSmellMml(value: string | null): void {
    this._ambientSmellMml = value;
  }

  /**
   * Strict-on-unit guard. Setters that receive a Quantity with the
   * wrong unit throw a clear TypeError rather than corrupting state.
   * Matches `Material.density` / `Material.molarMass`'s shape.
   */
  private static assertQuantity<U extends Parameters<typeof Quantity.of>[1]>(
    value: unknown,
    expectedUnit: U,
    fieldName: string
  ): void {
    if (
      !(value instanceof Quantity) ||
      (value as Quantity<typeof expectedUnit>).unit !== expectedUnit
    ) {
      const actualUnit =
        value instanceof Quantity
          ? `Quantity<'${(value as Quantity<Parameters<typeof Quantity.of>[1]>).unit}'>`
          : typeof value;
      throw new TypeError(
        `Biome.${fieldName} must be Quantity<'${expectedUnit}'> | null; ` +
          `got ${actualUnit}`
      );
    }
  }
}
