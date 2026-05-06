/**
 * HotReloadApi — path-keyed registry for live class blueprint
 * replacement.
 *
 * Saxonberg's mixin / template / verb / hook plumbing all looks up by
 * name, not by class identity. That makes a class-swap-at-runtime
 * model viable: load the new class, point the registry at it, and the
 * next clone / dispatch / hook invocation picks it up. Existing
 * instances keep their old prototype chain — we don't migrate live
 * state. Old class objects fall out of the registry and become
 * GC-only when their last instance is gone.
 *
 * The registry holds AT MOST two blueprints per path: `current` and
 * `previous`. Anything older drops out on the next successful reload.
 * An audit ledger that wants longer history subscribes to the
 * `Events.Module*` lifecycle events instead.
 *
 * State per path:
 *   Empty        — never seen, or explicitly unloaded.
 *   V1           — `current` only (one successful reload).
 *   V2           — `current` + `previous` (≥2 successful reloads).
 *
 * Empty has two flavors that matter to `StuffApi.clone`:
 *   - "never seen": clone may lazy-`reload()` and self-warm.
 *   - "unloaded": frozen — clone must throw "no blueprint at path".
 * `#frozenPaths` distinguishes them. `unload()` adds; `reload()`
 * removes.
 *
 * Reload mechanism: cache-busting dynamic import. Each `reload()`
 * appends a fresh `?hmr=N` query so Node's module loader returns a
 * new evaluation; the source transform re-runs and `ModuleApi.stamp`
 * picks up the fresh class objects.
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';

import { EventApi } from './event';
import { SecurityApi } from './security';
import { Events, type ReloadEvent } from '../lib/events';

/**
 * A class-shaped constructor. `never[]` is the contravariant trick
 * that lets every concrete class assign in regardless of its real
 * argument list — we don't actually invoke these from HotReloadApi;
 * we hand them off to `StuffApi.clone`'s `new ClassConstructor()`
 * (no-arg) site or back to dispatch code that knows the right
 * shape.
 */
type ClassLike = new (...args: never[]) => unknown;

interface Blueprint {
  /** Class-shaped exports, keyed by export name. */
  exports: Record<string, ClassLike>;
  /** Truncated sha256 of the source bytes at load time. */
  versionId: string;
}

interface BlueprintEntry {
  current: Blueprint;
  previous: Blueprint | null;
}

export class HotReloadApi {
  private constructor() {}

  /** path → { current, previous }. Empty when the path is absent. */
  static #registry: Map<string, BlueprintEntry> = new Map();

  /** Paths explicitly `unload`'d. `clone()` checks this to distinguish
   *  "never-seen Empty" (lazy-reload OK) from "unloaded Empty" (throw). */
  static #frozenPaths: Set<string> = new Set();

  /** Per-path lock. Concurrent `reload(path)` calls share one promise. */
  static #inflight: Map<string, Promise<void>> = new Map();

  /** Monotonic counter for the cache-busting query string. */
  static #counter: number = 0;

  /* ─────────────────────────── Mutators ─────────────────────────── */

  /**
   * Load the module at `path`, swap the registry's current blueprint
   * for the new one. Throws on compile error or top-level execution
   * error; registry stays unchanged on failure.
   *
   * Concurrent `reload(path)` calls share one in-flight promise — the
   * second caller waits for the first instead of starting a parallel
   * import.
   */
  public static async reload(path: string): Promise<void> {
    const inflight = this.#inflight.get(path);
    if (inflight) return inflight;

    const promise = this.#doReload(path).finally(() => {
      this.#inflight.delete(path);
    });
    this.#inflight.set(path, promise);
    return promise;
  }

  /**
   * Swap `current` and `previous` for `path`. Throws when there is no
   * `previous` (states Empty and V1).
   */
  public static rollback(path: string): void {
    const entry = this.#registry.get(path);
    if (!entry || !entry.previous) {
      throw new Error(`HotReloadApi.rollback: nothing to roll back to at '${path}'`);
    }
    const swapped: BlueprintEntry = {
      current: entry.previous,
      previous: entry.current,
    };
    this.#registry.set(path, swapped);
    this.#emit(Events.ModuleRolledBack, {
      path,
      versionId: swapped.current.versionId,
      previousVersionId: swapped.previous!.versionId,
      exports: Object.keys(swapped.current.exports),
    });
  }

  /**
   * Clear both registry slots for `path` and freeze it. Subsequent
   * `clone(path)` throws "no blueprint at path" until the next
   * `reload()` repopulates. Idempotent: `unload`-from-Empty emits
   * the event without changing state, so subscribers still see the
   * intent.
   */
  public static unload(path: string): void {
    const prior = this.#registry.get(path);
    this.#registry.delete(path);
    this.#frozenPaths.add(path);
    this.#emit(Events.ModuleUnloaded, {
      path,
      versionId: null,
      previousVersionId: prior?.current.versionId ?? null,
      exports: [],
    });
  }

  /* ───────────────────────── Introspection ───────────────────────── */

  /**
   * Class currently registered under the canonical export name for
   * `path`, or `null` if the path is in state Empty (or the file
   * doesn't export a class matching the last-path-segment convention).
   *
   * The canonical export is the export whose name equals the last
   * path segment without extension — the same convention
   * `StuffApi.clone` uses today.
   */
  public static getCurrent(path: string): ClassLike | null {
    const entry = this.#registry.get(path);
    if (!entry) return null;
    return entry.current.exports[this.#defaultExportName(path)] ?? null;
  }

  /**
   * Like `getCurrent` but for an explicit export name. Useful for
   * mixin / hook files where filename ≠ canonical export.
   */
  public static getCurrentExport(
    path: string,
    exportName: string
  ): ClassLike | null {
    const entry = this.#registry.get(path);
    if (!entry) return null;
    return entry.current.exports[exportName] ?? null;
  }

  /**
   * Previous registered class for `path`, or `null` in states Empty
   * and V1. Same canonical-export convention as `getCurrent`.
   */
  public static getPrevious(path: string): ClassLike | null {
    const entry = this.#registry.get(path);
    if (!entry || !entry.previous) return null;
    return entry.previous.exports[this.#defaultExportName(path)] ?? null;
  }

  /**
   * All paths with a `current` blueprint registered (states V1 and
   * V2), in insertion order.
   */
  public static getRegisteredPaths(): string[] {
    return [...this.#registry.keys()];
  }

  /**
   * Refresh the persistence-hook chain from `hooks.yaml`. Required
   * after reloading a hook source file: hook instances live as
   * cloned Stuff objects pinned to their old class. This call drops
   * the chain and rebuilds it from the manifest, so the next save /
   * delete fires the freshly-cloned hooks. Idempotent.
   *
   * Lazy import keeps `PersistenceManager` (and its mongo dependency
   * tree) out of HotReloadApi's static graph for callers that only
   * touch the registry surface.
   */
  public static async reloadHookManifest(): Promise<void> {
    const { PersistenceManager } = await import(
      '../../backend/PersistenceManager'
    );
    const pm = PersistenceManager.get();
    pm.clearHooks();
    await pm.loadHooks();
  }

  /**
   * Refresh the controller registry from `mud/obj/command/`. Required
   * after reloading any controller source file: controller instances
   * live as cloned Stuff pinned to the class blueprint they were
   * cloned against. This call drops the registry and re-clones every
   * controller; subsequent dispatches resolve to the freshly-loaded
   * class. Idempotent.
   *
   * Lazy import for the same reason as `reloadHookManifest`.
   */
  public static async reloadControllerManifest(): Promise<void> {
    const { CommandApi } = await import('./command');
    CommandApi.clearControllers();
    await CommandApi.loadControllers();
  }

  /**
   * Whether `path` was explicitly `unload`'d and not yet repopulated
   * by a subsequent `reload`. `StuffApi.clone` uses this to choose
   * between throwing (frozen) and lazy-reloading (never-seen).
   */
  public static isFrozen(path: string): boolean {
    return this.#frozenPaths.has(path);
  }

  /* ───────────────────────── Test seams ───────────────────────── */

  /** @internal — clear all state. */
  public static _clearAllForTest(): void {
    SecurityApi.assertTestOnly('_clearAllForTest');
    this.#registry.clear();
    this.#frozenPaths.clear();
    this.#inflight.clear();
  }

  /**
   * Test seam — install a blueprint without going through filesystem
   * I/O. Used by integration tests that want to verify the
   * `StuffApi.clone` override path without round-tripping through a
   * fixture file. Promotes any prior current to `previous` (matching
   * the V1 → V2 semantics of a real reload).
   *
   * @internal
   */
  public static _registerForTest(
    path: string,
    exports: Record<string, ClassLike>
  ): void {
    SecurityApi.assertTestOnly('_registerForTest');
    const prior = this.#registry.get(path);
    this.#registry.set(path, {
      current: { exports, versionId: 'test' },
      previous: prior ? prior.current : null,
    });
    this.#frozenPaths.delete(path);
  }

  /* ─────────────────────────── Internals ─────────────────────────── */

  static async #doReload(path: string): Promise<void> {
    let source: string;
    let blueprint: Blueprint;
    try {
      source = await readFile(path, 'utf8');
      const versionId = this.#computeVersionId(source);
      const url = pathToFileURL(path).href;
      const counter = ++this.#counter;
      const module = (await import(`${url}?hmr=${counter}`)) as Record<
        string,
        unknown
      >;
      blueprint = {
        exports: this.#extractClassLikeExports(module),
        versionId,
      };
    } catch (err) {
      const reason = err && typeof err === 'object' && 'message' in err
        ? (err as { message: unknown }).message
        : String(err);
      const stack = err && typeof err === 'object' && 'stack' in err
        ? (err as { stack?: unknown }).stack
        : undefined;
      this.#emit(Events.ModuleReloadFailed, {
        path,
        versionId: null,
        previousVersionId: this.#registry.get(path)?.current.versionId ?? null,
        exports: [],
        error: {
          message: typeof reason === 'string' ? reason : String(reason),
          stack: typeof stack === 'string' ? stack : undefined,
        },
      });
      throw err;
    }

    const prior = this.#registry.get(path);
    const next: BlueprintEntry = {
      current: blueprint,
      previous: prior ? prior.current : null,
    };
    this.#registry.set(path, next);
    this.#frozenPaths.delete(path);

    this.#emit(Events.ModuleReloaded, {
      path,
      versionId: blueprint.versionId,
      previousVersionId: next.previous?.versionId ?? null,
      exports: Object.keys(blueprint.exports),
    });
  }

  static #computeVersionId(source: string): string {
    return createHash('sha256').update(source).digest('hex').slice(0, 16);
  }

  /**
   * Pick out every named export that's a function with a `prototype`
   * (filters out arrow functions; admits classes and plain functions).
   * `default` exports are included under the key `default`.
   */
  static #extractClassLikeExports(
    module: Record<string, unknown>
  ): Record<string, ClassLike> {
    const out: Record<string, ClassLike> = {};
    for (const [name, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const fn = value as ClassLike & { prototype?: unknown };
      if (fn.prototype === undefined) continue;
      out[name] = fn;
    }
    return out;
  }

  /**
   * Last path segment without extension, e.g.:
   *   /abs/path/to/obj/Avatar.ts → Avatar
   *   /abs/.../foo/bar.tsx       → bar
   */
  static #defaultExportName(path: string): string {
    const tail = path.split(/[\\/]/).pop() ?? path;
    return tail.replace(/\.(ts|tsx|js|mjs|cjs)$/, '');
  }

  static #emit(
    eventName:
      | typeof Events.ModuleReloaded
      | typeof Events.ModuleRolledBack
      | typeof Events.ModuleUnloaded
      | typeof Events.ModuleReloadFailed,
    payload: ReloadEvent
  ): void {
    EventApi.emit(eventName, payload);
  }
}

SecurityApi.decorateApiClass(HotReloadApi);
