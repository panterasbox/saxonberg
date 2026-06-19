/**
 * PropertiedMixin - Controlled API for dynamic runtime properties
 *
 * **Core Principle**: Objects should NOT add arbitrary properties via direct
 * assignment (`obj.foo = bar`). All dynamic properties MUST go through the
 * PropertiedMixin API for security, introspection, and persistence control.
 *
 * Source: Proven design from panterasbot (LPC → TypeScript port)
 *
 * Features:
 * - Type-safe property operations via Property<T> wrapper
 * - Explicit transient vs saved (persistent) distinction
 * - Fine-grained access control via PropAccessCheck functions
 * - Value transformation masks (e.g., stat modifiers, equipment bonuses)
 * - Property introspection and enumeration
 * - Unique property name generation
 *
 * **Access Control vs Masks**:
 * - **Access Control** (checkAccess): Controls WHO can access a property
 * - **Masks**: Transform WHAT VALUE is returned (applied during getProp only)
 *
 * Usage:
 * ```typescript
 * // Simple flag (auto-initializes as transient)
 * avatar.setProp(Property.of<boolean>("quest_started"), true);
 * avatar.getProp(Property.of<boolean>("quest_started")); // true
 *
 * // Persistent property with access control
 * const gold = Property.of<number>("gold");
 * avatar.initProp(gold, {
 *   transient: false,  // Persists to DB
 *   checkAccess: (prop, op, special) => {
 *     if (op === PropOperations.Set && special !== avatar) {
 *       return false;  // Only owner can modify
 *     }
 *     return true;
 *   }
 * });
 * avatar.setProp(gold, 100);
 *
 * // Persistent property holding a rich value object — bind a
 * // marshaller so the savedProps record carries storage-shape and
 * // getProp returns runtime-shape. The binding persists alongside
 * // the value in `savedPropMarshallers`, so reload-after-restart
 * // re-applies it without redeclaring.
 * const mass = Property.of<Quantity<'kg'>>("mass");
 * avatar.initProp(mass, {
 *   transient: false,
 *   marshaller: QuantityMarshaller.pathFor('kg'),
 * });
 * avatar.setProp(mass, Quantity.of(5, 'kg'));
 * avatar.getProp(mass); // → Quantity.of(5, 'kg')
 *
 * // Value transformation masks (e.g., equipment bonus). When called
 * // from inside the ring's own method, owner defaults to the ring.
 * class MagicRing extends SomeStuff {
 *   activate(target: Avatar) {
 *     target.maskProp(Property.of<number>("strength"), (p, v) => v + 5);
 *   }
 *   deactivate(target: Avatar) {
 *     target.unmaskProp(Property.of<number>("strength"));
 *   }
 * }
 *
 * // Generate unique anonymous property
 * const buffProp = avatar.generateUniquePropName("buff");  // "buff.abc123xyz"
 * avatar.setProp(buffProp, { strength: 10, duration: 60 });
 * ```
 */

import type { MixinConstructor } from '../mixin';
import { Stuff } from './Stuff';
import { SecurityApi } from '../../api/security';
import { Unshadowable } from '../security/decorators';
import { ExecutionContextApi } from '../../api/execution-context';
import { StuffApi } from '../../api/stuff';
import type { Marshaller } from '../persistence/Marshaller';
import { EventApi } from '../../api/event';
import { PropertyChangedEvent } from '../events/PropertyChangedEvent';

/**
 * Property wrapper for type safety.
 * Extends String to allow using strings as Property<T> but with type checking.
 *
 * Prefer the `Property.of<T>(name)` factory over `new Property<T>(name)` —
 * shorter at the call site and keeps room for future interning.
 */
export class Property<T extends PropValue = PropValue> extends String {
  constructor(name: string) {
    super(name);
  }

  /**
   * Canonical factory. Reads as "a Property of T called name".
   *
   * ```typescript
   * avatar.setProp(Property.of<number>('gold'), 100);
   * ```
   */
  static of<T extends PropValue = PropValue>(name: string): Property<T> {
    return new Property<T>(name);
  }
}

/**
 * Supported property value types.
 * Covers most common data types for game properties.
 */
export type PropValue =
  | object
  | string
  | number
  | boolean
  | (object | string | number | boolean)[]
  | null;

/**
 * Property operations for access control.
 */
export const PropOperations = {
  Configure: 'configure', // Change property configuration
  Set: 'set', // Set property value
  Get: 'get', // Get property value
  Remove: 'remove', // Remove property
  Mask: 'mask', // Add access mask (security)
  Unmask: 'unmask', // Remove access mask
} as const;

export type PropOperation =
  (typeof PropOperations)[keyof typeof PropOperations];

/**
 * Access control function for properties.
 *
 * @param prop - Property being accessed
 * @param op - Operation being performed
 * @param special - Operation-specific extra context. Semantics depend on
 *   `op`:
 *   - Set: the incoming value (T)
 *   - Configure: the Partial<PropOptions<T>> being applied
 *   - Mask / Unmask: the owning Stuff
 *   - Get / Remove: null
 *   Each operation defines what it passes; the type is intentionally open.
 * @returns true if access is allowed, false otherwise
 */
export type PropAccessCheck<T extends PropValue> = (
  prop: Property<T>,
  op: PropOperation,
  special: unknown,
) => boolean;

/**
 * Value transformation function for properties.
 * Masks modify the value returned by getProp() (e.g., stat modifiers, equipment bonuses).
 * This is SEPARATE from access control.
 *
 * @param prop - Property being queried
 * @param value - Current value (may have been modified by previous masks)
 * @param extra - Additional arguments passed when mask was registered
 * @returns Transformed value
 */
export type PropValueMask<T extends PropValue> = (
  prop: Property<T>,
  value: T,
  ...extra: unknown[]
) => T;

/**
 * Property configuration options. Runtime-shape only — these are
 * NOT persisted directly. The persistent counterpart is the
 * `savedPropMarshallers` map (propName → marshaller templatePath),
 * which carries the only piece of prop config that needs to round-
 * trip through storage. `transient` is implicit from which bag
 * holds the value (`savedProps` vs `transientProps`); `checkAccess`
 * is a closure and reconstructed from `defaultPropAccess` on
 * lazy auto-init after hydration.
 */
export interface PropOptions<T extends PropValue> {
  /**
   * If true, property is memory-only (not persisted).
   * If false, property is saved to database.
   * Default: true
   */
  transient: boolean;

  /**
   * Access control function.
   * Called before every property operation.
   * If not provided, uses defaultPropAccess().
   */
  checkAccess: PropAccessCheck<T>;
}

/**
 * Optional `marshaller` knob the author passes to `initProp` for
 * persistent props that hold rich value objects (Quantity, future
 * value classes). The path resolves through
 * `StuffApi.findByTemplatePath` to a registered Marshaller; the
 * mixin applies `toStored` on write and `fromStored` on read so
 * setProp / getProp see the runtime type, while storage carries
 * the raw shape.
 *
 * Persisted alongside `savedProps` as the per-prop marshaller
 * binding so loaded data round-trips correctly across restarts
 * without re-declaring the binding at every boot.
 */
export interface PropOptionsInput<T extends PropValue>
  extends Partial<PropOptions<T>> {
  marshaller?: string;
}

/**
 * Value mask entry with owner tracking.
 * Masks transform property values during getProp() (e.g., stat bonuses, modifiers).
 */
interface MaskEntry<T extends PropValue> {
  owner: Stuff; // The in-world Stuff this mask belongs to (the ring, potion, curse, etc.). Identity key for removal.
  mask: PropValueMask<T>; // Transformation function
  extra: unknown[]; // Extra arguments to pass to mask
}

/**
 * Interface for objects with dynamic properties.
 */
export interface Propertied {
  /**
   * Read-only view of all properties (saved + transient).
   */
  getProps(): Readonly<Record<string, PropValue>>;

  /**
   * Initialize a new property with options.
   *
   * Pass `marshaller: '/lib/persistence/QuantityMarshaller/kg'` (or
   * any registered marshaller path) when the prop holds a rich
   * value object that needs storage-shape conversion. The binding
   * persists alongside `savedProps`, so loaded hosts round-trip
   * through the same marshaller without redeclaring.
   *
   * @returns true if successful, false if property already exists
   */
  initProp<T extends PropValue>(
    prop: Property<T>,
    options?: PropOptionsInput<T>,
  ): boolean;

  /**
   * Change property configuration (transient/saved, access control).
   *
   * @returns true if successful, false if access denied or property doesn't exist
   */
  configureProp<T extends PropValue>(
    prop: Property<T>,
    options: Partial<PropOptions<T>>,
  ): boolean;

  /**
   * Set property value (auto-initializes if doesn't exist).
   *
   * @returns true if successful, false if access denied
   */
  setProp<T extends PropValue>(prop: Property<T>, value: T): boolean;

  /**
   * Get property value (null if doesn't exist or access denied).
   */
  getProp<T extends PropValue>(prop: Property<T>): T | null;

  /**
   * Remove property.
   *
   * @returns true if successful, false if access denied or property doesn't exist
   */
  removeProp<T extends PropValue>(prop: Property<T>): boolean;

  /**
   * Add value transformation mask (e.g., stat modifiers, equipment bonuses).
   * Masks are applied during getProp() to transform the returned value.
   *
   * The owner is the in-world Stuff this mask belongs to — the ring that
   * grants the bonus, the potion that doubles it, the curse that halves
   * it. The caller retains the reference so it can later call
   * unmaskProp(prop, owner) to remove *its own* masks without touching
   * others'. Owner is also passed to access control as `special`.
   *
   * If `owner` is omitted, it defaults to the nearest Stuff on the call
   * stack (the caller of this method, walking down past Api frames).
   * The common case — Stuff A reaches into Stuff B and adds a mask —
   * needs no explicit owner. Throws if no Stuff is reachable on the
   * stack.
   *
   * @param prop - Property to mask
   * @param mask - Value transformation function
   * @param owner - The Stuff this mask belongs to (defaults to nearest Stuff caller)
   * @param extra - Additional arguments to pass to mask when executed
   * @returns true if successful, false if property doesn't exist or owner already has a mask
   */
  maskProp<T extends PropValue>(
    prop: Property<T>,
    mask: PropValueMask<T>,
    owner?: Stuff,
    ...extra: unknown[]
  ): boolean;

  /**
   * Remove masks by owner. Owner defaults to the nearest Stuff on the
   * call stack — the same resolution rule as `maskProp`, so symmetric
   * pairs need no explicit owner.
   *
   * @param prop - Property to unmask
   * @param owner - The Stuff whose masks should be removed (defaults to nearest Stuff caller)
   * @returns true if any masks were removed, false otherwise
   */
  unmaskProp<T extends PropValue>(prop: Property<T>, owner?: Stuff): boolean;

  /**
   * Check if owner has any masks on property. Owner defaults to the
   * nearest Stuff on the call stack.
   *
   * @param prop - Property to check
   * @param owner - The Stuff to check for (defaults to nearest Stuff caller)
   * @returns true if owner has masks on this property
   */
  isMaskingProp<T extends PropValue>(prop: Property<T>, owner?: Stuff): boolean;

  /**
   * Check if property exists and get its options.
   *
   * @returns Property options, or null if doesn't exist
   */
  checkProp<T extends PropValue>(prop: Property<T>): PropOptions<T> | null;

  /**
   * Get all property names.
   */
  getAllPropNames(): Property<PropValue>[];

  /**
   * Generate unique property name (useful for anonymous properties).
   *
   * @param seed - Optional prefix (default: "prop")
   * @returns Unique property name like "seed.abc123xyz"
   */
  generateUniquePropName<T extends PropValue>(seed?: string): Property<T>;

  /**
   * Default access control (override in subclasses).
   *
   * Default implementation allows all operations.
   */
  defaultPropAccess(
    property: Property<PropValue>,
    op: PropOperation,
    special: unknown,
  ): boolean;
}

/**
 * Detect "we're inside an EventApi.emit call" — the case where
 * EventApi calls `reg.setProp(name, payload)` on the EventRegistry
 * to drive event dispatch. PropertiedMixin must NOT fire a
 * PropertyChangedEvent in that case: doing so would re-enter
 * EventApi.emit → reg.setProp → setProp → fire → infinite loop.
 *
 * The guard walks the call stack for an `EventApi` class frame.
 * This is the same shape `emittableBy` uses; we keep this local
 * (no shared helper) to avoid pulling EventApi into the import
 * cycle at module-load.
 */
function isInEventApiFrame(): boolean {
  const stack = ExecutionContextApi.getCallStack();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.target === EventApi) return true;
  }
  return false;
}

/**
 * Resolve a marshaller by templatePath. Throws when the path is
 * declared but the marshaller hasn't been loaded into the registry —
 * marshallers must be seeded / registered before any host that
 * binds them is hydrated.
 */
function resolveMarshaller(
  path: string,
  propName: string
): Marshaller<unknown, unknown> {
  const m = StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path);
  if (!m) {
    throw new Error(
      `PropertiedMixin: marshaller '${path}' for prop '${propName}' is not registered. ` +
        `Marshallers must be loaded before set/getProp on a marshalled prop.`
    );
  }
  return m;
}

/**
 * Resolve a mask `owner` from explicit argument or call-stack walk.
 *
 * When `explicit` is provided, returns it. Otherwise walks the
 * `ExecutionContextApi` stack top-down looking for the most recent
 * frame whose `caller` is a `Stuff`. That's the immediate caller for
 * direct invocations and the nearest Stuff above any intermediate Api
 * frames otherwise.
 *
 * Throws when no Stuff can be found — calling these methods without an
 * owner from a context that can't supply one (raw test code, framework
 * bootstrap) is a bug, fail loud rather than silently misattributing.
 */
function resolveMaskOwner(explicit: Stuff | undefined, op: string): Stuff {
  if (explicit !== undefined) return explicit;
  const stack = ExecutionContextApi.getCallStack();
  for (let i = stack.length - 1; i >= 0; i--) {
    const caller = stack[i]!.caller;
    if (caller instanceof Stuff) return caller;
  }
  throw new Error(
    `Propertied.${op}: owner omitted and no Stuff is on the call stack — ` +
      `pass owner explicitly when calling from outside a Stuff method`,
  );
}

/**
 * Mixin that adds controlled dynamic properties to objects.
 *
 * The returned class is marked class-form `@Unshadowable`: every method
 * on a PropertiedMixin layer is unshadowable. Reason: `queryProp` is
 * hot-path-called everywhere; `setProp` carries field-shape invariants;
 * shadowing them would undermine `maskProp`, which is the legitimate
 * per-property override mechanism. If you find a real need (admin debug
 * tracing, perhaps) downgrade specific methods to "shadowable but only
 * by Admin."
 */
export function PropertiedMixin<TBase extends MixinConstructor>(Base: TBase) {
  @Unshadowable
  class PropertiedMixin extends Base implements Propertied {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'PropertiedMixin';

    /**
     * Persistent fields declared by this mixin. `savedProps` carries
     * the raw stored shape of each persistent prop (Quantity round-
     * trips as `{value, unit}`, etc.); `savedPropMarshallers` carries
     * the per-prop binding from prop name to marshaller templatePath
     * so loaded hosts know which marshaller to apply on read /
     * write. The marshaller binding is persisted explicitly so it
     * survives restarts without requiring the host class to re-
     * declare the binding for every prop name.
     */
    static persistentFields = ['savedProps', 'savedPropMarshallers'];

    /**
     * Persistent properties — STORED SHAPE. Host-internal storage;
     * `setProp` applies `marshaller.toStored` before writing here
     * when a marshaller is bound for the prop, and `getProp`
     * applies `marshaller.fromStored` on read so external callers
     * see the runtime type. The hydrator's bracket-assign deposits
     * the raw record directly without per-key conversion — the
     * marshaller binding lives on `savedPropMarshallers` and runs
     * lazily at access time.
     */
    protected savedProps?: Record<string, PropValue> = {};

    /**
     * Per-prop marshaller bindings. Maps prop name → marshaller
     * templatePath. Persistent and arrives alongside `savedProps`
     * during hydration. `setProp` / `getProp` consult this map to
     * decide whether to invoke `toStored` / `fromStored` for a
     * given value. Props without a binding here round-trip raw, the
     * way scalar props always have.
     *
     * Auto-initialized to an empty object; populated by
     * `initProp(prop, { marshaller: '/path' })`.
     */
    protected savedPropMarshallers: Record<string, string> = {};

    /**
     * Transient properties (memory only, lost on restart).
     */
    protected transientProps: Record<string, PropValue> = {};

    /**
     * Property configuration (transient/saved, access control).
     * Not persisted - reconstructed on load.
     */
    private propOptions: Record<string, PropOptions<PropValue>> = {};

    /**
     * Per-property value transformation masks.
     * Applied in order during getProp() to transform the returned value.
     * Not persisted - reconstructed on load.
     */
    private propMasks: Record<string, MaskEntry<PropValue>[]> = {};

    /**
     * Host-internal accessor; external callers go through `getProps()`.
     */
    protected get props(): Readonly<Record<string, PropValue>> {
      return { ...this.savedProps, ...this.transientProps };
    }

    /**
     * Read-only view combining saved + transient properties. Saved
     * props are returned in their RUNTIME form — marshalled props
     * pass through `marshaller.fromStored` on the way out so callers
     * see Quantity instances and friends, not the raw stored shape.
     */
    getProps(): Readonly<Record<string, PropValue>> {
      const saved: Record<string, PropValue> = {};
      if (this.savedProps) {
        for (const [key, raw] of Object.entries(this.savedProps)) {
          const path = this.savedPropMarshallers[key];
          if (path) {
            saved[key] = resolveMarshaller(path, key).fromStored(
              raw
            ) as PropValue;
          } else {
            saved[key] = raw;
          }
        }
      }
      return { ...saved, ...this.transientProps };
    }

    /**
     * Initialize a new property with options. Pass `marshaller:`
     * for props that hold rich value objects — the binding persists
     * alongside `savedProps`, so the same marshaller will run on
     * future loads of this host.
     */
    initProp<T extends PropValue>(
      prop: Property<T>,
      options?: PropOptionsInput<T>,
    ): boolean {
      const propName = prop.toString();

      // Check if already exists
      if (this.propOptions[propName]) {
        return false;
      }

      // Create configuration
      this.propOptions[propName] = {
        transient: options?.transient ?? true,
        checkAccess:
          (options?.checkAccess as PropAccessCheck<PropValue>) ??
          ((p, op, special) => this.defaultPropAccess(p, op, special)),
      };
      this.propMasks[propName] = [];
      if (options?.marshaller) {
        this.savedPropMarshallers[propName] = options.marshaller;
      }
      return true;
    }

    /**
     * Change property configuration.
     */
    configureProp<T extends PropValue>(
      prop: Property<T>,
      options: Partial<PropOptions<T>>,
    ): boolean {
      const propName = prop.toString();
      const config = this.propOptions[propName];

      if (!config) {
        return false;
      }

      // Check access for Configure operation
      if (!this.checkAccess(prop, PropOperations.Configure, options)) {
        return false;
      }

      // Update configuration
      if (options.transient !== undefined) {
        // If changing transient status, move value between storages.
        // Account for the marshaller binding: savedProps holds
        // storage-shape, transientProps holds runtime-shape, so
        // crossing the boundary requires the appropriate
        // toStored / fromStored conversion when one is bound.
        const oldTransient = config.transient;
        const newTransient = options.transient;

        if (oldTransient !== newTransient) {
          const path = this.savedPropMarshallers[propName];
          const raw = this.getPropValue(propName);

          if (raw !== null) {
            if (newTransient) {
              // saved → transient: move runtime-shape across.
              const runtime = path
                ? (resolveMarshaller(path, propName).fromStored(
                    raw
                  ) as PropValue)
                : raw;
              delete this.savedProps![propName];
              this.transientProps[propName] = runtime;
            } else {
              // transient → saved: move storage-shape across.
              const stored = path
                ? (resolveMarshaller(path, propName).toStored(raw) as PropValue)
                : raw;
              delete this.transientProps[propName];
              this.savedProps![propName] = stored;
            }
          }

          config.transient = newTransient;
        }
      }

      if (options.checkAccess !== undefined) {
        config.checkAccess = options.checkAccess as PropAccessCheck<PropValue>;
      }

      return true;
    }

    /**
     * Set property value (auto-initializes if doesn't exist).
     *
     * If `savedProps` already carries an entry for this name (e.g.
     * delivered by hydration from a seed template), auto-init treats
     * the prop as `transient: false` so subsequent writes route back
     * to `savedProps` rather than landing in `transientProps`. Without
     * this branch, hydrated values would be silently shadowed by the
     * first set call.
     */
    setProp<T extends PropValue>(prop: Property<T>, value: T): boolean {
      const propName = prop.toString();

      // Auto-initialize if doesn't exist
      if (!this.propOptions[propName]) {
        const fromHydration =
          !!this.savedProps && propName in this.savedProps;
        this.initProp(prop, fromHydration ? { transient: false } : undefined);
      }

      // Check access for Set operation
      if (!this.checkAccess(prop, PropOperations.Set, value)) {
        return false;
      }

      // Capture pre-set runtime-shape value for change detection.
      // `getPropValue` returns storage-shape for marshalled saved
      // props; convert via the same path `getProp` uses so the
      // payload's `oldValue` reflects what consumers actually saw.
      const oldRaw = this.getPropValue(propName);
      let oldRuntime: PropValue | null = oldRaw;
      if (oldRaw !== null) {
        const path = this.savedPropMarshallers[propName];
        if (
          path !== undefined &&
          this.savedProps &&
          propName in this.savedProps
        ) {
          oldRuntime = resolveMarshaller(path, propName).fromStored(
            oldRaw,
          ) as PropValue;
        }
      }

      // Store in appropriate location (initProp above guarantees config exists).
      // Transient props store the raw runtime value (memory-only, never
      // serialized). Persistent props apply `marshaller.toStored` if a
      // marshaller is bound, so the savedProps record carries the
      // storage-shape ready for serialization.
      if (this.propOptions[propName]!.transient) {
        this.transientProps[propName] = value;
      } else {
        const path = this.savedPropMarshallers[propName];
        if (path) {
          const stored = resolveMarshaller(path, propName).toStored(value);
          this.savedProps![propName] = stored as PropValue;
        } else {
          this.savedProps![propName] = value;
        }
      }

      if (!Object.is(oldRuntime, value) && !isInEventApiFrame()) {
        EventApi.fire(
          new PropertyChangedEvent({
            target: (this as unknown as { stuffId: string }).stuffId,
            property: propName,
            oldValue: oldRuntime,
            newValue: value,
          }),
        );
      }

      return true;
    }

    /**
     * Get property value (with masks applied).
     *
     * Lazily auto-initializes prop options when `savedProps` carries
     * a hydration-delivered entry but `propOptions` doesn't yet —
     * otherwise the value would be unreachable through the public API
     * (getProp returns null without a config). Auto-init uses
     * `transient: false` so the prop's persistence flag matches its
     * storage location.
     */
    getProp<T extends PropValue>(prop: Property<T>): T | null {
      const propName = prop.toString();
      let config = this.propOptions[propName];

      if (!config) {
        if (this.savedProps && propName in this.savedProps) {
          this.initProp(prop, { transient: false });
          config = this.propOptions[propName];
        }
      }

      if (!config) {
        return null;
      }

      // Check access for Get operation
      if (!this.checkAccess(prop, PropOperations.Get, null)) {
        return null;
      }

      // Get base value. Persistent props with a marshaller binding
      // hold storage-shape in `savedProps`; convert to runtime form
      // via `fromStored` here so callers (and mask functions) see
      // the strict value-object type.
      let value = this.getPropValue(propName);
      if (value !== null) {
        const path = this.savedPropMarshallers[propName];
        if (
          path !== undefined &&
          this.savedProps &&
          propName in this.savedProps
        ) {
          value = resolveMarshaller(path, propName).fromStored(
            value
          ) as PropValue;
        }
      }
      let typed = (value as T) ?? null;

      // Apply masks in order, filtering out invalid ones
      const masks = this.propMasks[propName] ?? [];
      const validMasks: MaskEntry<PropValue>[] = [];

      for (const maskEntry of masks) {
        try {
          typed = (maskEntry.mask as unknown as PropValueMask<T>)(
            prop,
            typed!,
            ...maskEntry.extra,
          );
          validMasks.push(maskEntry);
        } catch {
          // Mask failed (e.g., owner destroyed), drop it.
        }
      }

      this.propMasks[propName] = validMasks;

      return typed;
    }

    /**
     * Remove property.
     */
    removeProp<T extends PropValue>(prop: Property<T>): boolean {
      const propName = prop.toString();

      if (!this.propOptions[propName]) {
        return false;
      }

      // Check access for Remove operation
      if (!this.checkAccess(prop, PropOperations.Remove, null)) {
        return false;
      }

      // Remove from storages and configuration. The marshaller
      // binding goes with the prop — leaving it in
      // `savedPropMarshallers` would attach a stale path to a
      // future setProp under the same name.
      delete this.transientProps[propName];
      delete this.savedProps![propName];
      delete this.propOptions[propName];
      delete this.propMasks[propName];
      delete this.savedPropMarshallers[propName];

      return true;
    }

    /**
     * Add value transformation mask.
     */
    maskProp<T extends PropValue>(
      prop: Property<T>,
      mask: PropValueMask<T>,
      owner?: Stuff,
      ...extra: unknown[]
    ): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      const resolvedOwner = resolveMaskOwner(owner, 'maskProp');

      const masks = (this.propMasks[propName] ??= []);

      // Only one mask per owner
      if (masks.some((entry) => entry.owner === resolvedOwner)) {
        return false;
      }

      // Check access for Mask operation
      if (!this.checkAccess(prop, PropOperations.Mask, resolvedOwner)) {
        return false;
      }

      masks.push({
        owner: resolvedOwner,
        mask: mask as unknown as PropValueMask<PropValue>,
        extra: extra,
      });
      return true;
    }

    /**
     * Remove value transformation masks by owner.
     */
    unmaskProp<T extends PropValue>(prop: Property<T>, owner?: Stuff): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      const resolvedOwner = resolveMaskOwner(owner, 'unmaskProp');

      // Check access for Unmask operation
      if (!this.checkAccess(prop, PropOperations.Unmask, resolvedOwner)) {
        return false;
      }

      const masks = this.propMasks[propName] ?? [];
      const originalLength = masks.length;
      this.propMasks[propName] = masks.filter(
        (entry) => entry.owner !== resolvedOwner,
      );

      return this.propMasks[propName]!.length !== originalLength;
    }

    /**
     * Check if owner has any masks on property.
     */
    isMaskingProp<T extends PropValue>(
      prop: Property<T>,
      owner?: Stuff,
    ): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      const resolvedOwner = resolveMaskOwner(owner, 'isMaskingProp');

      const masks = this.propMasks[propName] ?? [];
      return masks.some((entry) => entry.owner === resolvedOwner);
    }

    /**
     * Check if property exists AND the caller is allowed to see it.
     * Returns the prop's options when both are true, `null` otherwise.
     *
     * Single answer to "does this prop exist and can I read it?":
     * the Get access op gates visibility, so a denied caller gets
     * the same `null` as for a non-existent prop. Lets EventApi.on
     * disambiguate "no such event / not allowed to subscribe" from
     * "exists and emitted-but-no-payload-yet" without sentinels.
     */
    checkProp<T extends PropValue>(prop: Property<T>): PropOptions<T> | null {
      const propName = prop.toString();
      const config = this.propOptions[propName];

      if (!config) {
        return null;
      }

      if (!this.checkAccess(prop, PropOperations.Get, null)) {
        return null;
      }

      // Return copy without internal fields (masks)
      return {
        transient: config.transient,
        checkAccess: config.checkAccess as PropAccessCheck<T>,
      };
    }

    /**
     * Get all property names.
     */
    getAllPropNames(): Property<PropValue>[] {
      return Object.keys(this.propOptions).map((name) => Property.of(name));
    }

    /**
     * Generate unique property name.
     */
    generateUniquePropName<T extends PropValue>(seed?: string): Property<T> {
      const prefix = seed || 'prop';
      let name: string;

      // Keep generating until we find a unique name
      do {
        name = `${prefix}.${SecurityApi.uuid(8)}`;
      } while (this.propOptions[name]);

      return Property.of<T>(name);
    }

    /**
     * Default access control.
     * Override in subclasses to provide custom access control.
     *
     * Default implementation allows all operations.
     */
    defaultPropAccess(
      _property: Property<PropValue>,
      _op: PropOperation,
      _special: unknown,
    ): boolean {
      return true;
    }

    /**
     * Internal: Check access control.
     */
    private checkAccess<T extends PropValue>(
      prop: Property<T>,
      op: PropOperation,
      special: unknown,
    ): boolean {
      const propName = prop.toString();
      const config = this.propOptions[propName];

      if (!config) {
        return false;
      }

      // Check access control function
      return config.checkAccess(prop, op, special);
    }

    /**
     * Internal: Get property value from appropriate storage.
     */
    private getPropValue(propName: string): PropValue | null {
      // Check transient first (takes precedence)
      if (propName in this.transientProps) {
        return this.transientProps[propName]!;
      }

      // Check saved
      if (this.savedProps && propName in this.savedProps) {
        return this.savedProps[propName]!;
      }

      return null;
    }
  }
  return PropertiedMixin;
}
