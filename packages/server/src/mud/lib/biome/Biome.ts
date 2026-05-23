/**
 * Biome — atmospheric defaults + ambient sensory texture, organized
 * as a leaf Idea with an explicit parent ref.
 *
 * Biomes are NOT Zones. They're reference data — like `Material` or
 * `Species` — that hangs off the template tree as leaves. The
 * template tree's folder structure (`/lib/biome/`, `/lib/biome/outdoor/`,
 * etc.) is `FolderZone`s for admin / ownership scoping; individual
 * biomes are `Biome` (or `SkyExposedBiome`) leaf templates under them.
 *
 * **Inheritance is explicit.** A biome that wants to inherit defaults
 * from another biome points at it via `_extendsBiomePath` (Pattern A).
 * The chain in `BiomeApi.resolve*For` follows `_extendsBiomePath`
 * refs from leaf upward to the root universe biome (`/lib/biome/universe`,
 * whose `_extendsBiomePath` is `null`). Path-based templatePath-walk
 * inheritance is gone — the inheritance graph is now independent of
 * the templatePath organization, which keeps Zone's original
 * "domain ownership" meaning intact.
 *
 * `Biome` does NOT compose `SingletonMixin` in v1 — leaves room for
 * future procedural / time-of-day variance per clone.
 * `BiomeApi.findByPath` works either way (delegates to
 * `StuffApi.findByTemplatePath`).
 *
 * Atmospheric defaults round-trip through `QuantityMarshaller`s at
 * the four Quantity-typed fields. The atmosphere tag is a plain
 * string. The two ambient-sensory fields carry MML strings for
 * biome-shaped prose rendering and are consumed by future sound /
 * scent slates.
 */

import { Idea } from '../stuff/Idea';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';
import { StuffApi } from '../../api/stuff';

export class Biome extends Idea {
  /** Display name (e.g. `'universe'`, `'temperate-baseline'`, `'quad'`). */
  protected name: string = '';

  /**
   * Path of the biome this one inherits defaults from. `null` on the
   * root universe biome (and on any deliberately-exotic biome with
   * no parent). Pattern A: stored as a path string, re-resolved on
   * each read via `StuffApi.findByTemplatePath` (HMR-safe).
   */
  public _extendsBiomePath: string | null = null;

  /**
   * Default temperature for descendants (along the `_extendsBiomePath`
   * chain) that don't override. `null` means "fall through to the
   * parent biome via `_extendsBiomePath`."
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
    'name',
    '_extendsBiomePath',
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

  // ---------- name ----------

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  // ---------- inheritance ref ----------

  /**
   * Resolve the parent biome (or `null` for the root). Re-resolves
   * on each call so HMR replacement of a parent template propagates
   * immediately.
   */
  public getExtendsBiome(): Biome | null {
    if (this._extendsBiomePath === null) return null;
    return StuffApi.findByTemplatePath<Biome>(this._extendsBiomePath) ?? null;
  }

  /**
   * Set the parent biome. Stores its templatePath; `null` clears.
   */
  public setExtendsBiome(value: Biome | null): void {
    this._extendsBiomePath =
      value === null ? null : (value.getTemplatePath() ?? null);
  }

  /**
   * Raw-path accessor — `BiomeApi`'s chain walker reads the path
   * directly to avoid re-resolving an instance it doesn't otherwise
   * need. Per the ref-shapes Pattern A "no raw-path getter unless a
   * real consumer demands it" rule — the consumer is BiomeApi.
   */
  public getExtendsBiomePath(): string | null {
    return this._extendsBiomePath;
  }

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
