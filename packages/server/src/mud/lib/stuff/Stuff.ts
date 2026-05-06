/**
 * Stuff - Base class for all game objects
 *
 * This is the root of the Standard Model hierarchy. Every object in the game
 * (users, players, items, locations, etc.) is a Stuff.
 *
 * Responsibilities:
 * - Runtime ID generation (stuffId)
 * - Destruction lifecycle (isDestroyed flag)
 * - Auto-unregistration from StuffApi (on destroy)
 *
 * CRITICAL PATTERNS:
 *
 * 1. Object Creation:
 * - Use StuffApi.create(() => new YourClass()) to create objects
 * - This ensures objects are properly registered for tracking
 * - Direct 'new' calls will work but object won't be tracked
 *
 * 2. Object Destruction:
 * - Call StuffApi.destruct(obj) to destroy objects — it is the canonical
 *   destruction entry point. The call-security framework's `ApiOnly`
 *   policy now enforces this at runtime; direct obj.destroy() throws
 *   `SecurityError`.
 * - Override prepareDestroy() in subclasses for cleanup logic.
 * - destroy() carries `@Final @Unshadowable @CallSecurity(ApiOnly)`.
 *   Subclass overrides throw `FinalViolationError` at import time;
 *   shadows attempting to attach throw `ShadowError`. Together these
 *   guarantee `StuffApi.unregister()` always runs (essential for GC).
 */

import { nanoid } from 'nanoid';
import { StuffApi } from '../../api/stuff';

/**
 * Any class reference, abstract or concrete. Used by the top-level
 * branch registry — identity-based, no instantiation through this.
 */
type AnyClassRef = abstract new (...args: never[]) => unknown;
import type { Zone } from '../spatial/Zone';
import { CallSecurity, Unshadowable, Final } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * Metadata for destroyed objects (used for debugging).
 */
export interface DestroyedObjectMetadata {
  stuffId: string;
  destroyedAt: Date;
}

/**
 * Base class for all game objects.
 */
export abstract class Stuff {
  /**
   * Runtime ID for this object (generated using nanoid).
   * This is NOT the MongoDB _id - it's a runtime identifier.
   */
  public readonly stuffId: string;

  /**
   * CMS template path this object was cloned from, or null when the
   * object was constructed directly via `StuffApi.create`. Stamped at
   * clone time by `StuffApi.clone()` via the bracket-write framework
   * carve-out below; **immutable post-stamp** for everyone else.
   *
   * Storage is public as a framework carve-out: SecurityPolicies and
   * StuffApi indexes read it directly through the Proxy via
   * PASSTHROUGH_KEYS. Domain code reads via `getTemplatePath()`. There
   * is intentionally **no `setTemplatePath()`** — flipping a Stuff's
   * identity post-clone would break `FromTemplate` policies and the
   * `byTemplatePath` index.
   */
  public templatePath: string | null = null;
  public getTemplatePath(): string | null {
    return this.templatePath;
  }

  /**
   * Zone this object belongs to. Universal subdivision of the MUD domain.
   *
   * Stamped at clone-time from the template path (see ZoneApi), or on first
   * placement via ContainmentApi.move() when null. Runtime-only for now: Zone
   * references are not auto-persisted (mirrors how `inventory`/`environment`
   * are handled — they are runtime references, and the authoritative source
   * for zone membership is the `domain` template path at clone time).
   *
   * Framework carve-out: domain code uses `getZone()` / `setZone()`;
   * framework code reads via bracket cast (PASSTHROUGH_KEYS in
   * `proxy.ts` skips the proxy pipeline for this slot). Same shape
   * as `templatePath` above.
   */
  protected zone: Zone | null = null;
  public getZone(): Zone | null {
    return this.zone;
  }
  public setZone(value: Zone | null): void {
    this.zone = value;
  }

  /**
   * Flag indicating whether this object has been destroyed.
   * Once destroyed, the object should not be used.
   */
  private _isDestroyed: boolean = false;

  /**
   * Construction sentinel. Set to `true` immediately before
   * `StuffApi.#registerAndInit` invokes a factory or `new
   * ClassConstructor()`, then reset by the constructor when it consumes
   * the flag. Raw `new SomeStuff()` from outside `StuffApi` finds the
   * flag false and throws — the only legitimate construction path is
   * via `StuffApi.create` / `StuffApi.clone`.
   *
   * Hard-private: a wrapping Proxy must not be able to flip the flag,
   * and a malicious subclass field with the same name must not collide.
   */
  static #expectingConstruction: boolean = false;

  /**
   * Internal helper called by `StuffApi.#registerAndInit` immediately
   * before invoking the factory or `new ClassConstructor()`. The sentinel
   * MUST be paired with the constructor's consumption — never set it
   * without immediately running construction in the same synchronous
   * scope, or a parallel call could observe it set and bypass.
   *
   * Locked down by stack-walk allowlist: only callers from `mud/api/`
   * (StuffApi's create/clone/createSync),
   * `mud/lib/security/__tests__/test-setup` (the `makeStuff` helper),
   * or test files may flip the sentinel.
   * Anything else throws — closes the "replicate StuffApi's flow
   * without registering" attack the MR review flagged.
   *
   * The leading underscore signals "framework-internal"; matches the
   * existing convention (see `StuffApi._validateClassPath` test seam).
   * @internal
   */
  public static _beginConstruction(): boolean {
    Stuff.#assertConstructionGateAllowed('_beginConstruction');
    const prev = Stuff.#expectingConstruction;
    Stuff.#expectingConstruction = true;
    return prev;
  }

  /**
   * Companion to `_beginConstruction`. Called by `StuffApi`'s finally-
   * block to restore the sentinel even if construction throws. Pass the
   * value returned from the matching `_beginConstruction` to enable
   * nested begin/end pairs (otherwise pass `false`). Same stack-walk
   * allowlist applies.
   * @internal
   */
  public static _endConstruction(prev: boolean = false): void {
    Stuff.#assertConstructionGateAllowed('_endConstruction');
    Stuff.#expectingConstruction = prev;
  }

  /**
   * File-URL patterns whose code may flip the construction sentinel.
   * Same shape as `ExecutionContextApi`'s frame-mutator allowlist —
   * different method, different allowlist, but identical mechanism.
   */
  static #constructionGateAllowlist: ReadonlyArray<RegExp> = [
    /\/mud\/api\//,                                  // StuffApi.create / clone / createSync
    /\/mud\/lib\/security\/__tests__\/test-setup\.(ts|js)$/, // `makeStuff` test seam
    /\.test\.(ts|js)$/,                              // direct test usage
  ];

  static #constructionGateCache: Map<string, boolean> = new Map();

  /**
   * Throw if the immediate caller of `_beginConstruction` /
   * `_endConstruction` isn't on the allowlist. Per-URL cached, so the
   * cost is one stack walk per file ever; after warmup it's a Map
   * lookup. New legitimate callers must be added here with a one-line
   * justification — keep the list narrow.
   */
  static #assertConstructionGateAllowed(op: string): void {
    const url = Stuff.#findImmediateCallerUrl();
    if (url === null) {
      throw new Error(
        `Stuff.${op}() refused: caller URL could not be determined`
      );
    }
    const cached = Stuff.#constructionGateCache.get(url);
    if (cached === true) return;
    if (cached === false) {
      throw new Error(
        `Stuff.${op}() refused from ${url}: only StuffApi (mud/api/**), ` +
          `the test-setup helper (mud/lib/security/__tests__/test-setup), and ` +
          `*.test.ts files may flip the construction sentinel`
      );
    }
    const allowed = Stuff.#constructionGateAllowlist.some((re) => re.test(url));
    Stuff.#constructionGateCache.set(url, allowed);
    if (!allowed) {
      throw new Error(
        `Stuff.${op}() refused from ${url}: only StuffApi (mud/api/**), ` +
          `the test-setup helper (mud/lib/security/__tests__/test-setup), and ` +
          `*.test.ts files may flip the construction sentinel`
      );
    }
  }

  /**
   * Walk `Error.stack` to the first frame outside this module and
   * return its file URL, or `null`.
   */
  static #findImmediateCallerUrl(): string | null {
    const err = new Error();
    const lines = (err.stack ?? '').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('at ')) continue;
      const parens = trimmed.match(/\((.+):\d+:\d+\)$/);
      const bare = trimmed.match(
        /at (file:\/\/[^\s]+|\/[^\s]+|[A-Za-z]:[\\/][^\s]+):\d+:\d+$/
      );
      const m = parens ?? bare;
      if (!m) continue;
      const raw = m[1];
      if (!raw) continue;
      // Normalise Windows backslashes — stack-frame URLs on Windows
      // arrive as `C:\...` while the in-module skip below is written
      // with forward slashes.
      const url = raw.replace(/\\/g, '/');
      // Skip frames inside this module file (Stuff.ts/js).
      if (/\/mud\/lib\/stuff\/Stuff\.(ts|js)(\?|$|:)/.test(url)) continue;
      return url;
    }
    return null;
  }

  /**
   * Constructor - generates unique runtime ID.
   *
   * Subclass constructors should call super() and then initialize their
   * fields. Use field initializers for default values where possible.
   *
   * IMPORTANT: Direct `new SomeStuff()` is rejected — every Stuff must
   * be created via `StuffApi.create(() => new YourClass())` or
   * `StuffApi.clone(...)`. The construction sentinel above guarantees
   * this; raw `new` outside the Api layer throws here.
   *
   * Constructor-body method calls bypass the Proxy (the Proxy is
   * installed AFTER the constructor returns). Initialize fields here;
   * do NOT invoke methods that carry @CallSecurity from inside a
   * constructor body.
   */
  constructor() {
    if (!Stuff.#expectingConstruction) {
      throw new Error(
        `Direct 'new' on a Stuff subclass is not allowed. ` +
          `Use StuffApi.create(() => new YourClass()) or StuffApi.clone(path).`
      );
    }
    Stuff.#expectingConstruction = false;
    Stuff.#assertTopLevelBranch(this.constructor as AnyClassRef);
    this.stuffId = nanoid();
  }

  /**
   * Top-level branches registered via `_registerTopLevelBranch`.
   * Every concrete Stuff subclass must trace through one of these in
   * its prototype chain. Identity-based — entries are the actual
   * branch constructors (Thing, Location, Idea, Agent, Vessel,
   * Persistable, Shadow), not names or markers, so the membership
   * check can't be spoofed by a same-named class declared elsewhere.
   */
  static #branches: Set<AnyClassRef> = new Set();

  /**
   * File-URL patterns whose code may call `_registerTopLevelBranch`.
   * Same machinery as `#constructionGateAllowlist`: caller's source
   * URL must match. Adding a new branch is a deliberate edit to this
   * list AND its registration call site.
   */
  static #branchRegistrationAllowlist: ReadonlyArray<RegExp> = [
    /\/mud\/lib\/stuff\/(Thing|Location|Idea|Agent|Vessel|Shadow)\.(ts|js)$/,
    /\/mud\/lib\/persistence\/Persistable\.(ts|js)$/,
  ];

  static #branchRegistrationCache: Map<string, boolean> = new Map();

  /**
   * Register a class as a top-level branch. Called by Thing /
   * Location / Idea / Agent / Vessel / Persistable / Shadow at module
   * load. Caller URL must match `#branchRegistrationAllowlist`;
   * everything else throws.
   *
   * @internal
   */
  public static _registerTopLevelBranch(ctor: AnyClassRef): void {
    Stuff.#assertBranchRegistrationAllowed();
    Stuff.#branches.add(ctor);
  }

  static #assertBranchRegistrationAllowed(): void {
    const url = Stuff.#findImmediateCallerUrl();
    if (url === null) {
      throw new Error(
        `Stuff._registerTopLevelBranch refused: caller URL could not be determined`
      );
    }
    const cached = Stuff.#branchRegistrationCache.get(url);
    if (cached === true) return;
    if (cached === false) {
      throw new Error(
        `Stuff._registerTopLevelBranch refused from ${url}: only the ` +
          `seven branch files (lib/stuff/{Thing,Location,Idea,Agent,Vessel,Shadow}.ts ` +
          `and lib/persistence/Persistable.ts) may register branches.`
      );
    }
    const allowed = Stuff.#branchRegistrationAllowlist.some((re) => re.test(url));
    Stuff.#branchRegistrationCache.set(url, allowed);
    if (!allowed) {
      throw new Error(
        `Stuff._registerTopLevelBranch refused from ${url}: only the ` +
          `seven branch files (lib/stuff/{Thing,Location,Idea,Agent,Vessel,Shadow}.ts ` +
          `and lib/persistence/Persistable.ts) may register branches.`
      );
    }
  }

  /**
   * Cache of constructors known to trace through a registered branch.
   * Misses are not cached — failing classes should never be
   * constructed twice.
   */
  static #branchCheckCache: WeakSet<object> = new WeakSet();

  /**
   * Throw if `ctor` doesn't trace through one of the registered
   * top-level branches. Walks `Object.getPrototypeOf(ctor)` upward
   * comparing constructor identity against `#branches`. See
   * `docs/architecture.md § Top-level branches` for the rule and the
   * rationale.
   */
  static #assertTopLevelBranch(ctor: AnyClassRef): void {
    if (Stuff.#branchCheckCache.has(ctor)) return;
    let cur: AnyClassRef | null = ctor;
    while (cur) {
      if (Stuff.#branches.has(cur)) {
        Stuff.#branchCheckCache.add(ctor);
        return;
      }
      cur = Object.getPrototypeOf(cur) as AnyClassRef | null;
    }
    throw new Error(
      `Stuff subclass '${ctor.name || '<anonymous>'}' does not extend ` +
        `through one of the top-level branches: Thing, Location, Idea, ` +
        `Agent, Vessel, Persistable, or Shadow. See ` +
        `docs/architecture.md § Top-level branches.`
    );
  }

  /**
   * Check if this object has been destroyed.
   *
   * `@Unshadowable`: the destroyed-state read is a framework invariant —
   * any shadow that lied about it would let consumers touch a torn-down
   * Stuff. `@Final`: subclasses overriding this would defeat the same
   * invariant; the loader hook throws `FinalViolationError` at import
   * time on any subclass that redefines it.
   */
  @Final
  @Unshadowable
  public isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Hook for subclass cleanup logic.
   * Called by destroy() before marking object as destroyed and unregistering.
   *
   * Override this method in subclasses to add cleanup logic.
   * DO NOT call super.prepareDestroy() unless parent class needs it.
   *
   * Examples:
   * - Unlink references to other objects
   * - Close file handles
   * - Cancel timers
   * - Release resources
   */
  protected prepareDestroy(): void {
    // Default: no-op
    // Subclasses override this for cleanup
  }

  /**
   * Destroy this object.
   *
   * Locked down by `@CallSecurity(ApiOnly)` — only callers under
   * `mud/api/` (in practice, `StuffApi.destruct`) may invoke it.
   * `@Unshadowable` because the unregistration path must always run;
   * a shadow that intercepts and skips it would leak the object into
   * the registry forever. `@Final` because subclass overrides would
   * defeat the same invariant — the loader hook throws
   * `FinalViolationError` at import time on any subclass redefinition.
   *
   * Cleanup logic belongs in `prepareDestroy()`, not here.
   */
  @Final
  @Unshadowable
  @CallSecurity(SecurityPolicies.ApiOnly)
  public destroy(): void {
    if (this._isDestroyed) {
      console.warn(`Stuff.destroy(): Object ${this.stuffId} already destroyed`);
      return;
    }

    // Step 1: Call subclass cleanup hook
    this.prepareDestroy();

    // Step 2: Mark as destroyed (prevents double-destroy)
    this._isDestroyed = true;

    // Step 3: Critical housekeeping - unregister from StuffApi
    // This MUST happen for garbage collection to work properly
    StuffApi.unregister(this);
  }

  /**
   * Get a string representation of this object (for debugging).
   */
  public toString(): string {
    return `[Stuff ${this.stuffId}${this._isDestroyed ? ' (destroyed)' : ''}]`;
  }
}
