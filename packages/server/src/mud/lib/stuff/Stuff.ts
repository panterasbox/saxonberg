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
 *   policy enforces this at runtime; direct obj.destroy() throws
 *   `SecurityError`.
 * - Subclasses customize destruction via two optional Witness hooks:
 *     `canDestruct(): VetoResult` — refusal seam (return
 *       `{ ok: false, reason }` to abort). Bypassable via
 *       `StuffApi.forceDestruct` (admin-gated).
 *     `onDestruct(): void` — cleanup hook, runs while the target is
 *       still live. Replaces the retired `prepareDestroy()` hook.
 * - destroy() carries `@Final @Unshadowable @CallSecurity(ApiOnly)`.
 *   Subclass overrides throw `FinalViolationError` at import time;
 *   shadows attempting to attach throw `ShadowError`. Together these
 *   guarantee `StuffApi.unregister()` always runs (essential for GC).
 */

import { nanoid } from 'nanoid';
import { StuffApi } from '../../api/stuff';
import { ModuleApi } from '../../api/module';

/**
 * Any class reference, abstract or concrete. Used by the top-level
 * branch registry — identity-based, no instantiation through this.
 */
type AnyClassRef = abstract new (...args: never[]) => unknown;
import type { SpatialZone } from '../spatial/SpatialZone';
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
   * Spatial zone this object belongs to. Stamped at clone-time from the
   * nearest spatial-zone ancestor via `ZoneApi.resolveZoneForPath`, or
   * left null when no spatial ancestor exists.
   *
   * The field is narrowed to `SpatialZone` (not the bare `Zone` base):
   * non-spatial Zone subclasses (`Clade`, future taxonomic / permission
   * scopes) NEVER stamp here. The folder-of-templates membership lives
   * in the template-tree structure; only spatial zones — the things
   * that own a `Set<Location>` and a `deriveExit` strategy — go on
   * `Stuff.zone`. Callers who want "what folder does this template path
   * sit under" should consult the template tree, not this field.
   *
   * Runtime-only: not auto-persisted (the authoritative source is the
   * `domain` template path at clone time).
   *
   * Framework carve-out: domain code uses `getZone()` / `setZone()`;
   * framework code reads via bracket cast (PASSTHROUGH_KEYS in
   * `proxy.ts` skips the proxy pipeline for this slot). Same shape
   * as `templatePath` above.
   */
  protected zone: SpatialZone | null = null;
  public getZone(): SpatialZone | null {
    return this.zone;
  }
  public setZone(value: SpatialZone | null): void {
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
    const url = ModuleApi.getImmediateCallerUrl(Stuff.#SELF_URL);
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
   * Self-skip pattern for `ModuleApi.getImmediateCallerUrl` — frames
   * inside `Stuff.ts` (the construction-gate / branch-registration
   * helpers themselves) are dropped so the first reported frame is
   * the actual caller.
   */
  static #SELF_URL = /\/mud\/lib\/stuff\/Stuff\.(ts|js)(\?|$|:)/;

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
    const url = ModuleApi.getImmediateCallerUrl(Stuff.#SELF_URL);
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
   * Subclass cleanup belongs on the optional `onDestruct()` witness
   * (consulted by `StuffApi.destruct` while the target is still live);
   * refusal logic belongs on `canDestruct()`. This terminal `destroy()`
   * is the unshadowable mark-and-unregister step only.
   */
  @Final
  @Unshadowable
  @CallSecurity(SecurityPolicies.ApiOnly)
  public destroy(): void {
    if (this._isDestroyed) {
      console.warn(`Stuff.destroy(): Object ${this.stuffId} already destroyed`);
      return;
    }

    // Mark as destroyed (prevents double-destroy)
    this._isDestroyed = true;

    // Critical housekeeping - unregister from StuffApi
    // This MUST happen for garbage collection to work properly
    StuffApi.unregister(this);
  }

  /**
   * Terminal `onDestruct` no-op. Exists so subclasses and mixins
   * overriding `onDestruct` can call `super.onDestruct()` without
   * the cast-to-optional-callable dance — the chain is guaranteed
   * to bottom out here. `StuffApi.destruct` invokes the hook via
   * the optional-method dispatcher in `api/stuff.ts`; that path
   * still works (always finds a function on the prototype).
   *
   * Override (not extend with `super`) at any layer that wants
   * cleanup; chain to `super.onDestruct()` from the override so
   * intermediate layers in a mixin chain run too.
   */
  public onDestruct(): void {}

  /**
   * Get a string representation of this object (for debugging).
   */
  public toString(): string {
    return `[Stuff ${this.stuffId}${this._isDestroyed ? ' (destroyed)' : ''}]`;
  }
}
