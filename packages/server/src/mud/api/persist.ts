/**
 * PersistApi - Static utility class for persistence operations
 *
 * Provides automatic synchronization between runtime and persistent objects
 * using field declarations from mixins and classes.
 *
 * Key Features:
 * - Auto-collection of persistent fields from mixins
 * - Complex type handlers for references, arrays, Maps
 * - Bidirectional sync (runtime ↔ persistent)
 * - Legacy manual sync methods (deprecated)
 *
 * Usage:
 * ```typescript
 * // Sync runtime object to persistent object (save)
 * PersistApi.syncTo(avatar, player);
 *
 * // Sync persistent object to runtime object (load)
 * await PersistApi.syncFrom(player, avatar);
 * ```
 */

import { MixinApi } from './mixin.js';

/**
 * Persistence handler for complex types.
 */
export interface PersistenceHandler {
  /**
   * Transform from runtime to persistent format (sync to database).
   */
  to?: (value: any) => any;

  /**
   * Transform from persistent to runtime format (load from database).
   * May be async if it needs to fetch referenced objects.
   */
  from?: (value: any) => any | Promise<any>;
}

/**
 * Static API for persistence operations and auto-sync.
 */
export class PersistApi {
  /**
   * Sync from runtime object to persistent object (save direction).
   * Auto-collects simple fields from mixins + class.
   * Applies complex type handlers if defined.
   *
   * @param source - Runtime object (e.g., Avatar)
   * @param target - Persistent object (e.g., Player)
   */
  public static syncTo(source: any, target: any): void {
    const constructor = source.constructor;

    // 1. Auto-sync simple fields from mixins + class
    const simpleFields = this.getSimpleFields(constructor);

    for (const field of simpleFields) {
      if (field in source && field in target) {
        target[field] = source[field];
      }
    }

    // 2. Apply complex type handlers
    const handlers = constructor.persistenceHandlers || {};

    for (const [field, handler] of Object.entries(handlers)) {
      const typedHandler = handler as PersistenceHandler;
      if (typedHandler.to && field in source) {
        target[field] = typedHandler.to(source[field]);
      }
    }
  }

  /**
   * Sync from persistent object to runtime object (load direction).
   * Auto-collects simple fields from mixins + class.
   * Applies complex type handlers (may be async).
   *
   * @param source - Persistent object (e.g., Player)
   * @param target - Runtime object (e.g., Avatar)
   */
  public static async syncFrom(source: any, target: any): Promise<void> {
    const constructor = target.constructor;

    // 1. Auto-sync simple fields
    const simpleFields = this.getSimpleFields(constructor);

    for (const field of simpleFields) {
      if (field in source && field in target) {
        target[field] = source[field];
      }
    }

    // 2. Apply complex type handlers (may be async)
    const handlers = constructor.persistenceHandlers || {};

    for (const [field, handler] of Object.entries(handlers)) {
      const typedHandler = handler as PersistenceHandler;
      if (typedHandler.from && field in source) {
        target[field] = await typedHandler.from(source[field]);
      }
    }
  }

  /**
   * Get all simple persistent fields (fields that don't need handlers).
   * Uses MixinApi to collect fields from mixins + class.
   *
   * @param constructor - Class constructor
   * @returns Array of field names
   */
  private static getSimpleFields(constructor: any): string[] {
    // Try to get getAllPersistentFields static method if it exists
    if (
      typeof constructor.getAllPersistentFields === 'function'
    ) {
      return constructor.getAllPersistentFields();
    }

    // Fallback: collect manually using MixinApi
    return MixinApi.getAllPersistentFields(constructor);
  }

  /**
   * Legacy manual sync method (deprecated - prefer syncTo).
   * Syncs specific properties from source to target.
   *
   * @param source - Source object
   * @param target - Target object
   * @param properties - Array of property names to sync
   * @deprecated Use syncTo() with automatic field collection instead
   */
  public static syncToPersistable(
    source: any,
    target: any,
    properties: string[]
  ): void {
    for (const prop of properties) {
      if (prop in source && prop in target) {
        target[prop] = source[prop];
      }
    }
  }

  /**
   * Legacy manual sync method (deprecated - prefer syncFrom).
   * Syncs specific properties from source to target.
   *
   * @param source - Source object
   * @param target - Target object
   * @param properties - Array of property names to sync
   * @deprecated Use syncFrom() with automatic field collection instead
   */
  public static syncFromPersistable(
    source: any,
    target: any,
    properties: string[]
  ): void {
    for (const prop of properties) {
      if (prop in source && prop in target) {
        target[prop] = source[prop];
      }
    }
  }

  /**
   * Check if a class has persistence handlers defined.
   *
   * @param constructor - Class constructor
   * @returns True if handlers are defined
   */
  public static hasPersistenceHandlers(constructor: any): boolean {
    return (
      constructor.persistenceHandlers &&
      typeof constructor.persistenceHandlers === 'object'
    );
  }

  /**
   * Get persistence handlers for a specific field.
   *
   * @param constructor - Class constructor
   * @param field - Field name
   * @returns Handler or undefined
   */
  public static getHandler(
    constructor: any,
    field: string
  ): PersistenceHandler | undefined {
    if (!this.hasPersistenceHandlers(constructor)) {
      return undefined;
    }

    return constructor.persistenceHandlers[field];
  }
}
