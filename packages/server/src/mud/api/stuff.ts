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
import { MixinApi } from './mixin';
import { Mixins } from '../lib/mixin';
import { ProxyApi } from './proxy';
import { ExecutionContextApi, FrameKind } from './execution-context';
// SecurityApi installs its proxy interceptor in a static initializer
// at module-load time, so simply importing it (which we do for several
// other uses below) guarantees the security gate is in place before
// the first `ProxyApi.wrap` in `create` / `clone` / `createSync`.
import { SecurityApi } from './security';
import { ShadowApi } from './shadow';
import { EventApi } from './event';
import { Events } from '../lib/events';

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
   * Registry of all active runtime objects, organized by lookup attribute.
   *
   * Naming convention for future indexes:
   *   - Index field: `by<Attribute>` here.
   *   - Singleton-enforcing lookup: `findBy<Attribute>(value)` — throws
   *     on multi-instance collision.
   *   - Always-array lookup: `findAllBy<Attribute>(value)`.
   *
   * All updates flow through {@link #updateIndexes} so register /
   * unregister atomically touch every index. One audit point.
   */
  static #indexes: {
    byId: Map<string, Stuff>;
    byTemplatePath: Map<string, Set<Stuff>>;
  } = {
    byId: new Map(),
    byTemplatePath: new Map(),
  };

  /**
   * Atomically add or remove `obj` across every index. Called from
   * `register` / `unregister`. Reads `obj.stuffId` and the
   * `templatePath` field stamped by `clone()` (`undefined` when the
   * object was constructed via `create*` and never gets a template).
   */
  static #updateIndexes(obj: Stuff, action: 'add' | 'remove'): void {
    const id = obj.stuffId;
    const templatePath = (obj as unknown as { templatePath?: string })
      .templatePath;
    if (action === 'add') {
      this.#indexes.byId.set(id, obj);
      if (templatePath) {
        let bucket = this.#indexes.byTemplatePath.get(templatePath);
        if (!bucket) {
          bucket = new Set();
          this.#indexes.byTemplatePath.set(templatePath, bucket);
        }
        bucket.add(obj);
      }
    } else {
      this.#indexes.byId.delete(id);
      if (templatePath) {
        const bucket = this.#indexes.byTemplatePath.get(templatePath);
        if (bucket) {
          bucket.delete(obj);
          if (bucket.size === 0) {
            this.#indexes.byTemplatePath.delete(templatePath);
          }
        }
      }
    }
  }

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
   * @param templatePath - Path to the template (e.g., "/obj/Avatar/<playerId>")
   * @param context - Optional runtime context passed to `postRegister`
   * @returns The cloned and registered object
   *
   * @example
   * const avatar = await StuffApi.clone<Avatar>('/obj/Avatar/abc', { user });
   * const room = await StuffApi.clone('/home/bobalu/workroom');
   */
  public static async clone<T extends Stuff>(
    templatePath: string,
    context?: unknown
  ): Promise<T> {
    // 1. Load Template from domain collection. Lazy-import to avoid the
    //    Template → Persistable → Idea → Stuff → StuffApi cycle at module
    //    init time.
    const { Template } = await import('../lib/stuff/Template');
    const template = await Template.findByPath(templatePath);
    if (!template) {
      throw new Error(`Template not found: ${templatePath}`);
    }

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

    // 4b. SingletonMixin pre-flight: classes composing SingletonMixin
    //     allow at most one live instance per templatePath. Use
    //     `singleton(path)` to get-or-create; bare `clone()` on an
    //     already-instantiated singleton path throws.
    if (
      MixinApi.hasMixin(ClassConstructor, Mixins.Singleton) &&
      this.#indexes.byTemplatePath.has(templatePath)
    ) {
      throw new Error(
        `StuffApi.clone('${templatePath}'): class ${className} composes ` +
          `SingletonMixin and an instance already exists. Use ` +
          `StuffApi.singleton('${templatePath}') instead.`
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
    const prevSentinel = Stuff._beginConstruction();
    let obj: T;
    try {
      obj = new ClassConstructor();
    } finally {
      Stuff._endConstruction(prevSentinel);
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
   * Cache-or-clone for templatePath-keyed singletons.
   *
   * Returns the unique live instance for `path` if one exists in the
   * `byTemplatePath` index, otherwise routes through `clone()` to create
   * one. Works on any class — composition with `SingletonMixin` is the
   * separate enforcement layer that prevents bare `clone()` from
   * producing duplicates.
   *
   * Throws when the index has multiple instances for `path` — that
   * means the caller violated the singleton contract by also using
   * `clone()` on a non-`SingletonMixin` class. Use `clone()` and track
   * instances explicitly in that case.
   *
   * @param path - Template path (e.g., `/narnia` for the Narnia zone).
   * @param context - Forwarded to `clone()` when this resolves to a
   *   first-time clone.
   */
  public static async singleton<T extends Stuff>(
    path: string,
    context?: unknown
  ): Promise<T> {
    const bucket = this.#indexes.byTemplatePath.get(path);
    if (bucket && bucket.size > 0) {
      if (bucket.size > 1) {
        throw new Error(
          `StuffApi.singleton('${path}'): expected at most one ` +
            `instance, found ${bucket.size}. The caller mixed ` +
            `clone() and singleton() on a class that does not ` +
            `compose SingletonMixin.`
        );
      }
      return bucket.values().next().value as T;
    }
    return this.clone<T>(path, context);
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
    const prevSentinel = Stuff._beginConstruction();
    let raw: T;
    try {
      raw = factory();
    } finally {
      Stuff._endConstruction(prevSentinel);
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
   *
   * Guardrail: throws if the constructed Stuff composes
   * `PostRegistrationMixin`. The point of `createSync` is "this Stuff
   * has no async setup" — silently skipping `postRegister()` would
   * yield a half-initialised object. The throw forces such classes
   * to use the async `create()` path instead.
   */
  public static createSync<T extends Stuff>(factory: () => T): T {
    const prevSentinel = Stuff._beginConstruction();
    let raw: T;
    try {
      raw = factory();
    } finally {
      Stuff._endConstruction(prevSentinel);
    }
    const proxy = ProxyApi.wrap(raw);
    if (MixinApi.isPostRegistration(proxy)) {
      // Don't even register — fail before the half-initialised object
      // can leak into the registry.
      throw new Error(
        `StuffApi.createSync(): ${(proxy as object).constructor.name} ` +
          `composes PostRegistrationMixin and needs async setup. ` +
          `Use 'await StuffApi.create(...)' instead.`
      );
    }
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
    const proxy = ProxyApi.wrap(raw);
    this.register(proxy);

    try {
      // Synthetic constructor frame around hydrate + postRegister so
      // anything those steps invoke has `caller = StuffApi` and
      // `target = <new instance>`. Inner `this.foo()` calls then
      // appear as self-calls, which is the natural reading of
      // construction-time self-initialization.
      await ExecutionContextApi.run(
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

    // Lifecycle event. EventApi silently drops the emit during early
    // boot (e.g. when the EventRegistry itself is being created),
    // so the call is safe at every point in the registration order.
    const templatePath = (proxy as unknown as { templatePath?: string })
      .templatePath;
    EventApi.emit(Events.StuffCreated, {
      stuffId: proxy.stuffId,
      templatePath,
    });

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

    if (this.#indexes.byId.has(object.stuffId)) {
      console.warn(
        `StuffApi.register(): Object ${object.stuffId} already registered`
      );
      return;
    }

    this.#updateIndexes(object, 'add');
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
    const stuffId = object.stuffId;
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

    // Lifecycle event after the object is fully removed from the
    // registry. EventApi silently drops emits before bootstrap.
    EventApi.emit(Events.StuffDestructed, { stuffId });
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

    this.#updateIndexes(object, 'remove');

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
    const obj = this.#indexes.byId.get(stuffId);

    // If object is destroyed, drop it from every index.
    if (obj?.isDestroyed()) {
      this.#updateIndexes(obj, 'remove');
      return undefined;
    }

    return obj;
  }

  /**
   * Find the single runtime instance cloned from `templatePath`.
   *
   * Template paths identify *classes of world objects* — the same
   * notion as MQL identity. For singleton system Ideas (one template
   * per class), this is the canonical lookup.
   *
   * Returns the instance when exactly one exists, `undefined` when
   * none, throws when multiple share the path. Throwing on multi is
   * deliberate — if a caller treats the result as a singleton and
   * silently picks an arbitrary one, bugs become non-deterministic.
   * Use {@link findAllByTemplatePath} when multiple instances are
   * legitimate.
   *
   * O(1) via the `byTemplatePath` index maintained in
   * {@link #updateIndexes}.
   */
  public static findByTemplatePath<T extends Stuff = Stuff>(
    path: string
  ): T | undefined {
    const bucket = this.#indexes.byTemplatePath.get(path);
    if (!bucket || bucket.size === 0) return undefined;
    if (bucket.size > 1) {
      throw new Error(
        `StuffApi.findByTemplatePath('${path}'): expected singleton, found ${bucket.size}`
      );
    }
    return bucket.values().next().value as T;
  }

  /**
   * Find every runtime instance cloned from `templatePath`. Always
   * returns an array (possibly empty). Companion to
   * {@link findByTemplatePath} for the multi-instance case.
   */
  public static findAllByTemplatePath<T extends Stuff = Stuff>(
    path: string
  ): T[] {
    const bucket = this.#indexes.byTemplatePath.get(path);
    if (!bucket) return [];
    return [...bucket] as T[];
  }

  /**
   * Get all active objects.
   * Filters out destroyed objects.
   *
   * @returns Array of all active objects
   */
  public static getAllObjects(): Stuff[] {
    const objects: Stuff[] = [];

    for (const obj of this.#indexes.byId.values()) {
      if (!obj.isDestroyed()) {
        objects.push(obj);
      } else {
        // Clean up destroyed objects across every index.
        this.#updateIndexes(obj, 'remove');
      }
    }

    return objects;
  }

  /**
   * Get count of active objects.
   */
  public static getObjectCount(): number {
    return this.#indexes.byId.size;
  }

  /**
   * Clear all registries (for testing).
   * WARNING: This will not properly clean up objects.
   * Only use for testing or shutdown.
   */
  public static clearAll(): void {
    this.#indexes.byId.clear();
    this.#indexes.byTemplatePath.clear();
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
   * part of the public API — gated by `SecurityApi.assertTestOnly`.
   * @internal
   */
  public static _validateClassPath(classPath: string): string {
    SecurityApi.assertTestOnly('_validateClassPath');
    return this.#validateClassPath(classPath);
  }
}

SecurityApi.decorateApiClass(StuffApi);
