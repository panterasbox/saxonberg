/**
 * Material — bulk substance singleton.
 *
 * A `Material` describes the physical properties of a substance independent
 * of any particular object made from it. Two Stuff instances composed of
 * the same Material (the iron in a sword, the iron in a chain) reach the
 * same singleton via `Tangible.getMaterial()` and observe identical
 * physics. Per-object variation lives elsewhere — the bulk Material is
 * shared.
 *
 * Tangible Stuff carries a default bulk Material plus optional per-Detail
 * overrides (the wood haft vs the iron head of an axe).
 *
 * ⭐⭐ **Material decomposition (2026-11).** This class holds only what
 * every material has. Everything else is a CAPABILITY — a mixin named for
 * the substance's physics (`CombustionMixin`, `FusionMixin`,
 * `EdibilityMixin`, … in this folder) — and a material's CLASS is its KIND,
 * what the substance is: `Metal`, `Stone`, `Food`, `Wood`
 * (`platform/idea/material/`, above the abstract `Mineral`/`Organic`/
 * `Plant`/`Animal` here). A kind composes the capabilities its members
 * physically share; an exception is a one-step child. Chemical identity
 * (`ElementMixin` · `CompoundMixin` · `MixtureMixin`) is exclusive and
 * rides the kind too.
 *
 * ⛔ **Consumers depend on capabilities, never on kinds**: ask
 * `MixinApi.hasFusion(m)` before reading a melting point, never whether it
 * is a `Metal` (`lint:material-kinds`). A material that lacks a capability
 * simply does not have it — there is no "not applicable" value.
 *
  * Singleton-by-templatePath: every `/stuff/idea/material/<...>` template resolves
 * to the same instance via `StuffApi.singleton(path)` /
 * `findByTemplatePath`. Cross-references on other Stuff store the path
 * string and re-resolve on each call (HMR-safe — no cached instance).
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PerceptibleMixin } from '../description/Perceptible';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { VetoResult } from '../errors';
import type { EvictionContext, Stuff } from '../stuff/Stuff';
import type { FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { MaterialApi } from '../../api/material';
import type { CleanserDescriptor } from '../cleanliness/Cleanser';
import type { BoundaryRole } from '../security/BoundaryRole';

export type { ChillArrow } from './Fusion';
export type { TasteTag } from './Edibility';
export { BASIC_TASTES, TASTE_THRESHOLDS, TASTE_HEDONICS } from './Edibility';
export type { LeachSpec } from './Toxicity';
export type { ConcentrationArrow, CrystallizesTo } from './Solution';
export type { PigmentSpec, AdhesiveSpec } from './Coating';
export type { BiologicalSource } from './Tissue';
export type { CompositionEntry } from './Mixture';
export type { ElementChemistry } from './Compound';

/**
 * ⭐⭐ The base keeps only what EVERY material has (material decomposition
 * W2b): name, appearance, tags, density, the thermal and electrical
 * constants, and what it washes as. Every other property is a capability a
 * kind composes; nothing may be "just a material", so no row names this
 * class — it names its kind.
 */
export default class Material extends SingletonMixin(
// ⭐⭐ **NOT `PropertiedMixin`, and it was here until the base-class
// narrowing (2026-09-30).** `Propertied` is a per-INSTANCE bag of
// runtime state — a quest flag, a buff, a circle membership — and this
// class is a `Singleton`: one instance for the whole world, shared by
// every holder of the thing it describes. A prop set on `oak` would be
// a prop on every oak there has ever been, which is not a per-instance
// store; it is a global with extra steps.
//
// ⭐ The tell was already written down. `race.md:280-290` records that
// it was composed for *"per-material damage resistance as
// content-defined prop keys … accessors removed until combat lands"* —
// and when combat landed, materials-response shipped resistance as
// FIRST-CLASS FIELDS instead. The mixin outlived the design that asked
// for it by two builds.
//
// ⚠ Verified empty, not merely unauthored: every `setProp` / `getProp`
// / `initProp` / `maskProp` receiver in the tree is a person
// (`BankingLogic`), an actor (`Climbable`/`Flyable`/`Swimmable`), a
// slot occupant (`Drivable`) or `EventRegistry` itself. None is a
// reference singleton.
  PerceptibleMixin(Idea),
) {
  /**
   * what things are MADE of: a closed vocabulary, so a per-parcel `iron` would fork it.
   *
   * See `lib/security/BoundaryRole.ts` — this replaces a
   * hand-maintained list in `api/security.ts` /
   * `BootstrapManager`, and `lint:boundary-roles` holds the
   * `commons` census at its measured ceiling.
   */
  static boundaryRole: BoundaryRole = 'commons';

  /**
   * Residency veto — a Material is reference data resolved by SYNC
   * reads (`Tangible.getMaterial`, bulk slots, autoignition); the only
   * standup is the `MaterialCatalogue` roster warm, so a culled material
   * would stay a null read until the next process. Never culled.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'material reference singleton; never culled' };
  }

  /** Display name (e.g. `'iron'`, `'oak'`, `'fruit-flesh'`). */
  protected name: string = '';

  /**
   * Free-prose appearance phrase for the substance as it reads in a
   * holder — e.g. `'dark, steaming coffee'`, `'clear water'`. The bulk
   * substrate composes this into a holder's description (`look thermos`)
   * and a surface puddle's line (`a puddle of water`). Plain property
   * field; storage IS the value.
   *
   * `Material` composes {@link PerceptibleMixin} for its keyword pool
   * (so `drink coffee` resolves a holder by its bulk material) but NOT
   * `Visible` / `Named` — substance identity stays out of the
   * perception-target machinery (no Sensor, scene, or light behavior),
   * so material keywords never leak into room scope. Keywords are
   * purely authored; `appearance` is the rendered phrase.
   */
  protected appearance: string = '';

  /**
   * Density as a `Quantity<'kg/m³'>`. The QuantityMarshaller for
   * kg/m³ handles hydration coercion (numeric / string / JSON-shape
   * inputs) at the persistence boundary; the runtime accessor pair
   * stays strict on Quantity.
   */
  private _density: Quantity<'kg/m³'> = Quantity.of(0, 'kg/m³');

  protected get density(): Quantity<'kg/m³'> {
    return this._density;
  }
  protected set density(value: Quantity<'kg/m³'>) {
    if (!(value instanceof Quantity) || value.unit !== 'kg/m³') {
      throw new TypeError(
        `Material.density must be a Quantity<'kg/m³'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
      );
    }
    this._density = value;
  }

  /**
   * Thermal conductivity (`W/(m·K)`) — a real, tabulated material
   * property, Quantity-typed (strict on unit) like `density`. Consumed
   * by the Thermal capability (heat flow / algor-mortis time-of-death);
   * no live consumer yet — seeded ahead per the reality-shaped
   * discipline. (The old 0–1 `hardness` / `flammability` / `opacity` /
   * `magneticSusceptibility` fields were removed: fake normalized scales
   * with zero consumers. Re-add as real Quantities when a consumer — fire,
   * magnetism — actually lands. `electricalConductivity` has since been
   * re-added below as a real `Quantity<'S/m'>`: the electricity build is
   * the consumer that landed.)
   */
  private _thermalConductivity: Quantity<'W/(m·K)'> = Quantity.of(
    0,
    'W/(m·K)',
  );

  protected get thermalConductivity(): Quantity<'W/(m·K)'> {
    return this._thermalConductivity;
  }
  protected set thermalConductivity(value: Quantity<'W/(m·K)'>) {
    if (!(value instanceof Quantity) || value.unit !== 'W/(m·K)') {
      throw new TypeError(
        `Material.thermalConductivity must be a Quantity<'W/(m·K)'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
      );
    }
    this._thermalConductivity = value;
  }

  /**
   * Specific heat capacity (`J/(kg·K)`) — a real, tabulated material
   * property, Quantity-typed (strict on unit) like `thermalConductivity`.
   * The `C = m·c` half of the Thermal capability's `τ = R·C`: a body of
   * water (≈ 4186) holds far more heat per kilogram than steel (≈ 466),
   * so a full thermos cools slower than an empty mug. Consumed by
   * `ThermalMixin.thermalCapacity()`; falls back to a dial when a
   * material authors none.
   */
  private _specificHeat: Quantity<'J/(kg·K)'> = Quantity.of(
    0,
    'J/(kg·K)',
  );

  protected get specificHeat(): Quantity<'J/(kg·K)'> {
    return this._specificHeat;
  }
  protected set specificHeat(value: Quantity<'J/(kg·K)'>) {
    if (!(value instanceof Quantity) || value.unit !== 'J/(kg·K)') {
      throw new TypeError(
        `Material.specificHeat must be a Quantity<'J/(kg·K)'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
      );
    }
    this._specificHeat = value;
  }

  /**
   * Electrical conductivity as a `Quantity<'S/m'>` — a real, tabulated
   * material property spanning ~20 orders of magnitude (copper ≈ 6×10⁷,
   * salt water ≈ 5, flesh ≈ 0.2, rubber ≈ 1×10⁻¹³). Quantity-typed and
   * strict on unit like `hardness`. The *height* the shock model reads:
   * `MaterialApi` inverts it to a path resistance for `I = V/R`, so metal
   * conducts (betrays armor) and rubber insulates — the armor inversion is
   * emergent from this one number, never an `isElectrical` special case.
   * Zero-default until authored (materials stay content — the base-library
   * pack supplies the roster's values). Re-added here as the real
   * `Quantity` the removed 0–1 scalar reserved a seam for — electricity is
   * the consumer that landed.
   */
  private _electricalConductivity: Quantity<'S/m'> = Quantity.of(0, 'S/m');

  protected get electricalConductivity(): Quantity<'S/m'> {
    return this._electricalConductivity;
  }
  protected set electricalConductivity(value: Quantity<'S/m'>) {
    if (!(value instanceof Quantity) || value.unit !== 'S/m') {
      throw new TypeError(
        `Material.electricalConductivity must be a Quantity<'S/m'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
      );
    }
    this._electricalConductivity = value;
  }

  /**
   * Free-form classification tags. See class header for layer-1
   * description; vocabulary intentionally not centrally registered.
   */
  protected tags: string[] = [];


  /**
   * Field-marshaller bindings. The persistence pipeline routes
   * hydration / save through these marshallers; setters stay
   * strict on the runtime value type.
   */
  /**
   * ⭐ **The measured properties carry `spoiler: 1`.**
   *
   * What a material *is* — its name, look, tags, and the chemical
   * identity anyone could look up in the real world — is open. What it
   * *measures* is the reward for working with it: how dense oak is,
   * what temperature it catches at, how much energy it gives back. A
   * panel that hands a reader every constant makes the material
   * science a lookup instead of a subject.
   *
   * Level **1** specifically, which is the reader rung: hidden by
   * default, one click to open, plain for a reader who set
   * `wiki.spoilerAppetite` higher. It is a **default about
   * presentation, not a lock** — a player who wants the numbers has
   * them immediately, and only a guest (who cannot persist the
   * preference) is refused outright.
   *
   * ⭐ `spoilerName: 0` beside it, because **the existence of the
   * property is schema and only the measurement is content**. "Oak has
   * a density" is what `help` and the generated API docs publish
   * anyway; `750 kg/m³` is the part worth working for. So the panel
   * shows the property list with the numbers collapsed, rather than a
   * table of blanks that tells a reader nothing about what is there to
   * find.
   *
   * ⚠ This is not a knowledge model and must not be mistaken for one.
   * It cannot express "this character has worked oak and therefore
   * knows its density" — that is the Transcript/Competence axis, and
   * reaching for a spoiler level to model something a character should
   * EARN is the mistake this note exists to prevent.
   *
   * ⚠ The level rides the FIELD, so it applies wherever the value
   * surfaces — wiki panel, Studio, help, a future codex — which is the
   * whole reason it is declared here and not in the wiki. Changes show
   * up as a diff in `wiki-spoiler-fields.snapshot.test.ts`.
   */
  static fieldMeta: FieldMeta = {
    // ── Identity: what it is, and what anyone could look up ──
    name: { persistent: true },
    appearance: { persistent: true },
    tags: { persistent: true },
    // ⭐ What it washes as — a role many substances play (soap, lye, sand,
    // spirit, vinegar), not one physics, so it is not a capability
    // (material decomposition W2a census).
    cleanser: { persistent: true, authorable: true },

    // ── Measured: what working with it teaches you ──
    density: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('kg/m³') },
    thermalConductivity: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('W/(m·K)') },
    specificHeat: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('J/(kg·K)') },
    electricalConductivity: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('S/m') },
    // ⭐ Size and carrying D4: what a strap, a belt or a rail of it bears.
    tensileStrengthMPa: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
  };

  /**
   * ⭐ What it breaks at pulled, MPa (size and carrying D4) — what a belt, a
   * strap, a rail of it bears hung from (`Placing.bearsKg`). `0` = not
   * given, and a host of it bears without bound (a pegboard's authors need
   * not care). On every material, as density is: a liquid simply never
   * gives one.
   */
  public tensileStrengthMPa = 0;
  public getTensileStrengthMPa(): number {
    return this.tensileStrengthMPa;
  }
  public setTensileStrengthMPa(value: number): void {
    if (!(typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
      throw new RangeError(`tensileStrengthMPa must be a non-negative number (got ${String(value)})`);
    }
    this.tensileStrengthMPa = value;
  }

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  /** Read the substance's appearance phrase (may be empty). */
  public getAppearance(): string { return this.appearance; }
  /** Set the substance's appearance phrase. */
  public setAppearance(value: string): void { this.appearance = value; }

  /**
   * Read density. Strict-shape on `Quantity<'kg/m³'>`; the
   * QuantityMarshaller absorbed authoring-shape coercion at the
   * persistence boundary, so callers see only the runtime type.
   */
  public getDensity(): Quantity<'kg/m³'> {
    return this._density;
  }
  /**
   * Set density. Strict on `Quantity<'kg/m³'>` — authors who hold a
   * raw number wrap it via `Quantity.of(n, 'kg/m³')` at the call
   * site. The QuantityMarshaller handles raw-shape coercion only on
   * the persistence path; in-process callers commit to the typed
   * value.
   */
  public setDensity(value: Quantity<'kg/m³'>): void {
    this.density = value;
  }

  public getThermalConductivity(): Quantity<'W/(m·K)'> {
    return this._thermalConductivity;
  }
  public setThermalConductivity(value: Quantity<'W/(m·K)'>): void {
    this.thermalConductivity = value;
  }

  public getSpecificHeat(): Quantity<'J/(kg·K)'> {
    return this._specificHeat;
  }
  /**
   * ⭐ Thermal effusivity √(kρc), J/(m²·K·s^½) — how fast this draws heat
   * out of something hot laid against it: an iron mould chills a pour that
   * sand lets run (Chvorinov). `0` when any of the three is unauthored.
   */
  public getEffusivity(): number {
    const k = this._thermalConductivity.rawValue();
    const rho = this.getDensity().rawValue();
    const c = this._specificHeat.rawValue();
    return k > 0 && rho > 0 && c > 0 ? Math.sqrt(k * rho * c) : 0;
  }
  public setSpecificHeat(value: Quantity<'J/(kg·K)'>): void {
    this.specificHeat = value;
  }

  /**
   * Read electrical conductivity. Strict on `Quantity<'S/m'>`; the
   * QuantityMarshaller absorbed authoring-shape coercion at the
   * persistence boundary.
   */
  public getElectricalConductivity(): Quantity<'S/m'> {
    return this._electricalConductivity;
  }
  /** Set electrical conductivity. Strict on `Quantity<'S/m'>`. */
  public setElectricalConductivity(value: Quantity<'S/m'>): void {
    this.electricalConductivity = value;
  }

  public getTags(): readonly string[] { return this.tags; }

  public setTags(value: string[]): void { this.tags = value; }
  public hasTag(tag: string): boolean { return this.tags.includes(tag); }


  /**
   * ⭐ The CLEANSER this material is (cleanliness B50) — a bar of soap, a
   * flask of lye: the `cleanser` document a wash reads. Named by the
   * material, so the document loads WITH it (the setter returns the load,
   * the applier awaits it — load-on-use W1) and the wash asks the thing in
   * hand what it is — never a search of the cleansers by tag.
   * `''` = not a cleanser.
   */
  protected cleanser = '';
  /** The cleanser this material acts as, as the wash reads it — or `null`. */
  public getCleanser(): CleanserDescriptor | null {
    if (!this.cleanser) return null;
    return MaterialApi.cleansers().need(this.cleanser);
  }
  public getCleanserPath(): string {
    return this.cleanser;
  }
  /** Name the cleanser document this material is — and load it (D7: the setter returns its load). */
  public setCleanser(value: string): Promise<void> {
    this.cleanser = typeof value === 'string' ? value : '';
    if (!this.cleanser) return Promise.resolve();
    return MaterialApi.cleansers().ensure(this.cleanser).then(() => undefined);
  }
}
