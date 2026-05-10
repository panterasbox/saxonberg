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
 * 3. **Chemistry** (`chemistry: ElementChemistry | null`) — atomic-
 *    or molecular-level science data: element symbol, atomic
 *    number, atomic mass for elements; chemical formula, molar mass
 *    for compounds. Lower-division depth.
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
import { PropertiedMixin, Property } from '../stuff/Propertied';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';
import { ChemistryMarshaller } from '../persistence/ChemistryMarshaller';

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
 * Atomic / molecular science data. Wave 4 consolidates the legacy
 * `atomicMass` (u) and `molarMass` (g/mol) into a single
 * `molarMass: Quantity<'g/mol'>` — they're numerically equivalent
 * (one atomic mass unit ≡ 1 g/mol) and the rename matches scientific
 * convention. Element fields (`symbol`, `atomicNumber`, `molarMass`)
 * populate for pure elements; compound fields (`formula`,
 * `molarMass`) populate for chemical compounds. Mixtures and alloys
 * typically leave this `null` and read composition via the
 * `composition` field instead.
 *
 * `molarMass` is strictly `Quantity<'g/mol'>` at the runtime API.
 * Authoring shapes (bare number, tag string, JSON `{value,unit}`)
 * are absorbed by the `ChemistryMarshaller` at the persistence
 * boundary — see `lib/persistence/ChemistryMarshaller.ts`.
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

export class Material extends SingletonMixin(PropertiedMixin(Idea)) {
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

  /** Mohs-scale-ish hardness (0–10). */
  protected hardness: number = 0;

  /** 0–1, how easily this material ignites. */
  protected flammability: number = 0;

  /** 0–1, how much this material blocks light passing through. */
  protected opacity: number = 0;

  /** W/(m·K). Heat conduction rate. */
  protected thermalConductivity: number = 0;

  /** S/m. Electrical conduction rate. */
  protected electricalConductivity: number = 0;

  /** 0–1. How strongly this material responds to magnetism. */
  protected magneticSusceptibility: number = 0;

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

  /**
   * Atomic / molecular science data. `null` when the material has no
   * meaningful chemistry shape (e.g. a generic "flesh" stand-in).
   * Population convention: elements get `symbol/atomicNumber/atomicMass`,
   * compounds get `formula/molarMass`, mixtures leave this null and
   * carry composition data instead.
   */
  protected chemistry: ElementChemistry | null = null;

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
    'hardness',
    'flammability',
    'opacity',
    'thermalConductivity',
    'electricalConductivity',
    'magneticSusceptibility',
    'edibility',
    'nutrients',
    'toxicity',
    'tags',
    'composition',
    'chemistry',
    'biologicalSource',
  ];

  /**
   * Field-marshaller bindings. The persistence pipeline routes
   * hydration / save through these marshallers; setters stay
   * strict on the runtime value type.
   */
  static fieldMarshallers = {
    density: QuantityMarshaller.pathFor('kg/m³'),
    chemistry: ChemistryMarshaller.templatePath,
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

  public getHardness(): number { return this.hardness; }
  public setHardness(value: number): void { this.hardness = value; }

  public getFlammability(): number { return this.flammability; }
  public setFlammability(value: number): void { this.flammability = value; }

  public getOpacity(): number { return this.opacity; }
  public setOpacity(value: number): void { this.opacity = value; }

  public getThermalConductivity(): number { return this.thermalConductivity; }
  public setThermalConductivity(value: number): void {
    this.thermalConductivity = value;
  }

  public getElectricalConductivity(): number {
    return this.electricalConductivity;
  }
  public setElectricalConductivity(value: number): void {
    this.electricalConductivity = value;
  }

  public getMagneticSusceptibility(): number {
    return this.magneticSusceptibility;
  }
  public setMagneticSusceptibility(value: number): void {
    this.magneticSusceptibility = value;
  }

  public getEdibility(): boolean { return this.edibility; }
  public setEdibility(value: boolean): void { this.edibility = value; }

  public getNutrients(): readonly string[] { return this.nutrients; }
  public setNutrients(value: string[]): void { this.nutrients = value; }

  public getToxicity(): readonly string[] { return this.toxicity; }
  public setToxicity(value: string[]): void { this.toxicity = value; }

  /**
   * Read damage resistance for `damageType` (`'slash'`, `'blunt'`,
   * `'pierce'`, `'fire'`, …). Threads through `PropertiedMixin` —
   * stored under `Property.of<number>('resistance.<damageType>')`. The
   * property layer gives masking for free: an enchanted shield can
   * `maskProp` a `resistance.fire` boost on its wearer's material
   * surface without touching the base value.
   *
   * Returns `0` when no resistance is set for the type. Damage-type
   * vocabulary is content-defined; the engine doesn't enumerate it.
   */
  public getDamageResistance(damageType: string): number {
    return this.getProp(Property.of<number>(`resistance.${damageType}`)) ?? 0;
  }

  public setDamageResistance(damageType: string, value: number): void {
    this.setProp(Property.of<number>(`resistance.${damageType}`), value);
  }

  public getTags(): readonly string[] { return this.tags; }
  public setTags(value: string[]): void { this.tags = value; }
  public hasTag(tag: string): boolean { return this.tags.includes(tag); }

  public getComposition(): readonly CompositionEntry[] { return this.composition; }
  public setComposition(value: CompositionEntry[]): void {
    this.composition = value;
  }

  public getChemistry(): ElementChemistry | null { return this.chemistry; }
  /**
   * Set the chemistry record. Strict on `ElementChemistry` —
   * `molarMass` must be a `Quantity<'g/mol'>` if present.
   * Authoring-shape coercion lives in `ChemistryMarshaller` and only
   * runs on the persistence path.
   */
  public setChemistry(value: ElementChemistry | null): void {
    if (value !== null && value !== undefined) {
      if (
        value.molarMass !== undefined &&
        (!(value.molarMass instanceof Quantity) ||
          value.molarMass.unit !== 'g/mol')
      ) {
        throw new TypeError(
          `Material.setChemistry: molarMass must be Quantity<'g/mol'>`
        );
      }
    }
    this.chemistry = value;
  }

  public getBiologicalSource(): BiologicalSource | null {
    return this.biologicalSource;
  }
  public setBiologicalSource(value: BiologicalSource | null): void {
    this.biologicalSource = value;
  }
}
