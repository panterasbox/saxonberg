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
import { Stuff, type DestroyedObjectMetadata } from '../lib/stuff/Stuff';
import type { Hydrator } from '../lib/stuff/Hydrator';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { MixinApi } from './mixin';
import { wrapInProxy } from '../lib/security/proxy';
import { ExecutionContext, FrameKind } from '../lib/security/ExecutionContext';
import { decorateApiClass } from '../lib/security/decorators';
import { ShadowApi } from './shadow';

/**
 * Domain template document from the CMS.
 *
 * Two class paths sit at the top level, independently:
 *   - `class`         — the runtime backing class (what gets instantiated)
 *   - `hydratorClass` — a class implementing the `Hydrator` interface that
 *                       knows how to translate `data` into live state on the
 *                       backing. Optional: when ABSENT, no hydrator runs at
 *                       all and `data` is ignored. Templates that want the
 *                       generic mixin-field copy must opt in by setting
 *                       `hydratorClass: '/lib/persistence/PersistentHydrator'`.
 *                       Multiple backing classes may share one hydrator
 *                       (e.g. a `CreatureHydrator` serving both a Guard and
 *                       a GuardDog), and one backing class may be decorated
 *                       by many domain-specific hydrators.
 *
 * `data` is pure hydration payload — never carries class paths itself.
 */
export interface DomainTemplate {
  _id?: string;
  path: string; // e.g., "/avatar/player/abc", "/home/bobalu/workroom"
  class: string; // runtime backing class, e.g. "/obj/Avatar"
  hydratorClass?: string; // optional Hydrator class, e.g. "/lib/persistence/PersistentHydrator"
  data: Record<string, unknown>;
}

/**
 * Constructor type for Stuff classes. Clone instantiates backings with no
 * argument; hydration happens in a separate `Hydrator.hydrate()` step.
 * Classes may still define a raw-data constructor for direct test
 * construction — that's a class-local convenience, not a clone contract.
 */
export type StuffConstructor<T extends Stuff = Stuff> = new () => T;

/**
 * Static API for object management and registry.
 */
export class StuffApi {
  /**
   * Registry of all active objects by stuffId.
   */
  static #objectsById: Map<string, Stuff> = new Map();

  /**
   * WeakMap tracking destroyed objects for debugging.
   * Objects are automatically garbage collected once no other references exist.
   */
  static #destroyedObjects: WeakMap<Stuff, DestroyedObjectMetadata> =
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
   * Hard-private: class-path validation gates dynamic-import targets, so the
   * function must be invocable only from within this class — wrapping
   * `clone()` with a Proxy must not be able to redirect or short-circuit it.
   *
   * @param classPath - Class path relative to /mud/ (e.g., "/obj/Avatar")
   * @returns Normalized path
   * @throws Error if path is invalid
   */
  static #validateClassPath(classPath: string): string {
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
   * Pipeline:
   *   1. Load the template doc by path.
   *   2. Dynamic-import the backing `class` module.
   *   3. Construct an empty backing (no-arg ctor) and stamp its zone.
   *   4. Register the instance so recursive resolution during hydrate /
   *      initialize can observe the in-flight object.
   *   5. If the template names a `hydratorClass`, resolve it and
   *      `await hydrator.hydrate(backing, doc.data)`. When absent, no
   *      hydration step runs — templates that want generic mixin-field
   *      copy must opt in by naming
   *      `'/lib/persistence/PersistentHydrator'`.
   *   6. If the backing composes `PostRegistrationMixin`, await
   *      `postRegister(context)`, forwarding the caller-supplied context.
   *
   * If hydration or `postRegister` throws, the object is unregistered
   * before the error propagates.
   *
   * The optional `context` is a caller-supplied bag threaded through to
   * `postRegister`. It carries runtime setup that cannot come from the
   * template's `data` — e.g., an authenticated `User` for an avatar.
   * Objects that don't care ignore it; objects that do (Avatar) declare a
   * narrower context type locally and read what they need.
   *
   * @param templatePath - Path to the template (e.g., "/avatar/<playerId>")
   * @param context - Optional runtime context passed to `postRegister`
   * @returns The cloned and registered object
   *
   * @example
   * const avatar = await StuffApi.clone<Avatar>('/avatar/abc', { user });
   * const room = await StuffApi.clone('/home/bobalu/workroom');
   */
  public static async clone<T extends Stuff>(
    templatePath: string,
    context?: unknown
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
    const classPath = this.#validateClassPath(template.class);

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

    // 5. Resolve the template's zone from its path. Stamped before hydrate /
    //    initialize so hooks that rely on `this.zone` see the correct value.
    //    `ZoneApi.resolveZoneForPath` returns null when the template is
    //    itself a Zone (a zone isn't inside itself).
    const { ZoneApi } = await import('./zone');
    const zone = await ZoneApi.resolveZoneForPath(templatePath);

    // 6. Resolve the hydrator. When `hydratorClass` is omitted, no
    //    hydration step runs at all — `data` is ignored. Templates that
    //    want generic mixin-field copy must opt in.
    const hydrator = await this.#resolveHydrator(template.hydratorClass);

    // 7. Construct, stamp zone, then run the shared register / hydrate /
    //    postRegister sequence. The hydrator captures `template.data`.
    //    The construction sentinel must be flipped immediately around
    //    `new` with no intervening async — otherwise a parallel call
    //    could observe it set and bypass.
    Stuff._beginConstruction();
    let obj: T;
    try {
      obj = new ClassConstructor();
    } finally {
      Stuff._endConstruction();
    }
    if (zone) obj.zone = zone;
    // Stamp the template path onto the instance so identity-keyed
    // policies (`FromTemplate`, etc.) can match against it. The
    // proxy reads `templatePath` directly via the get-trap; we use
    // a plain property so test code can also see it.
    (obj as unknown as { templatePath?: string }).templatePath = templatePath;
    return this.#registerAndInit(
      obj,
      hydrator ? (o) => hydrator.hydrate(o, template.data ?? {}) : null,
      context
    );
  }

  /**
   * Resolve a `hydratorClass` path into a `Hydrator` instance. Returns
   * `null` when no `hydratorClass` is configured — clone() then skips the
   * hydrate step entirely. Hydrator modules follow the same
   * last-segment-as-export-name convention as backing classes.
   */
  static async #resolveHydrator(
    hydratorClassPath: string | undefined
  ): Promise<Hydrator | null> {
    if (!hydratorClassPath) return null;

    const normalized = this.#validateClassPath(hydratorClassPath);
    const modulePath = `..${normalized}.js`;
    const className = normalized.split('/').pop()!;

    let module: Record<string, unknown>;
    try {
      module = (await import(modulePath)) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Failed to import hydrator ${hydratorClassPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const Ctor = module[className] as (new () => Hydrator) | undefined;
    if (!Ctor) {
      throw new Error(
        `Hydrator ${className} not found in module ${modulePath} (available exports: ${Object.keys(module).join(', ')})`
      );
    }
    return new Ctor();
  }

  /**
   * Create and register a Stuff object via a caller-supplied factory.
   *
   * Sister of `clone()`: same register / postRegister tail, no hydration
   * step (the factory IS the construction). Use this for runtime-only
   * objects whose construction needs explicit arguments and which don't
   * round-trip through the CMS template pattern (Interactive being the
   * canonical example — `socketId`, `sessionId`, `user` all flow through
   * the closure).
   *
   * Registration happens BEFORE `postRegister()` so that recursive
   * resolution during setup (e.g. a room whose exits resolve back to
   * itself via the registry) can observe the in-flight instance. If
   * `postRegister()` throws, the object is unregistered before the error
   * propagates.
   *
   * @param factory - Function that constructs the object
   * @param context - Optional runtime context passed to `postRegister`
   * @returns The created and registered object
   *
   * @example
   * const user = await StuffApi.create(() => new User());
   */
  public static async create<T extends Stuff>(
    factory: () => T,
    context?: unknown
  ): Promise<T> {
    // Sentinel must be set immediately around the factory invocation
    // with no intervening async — see clone() for the rationale.
    Stuff._beginConstruction();
    let raw: T;
    try {
      raw = factory();
    } finally {
      Stuff._endConstruction();
    }
    return this.#registerAndInit(raw, null, context);
  }

  /**
   * Synchronous variant of `create()` for runtime objects whose
   * construction is purely synchronous — no `Hydrator.hydrate()` step
   * (the factory does the work) and no `postRegister()` (the class
   * does not compose `PostRegistrationMixin`).
   *
   * Same sentinel-flip + Proxy-wrap + register guarantees as the
   * async path, so the result is interception-mediated and tracked
   * in the registry just like any other Stuff. Use this from inside
   * sync helpers (e.g. `Exitable.addBidirectionalExit`'s `new
   * Exit(...)` calls) where awaiting `create()` would force the
   * caller — and its callers — to become async too.
   *
   * Reach for `create()` whenever async hydration or post-registration
   * matters; `createSync()` is the narrow-use sister.
   */
  public static createSync<T extends Stuff>(factory: () => T): T {
    Stuff._beginConstruction();
    let raw: T;
    try {
      raw = factory();
    } finally {
      Stuff._endConstruction();
    }
    const proxy = wrapInProxy(raw);
    this.register(proxy);
    return proxy;
  }

  /**
   * Shared register / hydrate / postRegister sequence used by both
   * `clone()` and `create()`. `hydrate` is `null` for the create path
   * (no template, no hydrator); `clone()` passes a closure that captures
   * the resolved hydrator and template data.
   *
   * Order is load-bearing: register fires first so anything resolving the
   * in-flight object by `stuffId` during hydrate or `postRegister` (e.g.,
   * a self-referencing exit hydrator) finds it. If hydrate or
   * `postRegister` throws, we unregister before propagating so a partial
   * object never lingers in the registry.
   */
  static async #registerAndInit<T extends Stuff>(
    raw: T,
    hydrate: ((obj: T) => Promise<void>) | null,
    context: unknown
  ): Promise<T> {
    // Wrap before registry insertion so every consumer that resolves
    // the object by `stuffId` (including hydration's own self-resolving
    // hooks) sees the proxy. Holding the raw in the registry would
    // bypass interception for those callers — the decision is forced.
    const proxy = wrapInProxy(raw);
    this.register(proxy);

    try {
      // Synthetic constructor frame around hydrate + postRegister so
      // anything those steps invoke has `caller = StuffApi` and
      // `target = <new instance>`. Inner `this.foo()` calls then
      // appear as self-calls, which is the natural reading of
      // construction-time self-initialization.
      await ExecutionContext.run(
        StuffApi,
        proxy,
        'constructor',
        { kind: FrameKind.Constructor },
        async () => {
          if (hydrate) await hydrate(proxy);
          if (MixinApi.isPostRegistration(proxy)) {
            await proxy.postRegister(context);
          }
        }
      );
    } catch (error) {
      this.unregister(proxy);
      throw error;
    }

    return proxy;
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

    if (this.#objectsById.has(object.stuffId)) {
      console.warn(
        `StuffApi.register(): Object ${object.stuffId} already registered`
      );
      return;
    }

    this.#objectsById.set(object.stuffId, object);
  }

  /**
   * Destroy an object.
   *
   * This is the canonical destruction entry point — `Stuff.destroy()`
   * is now `@CallSecurity(ApiOnly)` and rejects calls from outside
   * the Api layer. Lifecycle ordering matches §3.10 of the spec:
   *
   *   1. `prepareDestroy()` runs through any installed shadow chain.
   *      Shadows can wrap, observe, or replace cleanup logic.
   *   2. Privileged shadow detach removes every shadow from the host.
   *      Bypasses `@ShadowSecurity({ detach })` because host
   *      destruction is unconditional.
   *   3. `destroy()` runs (FINAL, unshadowable) — marks
   *      `_isDestroyed`, unregisters from `StuffApi`.
   *
   * @param object - The object to destroy
   */
  public static destruct(object: Stuff): void {
    if (!object) {
      throw new Error('StuffApi.destruct(): Invalid object');
    }
    // Fire-and-forget the prepare hook through the proxy so any
    // shadow chain observes it. Cast for direct invocation; the
    // proxy mediates the call regardless.
    const prep = (object as unknown as { prepareDestroy?: () => void })
      .prepareDestroy;
    if (typeof prep === 'function') {
      prep.call(object);
    }
    // Privileged detach bypasses @ShadowSecurity per spec — destruction
    // is non-negotiable.
    ShadowApi._detachAllForHost(object);
    // Now shadow-free — destroy() runs straight to the original body.
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

    this.#objectsById.delete(object.stuffId);

    // Track for debugging
    this.#destroyedObjects.set(object, {
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
    const obj = this.#objectsById.get(stuffId);

    // If object is destroyed, remove it from registry
    if (obj?.isDestroyed()) {
      this.#objectsById.delete(stuffId);
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

    for (const obj of this.#objectsById.values()) {
      if (!obj.isDestroyed()) {
        objects.push(obj);
      } else {
        // Clean up destroyed objects
        this.#objectsById.delete(obj.stuffId);
      }
    }

    return objects;
  }

  /**
   * Get count of active objects.
   */
  public static getObjectCount(): number {
    return this.#objectsById.size;
  }

  /**
   * Clear all registries (for testing).
   * WARNING: This will not properly clean up objects.
   * Only use for testing or shutdown.
   */
  public static clearAll(): void {
    this.#objectsById.clear();
  }

  /**
   * Check if a destroyed object is tracked (for debugging).
   */
  public static isTrackedAsDestroyed(object: Stuff): boolean {
    return this.#destroyedObjects.has(object);
  }

  /**
   * Get destroyed object metadata (for debugging).
   */
  public static getDestroyedMetadata(
    object: Stuff
  ): DestroyedObjectMetadata | undefined {
    return this.#destroyedObjects.get(object);
  }

  /**
   * Deliberate observation seam for unit-testing `#validateClassPath`. NOT
   * part of the public API — the leading underscore signals "test-only".
   * @internal
   */
  public static _validateClassPath(classPath: string): string {
    return this.#validateClassPath(classPath);
  }
}

decorateApiClass(StuffApi);
