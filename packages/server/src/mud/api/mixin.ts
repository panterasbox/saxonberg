/**
 * MixinApi - Static utility class for mixin management
 *
 * Responsibilities:
 * - Query mixins applied to a class
 * - Collect persistent fields from all mixins
 * - Mixin registration and introspection
 *
 * This enables the Persistence Framework to automatically collect
 * persistent fields from all mixins in a class hierarchy.
 *
 * Usage:
 * ```typescript
 * import { Mixins } from '../lib/mixin';
 *
 * if (MixinApi.hasMixin(Player, Mixins.Named)) {
 *   // Player has NamedMixin
 * }
 * ```
 */

import type { MixinName } from '../lib/mixin';
import { Mixins } from '../lib/mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Mobile } from '../lib/spatial/Mobile';
import type { Sensor } from '../lib/message/Sensor';
import type { Vocal } from '../lib/message/Vocal';
import type { Named } from '../lib/description/Named';
import type { Gendered } from '../lib/character/Gendered';
import type { Visible } from '../lib/description/Visible';
import type { Perceptible } from '../lib/description/Perceptible';
import type { Detailed } from '../lib/description/Detailed';
import type { Propertied } from '../lib/stuff/Propertied';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Focused } from '../lib/command/Focused';
import type { Exitable } from '../lib/boundary/Exitable';
import type { Sealable } from '../lib/spatial/Sealable';
import type { CartesianCoordinates } from '../lib/spatial/CartesianCoordinates';
import type { SphericalCoordinates } from '../lib/spatial/SphericalCoordinates';
import type { AroundSaveHook } from '../lib/persistence/AroundSaveHook';
import type { AroundDeleteHook } from '../lib/persistence/AroundDeleteHook';
import type { PostRegistration } from '../lib/stuff/PostRegistration';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import type { Environment } from '../lib/shell/Environment';
import type { Alias } from '../lib/shell/Alias';
import type { Singleton } from '../lib/stuff/Singleton';
import type { DoorBearing } from '../lib/boundary/DoorBearing';
import type { Adornable } from '../lib/boundary/Adornable';
import type { Adornment } from '../lib/boundary/Adornment';
import type { AmbientLit } from '../lib/perception/AmbientLit';
import type { LightSource } from '../lib/perception/LightSource';
import type { Perception } from '../lib/perception/Perception';
import type { Tangible } from '../lib/material/Tangible';
import type { Organism } from '../lib/species/Organism';
import type { Sexed } from '../lib/character/Sexed';
import type { Radioactive } from '../lib/material/Radioactive';
import type { Workspace } from '../lib/shell/Workspace';
import type { Author } from '../lib/shell/Author';
import type { Perceiver } from '../lib/description/Perceiver';
import type { Scryable } from '../lib/perception/Scryable';
import type { Slotted } from '../lib/slot/Slotted';
import type { Slottable } from '../lib/slot/Slottable';
import type { Wearable } from '../lib/slot/Wearable';
import type { Wieldable } from '../lib/slot/Wieldable';
import type { Postured } from '../lib/slot/Postured';
import type { Posed } from '../lib/character/Posed';
import type { Mountable } from '../lib/slot/Mountable';
import type { Drivable } from '../lib/slot/Drivable';
import type { Spawner } from '../lib/stuff/Spawner';
import type { Spawned } from '../lib/stuff/Spawned';
import type { Globbable } from '../lib/stuff/Globbable';
import { SecurityApi } from './security';
import { ShadowApi } from './shadow';

// Re-export Mixins constants for convenience
export { Mixins } from '../lib/mixin';

/**
 * Any class-like constructor MixinApi may be asked to inspect.
 * Intentionally loose: mixin-decorated classes carry additional static markers
 * (_mixinName, persistentFields, commands) that are checked via
 * property access rather than declared on this type.
 *
 * Exported so callers that thread a constructor into MixinApi
 * (composition validation hooks, glob-identity helpers) can name the
 * type without redeclaring the `Function & ...` shape locally.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyConstructor = Function & { prototype: unknown };

/** Shape of a mixin constructor — what queryMixins() returns elements of. */
interface MixinClass {
  _mixinName?: string;
  name?: string;
  persistentFields?: string[];
  prototype: unknown;
}

/**
 * Static API for mixin management and introspection.
 */
export class MixinApi {
  /**
   * Get all mixins applied to a class by walking the prototype chain.
   * Returns an array of constructor functions.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of mixin constructors
   */
  public static queryMixins(constructor: AnyConstructor): MixinClass[] {
    const mixins: MixinClass[] = [];
    let current: unknown = constructor;

    // Walk up the prototype chain
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass;
      // Check if this level is a mixin (has _mixinName marker)
      if (
        Object.prototype.hasOwnProperty.call(c, '_mixinName') &&
        typeof c._mixinName === 'string'
      ) {
        mixins.push(c);
      }

      current = Object.getPrototypeOf(current);
    }

    return mixins;
  }

  /**
   * Get all persistent fields from mixins applied to a class.
   * Walks the prototype chain collecting fields from all mixins.
   *
   * This is used by PersistApi to automatically sync fields without
   * requiring manual field lists in every class.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of persistent field names
   */
  public static getMixinFields(constructor: AnyConstructor): string[] {
    const mixins = this.queryMixins(constructor);
    const fields: string[] = [];

    for (const mixin of mixins) {
      if (mixin.persistentFields && Array.isArray(mixin.persistentFields)) {
        fields.push(...mixin.persistentFields);
      }
    }

    // Remove duplicates
    return Array.from(new Set(fields));
  }

  /**
   * Check if a class or Stuff instance uses a specific mixin.
   *
   * Two overloads:
   *
   * - `hasMixin(constructor, name)` — pure constructor check, walks
   *   the prototype chain. Used for static introspection.
   * - `hasMixin(stuffInstance, name)` — also walks shadows attached
   *   to the host. A host without the mixin but carrying a shadow
   *   that composes it returns true. This is what the Witness
   *   pattern relies on so that a shadow can opt into receiving
   *   notifications even when the host doesn't compose the
   *   relevant mixin itself.
   *
   * Usage:
   * ```typescript
   * import { Mixins } from './mixin';
   *
   * if (MixinApi.hasMixin(Player, Mixins.Named)) {
   *   // Player class composes NamedMixin
   * }
   *
   * if (MixinApi.hasMixin(somePlayerInstance, Mixins.Named)) {
   *   // The instance OR any shadow on it composes NamedMixin
   * }
   * ```
   */
  public static hasMixin(
    constructor: AnyConstructor,
    mixinName: MixinName
  ): boolean;
  public static hasMixin(host: Stuff, mixinName: MixinName): boolean;
  public static hasMixin(
    arg: AnyConstructor | Stuff,
    mixinName: MixinName
  ): boolean {
    if (typeof arg === 'function') {
      return this.#hasMixinOnConstructor(arg, mixinName);
    }
    const host = arg as Stuff;
    const shadowMap = ShadowApi.getAllShadows(host);
    for (const shadows of shadowMap.values()) {
      for (const sh of shadows) {
        if (
          this.#hasMixinOnConstructor(
            sh.constructor as AnyConstructor,
            mixinName
          )
        ) {
          return true;
        }
      }
    }
    return this.#hasMixinOnConstructor(
      host.constructor as AnyConstructor,
      mixinName
    );
  }

  static #hasMixinOnConstructor(
    constructor: AnyConstructor,
    mixinName: MixinName
  ): boolean {
    const mixins = this.queryMixins(constructor);
    return mixins.some((mixin) => {
      const name = mixin._mixinName || mixin.name;
      return name === mixinName;
    });
  }

  /**
   * Get the field-marshaller registry for a class — the map of
   * persistent-field names → marshaller templatePaths declared on
   * mixins / classes in the prototype chain.
   *
   * Walks the prototype chain concrete-class-first, so a subclass's
   * declaration wins over a base mixin's for the same field. The
   * returned map is keyed by field name; values are templatePath
   * strings that callers resolve via `StuffApi.findByTemplatePath`
   * at use time.
   *
   * Mirrors the shape of {@link getAllPersistentFields} and is the
   * companion lookup for `PersistentHydrator` / `Persistable`'s
   * marshaller-aware coercion path.
   *
   * @param constructor - The class constructor to inspect
   * @returns Map of field name to marshaller templatePath
   */
  public static getAllFieldMarshallers(
    constructor: AnyConstructor
  ): Record<string, string> {
    const out: Record<string, string> = {};
    let current: unknown = constructor;

    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        fieldMarshallers?: Record<string, string>;
      };
      if (
        Object.prototype.hasOwnProperty.call(c, 'fieldMarshallers') &&
        c.fieldMarshallers &&
        typeof c.fieldMarshallers === 'object'
      ) {
        for (const [k, v] of Object.entries(c.fieldMarshallers)) {
          // First declaration wins — concrete-class walked first, so
          // subclass overrides base.
          if (!(k in out) && typeof v === 'string') out[k] = v;
        }
      }
      current = Object.getPrototypeOf(current);
    }

    return out;
  }

  /**
   * Get all persistent fields (from mixins and every class in the chain).
   *
   * Walks the prototype chain and collects `persistentFields` declared at
   * every level — mixins carry them as static arrays, and concrete classes
   * do too. Since a subclass that declares its own `persistentFields` shadows
   * the parent's static in JS, we need `hasOwnProperty` at each level to
   * pick up contributions from the whole ancestry (Stuff → Idea → Location → …).
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of all persistent field names (deduplicated)
   */
  public static getAllPersistentFields(constructor: AnyConstructor): string[] {
    const fields: string[] = [];
    let current: unknown = constructor;

    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass;
      if (
        Object.prototype.hasOwnProperty.call(c, 'persistentFields') &&
        Array.isArray(c.persistentFields)
      ) {
        fields.push(...c.persistentFields);
      }
      current = Object.getPrototypeOf(current);
    }

    return Array.from(new Set(fields));
  }

  /**
   * Type-predicate narrowing helpers.
   *
   * Each predicate performs a runtime mixin check and threads the matching
   * interface into TypeScript's control-flow narrowing:
   *
   * ```ts
   * if (MixinApi.isContainer(obj)) {
   *   obj.getContents(); // obj is Stuff & Container here
   * }
   * ```
   *
   * Prefer these over `hasMixin(obj.constructor, Mixins.X)` + cast when the
   * goal is to call interface methods on the narrowed object. `hasMixin`
   * remains the primitive for dynamic introspection (iterating queryMixins).
   */

  public static isContainer(obj: Stuff): obj is Stuff & Container {
    return this.hasMixin(obj, Mixins.Container);
  }

  public static isContainable(obj: Stuff): obj is Stuff & Containable {
    return this.hasMixin(obj, Mixins.Containable);
  }

  public static isMobile(obj: Stuff): obj is Stuff & Mobile {
    return this.hasMixin(obj, Mixins.Mobile);
  }

  public static isSensor(obj: Stuff): obj is Stuff & Sensor {
    return this.hasMixin(obj, Mixins.Sensor);
  }

  public static isVocal(obj: Stuff): obj is Stuff & Vocal {
    return this.hasMixin(obj, Mixins.Vocal);
  }

  public static isNamed(obj: Stuff): obj is Stuff & Named {
    return this.hasMixin(obj, Mixins.Named);
  }

  public static isGendered(obj: Stuff): obj is Stuff & Gendered {
    return this.hasMixin(obj, Mixins.Gendered);
  }

  public static isVisible(obj: Stuff): obj is Stuff & Visible {
    return this.hasMixin(obj, Mixins.Visible);
  }

  public static isPerceptible(obj: Stuff): obj is Stuff & Perceptible {
    return this.hasMixin(obj, Mixins.Perceptible);
  }

  public static isDetailed(obj: Stuff): obj is Stuff & Detailed {
    return this.hasMixin(obj, Mixins.Detailed);
  }

  public static isPropertied(obj: Stuff): obj is Stuff & Propertied {
    return this.hasMixin(obj, Mixins.Propertied);
  }

  public static isCommandGiver(obj: Stuff): obj is Stuff & CommandGiver {
    return this.hasMixin(obj, Mixins.CommandGiver);
  }

  public static isFocused(obj: Stuff): obj is Stuff & Focused {
    return this.hasMixin(obj, Mixins.Focused);
  }

  public static isExitable(obj: Stuff): obj is Stuff & Exitable {
    return this.hasMixin(obj, Mixins.Exitable);
  }

  public static isSealable(obj: Stuff): obj is Stuff & Sealable {
    return this.hasMixin(obj, Mixins.Sealable);
  }

  public static isCartesianCoordinates(obj: Stuff): obj is Stuff & CartesianCoordinates {
    return this.hasMixin(obj, Mixins.CartesianCoordinates);
  }

  public static isSphericalCoordinates(obj: Stuff): obj is Stuff & SphericalCoordinates {
    return this.hasMixin(obj, Mixins.SphericalCoordinates);
  }

  public static isAroundSaveHook(obj: Stuff): obj is Stuff & AroundSaveHook {
    return this.hasMixin(obj, Mixins.AroundSaveHook);
  }

  public static isAroundDeleteHook(obj: Stuff): obj is Stuff & AroundDeleteHook {
    return this.hasMixin(obj, Mixins.AroundDeleteHook);
  }

  public static isPostRegistration(obj: Stuff): obj is Stuff & PostRegistration {
    return this.hasMixin(obj, Mixins.PostRegistration);
  }

  public static isHasInteractive(obj: Stuff): obj is Stuff & HasInteractive {
    return this.hasMixin(obj, Mixins.HasInteractive);
  }

  public static isEnvironment(obj: Stuff): obj is Stuff & Environment {
    return this.hasMixin(obj, Mixins.Environment);
  }

  public static isAlias(obj: Stuff): obj is Stuff & Alias {
    return this.hasMixin(obj, Mixins.Alias);
  }

  public static isWorkspace(obj: Stuff): obj is Stuff & Workspace {
    return this.hasMixin(obj, Mixins.Workspace);
  }

  public static isAuthor(obj: Stuff): obj is Stuff & Author {
    return this.hasMixin(obj, Mixins.Author);
  }

  public static isPerceiver(obj: Stuff): obj is Stuff & Perceiver {
    return this.hasMixin(obj, Mixins.Perceiver);
  }

  public static isScryable(obj: Stuff): obj is Stuff & Scryable {
    return this.hasMixin(obj, Mixins.Scryable);
  }

  public static isSingleton(obj: Stuff): obj is Stuff & Singleton {
    return this.hasMixin(obj, Mixins.Singleton);
  }

  public static isDoorBearing(obj: Stuff): obj is Stuff & DoorBearing {
    return this.hasMixin(obj, Mixins.DoorBearing);
  }

  public static isAdornable(obj: Stuff): obj is Stuff & Adornable {
    return this.hasMixin(obj, Mixins.Adornable);
  }

  public static isAdornment(obj: Stuff): obj is Stuff & Adornment {
    return this.hasMixin(obj, Mixins.Adornment);
  }

  public static isAmbientLit(obj: Stuff): obj is Stuff & AmbientLit {
    return this.hasMixin(obj, Mixins.AmbientLit);
  }

  public static isLightSource(obj: Stuff): obj is Stuff & LightSource {
    return this.hasMixin(obj, Mixins.LightSource);
  }

  public static isPerception(obj: Stuff): obj is Stuff & Perception {
    return this.hasMixin(obj, Mixins.Perception);
  }

  public static isTangible(obj: Stuff): obj is Stuff & Tangible {
    return this.hasMixin(obj, Mixins.Tangible);
  }

  public static isOrganism(obj: Stuff): obj is Stuff & Organism {
    return this.hasMixin(obj, Mixins.Organism);
  }

  public static isSexed(obj: Stuff): obj is Stuff & Sexed {
    return this.hasMixin(obj, Mixins.Sexed);
  }

  public static isRadioactive(obj: Stuff): obj is Stuff & Radioactive {
    return this.hasMixin(obj, Mixins.Radioactive);
  }

  public static isSlotted(obj: Stuff): obj is Stuff & Slotted {
    return this.hasMixin(obj, Mixins.Slotted);
  }

  public static isSlottable(obj: Stuff): obj is Stuff & Slottable {
    return this.hasMixin(obj, Mixins.Slottable);
  }

  public static isWearable(obj: Stuff): obj is Stuff & Wearable {
    return this.hasMixin(obj, Mixins.Wearable);
  }

  public static isWieldable(obj: Stuff): obj is Stuff & Wieldable {
    return this.hasMixin(obj, Mixins.Wieldable);
  }

  public static isPostured(obj: Stuff): obj is Stuff & Postured {
    return this.hasMixin(obj, Mixins.Postured);
  }

  public static isPosed(obj: Stuff): obj is Stuff & Posed {
    return this.hasMixin(obj, Mixins.Posed);
  }

  public static isMountable(obj: Stuff): obj is Stuff & Mountable {
    return this.hasMixin(obj, Mixins.Mountable);
  }

  public static isDrivable(obj: Stuff): obj is Stuff & Drivable {
    return this.hasMixin(obj, Mixins.Drivable);
  }

  public static isSpawner(obj: Stuff): obj is Stuff & Spawner {
    return this.hasMixin(obj, Mixins.Spawner);
  }

  public static isSpawned(obj: Stuff): obj is Stuff & Spawned {
    return this.hasMixin(obj, Mixins.Spawned);
  }

  public static isGlobbable(obj: Stuff): obj is Stuff & Globbable {
    return this.hasMixin(obj, Mixins.Globbable);
  }

  /**
   * Walk the prototype chain unioning the static `globIdentityFields`
   * arrays declared at each level. Deduplicates. Mirrors the shape of
   * {@link getAllPersistentFields}.
   *
   * A glob's "kind" is defined by the values of these fields plus
   * `templatePath`; two globs merge iff their templatePath matches and
   * every glob-identity field has equal values.
   */
  public static getAllGlobIdentityFields(constructor: AnyConstructor): string[] {
    const fields: string[] = [];
    let current: unknown = constructor;
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & { globIdentityFields?: string[] };
      if (
        Object.prototype.hasOwnProperty.call(c, 'globIdentityFields') &&
        Array.isArray(c.globIdentityFields)
      ) {
        fields.push(...c.globIdentityFields);
      }
      current = Object.getPrototypeOf(current);
    }
    return Array.from(new Set(fields));
  }

  /**
   * Once-per-class composition validation hook.
   *
   * Walks the prototype chain calling each level's static
   * `__validateComposition__(ctor)` method exactly once per concrete
   * class. Mixins that want to enforce composition constraints
   * declare the static; everyone else is a no-op.
   *
   * Called from `StuffApi.register` so the check fires the first time
   * an instance of a given class lands in the registry. Subsequent
   * registrations of the same class short-circuit on the WeakSet
   * memo.
   *
   * ## HMR behavior
   *
   * The memo is keyed on **constructor identity**, not class name.
   * `HotReloadApi.reload` re-evaluates a module and produces a NEW
   * class binding (per `ModuleApi.stamp`'s "first-stamp-wins" rule —
   * same name, fresh identity). The new class is not in the WeakSet,
   * so the next first-instance-of-class registration re-runs the
   * validation against the reloaded mixin chain. Old class identities
   * stay memoized — fine, because nothing creates new instances of a
   * post-HMR-retired class.
   *
   * If a mixin's `__validateComposition__` itself changes during HMR,
   * the new check applies to subsequent first-instance-of-class
   * registrations. Instances of classes already validated against the
   * old check stay validated — same trade-off the rest of the HMR
   * surface makes.
   *
   * ## Current opt-ins
   *
   * - `GlobbableMixin` — `⊥ Container`, `⊥ Singleton`,
   *   `globIdentityFields ⊂ persistentFields`.
   *
   * ## Candidates for future opt-in
   *
   * Existing mixins document composition constraints in JSDoc that
   * could be promoted to a runtime check via this hook when the
   * informal pattern starts failing in practice:
   *
   * - `AdornableMixin` — "composed on `Stuff & Container`."
   * - `AdornmentMixin` — paired with `Containable`.
   * - `WearableMixin` / `WieldableMixin` — must compose `Slottable`.
   * - `BoundaryAnchor` — adornment-anchored; expects `Adornment`.
   * - `Perceiver` — pairs with `Sensor` / `CommandGiver`.
   *
   * None are urgent — the JSDoc convention has held — but the seam is
   * here for the day one of them needs runtime enforcement.
   */
  public static assertComposable(constructor: AnyConstructor): void {
    if (this.#validatedClasses.has(constructor)) return;
    let current: unknown = constructor;
    while (current && current !== Object && (current as MixinClass).prototype) {
      const c = current as MixinClass & {
        __validateComposition__?: (ctor: AnyConstructor) => void;
      };
      if (
        Object.prototype.hasOwnProperty.call(c, '__validateComposition__') &&
        typeof c.__validateComposition__ === 'function'
      ) {
        c.__validateComposition__(constructor);
      }
      current = Object.getPrototypeOf(current);
    }
    this.#validatedClasses.add(constructor);
  }

  static #validatedClasses = new WeakSet<AnyConstructor>();
}



SecurityApi.decorateApiClass(MixinApi);
