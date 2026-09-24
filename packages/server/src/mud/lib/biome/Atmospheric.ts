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
 * **Biome reference** is an identity ref: `_biomePath` carries a templatePath
 * string; `getBiome()` re-resolves on each call via
 * `BiomeApi.findByPath` (HMR-safe).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { BiomeApi } from '../../api/biome';
import { MixinApi } from '../../api/mixin';
import type Biome from './Biome';
import type { WeatherPin } from '../weather/WeatherType';

import type Material from '../material/Material';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { Decay } from '../Decay';

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

  getWind(detailKey?: string): Promise<Quantity<'m/s'>>;
  setWind(value: Quantity<'m/s'> | null, detailKey?: string): void;

  getGravity(detailKey?: string): Promise<Quantity<'m/s²'>>;
  setGravity(value: Quantity<'m/s²'> | null, detailKey?: string): void;

  getAtmosphere(detailKey?: string): Promise<string>;
  setAtmosphere(value: string | null, detailKey?: string): void;

  // ---------- weather pin (scope tier) ----------

  /**
   * The scope-tier authored weather pin (weather Wave 2). `{ type, mode }`
   * or `null`. Sits beside the `_temperature`/`_atmosphere` overrides — an
   * authored room that is *always* raining, overriding the procgen field
   * (and any Locality pin) within this single scope. Read by the weather
   * resolve's upward walk.
   */
  getWeatherPin(): WeatherPin | null;
  setWeatherPin(value: WeatherPin | null): void;

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
  _wind: Quantity<'m/s'> | null;
  _gravity: Quantity<'m/s²'> | null;
  _atmosphere: string | null;
  _detailTemperatures: Record<string, Quantity<'K'>>;
  _detailPressures: Record<string, Quantity<'Pa'>>;
  _detailHumidities: Record<string, Quantity<'%'>>;
  _detailWinds: Record<string, Quantity<'m/s'>>;
  _detailGravities: Record<string, Quantity<'m/s²'>>;
  _detailAtmospheres: Record<string, string>;
  _weatherPin: WeatherPin | null;

  // ---------- the envelope (envelope build, D3b) ----------

  /**
   * ⭐⭐ Does this scope hold a state different from its outside?
   *
   * True when it has a volume to hold air in, it authors no own
   * `_temperature` (an authored override is the bespoke case and wins
   * outright), and it is not open to the sky (a yard IS the outside).
   * Inert everywhere else with no guard needed: `Offstage` and a plain
   * `Location` have no volume, so the geometry answers.
   */
  /** What this scope's row says it is built of, or `null`. */
  getFabricSpec(): FabricSpec | null;
  setFabricSpec(value: FabricSpec | null): void;
  /** What a scope of this KIND is built of when its row says nothing. */
  fabricDefaults(): FabricDefaults;

  envelopeApplies(): boolean;

  /**
   * Integrate the envelope forward to now. Sync, reconcile-on-read, and
   * **no far-past guard** — a room left overnight IS cold in the
   * morning, which is the opposite of a body, whose absence is a
   * logout rather than a fact about the world.
   */
  reconcileEnvelope(): void;

  /**
   * The scope's own temperature (K), or `null` when no envelope
   * applies or its outside was never seeded. Sync: the thermal
   * reconcile reads it on the hot path.
   */
  envelopeTemperatureSync(): number | null;

  /** How many exterior openings currently stand open. */
  openExteriorOpenings(): number;

  /** The room's temperature as last integrated, WITHOUT integrating. */
  envelopeTemperatureLast(): number | null;

  /** Why the room is the temperature it is — what `feel` says out loud. */
  envelopeCause(): {
    insideK: number;
    outsideK: number;
    heatInputW: number;
    openings: number;
    fabricMaterialPath: string;
    hottestSource: string | null;
  } | null;

  /** The room's heat-loss coefficient and heat capacity, or `null`. */
  envelopeCoefficients(): {
    uWperK: number;
    capacityJPerK: number;
    fabric: EnvelopeFabric;
  } | null;

  /** The room's total heat-loss coefficient, W/K (0 when none applies). */
  envelopeUWperK(): number;

  /** The Material path the envelope resolved to — what `feel` names. */
  envelopeFabricMaterialPath(): string;

  /** Runtime state — see the mixin. */
  envelopeTemperatureK: number | null;
  envelopeClockStamp: number;
  envelopeOutsideK: number | null;
}

/**
 * What the fabric ladder resolved to, cached transiently on the host.
 * Every number is read off a `Material` row; none of it is authored as
 * an effect.
 */
/**
 * ⭐ What a scope says it is built of — the authored half, two keys and
 * no more. The row names a REAL material and how thick it is; the
 * conductivity, the density and the specific heat are that material's
 * and nobody types them twice.
 *
 * ⚠ The vocabulary is CLOSED and `lint:envelope` clause (e) holds it
 * shut: there is no `uPerM2`, no `insulation:`, and no way to type one.
 *
 * ⚠⚠ **Lives on `AtmosphericMixin`, not on `Location`** — the envelope
 * is the mixin's and so is its fabric. It sat on `Location` until
 * review (2026-09-24) and the tell was the shape of the reader: the
 * mixin composes INSIDE `Location`, so it could only reach three
 * optional members through a cast, which is the host saying it is the
 * wrong host. A `Vessel` answers the hook too, and that is why the
 * `getMaterial` rung could go.
 */
export interface FabricSpec {
  /** A `Material` template path — what the walls and roof are made of. */
  material?: string;
  /** How thick, in metres. Defaults to `envelope.defaultThicknessM`. */
  thicknessM?: number;
}

/** What {@link Atmospheric.fabricDefaults} answers. */
export interface FabricDefaults {
  materialPath: string;
  thicknessM: number;
}

export interface EnvelopeFabric {
  /** Thermal conductivity, W/(m·K). */
  kWmK: number;
  /** Density, kg/m³. */
  rhoKgM3: number;
  /** Specific heat, J/(kg·K). */
  cJkgK: number;
  /** Wall thickness, m. */
  thicknessM: number;
  /** The Material row this came from — what `feel` names. */
  materialPath: string;
}

export function AtmosphericMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class AtmosphericMixin extends Base implements Atmospheric {
    static _mixinName = 'AtmosphericMixin';

    /**
     * Field-marshaller bindings for the five Quantity-typed bulk
     * fields. The per-detail maps round-trip via standard JSON
     * (`Quantity.toJSON` / `fromJSON`) — `Record<string, Quantity<U>>`
     * serializes natively without a map marshaller.
     */
    static fieldMeta: FieldMeta = {
      _biomePath: { persistent: true, authorable: true, authorPicker: 'Biome' },
      _temperature: { persistent: true, marshaller: QuantityMarshaller.pathFor('K'), authorable: true },
      _pressure: { persistent: true, marshaller: QuantityMarshaller.pathFor('Pa'), authorable: true },
      _humidity: { persistent: true, marshaller: QuantityMarshaller.pathFor('%'), authorable: true },
      _wind: { persistent: true, marshaller: QuantityMarshaller.pathFor('m/s'), authorable: true },
      _gravity: { persistent: true, marshaller: QuantityMarshaller.pathFor('m/s²'), authorable: true },
      _atmosphere: { persistent: true, authorable: true },
      _detailTemperatures: { persistent: true, authorable: true },
      _detailPressures: { persistent: true, authorable: true },
      _detailHumidities: { persistent: true, authorable: true },
      _detailWinds: { persistent: true, authorable: true },
      _detailGravities: { persistent: true, authorable: true },
      _detailAtmospheres: { persistent: true, authorable: true },
      _weatherPin: { persistent: true, authorable: true },
      fabric: { persistent: true, authorable: true },
      envelopeTemperatureK: { persistent: true, runtimeState: true },
      envelopeClockStamp: { persistent: true, runtimeState: true },
      envelopeOutsideK: { persistent: true, runtimeState: true },
    };

    // ---------- storage ----------

    /** Authored biome reference (identity ref, a path string). */
    public _biomePath: string | null = null;
    /** Local room-scope temperature override; `null` falls through the chain. */
    public _temperature: Quantity<'K'> | null = null;
    /** Local room-scope pressure override; `null` falls through the chain. */
    public _pressure: Quantity<'Pa'> | null = null;
    /** Local room-scope humidity override; `null` falls through the chain. */
    public _humidity: Quantity<'%'> | null = null;
    /** Local room-scope wind override; `null` falls through the chain. */
    public _wind: Quantity<'m/s'> | null = null;
    /** Local room-scope gravity override; `null` falls through the chain. */
    public _gravity: Quantity<'m/s²'> | null = null;
    /** Local room-scope atmosphere override; `null` falls through the chain. */
    public _atmosphere: string | null = null;

    /** Per-detail temperature overrides. */
    public _detailTemperatures: Record<string, Quantity<'K'>> = {};
    /** Per-detail pressure overrides. */
    public _detailPressures: Record<string, Quantity<'Pa'>> = {};
    /** Per-detail humidity overrides. */
    public _detailHumidities: Record<string, Quantity<'%'>> = {};
    /** Per-detail wind overrides. */
    public _detailWinds: Record<string, Quantity<'m/s'>> = {};
    /** Per-detail gravity overrides. */
    public _detailGravities: Record<string, Quantity<'m/s²'>> = {};
    /** Per-detail atmosphere overrides. */
    public _detailAtmospheres: Record<string, string> = {};

    /** Scope-tier authored weather pin (`{type,mode}` or null). */
    public _weatherPin: WeatherPin | null = null;

    // ---------- the envelope (D3b) ----------

    /** The scope's own air temperature (K); `null` until first seeded. */
    public envelopeTemperatureK: number | null = null;
    /** Game-time (s) of the last envelope integration; 0 = unseeded. */
    public envelopeClockStamp = 0;
    /** What it is drifting TOWARD (K) — stamped at the async resolve. */
    public envelopeOutsideK: number | null = null;
    /**
     * The resolved fabric, cached transiently. A convenience, not a
     * necessity: the material lookup is a sync registry read, so a cold
     * cache costs one lookup rather than correctness.
     */
    private _envelopeResolved: EnvelopeFabric | null = null;

    /**
     * What this place says it is built of, without authoring anything
     * else. `null` — the ordinary case — falls through to
     * {@link fabricDefaults}.
     */
    protected fabric: FabricSpec | null = null;

    public getFabricSpec(): FabricSpec | null {
      return this.fabric;
    }
    public setFabricSpec(value: FabricSpec | null): void {
      this.fabric = value;
      this._envelopeResolved = null;
    }

    /**
     * What a scope of this KIND is built of, when its row says nothing.
     *
     * @hook Override where the class knows its own construction — a
     *   cellar cut into rock, a glasshouse, a tent, a ship's hull, or a
     *   `Vessel`, which IS matter and answers with its own material.
     *   The row still wins: a `fabric:` on the row beats this, and this
     *   beats the universe default.
     */
    public fabricDefaults(): FabricDefaults {
      return {
        materialPath: envelopeDialStr(
          AppSettingKeys.envelopeDefaultFabric,
          '/stuff/idea/material/rock/granite',
        ),
        thicknessM: envelopeDial(
          AppSettingKeys.envelopeDefaultThicknessM,
          0.3,
        ),
      };
    }
    /**
     * ⚠⚠ **Reentry guard, and it is load-bearing.**
     *
     * `reconcileEnvelope` walks the room's contents asking each
     * `SpaceHeating` source for its output. `spaceHeatOutputW()` asks
     * `isLit()`, which runs `reconcileFurnaceFuel()`, whose burnout
     * edge calls `restampHeated()` → `ThermalMixin.restamp()` →
     * `effectiveAmbient()` → `BiomeApi.resolveTemperatureFor(container)`
     * → **this room's envelope again**.
     *
     * `ThermalMixin` has had `_thermalReconciling` for exactly this
     * reason; the envelope needed its own. Found by the drive, as a
     * `feel` in the cookhouse that never answered — thirty seconds of
     * a socket going round a ring of four subsystems, each of which is
     * individually correct.
     */
    private _envelopeReconciling = false;

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
        this.restampThermalContents();
        return;
      }
      assertQuantity(value, 'K', 'temperature');
      this._temperature = value;
      // Ambient shift in place (Step 1.6 trigger 2): fan-out a re-stamp
      // over the scope's Thermal contents so each freezes-and-continues
      // toward the new ambient. Load-bearing under the cached-ambient
      // model — with no lazy read, nothing would otherwise pick the
      // change up. Room-scope only; per-detail shifts are rare and the
      // detail-keyed contents aren't enumerable here.
      this.restampThermalContents();
    }

    /**
     * Fire a re-stamp on every Thermal object directly contained in this
     * scope. Fire-and-forget (the setter is sync; `restamp` is async).
     * A thermal-listens-to-biome witness, not a dependency the other way.
     */
    private restampThermalContents(): void {
      const self = this as unknown as Stuff & Container;
      for (const content of self.getContents()) {
        if (MixinApi.isThermal(content)) {
          void content.restamp();
        }
      }
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

    // ---------- wind ----------

    public async getWind(detailKey?: string): Promise<Quantity<'m/s'>> {
      const self = this as unknown as Stuff & Container;
      return BiomeApi.resolveWindFor(self, detailKey);
    }
    public setWind(value: Quantity<'m/s'> | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailWinds[detailKey];
          return;
        }
        assertQuantity(value, 'm/s', 'wind');
        this._detailWinds[detailKey] = value;
        return;
      }
      if (value === null) {
        this._wind = null;
        return;
      }
      assertQuantity(value, 'm/s', 'wind');
      this._wind = value;
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

    // ---------- weather pin (scope tier) ----------

    public getWeatherPin(): WeatherPin | null {
      return this._weatherPin;
    }
    public setWeatherPin(value: WeatherPin | null): void {
      this._weatherPin = value;
    }

    // ---------- the envelope (D3b) ----------

    /**
     * ⭐⭐ Does this scope hold a state different from its outside?
     *
     * Three conditions, and every one of them is the geometry or the
     * author answering rather than a guard:
     *
     *  - **It has a volume.** `Offstage` extends `Location` directly and
     *    a plain `Location` derives nothing, so both return `null` and
     *    get no envelope. An off-stage parking room is not a place, and
     *    the geometry already says so — there is deliberately no
     *    `if (room is Offstage)` anywhere.
     *  - **It authors no own `_temperature`.** That is the EXCEPTION
     *    mechanism (a cellar, a cave — somewhere the same all year) and
     *    it wins outright. `lint:envelope` keeps a curated list of every
     *    row that uses it, with a reason each.
     *  - **It is not open to the sky.** A yard IS the outside; giving it
     *    an envelope would have it drift toward itself.
     */
    public envelopeApplies(): boolean {
      const self = this as unknown as Stuff & Container;
      if (this.getVolume() === null) return false;
      if (this._temperature !== null) return false;
      return !BiomeApi.isSkyExposed(self);
    }

    /**
     * ⭐ How many exterior openings stand open right now.
     *
     * An obvious exit whose destination is open to the sky, and which
     * is either doorless or has its door open. ⚠ Interior openings
     * count for NOTHING: this build narrows thermal.md's ventilation
     * non-goal to **room-to-outside only**, and rooms still do not mix
     * air with each other as a general mechanism.
     */
    public openExteriorOpenings(): number {
      const self = this as unknown as Stuff & Container;
      if (!MixinApi.isExitable(self)) return 0;
      let open = 0;
      for (const exit of self.getObviousExits()) {
        // The light walk's four hazard guards, for the same reasons: an
        // exit may name no room, name a template with many live clones,
        // throw on resolve, or land on something reaped mid-walk. A
        // neighbour going wrong must not take the temperature down.
        if (!exit.hasSpatialDestination()) continue;
        const door = exit.getDoor();
        if (door && !door.isOpen()) continue;
        let dest: Stuff & Container;
        try {
          dest = exit.getDestination();
        } catch {
          continue;
        }
        if (!MixinApi.isContainer(dest) || (dest as Stuff).isDestroyed()) {
          continue;
        }
        if (BiomeApi.isSkyExposed(dest)) open += 1;
      }
      return open;
    }

    /**
     * Resolve what this place is built of — **two rungs, and the second
     * always answers**:
     *
     *   1. the scope's own `fabric:` spec;
     *   2. its class's {@link fabricDefaults} hook, whose terminal here
     *      is the universe default (`envelope.defaultFabric`), and which
     *      a `Vessel` overrides with its own material because it IS
     *      matter.
     *
     * ⚠⚠ It was four rungs reached through a cast until review
     * (2026-09-24). Two of them — the `Location`'s spec and the
     * `Vessel`'s material — were only optional *because the members sat
     * on hosts this mixin composes inside of*, so it could not see them.
     * Moving the fabric onto the mixin that consumes it made rung 3 a
     * `Vessel` override and rung 4 the hook's own terminal, and the
     * three `?.` reaches went with them. ⭐ The tell was the cast: a
     * mixin narrowing its own `this` is the host being wrong.
     *
     * ⚠ A material whose row authors no `thermalConductivity` reads
     * **zero**, which is an infinite insulator — silently. That is why
     * `lint:envelope` clause (b) refuses a `fabric.material` naming a
     * row that does not conduct, and why the floor here is a small
     * positive number rather than the raw read.
     */
    private resolveFabric(): EnvelopeFabric {
      if (this._envelopeResolved !== null) return this._envelopeResolved;

      const spec = this.getFabricSpec();
      const defaults = this.fabricDefaults();
      const materialPath = spec?.material ?? defaults.materialPath;
      const thicknessM =
        typeof spec?.thicknessM === 'number'
          ? spec.thicknessM
          : defaults.thicknessM;

      const material =
        StuffApi.findByTemplatePath<Material>(materialPath) ?? null;
      const resolved: EnvelopeFabric = {
        kWmK: Math.max(material?.getThermalConductivity().rawValue() ?? 0, 0.02),
        rhoKgM3: material?.getDensity().rawValue() || 2000,
        cJkgK: material?.getSpecificHeat().rawValue() || 900,
        thicknessM: thicknessM > 0 ? thicknessM : 0.3,
        materialPath,
      };
      this._envelopeResolved = resolved;
      return resolved;
    }

    /**
     * ⭐⭐ Integrate the envelope forward to now.
     *
     * `T ← Decay.toward(T, T_ss, elapsed, C/U)` — exact for
     * piecewise-constant inputs, the same shape `ThermalMixin` uses on
     * a body, with:
     *
     *  - `U_fabric = (k / t) × A`, `A = 5 · extent²` — the walls and the
     *    roof of a cube cell. Masonry 0.6/0.3 m gives 2 W/m²K; timber
     *    0.12/0.15 gives 0.8; an iron sheet 80/0.005 gives 16 000, and a
     *    tin shed IS the street, honestly and without a special case.
     *  - `U_open = openingUPerM3 × V × n` — an open door is the inside
     *    air leaving, not conduction, so it scales with volume.
     *  - `C = C_air + ρ·c·A·activeDepth` — the SKIN of the fabric that
     *    answers within the hour. The stone holding the day is literally
     *    this term.
     *  - `P = Σ spaceHeatOutputW()` over `SpaceHeating` contents — a
     *    hearth, never a forge. A forge heats what you put IN it, and
     *    that rule is kept by composition rather than by asking "is this
     *    a forge".
     *
     * ⚠ **No far-past guard, deliberately.** `ThermalMixin` drops a long
     * gap because a body's absence is a logout; a ROOM's absence is a
     * fact about the world, and a room left overnight is cold in the
     * morning. The cost is that a hearth which burnt out mid-gap
     * over-credits the room for one read — bounded, self-correcting on
     * the next, and noted in thermal.md.
     */
    public reconcileEnvelope(): void {
      if (this._envelopeReconciling) return;
      if (!this.envelopeApplies()) return;
      const outside = this.envelopeOutsideK;
      if (outside === null) return;

      const now = envelopeNowSeconds();
      if (now === null) return;
      if (this.envelopeTemperatureK === null) {
        this.envelopeTemperatureK = outside;
      }
      if (this.envelopeClockStamp === 0) {
        this.envelopeClockStamp = now;
        return;
      }
      const elapsed = now - this.envelopeClockStamp;
      this.envelopeClockStamp = now;
      if (elapsed <= 0) return;

      const coeff = this.envelopeCoefficients();
      if (coeff === null) return;

      this._envelopeReconciling = true;
      try {
        let heatW = 0;
        const self = this as unknown as Stuff & Container;
        for (const occupant of self.getContents()) {
          if (!MixinApi.isSpaceHeating(occupant)) continue;
          heatW += occupant.spaceHeatOutputW();
        }

        const steadyState = outside + heatW / coeff.uWperK;
        this.envelopeTemperatureK = Decay.toward(
          this.envelopeTemperatureK,
          steadyState,
          elapsed,
          coeff.capacityJPerK / coeff.uWperK,
        );
      } finally {
        this._envelopeReconciling = false;
      }
    }

    /**
     * The room's heat-loss coefficient and heat capacity.
     *
     * ⭐ Extracted so the integration and the PROVENANCE `feel` reads
     * cannot come apart: one arithmetic, two callers. A second copy of
     * this formula would be a room whose stated reason disagreed with
     * its own temperature, which is the exact failure the cause line
     * exists to make visible.
     */
    public envelopeCoefficients(): {
      uWperK: number;
      capacityJPerK: number;
      fabric: EnvelopeFabric;
    } | null {
      const volQ = this.getVolume();
      const volume = volQ ? volQ.rawValue() : 0;
      if (!(volume > 0)) return null;
      // A cube of this volume: side = ∛V, and the envelope is its four
      // walls plus its roof. The floor is the ground and does not leak.
      const side = Math.cbrt(volume);
      const area = 5 * side * side;

      const fabric = this.resolveFabric();
      // ⭐⭐ **Conduction through the wall IN SERIES with the air films
      // either side of it.** A wall's resistance is not only its own:
      // still air clings to both faces and carries about
      // 0.17 m²K/W between them, which is the standard building-physics
      // figure and the reason a real stone wall is not the catastrophe
      // its raw conductivity suggests.
      //
      // ⚠ The plan's formula was `U = (k/t)·A` with no films, and it
      // does not survive contact with the shipped material rows: real
      // granite is 2.9 W/(m·K), not the 0.6 of brick masonry the worked
      // numbers assumed, so a 3 m stone cell came out at 435 W/K — a
      // hearth would lift it three degrees — and an iron sheet came out
      // at SIXTEEN THOUSAND, which is not a number about anything. With
      // the films the same shed is ~265 W/K: genuinely bad, which is
      // true, rather than infinitely bad, which is not.
      const rFilms = envelopeDial(
        AppSettingKeys.envelopeSurfaceResistanceM2KPerW,
        0.17,
      );
      const rWall = fabric.thicknessM / fabric.kWmK + rFilms;
      const uFabric = area / rWall;
      const uOpen =
        envelopeDial(AppSettingKeys.envelopeOpeningUPerM3, 6) *
        volume *
        this.openExteriorOpenings();
      const uWperK = uFabric + uOpen;
      if (!(uWperK > 0)) return null;

      const activeDepth = envelopeDial(
        AppSettingKeys.envelopeActiveDepthM,
        0.01,
      );
      // Air (ρ·c ≈ 1.2 × 1005) plus the responsive skin of the fabric.
      const capacityJPerK =
        1.2 * 1005 * volume +
        fabric.rhoKgM3 * fabric.cJkgK * area * activeDepth;
      if (!(capacityJPerK > 0)) return null;
      return { uWperK, capacityJPerK, fabric };
    }

    /** The room's total heat-loss coefficient, W/K (0 when none applies). */
    public envelopeUWperK(): number {
      return this.envelopeCoefficients()?.uWperK ?? 0;
    }

    /** The Material path the envelope resolved to — what `feel` names. */
    public envelopeFabricMaterialPath(): string {
      return this.resolveFabric().materialPath;
    }

    /**
     * ⭐ **Why this room is the temperature it is**, synchronously, as
     * last integrated — the read `feel` turns into a sentence.
     *
     * Lives here rather than in the controller for two reasons, and the
     * second is the one that matters: a controller walking a room's
     * contents to work out what is burning in it is a controller
     * re-deriving what the room already knows (`lint:instrument-args`
     * fails it by shape, and is right to), and a second copy of that
     * walk is a room whose stated reason could disagree with its own
     * temperature.
     */
    public envelopeCause(): {
      insideK: number;
      outsideK: number;
      heatInputW: number;
      openings: number;
      fabricMaterialPath: string;
      hottestSource: string | null;
    } | null {
      const inside = this.envelopeTemperatureLast();
      const outsideK = this.envelopeOutsideK;
      if (inside === null || outsideK === null) return null;

      let heatInputW = 0;
      let hottestSource: string | null = null;
      let hottestW = 0;
      const self = this as unknown as Stuff & Container;
      for (const occupant of self.getContents()) {
        if (!MixinApi.isSpaceHeating(occupant)) continue;
        const w = occupant.spaceHeatOutputW();
        heatInputW += w;
        if (w > hottestW) {
          hottestW = w;
          hottestSource = (occupant as unknown as Stuff).getPresentation();
        }
      }
      return {
        insideK: inside,
        outsideK,
        heatInputW,
        openings: this.openExteriorOpenings(),
        fabricMaterialPath: this.envelopeFabricMaterialPath(),
        hottestSource,
      };
    }

    /**
     * The scope's own temperature (K), reconciled, or `null` when no
     * envelope applies or its outside was never seeded. Sync, because
     * the thermal reconcile reads it on every vitals poll.
     */
    public envelopeTemperatureSync(): number | null {
      if (!this.envelopeApplies()) return null;
      if (this.envelopeOutsideK === null) return null;
      this.reconcileEnvelope();
      return this.envelopeTemperatureK;
    }

    /**
     * ⭐⭐ The room's temperature **as last integrated**, without
     * integrating. For readers that are inside the room.
     *
     * ⚠⚠ **The room integrates itself; bodies READ it.** A body's
     * reconcile calling `envelopeTemperatureSync()` closes a ring: the
     * room's integration walks its contents, lighting a fire restamps
     * every Thermal body standing in it, a restamp resolves the room's
     * temperature, and round it goes. Four subsystems, each
     * individually correct, and a `feel` in a cookhouse with a lit
     * hearth that never answered — found by the drive.
     *
     * Reading the last value costs a body nothing in accuracy: the room
     * re-integrates whenever anything resolves its temperature, which
     * includes every `feel`, every `measure`, and the body's own
     * re-stamp path one level up.
     */
    public envelopeTemperatureLast(): number | null {
      if (!this.envelopeApplies()) return null;
      if (this.envelopeOutsideK === null) return null;
      return this.envelopeTemperatureK;
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

/**
 * Game-time now, or `null` when no world clock is registered. The
 * `furnaceNowSeconds` shape: without the registry the envelope simply
 * does not integrate, which is the right degradation for a unit fixture
 * and for the window before boot finishes.
 */
function envelopeNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/** Numeric AppSetting read with a seeded-literal fallback (pre-warm safe). */
function envelopeDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** String AppSetting read with a seeded-literal fallback (pre-warm safe). */
function envelopeDialStr(key: string, fallback: string): string {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? fallback : raw;
  } catch {
    return fallback;
  }
}
