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

import { existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { ModuleApi } from './module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Stuff, type DestroyedObjectMetadata } from '../lib/stuff/Stuff';
import type { Hydrator } from '../lib/stuff/Hydrator';
import { MixinApi, type AnyConstructor } from './mixin';
import { Mixins } from '../lib/mixin';
import { PathTrie } from '../lib/collections/PathTrie';
import { ProxyApi } from './proxy';
import {
  ExecutionContextApi,
  FrameKind,
  OMNI_SCOPE,
} from './execution-context';
// SecurityApi installs its proxy interceptor in a static initializer
// at module-load time, so simply importing it (which we do for several
// other uses below) guarantees the security gate is in place before
// the first `ProxyApi.wrap` in `create` / `clone` / `createSync`.
import { SecurityApi } from './security';
import { ShadowApi } from './shadow';
import { EventApi } from './event';
import { Events } from '../lib/events';
import { HotReloadApi } from './hot-reload';
import { DestructError, type VetoResult } from '../lib/errors';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
// `DestructController` is reached lazily via a string module id to
// avoid a value-level static-import cycle (api/stuff → controller →
// StuffApi). `FromControllerByModuleId` consults `ModuleApi.find` at
// call time, by which point the controller's `_callSecModuleStamp`
// is established.

/**
 * Constructor type for Stuff classes. Clone instantiates backings with no
 * argument; hydration happens in a separate `Hydrator.hydrate()` step.
 * Classes may still define a raw-data constructor for direct test
 * construction — that's a class-local convenience, not a clone contract.
 */
export type StuffConstructor<T extends Stuff = Stuff> = new () => T;

/**
 * Where a class path resolved (`StuffApi.resolveClassFile`): the backing
 * file, and whether the kernel tree or a capability pack's `src/`
 * served it. The installer's rung check keys on `origin`.
 */
export interface ClassResolution {
  /** Absolute path of the backing module file. */
  file: string;
  /** `'kernel'`, or the pack namespace root + `src/` that served it. */
  origin: 'kernel' | { root: string; srcRoot: string };
}

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
    byTemplatePath: PathTrie<Stuff>;
  } = {
    byId: new Map(),
    byTemplatePath: new PathTrie<Stuff>(),
  };

  /**
   * Per-clone-tree set of templatePaths currently in flight, carried in
   * AsyncLocalStorage. Catches circular template dependencies — e.g. a
   * hydrator template naming itself (or another hydrator) as
   * `hydratorClass`. Without detection the recursion would stack-
   * overflow; with detection we throw a clear error before that happens.
   *
   * Crucially, the set is scoped to ONE async clone tree, not module-
   * global. A genuine cycle is the same path reappearing within a single
   * `clone()`'s own recursive descent (hydrate/postRegister re-entering
   * `clone()`). Two INDEPENDENT concurrent clones of the same shared
   * template — e.g. two avatars each cloning `/platform/idea/CommsUpdate` for
   * their loadout, whose `await` points interleave — must NOT see each
   * other's in-flight paths. A single module-global `Set` conflated
   * "concurrent" with "circular" and spuriously threw on the second
   * caller (the path chain in the error would even span two unrelated
   * Avatar trees). ALS gives each top-level clone its own store; nested
   * clones inherit the parent's via `getStore()`.
   *
   * Invariant: every `clone()` adds its `templatePath` to the active
   * store on entry and removes it in a finally block, regardless of
   * success / failure.
   */
  static #cloneStackALS = new AsyncLocalStorage<Set<string>>();

  /**
   * In-flight `singleton()` resolutions, keyed by path. Coalesces
   * concurrent first-resolution of the same singleton path onto a single
   * shared clone promise, so two concurrent `singleton(path)` calls share
   * ONE instance rather than each falling through to `clone(path)` and
   * racing to create two. Cleared when the clone settles. The classic
   * lazy-singleton race (e.g. two simultaneous logins both lazily
   * creating the lounge Warren).
   */
  static #pendingSingletons: Map<string, Promise<Stuff>> = new Map();

  /**
   * Atomically add or remove `obj` across every index. Called from
   * `register` / `unregister`. Reads `obj.stuffId` and the
   * `templatePath` field stamped by `clone()` (`undefined` when the
   * object was constructed via `create*` and never gets a template).
   */
  static #updateIndexes(obj: Stuff, action: 'add' | 'remove'): void {
    const id = obj.stuffId;
    // The index keys on IDENTITY (the raw stamped slot) falling back to
    // the template path (D17): a minted instance
    // (`/platform/agent/Avatar/<pid>`) stays addressable by the path it
    // always had while `getTemplatePath()` resolves to the content ROW.
    // Deliberately the raw slot, never the overridable method — a
    // sandbox vessel projects another identity and must not index there.
    const key = Stuff._identityStampOf(obj) ?? obj.getTemplatePath();
    if (action === 'add') {
      this.#indexes.byId.set(id, obj);
      if (key) {
        this.#indexes.byTemplatePath.insert(key, obj);
      }
    } else {
      this.#indexes.byId.delete(id);
      if (key) {
        this.#indexes.byTemplatePath.remove(key, obj);
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
    return SecurityApi.uuid();
  }

  /**
   * Validate and normalize a class path.
   * Ensures path is safe and doesn't attempt directory traversal.
   *
   * Hard-private: class-path validation gates dynamic-import targets, so the
   * function must be invocable only from within this class — wrapping
   * `clone()` with a Proxy must not be able to redirect or short-circuit it.
   *
   * @param classPath - Class path relative to /mud/ (e.g., "/platform/agent/Avatar")
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

    // No namespace allowlist. Whether a path is a legitimate class is
    // decided by RESOLUTION (`resolveClassFile`: a registered pack root
    // resolves into that pack's `src/`, anything else into the kernel
    // tree) and by the build-time gate (`lint:instanceable` — nothing
    // instances `/lib/`, every `class:` resolves). A runtime prefix
    // list would be a third copy of the same fact, kept by hand.
    return classPath;
  }

  /**
   * Resolve a class path to the file that backs it, and say where it
   * came from — the ONE place a class-namespace path becomes a file.
   *
   * A path whose namespace root a capability pack has registered
   * (`/system/arcana/thing/Wand`) resolves into that pack's `src/`
   * (`<srcRoot>/thing/Wand.ts`), longest root first; it is an error,
   * naming the pack, when the file is missing — a pack namespace never
   * falls back to the kernel tree. Every other path resolves from the
   * kernel tree exactly as before: `.ts` (dev/test) when present, `.js`
   * (built artifacts) next, and finally the `.ts` path unconditionally
   * so HMR-registered paths without a disk-resident source still match.
   *
   * Public because three things share it: the clone pipeline and the
   * brain resolver here, `HotReloadApi`-facing verbs (`reload
   * /system/arcana/thing/Wand`), and the installer's rung check (which records
   * the origin of every class a pack names).
   */
  public static resolveClassFile(classPath: string): ClassResolution {
    const validated = this.#validateClassPath(classPath);
    // Longest matching ROOT wins (the table is sorted by dir, which is
    // the URL→id direction's key): two packs may nest their roots —
    // /world/terminus (terminus) under /world/terminus/hinkley-hills
    // (hinkley-hills) — and the deeper pack owns the deeper namespace.
    let best: { dir: string; root: string } | null = null;
    for (const { dir, root } of ModuleApi.packSources()) {
      if (validated === root || validated.startsWith(root + '/')) {
        if (!best || root.length > best.root.length) best = { dir, root };
      }
    }
    if (best) {
      const { dir, root } = best;
      const file = dir + validated.slice(root.length + 1) + '.ts';
      if (!existsSync(file)) {
        throw new Error(
          `StuffApi.resolveClassFile('${classPath}'): the namespace ` +
            `'${root}' is a capability pack's, and its src/ has no ` +
            `'${validated.slice(root.length + 1)}.ts' (looked in ${dir})`
        );
      }
      return { file, origin: { root, srcRoot: dir } };
    }
    const moduleDir = new URL('..', import.meta.url); // <srcRoot>/mud/
    for (const ext of ['ts', 'js']) {
      const candidate = fileURLToPath(
        new URL(`.${validated}.${ext}`, moduleDir)
      );
      if (existsSync(candidate)) return { file: candidate, origin: 'kernel' };
    }
    return {
      file: fileURLToPath(new URL(`.${validated}.ts`, moduleDir)),
      origin: 'kernel',
    };
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
   *      `'/platform/idea/persistence/PersistentHydrator'`.
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
   * @param templatePath - Path to the template (e.g., "/platform/agent/Avatar/<playerId>")
   * @param context - Optional runtime context passed to `postRegister`
   * @returns The cloned and registered object
   *
   * @example
   * const avatar = await StuffApi.clone<Avatar>('/platform/agent/Avatar/abc', { user });
   * const room = await StuffApi.clone('/home/bobalu/workroom');
   */
  /**
   * Options for {@link clone} — the minted-identity channel (the
   * identity doctrine, ref-shapes.md § Identity, lineage, and backing):
   *
   * - `dataOverlay` — per-instance data merged over the template's
   *   authored `data` at hydration (`{...template.data, ...overlay}`).
   *   The channel that lets a caller clone a shared seed with
   *   instance-specific fields instead of forking a throwaway
   *   per-instance template row (the retired Avatar/guest pattern).
   * - `asIdentityPath` — the minted instance identity stamped on the
   *   clone's identity slot (D17). The clone's `templatePath` is ALWAYS
   *   the source row's path — it resolves to a row by construction —
   *   while the registry index and zone resolution key on the identity,
   *   so lookup behavior is byte-identical for every existing caller.
   */
  /**
   * Run `fn` outside any in-flight clone tree. The cycle guard's store
   * propagates through every async continuation spawned inside a clone
   * — including a timer an NPC's `postRegister` arms — so work that is
   * a fresh ROOT by definition (a scheduled callback) must shed it, or
   * two later, unrelated forced commands share one "in flight" set and
   * the second trips as a false cycle. `ScheduleApi`'s root wrapper is
   * the caller.
   */
  public static outsideCloneTree<T>(fn: () => T): T {
    return this.#cloneStackALS.exit(fn);
  }

  public static async clone<T extends Stuff>(
    templatePath: string,
    context?: unknown,
    opts?: { dataOverlay?: Record<string, unknown>; asIdentityPath?: string }
  ): Promise<T> {
    // Per-clone-tree cycle guard (see `#cloneStackALS`). Catches a
    // template whose `hydratorClass` resolves (transitively) back to
    // itself before the recursion stack-overflows. Normal clones aren't
    // recursive — only the hydrator-resolution recursion can hit this.
    // The in-flight set is scoped to this async clone tree, so concurrent
    // independent clones of the same path don't false-trip it.
    const existing = this.#cloneStackALS.getStore();
    const stack = existing ?? new Set<string>();

    if (stack.has(templatePath)) {
      throw new Error(
        `StuffApi.clone('${templatePath}'): circular template ` +
          `dependency — already in flight (path chain: ${[
            ...stack,
            templatePath,
          ].join(' → ')})`
      );
    }

    const run = async (): Promise<T> => {
      stack.add(templatePath);
      try {
        return await this.#cloneInner<T>(templatePath, context, opts);
      } finally {
        stack.delete(templatePath);
      }
    };

    // A top-level clone establishes the tree's store; nested clones
    // (triggered during hydrate / postRegister) inherit it via getStore().
    return existing ? run() : this.#cloneStackALS.run(stack, run);
  }

  static async #cloneInner<T extends Stuff>(
    templatePath: string,
    context?: unknown,
    opts?: { dataOverlay?: Record<string, unknown>; asIdentityPath?: string }
  ): Promise<T> {
    // 1. Load Template from domain collection. Lazy-import to avoid the
    //    Template module-load cycle at init time.
    const { Template } = await import('../lib/stuff/Template');
    const template = await Template.findByPath(templatePath);
    if (!template) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    // 2. Validate and resolve class path
    const classPath = this.#validateClassPath(template.class);

    // 3. Resolve the class. HotReloadApi is consulted first as an
    //    override: if a reload has registered a current blueprint for
    //    this path, that is what we instantiate. Otherwise fall back
    //    to a bare dynamic import (Node ESM cache; matches the class
    //    identity any static import of the same module would see).
    //    `unload(absPath)` poisons the path: subsequent clones throw.
    const className = classPath.split('/').pop()!; // "Avatar" from "/platform/agent/Avatar"
    const absoluteClassPath = StuffApi.resolveClassFile(classPath).file;
    if (HotReloadApi.isFrozen(absoluteClassPath)) {
      throw new Error(
        `StuffApi.clone('${templatePath}'): no blueprint at '${absoluteClassPath}' — was unloaded via HotReloadApi.unload`
      );
    }

    let ClassConstructor: StuffConstructor<T> | undefined;
    const reloaded = HotReloadApi.getCurrentExport(absoluteClassPath, className);
    if (reloaded) {
      ClassConstructor = reloaded as StuffConstructor<T>;
    }

    if (!ClassConstructor) {
      // Cold path: bare dynamic import of the resolved file by absolute
      // file URL — the shape `HotReloadApi.#doReload` already uses, and
      // the one that reaches a pack's src/ as readily as the kernel's.
      // Node's cache keys on the URL, so this is the same module
      // instance any static import of the file sees.
      const modulePath = pathToFileURL(absoluteClassPath).href;
      let module: Record<string, unknown>;
      try {
        module = (await import(modulePath)) as Record<string, unknown>;
      } catch (error) {
        throw new Error(
          `Failed to import class ${template.class}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      // Prefer the named export matching the file basename, falling
      // back to `module.default` for files that follow the
      // template-backing-class default-export convention (every
      // concrete Stuff subclass that backs a Template).
      ClassConstructor =
        (module[className] ?? module.default) as StuffConstructor<T> | undefined;
      if (!ClassConstructor) {
        throw new Error(
          `Class ${className} not found in module ${modulePath} (available exports: ${Object.keys(module).join(', ')})`
        );
      }
    }

    // 4b. SingletonMixin pre-flight: classes composing SingletonMixin
    //     allow at most one live instance per templatePath. Use
    //     `singleton(path)` to get-or-create; bare `clone()` on an
    //     already-instantiated singleton path throws.
    // The clone's identity path — the minted `asIdentityPath` when the
    // caller supplies one (the D17 identity channel), else the source
    // template's own path. The singleton guard and zone resolution key
    // on it; the stamp below splits the two axes.
    const identityPath = opts?.asIdentityPath ?? templatePath;
    if (
      MixinApi.hasMixin(ClassConstructor, Mixins.Singleton) &&
      this.#indexes.byTemplatePath.exact(identityPath).length > 0
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
    //    Lazy-loaded to break the StuffApi ↔ ZoneApi cycle (ZoneApi
    //    statically imports StuffApi for singleton + class-loading).
    const { ZoneApi } = await import('./zone');
    const zone = await ZoneApi.resolveZoneForPath(identityPath);

    // 6. Resolve the hydrator. When `hydratorClass` is omitted, no
    //    hydration step runs at all — `data` is ignored. Otherwise
    //    `singleton(path)` returns the cached hydrator instance if
    //    one is registered, or lazily clones the first time a
    //    backing needs it. Hydrators are stateless by contract
    //    (`Hydrator.ts` documents this) — reusing one instance
    //    across many `hydrate` calls is correct, and avoids a
    //    per-clone Template.findByPath round-trip. HMR-aware via
    //    the same clone-override path as the backing class.
    const hydrator: (Hydrator & Stuff) | null = template.hydratorClass
      ? await this.singleton<Hydrator & Stuff>(template.hydratorClass)
      : null;

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
    // Seed zone via the caller-allowlisted stamp seam (mirrors the
    // templatePath stamp below). Going through `obj.setZone(zone)`
    // would fail the `FromSpatialZone` gate at runtime — StuffApi
    // is not a SpatialZone subclass. The seam writes the `#zone`
    // slot directly; only `mud/api/stuff.ts` and test seams may
    // call it.
    if (zone) Stuff._stampZone(obj, zone);
    // Stamp BOTH axes BEFORE register, so #updateIndexes sees them
    // and adds the byTemplatePath entry (keyed identity ?? template)
    // as part of the single register pass. `templatePath` is ALWAYS
    // the source row's path (D17 — it resolves to a row by
    // construction); a minted instance identity rides the identity
    // slot. The seams are caller-gated: only this file
    // (`mud/api/stuff.ts`) and the test-setup helper may invoke
    // them; any other caller throws.
    Stuff._stampTemplatePath(obj, templatePath);
    if (opts?.asIdentityPath) {
      Stuff._stampIdentityPath(obj, opts.asIdentityPath);
    }
    const data = opts?.dataOverlay
      ? { ...(template.data ?? {}), ...opts.dataOverlay }
      : (template.data ?? {});
    return this.#registerAndInit(
      obj,
      hydrator ? (o) => hydrator.hydrate(o, data) : null,
      context
    );
  }

  /**
   * Resolve the backing class constructor for a template path. Loads the
   * template doc, reads its `class`, and resolves it via
   * `loadClassByPath`. Throws when no template exists at `ref`.
   *
   * Lets a caller dispatch on a target's *class* (its mixins, its
   * inheritance) without instantiating it — e.g. {@link singletonOrClone}
   * deciding clone-vs-singleton, or a spawn applier checking
   * `cls.prototype instanceof Warren`.
   */
  public static async classForRef(ref: string): Promise<AnyConstructor> {
    const { Template } = await import('../lib/stuff/Template');
    const template = await Template.findByPath(ref);
    if (!template) {
      throw new Error(`StuffApi.classForRef('${ref}'): no template at path`);
    }
    return (await this.loadClassByPath(template.class)) as AnyConstructor;
  }

  /**
   * Instantiate a template by the only question that matters at the
   * generic layer: should it be a shared singleton or a fresh instance?
   * If the class composes `SingletonMixin` → `singleton(path)` (reuse
   * the one instance, clone-if-absent); otherwise → `clone(path)` (a
   * fresh instance). Any *domain* semantics on top (a Warren landing in
   * its host, a recall) belong in the caller, not here.
   */
  public static async singletonOrClone<T extends Stuff>(
    path: string,
    context?: unknown
  ): Promise<T> {
    const cls = await this.classForRef(path);
    return MixinApi.hasMixin(cls, Mixins.Singleton)
      ? this.singleton<T>(path, context)
      : this.clone<T>(path, context);
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
    const bucket = this.#indexes.byTemplatePath.exact(path);
    if (bucket.length > 0) {
      if (bucket.length > 1) {
        throw new Error(
          `StuffApi.singleton('${path}'): expected at most one ` +
            `instance, found ${bucket.length}. The caller mixed ` +
            `clone() and singleton() on a class that does not ` +
            `compose SingletonMixin.`
        );
      }
      return bucket[0] as T;
    }
    // Coalesce concurrent first-resolution onto one shared clone (see
    // #pendingSingletons) so the second caller doesn't trip the cycle
    // guard in clone().
    const pending = this.#pendingSingletons.get(path);
    if (pending) return pending as Promise<T>;
    const p = this.clone<T>(path, context)
      .then(async (inst) => {
        // A persistable SINGLETON's establishing context is this call:
        // one instance per template path, so its record is keyed by
        // the scope alone (the same keyless key a nested `{ ref }`
        // restore derives). Restore when a record exists, else lay down
        // its born-with `props:` and capture the first record — a
        // venue room reached by an exit or booted by a pack, a Stock
        // counter placed by a room's props. Multi-instance hosts
        // (a dorm unit, a lot's yard, an Avatar) never come through
        // here: their provisioner clones and keys them itself.
        if (MixinApi.isPersistable(inst) && inst.getPersistenceKey() === null) {
          const { PersistableApi } = await import('./persistable');
          const scope = inst.getTemplatePath() ?? path;
          // The record store may be absent (a test with no persistence
          // wired, a boot before the connection). The world still has
          // to stand: no readable record → seed, and a failed write is a
          // warning, never a bare room.
          const warn = (what: string, err: unknown): void =>
            console.warn(
              `StuffApi.singleton('${path}'): ${what} failed — ` +
                (err instanceof Error ? err.message : String(err)),
            );
          let hasRecord = false;
          try {
            hasRecord = await PersistableApi.hasRecord(scope);
          } catch (err) {
            warn('record lookup', err);
          }
          if (hasRecord) {
            try {
              await PersistableApi.materialize(inst);
            } catch (err) {
              warn('restore', err);
            }
          } else {
            await inst.seedBornWith();
            try {
              await PersistableApi.capture(inst);
            } catch (err) {
              warn('first capture', err);
            }
          }
        }
        return inst;
      })
      .finally(() => {
        this.#pendingSingletons.delete(path);
      });
    this.#pendingSingletons.set(path, p as Promise<Stuff>);
    return p;
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
   * resolution during setup (e.g. a location whose exits resolve back to
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
    this.#stampScopeFromContext(raw);
    const proxy = ProxyApi.wrap(
      raw,
      MixinApi.getWeakRefFields(raw.constructor as AnyConstructor)
    );
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
   * Synchronous get-or-create for a path-keyed, **stateless** Stuff
   * singleton — the home for relocated Api logic (the
   * `/platform/idea/api/<feature>` logic singletons of the surface-architecture
   * refactor).
   *
   * Returns the unique live instance for `path` if one is already in
   * the `byTemplatePath` index; otherwise builds one via `createSync`,
   * stamps `path`, inserts it into `byTemplatePath`, and returns it.
   * Entirely synchronous — no template doc, no hydration, no
   * `postRegister` — so an Api method can reach its logic without
   * becoming `async`. That is exactly what a stateless, data-less
   * logic singleton allows (see {@link createSync}).
   *
   * `factory` MUST resolve the current hot-reloaded blueprint, not a
   * bare `new`, so that `dest`→next-call picks up an edit:
   *
   * ```ts
   * StuffApi.singletonSync('/platform/idea/api/foo', () =>
   *   new (HotReloadApi.getCurrentExport(FILE, 'FooLogic') ?? FooLogic)());
   * ```
   *
   * Reload is `dest`: `StuffApi.destruct` unregisters the singleton (it
   * leaves `byTemplatePath` empty for `path`), and the next call
   * re-creates through `factory`, which resolves the fresh class. The
   * stuffId is ephemeral (a new one per recreate); the path is the
   * stable handle.
   *
   * @param path - Address handle, by convention `/platform/idea/api/<feature>`.
   * @param factory - Blueprint-resolving constructor closure.
   * @throws if the index already holds more than one instance for
   *   `path` (a singleton-contract violation), mirroring
   *   {@link singleton}.
   * @internal
   */
  public static singletonSync<T extends Stuff>(
    path: string,
    factory: () => T
  ): T {
    const bucket = this.#indexes.byTemplatePath.exact(path);
    if (bucket.length > 0) {
      if (bucket.length > 1) {
        throw new Error(
          `StuffApi.singletonSync('${path}'): expected at most one ` +
            `instance, found ${bucket.length}.`
        );
      }
      return bucket[0] as T;
    }
    // createSync registers into byId only (the factory has not stamped
    // a path). Stamp the path on the raw slot, then insert into
    // byTemplatePath so the instance is MQL-addressable and a `dest`
    // empties the bucket for re-creation.
    const raw = this.createSync(factory);
    Stuff._stampTemplatePath(raw, path);
    this._reindexTemplatePath(raw, null, path);
    return raw;
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
    // Circle-scope induction: a newborn minted under circle context is
    // stamped with the minting context's scope; field and omni contexts
    // leave the slot null at zero cost. This single line beside the
    // register chokepoint is what makes the sandbox boundary hold for
    // every clone()/create() path.
    this.#stampScopeFromContext(raw);
    // Wrap before registry insertion so every consumer that resolves
    // the object by `stuffId` (including hydration's own self-resolving
    // hooks) sees the proxy. Holding the raw in the registry would
    // bypass interception for those callers — the decision is forced.
    const proxy = ProxyApi.wrap(
      raw,
      MixinApi.getWeakRefFields(raw.constructor as AnyConstructor)
    );
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
    const templatePath = proxy.getTemplatePath();
    EventApi.emit(Events.StuffCreated, {
      stuffId: proxy.stuffId,
      templatePath,
    });

    return proxy;
  }

  /**
   * Stamp a newborn's circle scope from the minting context's ambient
   * scope. A real circle scope (a parcel path) stamps; `null` (field)
   * and `'*'` (omni/system) leave the slot null — system-minted objects
   * are field objects. One ALS read per mint; nothing else.
   */
  static #stampScopeFromContext(raw: Stuff): void {
    const scope = ExecutionContextApi.getCircleScope();
    if (scope !== null && scope !== OMNI_SCOPE) {
      Stuff._stampCircleScope(raw, scope);
    }
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

    MixinApi.assertComposable(
      object.constructor as Parameters<typeof MixinApi.assertComposable>[0]
    );

    this.#updateIndexes(object, 'add');
  }

  /**
   * Destroy an object.
   *
   * This is the canonical destruction entry point — `Stuff.destroy()`
   * is `@CallSecurity(ApiOnly)` and rejects calls from outside the Api
   * layer. Lifecycle ordering:
   *
   *   1. `canDestruct()` Witness fires on the target. A
   *      `{ ok: false, reason }` result throws `DestructError` and
   *      aborts the rest of the chain. (Force-bypass via
   *      `forceDestruct()` invokes the witness identically but skips
   *      the assertion — observers still see the call.)
   *   2. `onDestruct()` Witness fires on the target. Cleanup hook,
   *      runs while the target is still live (mirror of how the
   *      retired `prepareDestroy()` ran before `destroy()`).
   *   3. Privileged shadow detach removes every shadow from the host.
   *      Bypasses `@ShadowSecurity({ detach })` because host
   *      destruction is unconditional.
   *   4. `destroy()` runs (FINAL, unshadowable) — marks
   *      `_isDestroyed`, unregisters from `StuffApi`.
   *   5. `Events.StuffDestructed` fires.
   *
   * @param object - The object to destroy
   */
  public static destruct(object: Stuff): void {
    StuffApi.#destructCore(object, false);
  }

  /**
   * Force-bypass variant of `destruct()` — invokes the `canDestruct`
   * witness identically (so audit hooks / observers fire as usual)
   * but ignores the veto result. The `onDestruct` cleanup hook still
   * runs.
   *
   * Gated to `DestructController` — the **narrow-entry pattern**. Only
   * `DestructController` can reach this entry point; the controller does
   * the `AccessApi.can(giver, 'force-destruct', target)` check before
   * invoking. Combined, the mutation has exactly one legitimate entry
   * path AND that path enforces who is authorized.
   *
   * The controller is cloned per execution (`destruct -f`), and
   * `FromModule` matches it by its class module id (code provenance), so
   * the cloned instance is admitted directly. Direct calls from any other
   * module throw `SecurityError`.
   */
  @CallSecurity(
    SecurityPolicies.FromModule('/platform/idea/cmd/author/DestructController')
  )
  public static forceDestruct(object: Stuff): void {
    StuffApi.#destructCore(object, true);
  }

  /**
   * Shared body for `destruct` / `forceDestruct`. Force only changes
   * whether a `canDestruct` veto throws; the witness itself fires
   * uniformly across both paths so any side effects the target
   * attaches (audit hooks, observers) see every call.
   *
   * Slot order (locked by the ref-shapes design):
   *   1. `canDestruct` witness (force ignores veto).
   *   2. `onDestruct` user witness — subclass-customizable.
   *   2.5 DECLARED REFERENCE CLEANUP — the `lifetime` axis of
   *      `fieldMeta`: `symmetric` back-ref clears, then `owned`
   *      cascades. After (2) so a hand-written `onDestruct` still sees
   *      its children; before (3) so substrate invariants run last.
   *   3. Mixin-registry cleanup walk: each mixin's static
   *      `cleanupOnDestruct(proxy)`, most-derived-first.
   *      Substrate-invariant cleanup; subclass overrides cannot
   *      bypass (statics aren't on the prototype chain).
   *   4. `ShadowApi._detachAllForHost`.
   *   5. `Stuff.destroy()` — terminal mark + unregister.
   *
   * Cleanup-handler exception policy: log-and-continue per mixin. A
   * thrown handler is logged with mixin name + stuff id; the loop
   * continues; `destroy()` always runs. The caller of
   * `StuffApi.destruct` never sees cleanup-handler failures.
   */
  /**
   * Slot 2.5 — run the declared `lifetime` rules for a destructing
   * holder.
   *
   * **All `symmetric` clears run before all `owned` cascades**, and that
   * ordering is specified rather than incidental: an owned cascade
   * destroys its targets, so a back-ref clear scheduled after it would
   * be operating on destroyed objects.
   *
   * Deliberately forgiving, because it has to coexist with the
   * hand-written cleanup it is replacing:
   *
   *   - a null / empty / absent slot is a no-op;
   *   - a target that is already destroyed is skipped;
   *   - the holder's own slot is cleared afterwards;
   *   - exceptions are logged per field and the loop continues, exactly
   *     as the slot-3 mixin walk does — a throwing cleanup must never
   *     prevent `destroy()`.
   *
   * ⚠ That forgiveness cuts both ways, and it is the single most
   * important thing to know when converting a site. It makes an
   * UN-migrated site inert (2.5 finds the slot already cleared by the
   * hand-written body and no-ops) — but it makes a HALF-migrated one
   * silently inert too. `Boundary.onDestruct` collects its anchors,
   * calls `detach()` (which nulls both slots), then destructs them:
   * declare `anchorA`/`anchorB` as `owned` while leaving that body
   * alone and 2.5 sees null slots, no-ops, and **the anchors are never
   * destructed at all**. No error. Converting a site means deleting
   * BOTH the cascade and the slot-clearing from the hand-written body.
   *
   * Direction matters for migration order, too. A site written in
   * `onDestruct` (slot 2) runs BEFORE this and may be converted in two
   * steps; a site written in `cleanupOnDestruct` (slot 3) runs AFTER,
   * so declaring it without removing the handler would have 2.5 destruct
   * first and slot 3 then walk destroyed objects. Those convert
   * atomically.
   */
  static #applyDeclaredRefCleanup(object: Stuff): void {
    const meta = MixinApi.getAllFieldMeta(
      object.constructor as AnyConstructor
    );
    const holder = object as unknown as Record<string, unknown>;

    const targetsOf = (value: unknown): Stuff[] => {
      if (value === null || value === undefined) return [];
      // Snapshot, never the live array: a target's own cleanup may
      // splice itself out of this very collection mid-cascade.
      if (Array.isArray(value)) return [...value] as Stuff[];
      if (value instanceof Set) return [...value] as Stuff[];
      if (value instanceof Map) return [...value.values()] as Stuff[];
      return [value as Stuff];
    };
    /** Empty the holder's own slot, preserving its container shape. */
    const clearSlot = (field: string): void => {
      const slot = holder[field];
      if (slot instanceof Set || slot instanceof Map) slot.clear();
      else if (Array.isArray(slot)) slot.length = 0;
      else holder[field] = null;
    };
    const isLive = (t: unknown): t is Stuff => {
      const s = t as { isDestroyed?: () => boolean } | null;
      return (
        s !== null &&
        typeof s === 'object' &&
        typeof s.isDestroyed === 'function' &&
        !s.isDestroyed()
      );
    };

    const entries = Object.entries(meta).filter(
      ([, e]) => e.ref === 'instance' && e.lifetime
    );

    // Pass 1 — symmetric back-ref clears.
    for (const [field, entry] of entries) {
      if (entry.lifetime !== 'symmetric' || !entry.inverse) continue;
      try {
        const inverse = entry.inverse;
        for (const target of targetsOf(holder[field]).filter(isLive)) {
          const other = target as unknown as Record<string, unknown>;
          const back = other[inverse];
          if (back instanceof Set) back.delete(object);
          else if (back instanceof Map) {
            for (const [k, v] of back) if (v === object) back.delete(k);
          } else if (Array.isArray(back)) {
            const i = back.indexOf(object);
            if (i >= 0) back.splice(i, 1);
          } else if (back === object) {
            other[inverse] = null;
          }
        }
        clearSlot(field);
      } catch (err) {
        console.error(
          `StuffApi: declared symmetric cleanup for '${field}' on ` +
            `${object.stuffId} threw`,
          err
        );
      }
    }

    // Pass 2 — owned cascades.
    for (const [field, entry] of entries) {
      if (entry.lifetime !== 'owned') continue;
      try {
        for (const target of targetsOf(holder[field]).filter(isLive)) {
          StuffApi.destruct(target);
        }
        clearSlot(field);
      } catch (err) {
        console.error(
          `StuffApi: declared owned cleanup for '${field}' on ` +
            `${object.stuffId} threw`,
          err
        );
      }
    }
  }

  static #destructCore(object: Stuff, force: boolean): void {
    if (!object) {
      throw new Error('StuffApi.destruct(): Invalid object');
    }
    const stuffId = object.stuffId;

    const veto = callDestructHook<VetoResult>(object, 'canDestruct');
    if (!force) assertDestructVetoOk(veto, 'canDestruct');

    // Cleanup hook — runs while the target is still live so it can
    // touch `this`. After `destroy()` marks `_isDestroyed`, every
    // proxy method call throws `DestroyedObjectError`.
    callDestructHook(object, 'onDestruct');

    // Slot 2.5 — the declared reference cleanup.
    StuffApi.#applyDeclaredRefCleanup(object);

    // Framework cleanup walk. Mixin authors register a static
    // `cleanupOnDestruct(stuff)` on the mixin class for invariant-
    // critical work that must not be skippable by a subclass override
    // or shadow. Discovery is structural: own static + function shape.
    // queryMixins walks most-derived-first naturally.
    const mixinChain = MixinApi.queryMixins(
      object.constructor as { prototype: unknown } &
        ((...args: unknown[]) => unknown)
    );
    for (const mixinCtor of mixinChain) {
      if (
        !Object.prototype.hasOwnProperty.call(mixinCtor, 'cleanupOnDestruct')
      ) {
        continue;
      }
      const handler = (mixinCtor as { cleanupOnDestruct?: unknown })
        .cleanupOnDestruct;
      if (typeof handler !== 'function') continue;
      try {
        (handler as (stuff: Stuff) => void).call(mixinCtor, object);
      } catch (err) {
        const mixinName =
          (mixinCtor as { _mixinName?: string })._mixinName ?? '<unknown>';
        console.error(
          `StuffApi.destruct: ${mixinName}.cleanupOnDestruct threw for ` +
            `stuff ${stuffId}`,
          err
        );
        // continue — substrate cleanup is best-effort bookkeeping;
        // partial state recovers via R2.3 self-heal + GC sweep.
      }
    }

    // Privileged detach bypasses @ShadowSecurity per spec —
    // destruction is non-negotiable.
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
    const bucket = this.#indexes.byTemplatePath.exact(path);
    if (bucket.length === 0) return undefined;
    if (bucket.length > 1) {
      throw new Error(
        `StuffApi.findByTemplatePath('${path}'): expected singleton, found ${bucket.length}`
      );
    }
    return bucket[0] as T;
  }

  /**
   * Find every runtime instance cloned from `templatePath`. Always
   * returns an array (possibly empty). Companion to
   * {@link findByTemplatePath} for the multi-instance case.
   */
  public static findAllByTemplatePath<T extends Stuff = Stuff>(
    path: string
  ): T[] {
    return this.#indexes.byTemplatePath.exact(path) as T[];
  }

  /**
   * Index re-key for `Stuff.setTemplatePath`. Removes the old
   * binding from `byTemplatePath` and inserts the new one. **Only**
   * called from `Stuff.setTemplatePath` (which carries the
   * ApiOnly + Final + Unshadowable lock that authorizes stamping);
   * not for general use.
   *
   * `oldPath` may be null (first-time stamp); `newPath` is always
   * a non-empty string at the call site.
   *
   * @internal
   */
  public static _reindexTemplatePath(
    obj: Stuff,
    oldPath: string | null,
    newPath: string
  ): void {
    // A minted instance identity dominates the index key (D17):
    // re-stamping the template lineage of an identity-stamped object
    // changes nothing about where it is filed.
    if (Stuff._identityStampOf(obj)) return;
    if (oldPath) {
      this.#indexes.byTemplatePath.remove(oldPath, obj);
    }
    this.#indexes.byTemplatePath.insert(newPath, obj);
  }

  /**
   * Find every runtime instance whose `templatePath` matches `pattern`
   * under {@link PathPatternApi} glob syntax (`*`, `**`, `?`).
   *
   * Backs the MQL path-glob seed (`/platform/agent/Avatar/*`). Stuff without a
   * template path are not in the index and never match. Result order
   * is unspecified — callers that need stable ordering must sort.
   */
  public static findByPathGlob<T extends Stuff = Stuff>(pattern: string): T[] {
    return this.#indexes.byTemplatePath.glob(pattern) as T[];
  }

  /**
   * Sync lookup for live templated Stuff instances (those that carry
   * a `path` field) by exact `path`. Backs the MQL path-atom
   * fallback: when `findByPathGlob` returns no clones, the resolver
   * falls back to this so a non-glob path can address the template
   * record itself (e.g. `destruct /platform/agent/Avatar/foo` to remove the
   * template doc when no live clone exists).
   *
   * Walks the registry and structurally matches via `obj.path` —
   * avoids importing `Template` here, which would close the
   * `StuffApi → Template → Stuff → StuffApi` cycle. Templates are in
   * the registry by virtue of `Template._materialize` going through
   * `StuffApi.create`. O(N) walk; called only on path-atom miss.
   */
  public static findTemplatesByPath<T extends Stuff = Stuff>(path: string): T[] {
    const out: T[] = [];
    for (const obj of this.#indexes.byId.values()) {
      if (obj.isDestroyed()) continue;
      const candidatePath = (obj as unknown as { path?: unknown }).path;
      if (typeof candidatePath !== 'string') continue;
      if (candidatePath !== path) continue;
      out.push(obj as T);
    }
    return out;
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
      // Check liveness on the RAW target: enumerating the registry is not
      // "using" an object, so the residency sweep's isDestroyed filter must
      // not count as a dispatch-touch (which would refresh every object's
      // recency on every sweep and defeat idle detection).
      if (!ProxyApi.unwrap(obj).isDestroyed()) {
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
   * Copy a single named field's value from `src` to `dst` through
   * the inter-stuff method surface.
   *
   * Prefers `src.getX()` / `dst.setX(value)` (`X = name` with the
   * first letter uppercased) — the canonical inter-stuff contract
   * (per CLAUDE.md). Falls back to direct property access on either
   * side when the accessor pair isn't defined, which covers the
   * common case of bare persisted scalars that don't expose a custom
   * getter / setter (a `tarnished: boolean` field on Coin).
   *
   * Used by `GlobbableApi.split` to clone the glob-identity field
   * set onto the split-off; general enough to live on the Stuff
   * registry rather than buried in glob.
   *
   * Doesn't validate the destination Stuff actually owns the field —
   * the caller is responsible for picking field names that make
   * sense for `dst`'s class. Mismatched casing or typos write a
   * dynamic property that nobody reads, silently. Treat as a
   * framework primitive: the callers are short, well-typed lists of
   * known fields (e.g., `static globIdentityFields`).
   */
  public static copyField(src: Stuff, dst: Stuff, name: string): void {
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    const getter = (src as unknown as Record<string, unknown>)[`get${cap}`];
    const value =
      typeof getter === 'function'
        ? (getter as (...args: unknown[]) => unknown).call(src)
        : (src as unknown as Record<string, unknown>)[name];
    const setter = (dst as unknown as Record<string, unknown>)[`set${cap}`];
    if (typeof setter === 'function') {
      (setter as (...args: unknown[]) => unknown).call(dst, value);
      return;
    }
    (dst as unknown as Record<string, unknown>)[name] = value;
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

  /**
   * Load and return the class constructor at `classPath`.
   *
   * Public companion to the inline class-loading logic in `clone()`:
   * validates the path, consults HotReloadApi for an override
   * blueprint, and falls back to a bare dynamic import. Returns the
   * raw constructor (typed as `unknown` — caller decides what to do
   * with it).
   *
   * Used by `ZoneApi.isFolderClass` and `isSpatialZoneClass` to
   * resolve a template's `class:` field to its TS class so the check
   * can be `prototype instanceof Zone` rather than membership in a
   * central allow-list. Content devs add a folder class by `extends
   * Zone` — no central registry to edit.
   */
  public static async loadClassByPath(classPath: string): Promise<unknown> {
    const validated = this.#validateClassPath(classPath);
    const className = validated.split('/').pop()!;
    const absoluteClassPath = StuffApi.resolveClassFile(validated).file;

    if (HotReloadApi.isFrozen(absoluteClassPath)) {
      throw new Error(
        `StuffApi.loadClassByPath('${classPath}'): no blueprint at ` +
          `'${absoluteClassPath}' — was unloaded via HotReloadApi.unload`
      );
    }
    const reloaded = HotReloadApi.getCurrentExport(absoluteClassPath, className);
    if (reloaded) return reloaded;

    const modulePath = pathToFileURL(absoluteClassPath).href;
    let module: Record<string, unknown>;
    try {
      module = (await import(modulePath)) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `StuffApi.loadClassByPath: failed to import ${classPath}: ` +
          `${error instanceof Error ? error.message : String(error)}`
      );
    }
    // Prefer the named export matching the file basename, falling
    // back to `module.default` for files that follow the
    // template-backing-class default-export convention (every
    // concrete Stuff subclass that backs a Template). Both forms
    // resolve to the same class object at runtime.
    const ClassConstructor = module[className] ?? module.default;
    if (!ClassConstructor) {
      throw new Error(
        `StuffApi.loadClassByPath: class ${className} not found in module ` +
          `${modulePath} (available exports: ${Object.keys(module).join(', ')})`
      );
    }
    return ClassConstructor;
  }

  /**
   * Resolve a **named export** at `classPath` from the hot-reload
   * registry, warming the path (lazy `reload`) on a cold miss. The
   * synchronous, caller-named-export cousin of {@link loadClassByPath}
   * (which resolves the file-basename export and falls back to a bare
   * import). Used for path-resolved **brain** modules (`exportName =
   * 'brain'`), whose concept-export is not the basename.
   *
   * Only class-like exports are retained by the registry, so the brain
   * marker is a named class-expression (`export const brain = class
   * {…}`). Returns `null` — never throws — for an invalid path, a
   * frozen path, or a missing export, so callers (the behavior wiring,
   * the CMS save-gate) treat "doesn't resolve" as a clean negative.
   */
  public static async resolveExport(
    classPath: string,
    exportName: string
  ): Promise<unknown | null> {
    let absoluteClassPath: string;
    try {
      absoluteClassPath = StuffApi.resolveClassFile(classPath).file;
    } catch {
      return null;
    }
    if (HotReloadApi.isFrozen(absoluteClassPath)) return null;
    let exp = HotReloadApi.getCurrentExport(absoluteClassPath, exportName);
    if (!exp) {
      try {
        await HotReloadApi.reload(absoluteClassPath);
      } catch {
        return null;
      }
      exp = HotReloadApi.getCurrentExport(absoluteClassPath, exportName);
    }
    return exp ?? null;
  }

  /**
   * Synchronous sibling of {@link resolveExport}: resolves a named
   * export from the hot-reload registry with **no** lazy warm. Returns
   * `null` if the path was never warmed, is frozen, or lacks the
   * export. The per-invocation re-resolve seam for brains —
   * `BehavedMixin` warms each brain path once at wire time (via the
   * async `resolveExport`), then re-resolves the current class per fire
   * through this sync path (a registry-map hit), so HMR propagates
   * with no async on the hot path.
   */
  public static resolveExportSync(
    classPath: string,
    exportName: string
  ): unknown | null {
    let absoluteClassPath: string;
    try {
      absoluteClassPath = StuffApi.resolveClassFile(classPath).file;
    } catch {
      return null;
    }
    if (HotReloadApi.isFrozen(absoluteClassPath)) return null;
    return HotReloadApi.getCurrentExport(absoluteClassPath, exportName) ?? null;
  }
}

/**
 * Optional-method dispatcher for the destruct witness pair. Uses
 * `typeof === 'function'` so a shadow defining `canDestruct` or
 * `onDestruct` participates without a `MixinApi.hasMixin` pre-check
 * on the host. Mirror of the helpers in `containment.ts` and
 * `Mobile.ts`.
 */
function callDestructHook<T>(
  obj: object,
  hookName: string
): T | undefined {
  const fn = (obj as Record<string, unknown>)[hookName];
  if (typeof fn !== 'function') return undefined;
  return (fn as () => T).apply(obj);
}

function assertDestructVetoOk(
  result: VetoResult | undefined,
  hookName: string
): void {
  if (!result) return;
  if (result.ok) return;
  throw new DestructError(`${hookName} veto: ${result.reason}`, {
    cause: { hookVeto: result, hookName },
  });
}

SecurityApi.decorateApiClass(StuffApi);
