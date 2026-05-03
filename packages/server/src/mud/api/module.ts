/**
 * ModuleApi — class-to-module-URL mapping for the call-security
 * framework.
 *
 * Every `.ts` file under `mud/` is processed at module-load time by a
 * source transform (Vite plugin in tests, Node loader hook in production)
 * that appends a single call:
 *
 *     import { ModuleApi as __callSecModuleApi } from '<...>/api/module';
 *     __callSecModuleApi.stamp(import.meta.url, { Foo, Bar });
 *
 * The names in `{ Foo, Bar }` are extracted from the module's `export
 * class` / `export default class` / `export { X }` declarations by AST
 * walk. `import.meta.url` is set by the loader, not by user code, so a
 * class can't lie about its source file.
 *
 * Tamper resistance: `stamp()` reads `Error.stack` to find the URL of
 * its immediate caller and rejects if `declaredUrl` doesn't match. A
 * malicious file can stamp its own classes (no escalation — they get
 * stamped with their real URL) but can't stamp another file's classes
 * or declare a fake URL for its own.
 *
 * First-stamp-wins for a given class: subsequent stamps for the same
 * class are no-ops. Hot reloads that re-evaluate a module don't break
 * existing instances; the registry continues to resolve old class
 * references to the same URL string. The new class binding is stamped
 * the same way.
 *
 * The `@Final` validator runs from inside `stamp()` so subclasses that
 * override an ancestor's `@Final` method throw `FinalViolationError` at
 * import time — the bad module never finishes loading.
 *
 * Shape: static class with `#`-private state — same convention as
 * `StuffApi` / `ExecutionContextApi` / every other Api in the codebase.
 */

import { FinalViolationError } from '../lib/security/errors';
import { SecurityApi } from './security';
// SecurityApi is also used at runtime by `_*ForTest` test seams to
// gate against production callers (`SecurityApi.assertTestOnly`).

// Like ExecutionContextApi, ModuleApi deliberately does NOT call
// `SecurityApi.decorateApiClass(...)`. It's framework infrastructure called by
// the loader transform during module evaluation; wrapping its
// methods in policy/frame-push plumbing would (a) form a bootstrap
// cycle with `decorators.ts`, and (b) push noise frames for every
// auto-injected `stamp()` call.

/**
 * Canonical module-id string. Form: `<path>#<exportName>` for named
 * exports; bare `<path>` for default exports. Path is normalised to
 * the source-rooted form (`mud/api/stuff` rather than the absolute
 * `file:///…/mud/api/stuff.ts`) so policy globs are written against a
 * predictable shape.
 */
type ModuleId = string;

/**
 * Roots that the URL normaliser strips. The first match wins; order
 * matters when one root is a prefix of another.
 *
 * Production tsx runs from `packages/server/src/`; Vitest also imports
 * from `packages/server/src/`. Compiled JS lives under
 * `packages/server/dist/` — same layout, different leading directory.
 * `node_modules` paths are passed through unchanged so an attacker
 * inspecting the registry can see at a glance "this came from a
 * dependency."
 */
const SOURCE_ROOT_HINTS = [
  'packages/server/src/',
  'packages/server/dist/',
];

export class ModuleApi {
  private constructor() {}

  /** Stamped identity per class. WeakMap so unloaded classes get GC'd
   *  naturally — the registry never pins a module in memory. */
  static #classModuleIds: WeakMap<object, ModuleId> = new WeakMap();

  /**
   * Stamp every entry in `exports` with `declaredUrl` (normalised).
   * Called once per module by the source transform's appended snippet.
   *
   * Rejects (silently — no throw) if `declaredUrl` doesn't match the
   * caller's stack-derived URL: a manual `stamp(fakeUrl, …)` from
   * another file fails the check. The transform always passes
   * `import.meta.url`, which equals the caller's URL, so legit
   * stamping never trips the check.
   *
   * For each newly-stamped class: also runs the `@Final` validator.
   * Throws `FinalViolationError` if the class overrides an ancestor's
   * `@Final` method. Bad modules fail at import time.
   */
  public static stamp(
    declaredUrl: string,
    exports: Record<string, unknown>
  ): void {
    const callerUrl = ModuleApi.#findCallerUrl();
    if (callerUrl === null) {
      // Can't verify caller — refuse rather than guess. Modules
      // imported through pathways without a JS stack (e.g., via a
      // C++ binding) wouldn't get stamped; not a v1 concern.
      return;
    }
    if (ModuleApi.#normaliseUrl(callerUrl) !== ModuleApi.#normaliseUrl(declaredUrl)) {
      // Caller is lying about its URL. Stamp denied.
      return;
    }

    const moduleBase = ModuleApi.#normaliseUrl(declaredUrl);
    for (const [exportName, value] of Object.entries(exports)) {
      if (typeof value !== 'function') continue;
      // First-stamp-wins. Hot reload re-evaluates the module and
      // calls stamp again with the same export name pointing at a
      // *new* class binding; that new class has no entry yet, so
      // it gets stamped under the same URL.
      if (ModuleApi.#classModuleIds.has(value)) continue;

      const id =
        exportName === 'default'
          ? moduleBase
          : `${moduleBase}#${exportName}`;
      ModuleApi.#classModuleIds.set(value, id);

      // Run @Final validation now. If the class overrides an
      // ancestor's @Final method, this throws — the bad module
      // never finishes loading.
      ModuleApi.#validateNoFinalOverrides(value);
    }
  }

  /**
   * Look up the canonical module-id string for `cls`. Returns `null`
   * if the class wasn't stamped. Identity-keyed policies that need a
   * module-id should fail closed (deny) on `null` — that's the
   * tamper-resistance contract.
   */
  public static lookup(cls: object | null): ModuleId | null {
    if (cls === null) return null;
    return ModuleApi.#classModuleIds.get(cls) ?? null;
  }

  /**
   * Test seam: directly stamp a class with a URL, bypassing the
   * caller-verification check. Used by unit tests for
   * caller-identity resolution and policy resolution where spinning
   * up the loader transform is overkill.
   *
   * @internal
   */
  public static _stampForTest(cls: object, moduleId: ModuleId): void {
    SecurityApi.assertTestOnly('_stampForTest');
    ModuleApi.#classModuleIds.set(cls, moduleId);
  }

  /**
   * Test seam: forget a stamp. Combined with `_stampForTest` lets
   * tests rebuild caller-identity scenarios from scratch.
   *
   * @internal
   */
  public static _forgetForTest(cls: object): void {
    SecurityApi.assertTestOnly('_forgetForTest');
    ModuleApi.#classModuleIds.delete(cls);
  }

  /**
   * Test seam: directly invoke the `@Final` validator. Lets tests
   * cover the override-violation path without going through `stamp()`
   * (which requires caller-URL plumbing).
   *
   * @internal
   */
  public static _validateNoFinalOverridesForTest(cls: object): void {
    SecurityApi.assertTestOnly('_validateNoFinalOverridesForTest');
    ModuleApi.#validateNoFinalOverrides(cls);
  }

  /* ─────────────────────── Internal helpers ─────────────────────── */

  /**
   * Convert a file:// URL or absolute path into the source-rooted
   * canonical form used by `FromModule(...)` globs. Drops the file
   * extension. Examples:
   *
   *     file:///home/bob/proj/packages/server/src/mud/api/stuff.ts
   *     → mud/api/stuff
   *
   *     file:///home/bob/proj/packages/server/dist/mud/lib/spatial/Door.js
   *     → mud/lib/spatial/Door
   *
   * Files outside known roots return the absolute path with extension
   * stripped — they'll typically be `node_modules` or scripts and won't
   * match any policy glob, which is the right behaviour.
   */
  static #normaliseUrl(rawUrl: string): string {
    let s = rawUrl;
    if (s.startsWith('file://')) s = s.slice('file://'.length);
    for (const root of SOURCE_ROOT_HINTS) {
      const idx = s.indexOf(root);
      if (idx >= 0) {
        s = s.slice(idx + root.length);
        break;
      }
    }
    // Strip extension.
    return s.replace(/\.(ts|tsx|js|mjs|cjs)$/, '');
  }

  /**
   * Find the file URL of the function that called `stamp()`. Walk the
   * stack; skip frames inside this module so `stamp` itself and the
   * private helpers don't show up as the caller. Return the first
   * external frame's URL.
   */
  static #findCallerUrl(): string | null {
    const err = new Error();
    const lines = (err.stack ?? '').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('at ')) continue;
      const parens = trimmed.match(/\((.+):(\d+):(\d+)\)$/);
      const bareUrl = trimmed.match(/at (file:\/\/[^\s]+|\/[^\s]+):(\d+):(\d+)$/);
      const m = parens ?? bareUrl;
      if (!m) continue;
      const url = m[1];
      if (!url) continue;
      // Skip frames inside this module file specifically — `stamp`,
      // `#findCallerUrl`, `#normaliseUrl`, `#validateNoFinalOverrides`
      // all live in `module.ts` (or its compiled `.js`).
      if (/\/mud\/api\/module\.(ts|js)(\?|$|:)/.test(url)) continue;
      return url;
    }
    return null;
  }

  /**
   * Walk `cls`'s prototype chain. For each ancestor, if it has any
   * `@Final` methods, check that `cls` does NOT have its own descriptor
   * for any of them. Throws `FinalViolationError` on violation.
   *
   * Multi-level chains handled correctly: A declares `@Final foo`, B
   * extends A and doesn't override, C extends B and overrides `foo` →
   * import of C throws because the walker reaches A and finds `foo`
   * marked final there.
   *
   * `#`-private — `stamp()` is the only legitimate caller. Tests reach
   * it via `_validateNoFinalOverridesForTest`.
   */
  static #validateNoFinalOverrides(cls: object): void {
    if (typeof cls !== 'function' || !('prototype' in cls)) return;
    const ctor = cls as { name?: string; prototype: object };
    let proto = ctor.prototype;
    while (proto && proto !== Object.prototype) {
      const ancestor = Object.getPrototypeOf(proto) as { constructor?: object } | null;
      if (!ancestor || ancestor === Object.prototype) break;
      const ancestorCtor = ancestor.constructor;
      if (typeof ancestorCtor === 'function') {
        const finals = SecurityApi.getFinalMethods(ancestorCtor as object);
        if (finals) {
          for (const name of finals) {
            // Walk every layer between cls.prototype and ancestor; if
            // any layer has its own descriptor for `name`, it overrides
            // the ancestor's @Final.
            let walker = ctor.prototype;
            while (walker && walker !== ancestor) {
              if (Object.hasOwn(walker, name)) {
                throw new FinalViolationError(
                  ctor.name ?? '<anonymous>',
                  `${(ancestorCtor as { name?: string }).name ?? '<anonymous>'}.${name}`
                );
              }
              walker = Object.getPrototypeOf(walker) as object;
            }
          }
        }
      }
      proto = ancestor as object;
    }
  }
}

