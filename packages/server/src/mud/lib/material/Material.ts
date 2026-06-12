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
 * overrides (the wood haft vs the iron head of an axe). Edibility tags
 * (`edibility`, `nutrients`, `toxicity`) are authored here today; the
 * `DietApi` consumer is deferred.
 *
 * **Layered classification.**
 *
 * Three orthogonal layers of metadata, all populated as data on the
 * template, queried by `MaterialApi`:
 *
 * 1. **Tags** (`tags: string[]`) — free-form classification strings
 *    (`'metal'`, `'alloy'`, `'igneous'`, `'organic'`, `'fantasy'`).
 *    Vocabulary is not centrally registered — content devs may
 *    introduce new tags as needed. Used for educational filtering
 *    and orthogonal grouping.
 * 2. **Composition** (`composition: CompositionEntry[]`) — for
 *    mixtures and alloys, weight-fraction references to the
 *    constituent Materials. Pure elements / non-mixtures have an
 *    empty list.
 * 3. **Chemistry** — atomic / molecular science data, decomposed
 *    into four flat scalar fields per the scalar-default rule:
 *    `symbol` (element only), `atomicNumber` (element only),
 *    `formula` (compound only), and `molarMass`
 *    (`Quantity<'g/mol'>`; element or compound). The
 *    `getChemistry` / `setChemistry` pair is a convenience aggregate
 *    over those four fields. Mixtures / alloys leave them all
 *    unset and rely on the composition layer.
 *
 * Plus `biologicalSource` for organic Materials with a known parent
 * Species (e.g., wood from a specific tree).
 *
 * Capability mixins layer on top via subclasses (see
 * `RadioactiveMixin` / `RadioactiveMaterial`). Only Materials whose
 * identity carries the capability compose the mixin; everything else
 * stays plain `Material`.
 *
 * Singleton-by-templatePath: every `/lib/material/<...>` template resolves
 * to the same instance via `StuffApi.singleton(path)` /
 * `findByTemplatePath`. Cross-references on other Stuff store the path
 * string and re-resolve on each call (HMR-safe — no cached instance).
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';

/**
 * One constituent in a mixture / alloy. `materialPath` is the
 * templatePath of the contained Material; `fraction` is the weight
 * fraction (0–1; sum across composition entries should approach 1 for
 * complete authoring, but the v1 model doesn't enforce). Mole-fraction
 * authoring is a follow-on.
 */
export interface CompositionEntry {
  materialPath: string;
  fraction: number;
}

/**
 * Atomic / molecular science data — convenience aggregate of
 * Material's chemistry-related fields. Material stores each field
 * as its own scalar (`symbol`, `atomicNumber`, `formula`,
 * `molarMass`) per the scalar-default rule; this interface is the
 * holder shape for the `getChemistry` / `setChemistry` convenience
 * pair. Population convention: elements get
 * `symbol/atomicNumber/molarMass`, compounds get
 * `formula/molarMass`, mixtures leave the chemistry fields unset
 * and carry composition data instead.
 *
 * `molarMass` is strictly `Quantity<'g/mol'>` at the runtime API.
 * Authoring-shape coercion (bare number, tag string, JSON
 * `{value,unit}`) is absorbed by `QuantityMarshaller(g/mol)` at the
 * persistence boundary for the `molarMass` scalar field.
 */
export interface ElementChemistry {
  /** Element symbol (e.g. `'Fe'`, `'C'`, `'U'`). Element-only. */
  symbol?: string;
  /** Atomic number (Z) — element-only. */
  atomicNumber?: number;
  /** Chemical formula (e.g. `'H2O'`, `'SiO2'`, `'(C6H10O5)n'`). Compound-only. */
  formula?: string;
  /** Molar mass in g/mol. Element-or-compound. */
  molarMass?: Quantity<'g/mol'>;
}

/**
 * Link from a biological Material to the Species it came from, plus
 * the kind of tissue (`'wood'`, `'flesh'`, `'leaf'`, `'fruit'`, …).
 * Bidirectional with `Species._defaultMaterialPath` — the species
 * points at its default Material, the material points back at the
 * species. Both directions are authored.
 */
export interface BiologicalSource {
  speciesPath: string;
  tissueType: string;
}

export default class Material extends SingletonMixin(PropertiedMixin(Idea)) {
  /** Display name (e.g. `'iron'`, `'oak'`, `'fruit-flesh'`). */
  protected name: string = '';

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
   * `electricalConductivity` / `magneticSusceptibility` fields were
   * removed: fake normalized scales with zero consumers. Re-add as real
   * Quantities when a consumer — fire, electricity — actually lands.)
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

  /** Whether this material can be eaten. v1 has no consumer. */
  protected edibility: boolean = false;

  /**
   * Tagged nutrient categories (`'protein'`, `'water'`, `'sugar'`).
   * v1 has no consumer (DietApi is deferred).
   */
  protected nutrients: string[] = [];

  /**
   * Tagged toxicity categories (`'iron-poisoning'`, `'lead'`,
   * `'oxalates'`). v1 has no consumer.
   */
  protected toxicity: string[] = [];

  /**
   * Free-form classification tags. See class header for layer-1
   * description; vocabulary intentionally not centrally registered.
   */
  protected tags: string[] = [];

  /**
   * Constituent breakdown for mixtures / alloys / composite materials.
   * Pure elements have an empty list. Each entry's `materialPath`
   * resolves lazily through `StuffApi.findByTemplatePath` at query
   * time; same shape as `_speciesPath` / `_materialPath` cross-refs.
   */
  protected composition: CompositionEntry[] = [];

  // ---------- Chemistry — flat scalar fields ----------
  // Each chemistry field is its own scalar per the scalar-default
  // rule. The `getChemistry` / `setChemistry` pair below is a
  // convenience aggregate that decomposes / recomposes from these
  // fields. Materials with no chemistry data leave all four at
  // their unset defaults; `getChemistry` returns null in that case.

  /** Element symbol (e.g. `'Fe'`, `'C'`, `'U'`). Element-only. */
  protected symbol: string | null = null;

  /** Atomic number (Z). Element-only. */
  protected atomicNumber: number | null = null;

  /** Chemical formula (e.g. `'H2O'`). Compound-only. */
  protected formula: string | null = null;

  /**
   * Molar mass as a `Quantity<'g/mol'>`. Element-or-compound. The
   * QuantityMarshaller for g/mol handles authoring-shape coercion
   * (numeric / string / JSON-shape) at the persistence boundary;
   * runtime accessors stay strict on Quantity.
   */
  private _molarMass: Quantity<'g/mol'> | null = null;

  protected get molarMass(): Quantity<'g/mol'> | null {
    return this._molarMass;
  }
  protected set molarMass(value: Quantity<'g/mol'> | null) {
    if (value === null || value === undefined) {
      this._molarMass = null;
      return;
    }
    if (!(value instanceof Quantity) || value.unit !== 'g/mol') {
      throw new TypeError(
        `Material.molarMass must be Quantity<'g/mol'> | null; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
      );
    }
    this._molarMass = value;
  }

  /**
   * Source-species link for biological materials. `null` for non-
   * biological materials and for biological materials where the source
   * species isn't modeled. The species side carries
   * `_defaultMaterialPath` pointing back here — the link is
   * bidirectional per slate.
   */
  protected biologicalSource: BiologicalSource | null = null;

  static persistentFields = [
    'name',
    'density',
    'thermalConductivity',
    'edibility',
    'nutrients',
    'toxicity',
    'tags',
    'composition',
    'symbol',
    'atomicNumber',
    'formula',
    'molarMass',
    'biologicalSource',
  ];

  /**
   * Field-marshaller bindings. The persistence pipeline routes
   * hydration / save through these marshallers; setters stay
   * strict on the runtime value type.
   */
  static fieldMarshallers = {
    density: QuantityMarshaller.pathFor('kg/m³'),
    thermalConductivity: QuantityMarshaller.pathFor('W/(m·K)'),
    molarMass: QuantityMarshaller.pathFor('g/mol'),
  };

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

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

  public getEdibility(): boolean { return this.edibility; }
  public setEdibility(value: boolean): void { this.edibility = value; }

  public getNutrients(): readonly string[] { return this.nutrients; }
  public setNutrients(value: string[]): void { this.nutrients = value; }

  public getToxicity(): readonly string[] { return this.toxicity; }
  public setToxicity(value: string[]): void { this.toxicity = value; }

  // Damage-resistance accessors removed — the combat / mechanism-of-
  // injury material-response seam (`resistance.<type>` props) is deferred
  // until that system lands and can define the model honestly.

  public getTags(): readonly string[] { return this.tags; }
  public setTags(value: string[]): void { this.tags = value; }
  public hasTag(tag: string): boolean { return this.tags.includes(tag); }

  public getComposition(): readonly CompositionEntry[] { return this.composition; }
  public setComposition(value: CompositionEntry[]): void {
    this.composition = value;
  }

  // ---------- Chemistry — per-field accessors ----------

  public getSymbol(): string | null { return this.symbol; }
  public setSymbol(value: string | null): void { this.symbol = value; }

  public getAtomicNumber(): number | null { return this.atomicNumber; }
  public setAtomicNumber(value: number | null): void {
    this.atomicNumber = value;
  }

  public getFormula(): string | null { return this.formula; }
  public setFormula(value: string | null): void { this.formula = value; }

  /**
   * Read molar mass. Strict on `Quantity<'g/mol'>`; the
   * QuantityMarshaller for g/mol absorbs authoring-shape coercion
   * at the persistence boundary.
   */
  public getMolarMass(): Quantity<'g/mol'> | null { return this._molarMass; }
  /**
   * Set molar mass. Strict on `Quantity<'g/mol'>` — wrap raw numbers
   * via `Quantity.of(n, 'g/mol')` at the call site.
   */
  public setMolarMass(value: Quantity<'g/mol'> | null): void {
    this.molarMass = value;
  }

  // ---------- Chemistry — convenience holder ----------

  /**
   * Aggregate chemistry view. Returns `null` when none of the
   * chemistry fields are populated; otherwise returns an object
   * carrying whichever subset is set. For programmatic chemistry
   * inspection where reading a few fields at once is more
   * convenient than four individual getters.
   */
  public getChemistry(): ElementChemistry | null {
    if (
      this.symbol === null &&
      this.atomicNumber === null &&
      this.formula === null &&
      this._molarMass === null
    ) {
      return null;
    }
    const out: ElementChemistry = {};
    if (this.symbol !== null) out.symbol = this.symbol;
    if (this.atomicNumber !== null) out.atomicNumber = this.atomicNumber;
    if (this.formula !== null) out.formula = this.formula;
    if (this._molarMass !== null) out.molarMass = this._molarMass;
    return out;
  }

  /**
   * Bulk-set chemistry. `setChemistry(null)` clears all four
   * chemistry fields; passing a partial record sets the named
   * fields and leaves the others at their current values? No —
   * the convenience setter REPLACES the whole chemistry block to
   * keep the holder/component contract symmetric. Use the
   * individual setters for partial updates.
   */
  public setChemistry(value: ElementChemistry | null): void {
    if (value === null || value === undefined) {
      this.symbol = null;
      this.atomicNumber = null;
      this.formula = null;
      this.molarMass = null;
      return;
    }
    this.symbol = value.symbol ?? null;
    this.atomicNumber = value.atomicNumber ?? null;
    this.formula = value.formula ?? null;
    this.molarMass = value.molarMass ?? null;
  }

  public getBiologicalSource(): BiologicalSource | null {
    return this.biologicalSource;
  }
  public setBiologicalSource(value: BiologicalSource | null): void {
    this.biologicalSource = value;
  }
}
