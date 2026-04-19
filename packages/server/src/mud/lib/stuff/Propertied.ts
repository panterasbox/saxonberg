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
 * avatar.setProp("quest_started", true);
 * avatar.getProp("quest_started"); // true
 *
 * // Persistent property with access control
 * avatar.initProp("gold", {
 *   transient: false,  // Persists to DB
 *   checkAccess: (prop, op, special) => {
 *     if (op === PropOperations.Set && special !== avatar) {
 *       return false;  // Only owner can modify
 *     }
 *     return true;
 *   }
 * });
 * avatar.setProp("gold", 100);
 *
 * // Value transformation masks (e.g., equipment bonus)
 * const magicRing = { name: 'Ring of Strength' };
 * avatar.maskProp("strength", (prop, value) => value + 5, magicRing);
 * avatar.setProp("strength", 10);
 * avatar.getProp("strength");  // 15 (base 10 + 5 from ring)
 *
 * // Generate unique anonymous property
 * const buffProp = avatar.generateUniquePropName("buff");  // "buff.abc123xyz"
 * avatar.setProp(buffProp, { strength: 10, duration: 60 });
 * ```
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from './Stuff';
import { nanoid } from 'nanoid';

/**
 * Property wrapper for type safety.
 * Extends String to allow using strings as Property<T> but with type checking.
 */
export class Property<T extends PropValue = PropValue> extends String {
  constructor(name: string) {
    super(name);
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
 * Property configuration options.
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
  props: Readonly<Record<string, PropValue>>;

  /**
   * Initialize a new property with options.
   *
   * @returns true if successful, false if property already exists
   */
  initProp<T extends PropValue>(
    prop: Property<T>,
    options?: Partial<PropOptions<T>>,
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
   * Once the call-security framework lands, owner will become optional
   * and default to the nearest Stuff on the call stack; until then, the
   * caller must name it explicitly.
   *
   * @param prop - Property to mask
   * @param mask - Value transformation function
   * @param owner - The Stuff this mask belongs to
   * @param extra - Additional arguments to pass to mask when executed
   * @returns true if successful, false if property doesn't exist or owner already has a mask
   */
  maskProp<T extends PropValue>(
    prop: Property<T>,
    mask: PropValueMask<T>,
    owner: Stuff,
    ...extra: unknown[]
  ): boolean;

  /**
   * Remove masks by owner.
   *
   * @param prop - Property to unmask
   * @param owner - The Stuff whose masks should be removed
   * @returns true if any masks were removed, false otherwise
   */
  unmaskProp<T extends PropValue>(prop: Property<T>, owner: Stuff): boolean;

  /**
   * Check if owner has any masks on property.
   *
   * @param prop - Property to check
   * @param owner - The Stuff to check for
   * @returns true if owner has masks on this property
   */
  isMaskingProp<T extends PropValue>(prop: Property<T>, owner: Stuff): boolean;

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
 * Mixin that adds controlled dynamic properties to objects.
 */
export function PropertiedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PropertiedMixin extends Base implements Propertied {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'PropertiedMixin';

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['savedProps'];

    /**
     * Persistent properties (saved to MongoDB).
     * Framework 2 handles serialization.
     */
    savedProps?: Record<string, PropValue> = {};

    /**
     * Transient properties (memory only, lost on restart).
     */
    transientProps: Record<string, PropValue> = {};

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
     * Read-only view combining saved + transient properties.
     */
    get props(): Readonly<Record<string, PropValue>> {
      return { ...this.savedProps, ...this.transientProps };
    }

    /**
     * Initialize a new property with options.
     */
    initProp<T extends PropValue>(
      prop: Property<T>,
      options?: Partial<PropOptions<T>>,
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
        // If changing transient status, move value between storages
        const oldTransient = config.transient;
        const newTransient = options.transient;

        if (oldTransient !== newTransient) {
          const value = this.getPropValue(propName);

          if (value !== null) {
            // Move from one storage to the other
            if (newTransient) {
              // saved → transient
              delete this.savedProps![propName];
              this.transientProps[propName] = value;
            } else {
              // transient → saved
              delete this.transientProps[propName];
              this.savedProps![propName] = value;
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
     */
    setProp<T extends PropValue>(prop: Property<T>, value: T): boolean {
      const propName = prop.toString();

      // Auto-initialize if doesn't exist
      if (!this.propOptions[propName]) {
        this.initProp(prop);
      }

      // Check access for Set operation
      if (!this.checkAccess(prop, PropOperations.Set, value)) {
        return false;
      }

      // Store in appropriate location (initProp above guarantees config exists)
      if (this.propOptions[propName]!.transient) {
        this.transientProps[propName] = value;
      } else {
        this.savedProps![propName] = value;
      }

      return true;
    }

    /**
     * Get property value (with masks applied).
     */
    getProp<T extends PropValue>(prop: Property<T>): T | null {
      const propName = prop.toString();
      const config = this.propOptions[propName];

      if (!config) {
        return null;
      }

      // Check access for Get operation
      if (!this.checkAccess(prop, PropOperations.Get, null)) {
        return null;
      }

      // Get base value
      let value = (this.getPropValue(propName) as T) ?? null;

      // Apply masks in order, filtering out invalid ones
      const masks = this.propMasks[propName] ?? [];
      const validMasks: MaskEntry<PropValue>[] = [];

      for (const maskEntry of masks) {
        try {
          value = (maskEntry.mask as unknown as PropValueMask<T>)(
            prop,
            value!,
            ...maskEntry.extra,
          );
          validMasks.push(maskEntry);
        } catch {
          // Mask failed (e.g., owner destroyed), drop it.
        }
      }

      this.propMasks[propName] = validMasks;

      return value;
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

      // Remove from storages and configuration
      delete this.transientProps[propName];
      delete this.savedProps![propName];
      delete this.propOptions[propName];
      delete this.propMasks[propName];

      return true;
    }

    /**
     * Add value transformation mask.
     */
    maskProp<T extends PropValue>(
      prop: Property<T>,
      mask: PropValueMask<T>,
      owner: Stuff,
      ...extra: unknown[]
    ): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      const masks = (this.propMasks[propName] ??= []);

      // Only one mask per owner
      if (masks.some((entry) => entry.owner === owner)) {
        return false;
      }

      // Check access for Mask operation
      if (!this.checkAccess(prop, PropOperations.Mask, owner)) {
        return false;
      }

      masks.push({
        owner,
        mask: mask as unknown as PropValueMask<PropValue>,
        extra: extra,
      });
      return true;
    }

    /**
     * Remove value transformation masks by owner.
     */
    unmaskProp<T extends PropValue>(prop: Property<T>, owner: Stuff): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      // Check access for Unmask operation
      if (!this.checkAccess(prop, PropOperations.Unmask, owner)) {
        return false;
      }

      const masks = this.propMasks[propName] ?? [];
      const originalLength = masks.length;
      this.propMasks[propName] = masks.filter(
        (entry) => entry.owner !== owner,
      );

      return this.propMasks[propName]!.length !== originalLength;
    }

    /**
     * Check if owner has any masks on property.
     */
    isMaskingProp<T extends PropValue>(
      prop: Property<T>,
      owner: Stuff,
    ): boolean {
      const propName = prop.toString();
      if (!this.propOptions[propName]) {
        return false;
      }

      const masks = this.propMasks[propName] ?? [];
      return masks.some((entry) => entry.owner === owner);
    }

    /**
     * Check if property exists and get its options.
     */
    checkProp<T extends PropValue>(prop: Property<T>): PropOptions<T> | null {
      const propName = prop.toString();
      const config = this.propOptions[propName];

      if (!config) {
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
      return Object.keys(this.propOptions).map(
        (name) => new Property<PropValue>(name),
      );
    }

    /**
     * Generate unique property name.
     */
    generateUniquePropName<T extends PropValue>(seed?: string): Property<T> {
      const prefix = seed || 'prop';
      let name: string;

      // Keep generating until we find a unique name
      do {
        name = `${prefix}.${nanoid(8)}`;
      } while (this.propOptions[name]);

      return new Property<T>(name);
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
  };
}
