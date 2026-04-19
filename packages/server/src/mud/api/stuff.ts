/**
 * StuffApi - Static utility class for object management
 *
 * Responsibilities:
 * - Object registry (objectsById: Map<stuffId, Stuff>)
 * - Avatar registry (avatarsByPlayerId: Map<playerId, Avatar>)
 * - Destroyed object tracking (for debugging)
 * - ID generation
 * - Object lookup methods
 * - Registration/unregistration
 *
 * This is the central registry for all runtime objects in the game.
 */

import { nanoid } from 'nanoid';
import type { Stuff, DestroyedObjectMetadata } from '../lib/stuff/Stuff';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager';

/**
 * Domain template from CMS.
 * Templates define how to create objects from paths.
 */
export interface DomainTemplate {
  _id?: string;
  path: string; // e.g., "/avatar/player/abc", "/home/bobalu/workroom"
  class: string; // e.g., "/obj/Avatar" (relative to /mud/)
  data: Record<string, unknown>; // template-specific initialization data
}

/**
 * Constructor type for Stuff classes.
 */
export type StuffConstructor<T extends Stuff = Stuff> = new (
  templateData: Record<string, unknown>
) => T;

/**
 * Static API for object management and registry.
 */
export class StuffApi {
  /**
   * Registry of all active objects by stuffId.
   */
  private static objectsById: Map<string, Stuff> = new Map();

  /**
   * WeakMap tracking destroyed objects for debugging.
   * Objects are automatically garbage collected once no other references exist.
   */
  private static destroyedObjects: WeakMap<Stuff, DestroyedObjectMetadata> =
    new WeakMap();

  /**
   * Generate a unique ID using nanoid.
   * Uses base58-encoded nanoid for short, URL-safe IDs.
   */
  public static generateId(): string {
    return nanoid();
  }

  /**
   * Validate and normalize a class path.
   * Ensures path is safe and doesn't attempt directory traversal.
   *
   * @param classPath - Class path relative to /mud/ (e.g., "/obj/Avatar")
   * @returns Normalized path
   * @throws Error if path is invalid
   */
  private static validateClassPath(classPath: string): string {
    // Must start with /
    if (!classPath.startsWith('/')) {
      throw new Error(`Class path must start with /: ${classPath}`);
    }

    // No directory traversal
    if (classPath.includes('..')) {
      throw new Error(`Class path cannot contain ..: ${classPath}`);
    }

    // Must be in allowed directories
    const allowedPrefixes = ['/obj/', '/lib/'];
    const hasAllowedPrefix = allowedPrefixes.some((prefix) =>
      classPath.startsWith(prefix)
    );
    if (!hasAllowedPrefix) {
      throw new Error(
        `Class path must start with ${allowedPrefixes.join(' or ')}: ${classPath}`
      );
    }

    return classPath;
  }

  /**
   * Clone an object from a template in the domain collection.
   *
   * This is the primary way to create game objects:
   * 1. Loads template from 'domain' collection by path
   * 2. Dynamically imports the class module
   * 3. Instantiates the class with template data
   * 4. Calls async initialize() if present
   * 5. Registers the object
   * 6. Returns the instance
   *
   * @param templatePath - Path to the template (e.g., "/avatar/player/abc")
   * @returns The cloned and registered object
   *
   * @example
   * const avatar = await StuffApi.clone('/avatar/player/abc');
   * const room = await StuffApi.clone('/home/bobalu/workroom');
   */
  public static async clone<T extends Stuff>(
    templatePath: string
  ): Promise<T> {
    // 1. Load template from domain collection
    const templates = await PersistenceManager.get().find(Collections.Domain, {
      path: templatePath,
    });

    if (templates.length === 0) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const template = templates[0] as unknown as DomainTemplate;

    // 2. Validate and resolve class path
    const classPath = this.validateClassPath(template.class);

    // 3. Dynamically import the module
    // Convert "/obj/Avatar" to "../obj/Avatar"
    const modulePath = `..${classPath}.js`;
    const className = classPath.split('/').pop()!; // "Avatar" from "/obj/Avatar"

    // Dynamic import result is an opaque module namespace object; we fish the
    // class constructor out of it by string name below.
    let module: Record<string, unknown>;
    try {
      module = (await import(modulePath)) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Failed to import class ${template.class}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 4. Get the class constructor from the module
    const ClassConstructor = module[className] as StuffConstructor<T> | undefined;
    if (!ClassConstructor) {
      throw new Error(
        `Class ${className} not found in module ${modulePath} (available exports: ${Object.keys(module).join(', ')})`
      );
    }

    // 5. Resolve the template's zone from its path. Done before initialize()
    //    so subclasses that rely on `this.zone` during async setup see the
    //    correct value. `ZoneApi.resolveZoneForPath` returns null when the
    //    template is itself a Zone (a zone isn't inside itself).
    const { ZoneApi } = await import('./zone');
    const zone = await ZoneApi.resolveZoneForPath(templatePath);

    return await this.create(() => {
      const obj = new ClassConstructor(template.data);
      if (zone) obj.zone = zone;
      return obj;
    });
  }

  /**
   * Create and register a Stuff object.
   * This is the preferred way to create game objects.
   *
   * The factory function should construct the object without side effects.
   * If the object has an async initialize() method, it will be called before registration.
   * Registration happens automatically after initialization.
   *
   * @param factory - Function that creates the object
   * @returns The created and registered object
   *
   * @example
   * const user = await StuffApi.create(() => new User());
   * const player = await StuffApi.create(() => new Player('Alice', 'Smith', Pronouns.She));
   * const avatar = await StuffApi.create(() => new Avatar({ playerId: '...' }));
   */
  public static async create<T extends Stuff>(factory: () => T): Promise<T> {
    const obj = factory();

    // Call initialize if it exists
    if ('initialize' in obj) {
      const init = (obj as Stuff & { initialize?: () => Promise<void> | void }).initialize;
      if (typeof init === 'function') {
        await init.call(obj);
      }
    }

    this.register(obj);
    return obj;
  }

  /**
   * Register an object in the registry.
   * Should be called during object construction.
   *
   * @param object - The object to register
   */
  public static register(object: Stuff): void {
    if (!object || !object.stuffId) {
      throw new Error('StuffApi.register(): Invalid object');
    }

    if (this.objectsById.has(object.stuffId)) {
      console.warn(
        `StuffApi.register(): Object ${object.stuffId} already registered`
      );
      return;
    }

    this.objectsById.set(object.stuffId, object);
  }

  /**
   * Destroy an object.
   *
   * This is the canonical destruction entry point — always destroy objects
   * through this API. Currently a thin wrapper over Stuff.destroy(); when
   * the call security framework lands, direct Stuff.destroy() calls will be
   * locked down so only this Api layer can invoke them.
   *
   * @param object - The object to destroy
   */
  public static destruct(object: Stuff): void {
    if (!object) {
      throw new Error('StuffApi.destruct(): Invalid object');
    }
    object.destroy();
  }

  /**
   * Unregister an object from the registry.
   * Called by destruct() — not typically invoked directly.
   *
   * @param object - The object to unregister
   */
  public static unregister(object: Stuff): void {
    if (!object || !object.stuffId) {
      throw new Error('StuffApi.unregister(): Invalid object');
    }

    this.objectsById.delete(object.stuffId);

    // Track for debugging
    this.destroyedObjects.set(object, {
      stuffId: object.stuffId,
      destroyedAt: new Date(),
    });
  }

  /**
   * Find an object by its stuffId.
   * Returns undefined if not found or if the object has been destroyed.
   *
   * @param stuffId - The runtime ID to look up
   * @returns The object, or undefined if not found
   */
  public static findById(stuffId: string): Stuff | undefined {
    const obj = this.objectsById.get(stuffId);

    // If object is destroyed, remove it from registry
    if (obj?.isDestroyed()) {
      this.objectsById.delete(stuffId);
      return undefined;
    }

    return obj;
  }

  /**
   * Get all active objects.
   * Filters out destroyed objects.
   *
   * @returns Array of all active objects
   */
  public static getAllObjects(): Stuff[] {
    const objects: Stuff[] = [];

    for (const obj of this.objectsById.values()) {
      if (!obj.isDestroyed()) {
        objects.push(obj);
      } else {
        // Clean up destroyed objects
        this.objectsById.delete(obj.stuffId);
      }
    }

    return objects;
  }

  /**
   * Get count of active objects.
   */
  public static getObjectCount(): number {
    return this.objectsById.size;
  }

  /**
   * Clear all registries (for testing).
   * WARNING: This will not properly clean up objects.
   * Only use for testing or shutdown.
   */
  public static clearAll(): void {
    this.objectsById.clear();
  }

  /**
   * Check if a destroyed object is tracked (for debugging).
   */
  public static isTrackedAsDestroyed(object: Stuff): boolean {
    return this.destroyedObjects.has(object);
  }

  /**
   * Get destroyed object metadata (for debugging).
   */
  public static getDestroyedMetadata(
    object: Stuff
  ): DestroyedObjectMetadata | undefined {
    return this.destroyedObjects.get(object);
  }
}
