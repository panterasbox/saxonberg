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
 * exports; bare `<path>` for default exports. Path is normalised to the
 * mud-rooted absolute form with a leading slash (`/api/stuff` rather than
 * the file URL `file:///…/src/mud/api/stuff.ts`) so a module id is the
 * same shape as the clone-namespace template path it parallels
 * (`/platform/idea/cmd/X`). The two identity spaces are told apart by which
 * policy reads which — `FromModule` matches a caller's class module id,
 * `FromTemplate` matches its instance template path — not by the slash.
 */
type ModuleId = string;

/**
 * Roots that the URL normaliser strips. The first match wins; order
 * matters when one root is a prefix of another — the `mud/`-rooted
 * hints come first so a mudlib file normalises to a `mud`-relative,
 * leading-slashed id (`/platform/idea/cmd/…`, `/api/…`, `/lib/…`) rather than a
 * `src`-relative one (`mud/platform/…`). This makes a module id **identical in
 * shape** to the clone-namespace template path it parallels
 * (`/platform/idea/cmd/X`); the two are told apart by which policy reads which
 * identity, not by the slash. Only `/mud/` files are ever stamped (the
 * loader transform gate), so every real id is `mud`-rooted; the trailing
 * `src/`/`dist/` hints are a harmless fallback for any stray non-mud
 * stamp.
 *
 * Production tsx runs from `packages/server/src/`; Vitest also imports
 * from `packages/server/src/`. Compiled JS lives under
 * `packages/server/dist/` — same layout, different leading directory.
 * `node_modules` paths are passed through unchanged so an attacker
 * inspecting the registry can see at a glance "this came from a
 * dependency."
 */
const SOURCE_ROOT_HINTS = [
  'packages/server/src/mud/',
  'packages/server/dist/mud/',
  'packages/server/src/',
  'packages/server/dist/',
];

/**
 * How many stack frames an immediate-caller lookup captures.
 *
 * The walk skips this file's own frames and then the caller's
 * `skipModule` frames before the answer appears — measured at 5 for the
 * hot path (`#walkExternalFrames` →
 * `getImmediateCallerUrl` → `_assertFrameMutatorAllowed` → `run`), so 8
 * clears it with margin. `getImmediateCallerUrl` retries unbounded if
 * this truncates, so the number is a performance knob and never a
 * correctness one.
 */
const IMMEDIATE_CALLER_FRAMES = 8;


export class ModuleApi {
  private constructor() {}

  /** Stamped identity per class. WeakMap so unloaded classes get GC'd
   *  naturally — the registry never pins a module in memory. */
  static #classModuleIds: WeakMap<object, ModuleId> = new WeakMap();

  /**
   * The capability-pack source table: an absolute `src/` directory
   * (forward-slashed, trailing slash) → the namespace root it backs
   * (`/arcana`). Consulted BEFORE `SOURCE_ROOT_HINTS` by the URL
   * normaliser, longest directory first, so a pack file
   * `…/packages/content/arcana/src/thing/Wand.ts` normalises to
   * `/arcana/thing/Wand` — the same string as its template path, which
   * is what keeps `FromModule` gates on pack controllers readable.
   * Populated by pack discovery (`PackApi.registerSources`); a pack
   * with several claims registers its one `src/` once per root.
   */
  static #packRoots: Array<{ dir: string; root: string }> = [];

  /**
   * Register a pack's `src/` directory as the backing of `namespaceRoot`.
   * Idempotent; the table is kept longest-dir-first so a nested
   * directory (should one ever exist) wins over its parent.
   */
  public static registerPackSource(absSrcDir: string, namespaceRoot: string): void {
    let dir = absSrcDir.replace(/\\/g, '/');
    if (!dir.endsWith('/')) dir += '/';
    const root = namespaceRoot.replace(/\/+$/, '');
    // A namespace root is backed by exactly one src/: re-registering
    // the same root points it at the new directory (a fixture pack
    // re-minted under a fresh tmp dir; a pack re-discovered after a
    // move). Same dir, same root → a no-op.
    const existing = ModuleApi.#packRoots.find((e) => e.root === root);
    if (existing) {
      existing.dir = dir;
      return;
    }
    ModuleApi.#packRoots.push({ dir, root });
    ModuleApi.#packRoots.sort((a, b) => b.dir.length - a.dir.length);
  }

  /** The registered pack source table (a copy), for the resolvers that share it. */
  public static packSources(): ReadonlyArray<{ dir: string; root: string }> {
    return ModuleApi.#packRoots.map((e) => ({ ...e }));
  }

  /**
   * The module-id a file URL (or absolute path) stamps as — the same
   * normalisation `stamp` applies: a registered pack `src/` first
   * (`/arcana/thing/Wand`), then the kernel roots (`/lib/…`, `/api/…`).
   * A file under neither returns its extension-stripped path, which
   * matches no policy glob.
   */
  public static moduleIdOfUrl(url: string): string {
    return ModuleApi.#normaliseUrl(url);
  }

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

      // Api-facade security decoration is NOT done here. An `*Api` class
      // is a thin, non-HMR-able interface, so it decorates itself at
      // module scope with a `SecurityApi.decorateApiClass(FooApi)` tail
      // — the one sanctioned module-scope exception (see the
      // no-module-scope-statements rule + check-module-scope's allowlist).
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

  /* ─────────────────────── Stack walking ─────────────────────── */

  /**
   * Find the first frame on the current call stack whose source URL
   * doesn't match `skipModule`, and return that URL. Use this when
   * you need "the file that called me" for a URL allowlist (e.g.
   * the construction-gate, frame-mutator, or branch-registration
   * gates) — pass a regex matching your own module so frames inside
   * your file (the helper that wraps this call, the policy method,
   * etc.) are skipped past.
   *
   * Returns `null` when the stack can't be parsed or every frame is
   * inside `ModuleApi` itself or `skipModule`.
   *
   * URLs are normalized to forward slashes before `skipModule` is
   * applied — write your pattern with `/`, not `\\`, regardless of
   * platform.
   */
  public static getImmediateCallerUrl(skipModule: RegExp): string | null {
    // Bounded first: this wants ONE frame, and the remap the capture
    // triggers is per-frame. The skip chain to the real caller is short
    // (this file's frames, then `skipModule`'s), so the bound clears it
    // with room to spare on every shipped call site.
    for (const url of ModuleApi.#walkExternalFrames(IMMEDIATE_CALLER_FRAMES)) {
      if (!skipModule.test(url)) return url;
    }
    // ⚠ Nothing matched — which may mean "no such caller" OR "the bound
    // truncated before we reached it". Those are indistinguishable from
    // here and the consequence is a SecurityError, so retry unbounded
    // rather than deny on a performance tweak. Costs a second capture
    // only in the case that was going to throw anyway.
    for (const url of ModuleApi.#walkExternalFrames()) {
      if (!skipModule.test(url)) return url;
    }
    return null;
  }

  /**
   * Walk the call stack and return the first frame's URL for which
   * `predicate` returns `true`, or `null` if no frame matches.
   * Useful for "is any caller in a test file?" / "is anyone in
   * `mud/api/...`?" style searches where the immediate caller isn't
   * what matters.
   *
   * Frames inside `ModuleApi` itself are skipped automatically.
   * URLs are normalized to forward slashes before the predicate runs.
   */
  public static findFrameMatching(
    predicate: (url: string) => boolean
  ): string | null {
    for (const url of ModuleApi.#walkExternalFrames()) {
      if (predicate(url)) return url;
    }
    return null;
  }

  /**
   * Generator over normalized URLs from each `at …` frame in the
   * current stack, skipping frames inside `module.ts` itself so
   * `getImmediateCallerUrl` / `findFrameMatching` and their callees
   * never appear as the caller. Single point of truth for the
   * regex parsing + Windows backslash normalization.
   */
  static *#walkExternalFrames(maxFrames = 0): Generator<string> {
    const SELF = /\/mud\/api\/module\.(ts|js)(\?|$|:)/;
    // ⚠ The capture is INLINE, not extracted into a helper, and that is
    // load-bearing: a helper adds one stack frame, and one frame is
    // enough to push a legitimate caller out of the window — extracting
    // it broke 438 tests.
    const prevLimit = Error.stackTraceLimit;
    let stack: string;
    try {
      if (maxFrames > 0) Error.stackTraceLimit = maxFrames;
      stack = new Error().stack ?? '';
    } finally {
      Error.stackTraceLimit = prevLimit;
    }
    for (const url of ModuleApi.#parseFrameUrls(stack)) {
      if (SELF.test(url)) continue;
      yield url;
    }
  }

  /**
   * **The file URL of each frame on the current stack** — and the
   * hottest few lines in the engine, because a caller check runs on
   * every gated method dispatch (`ExecutionContextApi.run` →
   * `_assertFrameMutatorAllowed` → here).
   *
   * Measured under the production runtime (`tsx`), one capture cost
   * **51.6 µs** against a 68.5 µs gated call — 75% of the whole gate.
   * Two things were paying for something nobody wanted:
   *
   * 1. **The stack was rendered to a string and re-parsed.** V8 builds
   *    the text lazily, and building it runs the runtime's
   *    `prepareStackTrace` hook, which **source-map remaps every
   *    frame** — that is what `tsx` (and `vite-node` under test)
   *    install, and it is why the same capture costs 9.4 µs on plain
   *    node and 51.6 µs here. We never wanted line numbers or pretty
   *    text; we want one filename per frame. Swapping in a raw
   *    `prepareStackTrace` hands back `CallSite` objects directly, so
   *    no text is built and no remapping happens.
   *
   * 2. **Ten frames were formatted to answer a question about one.**
   *    `Error.stackTraceLimit` defaults to 10, and the remap is
   *    per-frame, so the immediate-caller lookups bound it.
   *
   * ⚠ **The string path is kept as a fallback, and that is not
   * belt-and-braces.** `Error.prepareStackTrace` is a global someone
   * else may have frozen or replaced with a non-cooperating shim; if
   * our assignment doesn't take, `.stack` is a string, and iterating a
   * string yields *characters*. The `Array.isArray` check is what
   * turns that from a silent, absurd security answer into a fall back
   * to the parser that has always worked.
   *
   * ⚠ Restore is unconditional (`finally`) and completes **before the
   * first yield**, so a consumer that abandons the generator early —
   * `getImmediateCallerUrl` returns on its first match — can never
   * leave the global hook swapped out.
   *
   * `maxFrames` of 0 means "whatever the ambient limit is": callers
   * that scan for *any* matching frame must not be truncated.
   */
  /** Parse file URLs out of a rendered `Error.stack`. */
  static #parseFrameUrls(stack: string): string[] {
    const out: string[] = [];
    for (const line of stack.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('at ')) continue;
      const m =
        trimmed.match(/\((.+):\d+:\d+\)$/) ??
        trimmed.match(
          /at (file:\/\/[^\s]+|\/[^\s]+|[A-Za-z]:[\\/][^\s]+):\d+:\d+$/
        );
      const raw = m?.[1];
      if (!raw) continue;
      out.push(raw.replace(/\\/g, '/'));
    }
    return out;
  }

  /* ─────────────────────── Internal helpers ─────────────────────── */

  /**
   * Convert a file:// URL or absolute path into the mud-rooted
   * canonical form used by `FromModule(...)` globs. Drops the file
   * extension. Examples:
   *
   *     file:///home/bob/proj/packages/server/src/mud/api/stuff.ts
   *     → /api/stuff
   *
   *     file:///home/bob/proj/packages/server/dist/mud/lib/spatial/Door.js
   *     → /lib/spatial/Door
   *
   * Files outside known roots return the absolute path with extension
   * stripped — they'll typically be `node_modules` or scripts and won't
   * match any policy glob, which is the right behaviour.
   */
  static #normaliseUrl(rawUrl: string): string {
    // Force forward slashes first — `import.meta.url` is already
    // forward-slash, but stack-walked URLs on Windows arrive
    // backslashed. Normalising up-front means the source-root match
    // and final id are platform-independent.
    let s = rawUrl.replace(/\\/g, '/');
    if (s.startsWith('file://')) s = s.slice('file://'.length);
    // A capability pack's src/ first: the table is longest-dir-first,
    // and a pack file never lies under a kernel root hint, so the two
    // never compete — but a pack dir is the more specific claim.
    for (const { dir, root } of ModuleApi.#packRoots) {
      if (s.startsWith(dir)) {
        return (root + '/' + s.slice(dir.length)).replace(
          /\.(ts|tsx|js|mjs|cjs)$/,
          ''
        );
      }
    }
    for (const root of SOURCE_ROOT_HINTS) {
      const idx = s.indexOf(root);
      if (idx >= 0) {
        // Root-relative form with a LEADING SLASH, so a module id is an
        // absolute path in the same shape as a clone-namespace template
        // path — `/platform/idea/cmd/X`, `/api/foo#Foo`, `/lib/…`. The two are
        // then distinguished by *which policy resolves which identity*
        // (FromModule → class module id, FromTemplate → instance template
        // path), not by slash presence.
        s = '/' + s.slice(idx + root.length);
        break;
      }
    }
    // Strip extension. (Files outside every root fall through here with
    // their absolute fs path, already leading-slashed.)
    return s.replace(/\.(ts|tsx|js|mjs|cjs)$/, '');
  }

  /**
   * Find the file URL of the function that called `stamp()`. The
   * generator already skips frames inside `module.ts`, so the first
   * external URL it yields IS the immediate caller.
   */
  static #findCallerUrl(): string | null {
    for (const url of ModuleApi.#walkExternalFrames(IMMEDIATE_CALLER_FRAMES)) {
      return url;
    }
    for (const url of ModuleApi.#walkExternalFrames()) return url;
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

