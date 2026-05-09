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
import { SecurityApi } from './security';
import { ShadowApi } from './shadow';

// Re-export Mixins constants for convenience
export { Mixins } from '../lib/mixin';

/**
 * Any class-like constructor MixinApi may be asked to inspect.
 * Intentionally loose: mixin-decorated classes carry additional static markers
 * (_mixinName, persistentFields, commands) that are checked via
 * property access rather than declared on this type.
 */
type AnyConstructor = Function & { prototype: unknown };

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
}



SecurityApi.decorateApiClass(MixinApi);
