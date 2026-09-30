/**
 * Biome — atmospheric defaults + ambient sensory texture, organized
 * as a leaf Idea with an explicit parent ref.
 *
 * Biomes are NOT Zones. They're reference data — like `Material` or
 * `Species` — that hangs off the template tree as leaves. The
 * template tree's folder structure (`/stuff/idea/biome/`, `/stuff/idea/biome/outdoor/`,
 * etc.) is `FolderZone`s for admin / ownership scoping; individual
 * biomes are `Biome` (or `SkyExposedBiome`) leaf templates under them.
 *
 * **Inheritance is explicit, and it is now the tree's ONE mechanism.**
 * A biome that inherits defaults from another names it with the row's
 * own `extends:` — the same key every other template uses. The private
 * `_extendsBiomePath` field is gone (2026-09-25); a biome caches its
 * row's parent at `postRegister` and `getExtendsBiomePath()` answers
 * from that.
 *
 * ⚠⚠ **Biome keeps its own RESOLVER, and that is why every Biome field
 * declares `inherit: 'never'`.** `BiomeApi.resolve*For` walks the chain
 * per READ and reports which ancestor supplied a value (`trace
 * atmosphere`). If the generic clone-time merge copied a parent's
 * `_defaultTemperature` onto the child's row, the walk would find the
 * value on the CHILD and name the wrong ancestor — the reading would
 * still be right and its provenance would be a lie, which is the worse
 * failure. So the row link unifies; the resolution does not.
 *
 * The chain runs from leaf upward to the root universe biome
 * (`/stuff/idea/biome/universe`, which names no parent). It is
 * independent of the templatePath organization, which keeps Zone's
 * original "domain ownership" meaning intact.
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
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { StuffApi } from '../../api/stuff';
import type { FieldMeta } from '../mixin';

/**
 * ⭐ `PostRegistrationMixin` is composed for ONE reason: a live biome has
 * to know the parent its ROW names, and the row is only readable after
 * the instance is registered and stamped with its template path.
 */
const BiomeBase = PostRegistrationMixin(Idea);

export default class Biome extends BiomeBase {
  /** Display name (e.g. `'universe'`, `'temperate-baseline'`, `'quad'`). */
  protected name: string = '';

  /**
   * The parent biome's path, as an OVERRIDE of what the row says.
   * Transient, engine-written, never authored: `setExtendsBiome` /
   * `setExtendsBiomePath` write it, and it wins when set. Absent
   * (`undefined`), the row's own `extends:` answers — cached below.
   */
  private _parentOverride: string | null | undefined = undefined;

  /**
   * The parent this instance's ROW names, read once at `postRegister`.
   * `null` for the root universe biome.
   */
  private _parentPath: string | null = null;

  /**
   * Default temperature for descendants (along the `extends:` chain)
   * that don't override. `null` means "fall through to the
   * parent biome via `_extendsBiomePath`."
   */
  protected _defaultTemperature: Quantity<'K'> | null = null;

  /** Default atmospheric pressure. `null` falls through. */
  protected _defaultPressure: Quantity<'Pa'> | null = null;

  /** Default relative humidity. `null` falls through. */
  protected _defaultHumidity: Quantity<'%'> | null = null;

  /**
   * Default wind speed (`m/s`). Static-authored — there is no weather
   * subsystem; a windy pass or open plain authors a non-zero default,
   * sheltered biomes leave it calm. Read by the body's effective-ambient
   * resolver as the wind-chill input. `null` falls through.
   */
  protected _defaultWind: Quantity<'m/s'> | null = null;

  /** Default gravitational acceleration. `null` falls through. */
  protected _defaultGravity: Quantity<'m/s²'> | null = null;

  /**
   * Default atmosphere tag (`'air'`, `'water'`, `'vacuum'`, …).
   * Plain string — atmosphere isn't a scalar so it doesn't fit
   * the `Quantity` tag-table shape. `null` falls through.
   */
  protected _defaultAtmosphere: string | null = null;

  /**
   * Default ambient sound level for descendants. Parallel to the
   * other `_defaultX` fields — the biome chain
   * (`BiomeApi.resolveAmbientSoundLevelFor`) resolves it per scope.
   * `null` falls through.
   */
  protected _defaultAmbientSoundLevel: Quantity<'dB'> | null = null;

  /**
   * Ambient sound MML — biome-shaped prose rendered when a sound-
   * slate consumer asks. Consumer is deferred; the field ships so
   * authoring can begin.
   */
  protected _ambientSoundMml: string | null = null;

  /** Ambient smell MML. Same shape as `_ambientSoundMml`. */
  protected _ambientSmellMml: string | null = null;

  /**
   * ⭐ **What you SENSE is open; what you'd MEASURE is level 1.**
   *
   * The same cut as `Material`, for the same reason. The ambient sound
   * and smell are what arriving in the place is like — withholding
   * them would withhold the description itself. The temperature in
   * kelvin, the pressure in pascals, the gravity: those are readings,
   * and there are instruments in this world that take them. A number
   * an instrument earns should not be free on a web page by default.
   *
   * Level 1, collapsed rather than gated, `spoilerName: 0` so the
   * reader can see WHICH readings exist to be taken.
   */
  static fieldMeta: FieldMeta = {
    // ⚠⚠ EVERY field below declares `inherit: 'never'`. Biome resolves
    // per READ by its own chain walk and reports which ancestor supplied
    // each value; a clone-time merge would put the parent's value on the
    // child's row and make `trace atmosphere` name the child. See the
    // class docstring.

    // ── Identity, and what arriving there is like ──
    name: { persistent: true, inherit: 'never' },
    _ambientSoundMml: { persistent: true, inherit: 'never' },
    _ambientSmellMml: { persistent: true, inherit: 'never' },
    _defaultAtmosphere: { persistent: true, inherit: 'never' },

    // ── Readings an instrument takes ──
    _defaultTemperature: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('K') },
    _defaultPressure: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('Pa') },
    _defaultHumidity: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('%') },
    _defaultWind: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('m/s') },
    _defaultGravity: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('m/s²') },
    _defaultAmbientSoundLevel: { persistent: true, inherit: 'never', spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('dB') },
  };

  /**
   * Cache this instance's row parent. A by-path template read, which the
   * resident `content` cache answers from memory.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    const path = this.getTemplatePath();
    if (!path) return;
    const { Template } = await import('../stuff/Template');
    const row = await Template.findByPath(path);
    this._parentPath = row?.extends ?? null;
  }

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
    const path = this.getExtendsBiomePath();
    if (path === null) return null;
    return StuffApi.findByTemplatePath<Biome>(path) ?? null;
  }

  /**
   * Override the parent biome on this LIVE instance. `null` clears it to
   * "no parent" — which is different from never having set it, where the
   * row answers.
   */
  public setExtendsBiome(value: Biome | null): void {
    this._parentOverride =
      value === null ? null : (value.getTemplatePath() ?? null);
  }

  /** The path form of {@link setExtendsBiome} — the same override slot. */
  public setExtendsBiomePath(value: string | null): void {
    this._parentOverride = value;
  }

  /**
   * Raw-path accessor — `BiomeApi`'s chain walker reads the path
   * directly to avoid re-resolving an instance it doesn't otherwise
   * need. Per the ref-shapes identity-ref rule "no raw-path getter unless a
   * real consumer demands it" rule — the consumer is BiomeApi.
   *
   * ⭐ **Set wins, otherwise the row wins.** The override exists for the
   * tests and for any future live re-parenting; the authored truth is
   * the row's `extends:`.
   */
  public getExtendsBiomePath(): string | null {
    return this._parentOverride !== undefined
      ? this._parentOverride
      : this._parentPath;
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

  public getDefaultWind(): Quantity<'m/s'> | null {
    return this._defaultWind;
  }
  public setDefaultWind(value: Quantity<'m/s'> | null): void {
    if (value === null) {
      this._defaultWind = null;
      return;
    }
    Biome.assertQuantity(value, 'm/s', 'defaultWind');
    this._defaultWind = value;
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

  public getDefaultAmbientSoundLevel(): Quantity<'dB'> | null {
    return this._defaultAmbientSoundLevel;
  }
  public setDefaultAmbientSoundLevel(value: Quantity<'dB'> | null): void {
    if (value === null) {
      this._defaultAmbientSoundLevel = null;
      return;
    }
    Biome.assertQuantity(value, 'dB', 'defaultAmbientSoundLevel');
    this._defaultAmbientSoundLevel = value;
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
