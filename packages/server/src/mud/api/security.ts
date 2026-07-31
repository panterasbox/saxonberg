/**
 * SecurityApi — single source of truth for the call-security framework's
 * decorator-driven metadata and resolver pipeline.
 *
 * The decorators in `mud/lib/security/decorators.ts` are thin wrappers
 * that stamp metadata into THIS class. The proxy and ShadowApi consult
 * the resolver methods on THIS class at dispatch time. Tests poke the
 * `_*ForTest` seams to inspect or seed entries.
 *
 * What lives here:
 *   - `@CallSecurity` per-method + class-default policies
 *   - `@Unshadowable` per-method + class-form marks
 *   - `@Final` per-method marks
 *   - `@ShadowSecurity` per-method attach/detach specs
 *   - Static-method wrapping for Api classes (`decorateApiClass` and
 *     the per-descriptor wrap that pushes a frame + runs the policy)
 *   - Resolver methods used by the proxy and ShadowApi
 *
 * What stays in `mud/lib/security/decorators.ts`:
 *   - Just the decorator functions (`@CallSecurity`, `@Unshadowable`,
 *     `@Final`, `@Shadowing`, `@ShadowSecurity`). Each is a few lines
 *     that calls into `SecurityApi._set*(...)`.
 *
 * Like `ExecutionContextApi` and `ModuleApi`, this class deliberately
 * does NOT call `decorateApiClass(...)` on itself — wrapping its own
 * resolvers in policy/frame plumbing would form a bootstrap cycle and
 * push noise frames onto every policy lookup.
 */

import { nanoid } from 'nanoid';
import type { SecurityPolicy } from '../lib/security/SecurityPolicies';
import { ExecutionContextApi } from './execution-context';
import { ModuleApi } from './module';
import { ProxyApi, type Interceptor, type InterceptionContext } from './proxy';
import { SecurityError } from '../lib/security/errors';

/**
 * Late-binding handle to ShadowApi. We deliberately do NOT
 * `import { ShadowApi }` at the top of this file: shadow.ts imports
 * `SecurityApi` and runs `SecurityApi.decorateApiClass(ShadowApi)` at
 * module-bottom, which would crash mid-cycle if `security.ts` were
 * ALSO depending on `shadow.ts` to load first.
 *
 * Instead, `BootstrapManager.installFrameworkWiring()` calls
 * `SecurityApi._registerShadowApi(ShadowApi)` at boot (and the vitest
 * setup file does the same before every suite). The interceptor
 * dereferences this slot at runtime only, by which point the wiring
 * pass has run.
 */
interface ShadowApiLike {
  _consumeBypass(): boolean;
  _shadowsFor(host: object, methodName: string): ReadonlyArray<object> | null;
  _withDispatch<T>(
    host: object,
    methodName: string,
    shadows: ReadonlyArray<object>,
    args: unknown[],
    fn: () => T
  ): T;
  _invokeOnShadow(shadow: object, hostMethodName: string, args: unknown[]): unknown;
}

/**
 * Class-constructor-shaped key. Function with a `prototype`; matches both
 * concrete and abstract constructors. Authored as an interface
 * intersection so `@typescript-eslint/ban-types`' "no bare Function"
 * lint passes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClassKey = (abstract new (...args: any[]) => unknown) & {
  prototype: unknown;
};

/**
 * Per-method `@ShadowSecurity` shape. `attach` and `detach` each
 * gate the corresponding `ShadowApi` operation on the host method.
 * Omitted ops default to Public.
 */
export interface ShadowSecuritySpec {
  attach?: SecurityPolicy;
  detach?: SecurityPolicy;
}

/**
 * Local fallback used when no `@CallSecurity` decorator is found
 * anywhere on the prototype chain. Same semantics as
 * `SecurityPolicies.Public` but defined here to avoid importing
 * `SecurityPolicies` and forming a load-time cycle.
 */
const PUBLIC_FALLBACK: SecurityPolicy = {
  name: 'Public',
  allows: () => true,
};

export class SecurityApi {
  private constructor() {}

  /* ─────────────────────────── Identity ─────────────────────────── */

  /**
   * Mint a fresh, URL-safe, collision-resistant identifier — the
   * project-wide id source. Server code calls this instead of importing
   * `nanoid` directly, so id generation routes through one Api seam (the
   * client mints its own ids browser-side). Despite the name it returns
   * a nanoid (21 chars by default), not an RFC-4122 UUID.
   *
   * @param size optional length override (e.g. short handles).
   */
  public static uuid(size?: number): string {
    return size === undefined ? nanoid() : nanoid(size);
  }

  /* ─────────────────────────── Storage ─────────────────────────── */

  /** Per-method @CallSecurity. Outer key = class; inner key = method. */
  static #methodPolicies: WeakMap<ClassKey, Map<string, SecurityPolicy>> =
    new WeakMap();

  /** Class-form @CallSecurity — default for unannotated methods. */
  static #classDefaultPolicies: WeakMap<ClassKey, SecurityPolicy> =
    new WeakMap();

  /** Per-method @Unshadowable. */
  static #methodUnshadowable: WeakMap<ClassKey, Set<string>> = new WeakMap();

  /** Class-form @Unshadowable. */
  static #classUnshadowable: WeakSet<ClassKey> = new WeakSet();

  /** @Final method names per class. Read by the loader-hook validator. */
  static #finalMethods: WeakMap<ClassKey, Set<string>> = new WeakMap();

  /** Per-method @ShadowSecurity. */
  static #shadowSecurity: WeakMap<ClassKey, Map<string, ShadowSecuritySpec>> =
    new WeakMap();

  /**
   * Bounded dedup set for the inert-call debug log (stuffIds whose ghost
   * has already been logged once). A destroyed Stuff's method calls are
   * inert no-ops (see the gate), but the FIRST such call per object is
   * logged at debug level so a leaked strong ref stays observable to
   * senior devs without per-call spam. Capacity-capped so it never grows
   * unbounded on a long-running server.
   */
  static #inertCallsSeen: Set<string> = new Set();
  static readonly #INERT_LOG_CAP = 4096;

  /* ─────────────────────── Decorator-side writers ─────────────────────── */

  /** Stamp a per-method @CallSecurity policy. @internal */
  public static _setMethodPolicy(
    cls: object,
    methodName: string,
    policy: SecurityPolicy
  ): void {
    const k = cls as ClassKey;
    let map = SecurityApi.#methodPolicies.get(k);
    if (!map) {
      map = new Map();
      SecurityApi.#methodPolicies.set(k, map);
    }
    map.set(methodName, policy);
  }

  /** Stamp a class-form @CallSecurity default policy. @internal */
  public static _setClassDefaultPolicy(
    cls: object,
    policy: SecurityPolicy
  ): void {
    SecurityApi.#classDefaultPolicies.set(cls as ClassKey, policy);
  }

  /** Stamp a method-form @Unshadowable. @internal */
  public static _markMethodUnshadowable(cls: object, methodName: string): void {
    const k = cls as ClassKey;
    let set = SecurityApi.#methodUnshadowable.get(k);
    if (!set) {
      set = new Set();
      SecurityApi.#methodUnshadowable.set(k, set);
    }
    set.add(methodName);
  }

  /** Stamp a class-form @Unshadowable. @internal */
  public static _markClassUnshadowable(cls: object): void {
    SecurityApi.#classUnshadowable.add(cls as ClassKey);
  }

  /** Stamp a method as @Final. @internal */
  public static _markFinalMethod(cls: object, methodName: string): void {
    const k = cls as ClassKey;
    let methods = SecurityApi.#finalMethods.get(k);
    if (!methods) {
      methods = new Set();
      SecurityApi.#finalMethods.set(k, methods);
    }
    methods.add(methodName);
  }

  /** Stamp a per-method @ShadowSecurity spec. @internal */
  public static _setShadowSecurity(
    cls: object,
    methodName: string,
    spec: ShadowSecuritySpec
  ): void {
    const k = cls as ClassKey;
    let map = SecurityApi.#shadowSecurity.get(k);
    if (!map) {
      map = new Map();
      SecurityApi.#shadowSecurity.set(k, map);
    }
    map.set(methodName, spec);
  }

  /* ─────────────────────── Read-side resolvers ─────────────────────── */

  /**
   * Resolve the entry policy for a method on `instance`. Walks the
   * prototype chain looking for the closest method-form `@CallSecurity`,
   * then falls back to class-form default along the chain, then to
   * Public.
   *
   * Resolution order:
   *   1. Method-form @CallSecurity (closest in prototype chain)
   *   2. Class-form @CallSecurity (closest in prototype chain)
   *   3. Public (framework default)
   */
  public static resolveCallPolicy(
    instance: object,
    methodName: string
  ): SecurityPolicy {
    let proto: unknown = Object.getPrototypeOf(instance);
    while (proto && proto !== Object.prototype) {
      const cls = (proto as { constructor: ClassKey }).constructor;
      const map = SecurityApi.#methodPolicies.get(cls);
      if (map?.has(methodName)) {
        return map.get(methodName)!;
      }
      proto = Object.getPrototypeOf(proto);
    }
    proto = Object.getPrototypeOf(instance);
    while (proto && proto !== Object.prototype) {
      const cls = (proto as { constructor: ClassKey }).constructor;
      const policy = SecurityApi.#classDefaultPolicies.get(cls);
      if (policy) return policy;
      proto = Object.getPrototypeOf(proto);
    }
    return PUBLIC_FALLBACK;
  }

  /**
   * Resolve the entry policy for a static method on `cls`. Walks up
   * the class itself (not the prototype chain — statics aren't
   * inherited the same way). Returns Public if no policy was registered.
   */
  public static resolveStaticCallPolicy(
    cls: object,
    methodName: string
  ): SecurityPolicy {
    let current: ClassKey | null = cls as ClassKey;
    while (current) {
      const map = SecurityApi.#methodPolicies.get(current);
      if (map?.has(methodName)) return map.get(methodName)!;
      current = Object.getPrototypeOf(current) as ClassKey | null;
      if (current === Function.prototype || current === null) break;
    }
    current = cls as ClassKey;
    while (current) {
      const policy = SecurityApi.#classDefaultPolicies.get(current);
      if (policy) return policy;
      current = Object.getPrototypeOf(current) as ClassKey | null;
      if (current === Function.prototype || current === null) break;
    }
    return PUBLIC_FALLBACK;
  }

  /**
   * Returns true if the method is marked unshadowable — either
   * method-form on it directly, or class-form on the host's class
   * or any ancestor. Read at attach time by `ShadowApi`.
   */
  public static isMethodUnshadowable(
    hostInstance: object,
    methodName: string
  ): boolean {
    let proto: unknown = Object.getPrototypeOf(hostInstance);
    while (proto && proto !== Object.prototype) {
      const cls = (proto as { constructor: ClassKey }).constructor;
      if (SecurityApi.#classUnshadowable.has(cls)) return true;
      const set = SecurityApi.#methodUnshadowable.get(cls);
      if (set?.has(methodName)) return true;
      proto = Object.getPrototypeOf(proto);
    }
    return false;
  }

  /**
   * Resolve `@ShadowSecurity` for `host[methodName]`. Walks the host's
   * prototype chain; closest spec wins. Returns `null` when nothing is
   * stamped — `ShadowApi` treats absent specs as Public.
   */
  public static resolveShadowSecurity(
    host: object,
    methodName: string
  ): ShadowSecuritySpec | null {
    let proto: unknown = Object.getPrototypeOf(host);
    while (proto && proto !== Object.prototype) {
      const cls = (proto as { constructor: ClassKey }).constructor;
      const map = SecurityApi.#shadowSecurity.get(cls);
      const spec = map?.get(methodName);
      if (spec) return spec;
      proto = Object.getPrototypeOf(proto);
    }
    return null;
  }

  /**
   * Returns the set of @Final method names declared on `cls` directly
   * (not inherited). Read by the loader-hook validator
   * (`ModuleApi.stamp`'s `#validateNoFinalOverrides`).
   */
  public static getFinalMethods(cls: object): ReadonlySet<string> | undefined {
    return SecurityApi.#finalMethods.get(cls as ClassKey);
  }

  /* ─────────────────────── Static-method wrapping ─────────────────────── */

  /**
   * Apply the standard Api-class decoration imperatively — used by
   * Api files that can't take a `@CallSecurity` class decorator
   * because they have `static #private` identifiers (TS18036). Stamps
   * the class-default policy as Public (only when no policy is
   * already registered, so we don't trample a per-method or class-form
   * decorator that ran first) and wraps every own static method so
   * static Api calls push frames.
   */
  public static decorateApiClass(cls: object): void {
    const k = cls as ClassKey;
    if (!SecurityApi.#classDefaultPolicies.has(k)) {
      SecurityApi.#classDefaultPolicies.set(k, PUBLIC_FALLBACK);
    }
    SecurityApi.#wrapAllStaticMethods(k);
  }

  /**
   * Wrap every own static method on `cls` without touching the
   * class-default policy. Used by `@CallSecurity` (class form) which
   * sets its own policy first via `_setClassDefaultPolicy` and then
   * calls this helper to do just the wrapping. @internal
   */
  public static _wrapStaticMethods(cls: object): void {
    SecurityApi.#wrapAllStaticMethods(cls as ClassKey);
  }

  /**
   * Wrap a single static method's descriptor in-place so each
   * invocation pushes a CallFrame and runs the resolved policy.
   * Called by both the `@CallSecurity` method-form decorator (for a
   * single static) and `decorateApiClass` (for every static on the
   * class). @internal
   */
  public static _wrapStaticDescriptor(
    cls: object,
    methodName: string,
    descriptor: PropertyDescriptor
  ): void {
    SecurityApi.#wrapStaticDescriptor(cls as ClassKey, methodName, descriptor);
  }

  static #wrapStaticDescriptor(
    cls: ClassKey,
    methodName: string,
    descriptor: PropertyDescriptor
  ): void {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    if ((original as { _callSecWrapped?: boolean })._callSecWrapped) {
      return;
    }
    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      const policy = SecurityApi.resolveStaticCallPolicy(cls, methodName);
      const caller = ExecutionContextApi.getCurrentTarget();
      const allowed = policy.allows(caller, cls, methodName, args);
      const deny = (): never => {
        throw new SecurityError(
          `Policy ${policy.name} denied ${(cls as { name?: string }).name ?? '<class>'}.${methodName}()`,
          { methodName, policyName: policy.name }
        );
      };
      if (allowed instanceof Promise) {
        return allowed.then((ok) => {
          if (!ok) deny();
          return ExecutionContextApi.run(caller, cls, methodName, undefined, () =>
            original.apply(this, args)
          );
        });
      }
      if (!allowed) deny();
      return ExecutionContextApi.run(caller, cls, methodName, undefined, () =>
        original.apply(this, args)
      );
    };
    Object.defineProperty(wrapped, 'name', {
      value: original.name,
      configurable: true,
    });
    (wrapped as { _callSecWrapped?: boolean })._callSecWrapped = true;
    descriptor.value = wrapped;
    Object.defineProperty(cls, methodName, descriptor);
  }

  static #wrapAllStaticMethods(cls: ClassKey): void {
    for (const name of Object.getOwnPropertyNames(cls)) {
      if (name === 'length' || name === 'name' || name === 'prototype') continue;
      const descriptor = Object.getOwnPropertyDescriptor(cls, name);
      if (!descriptor) continue;
      if (typeof descriptor.value !== 'function') continue;
      if ((descriptor.value as { _callSecWrapped?: boolean })._callSecWrapped) {
        continue;
      }
      SecurityApi.#wrapStaticDescriptor(cls, name, descriptor);
    }
  }

  /* ───────────────────── Test-seam enforcement ─────────────────────
   *
   * Every `_*ForTest` / `_*ForTesting` method on every Api class
   * starts with a call to `SecurityApi.assertTestOnly(op)`. The check
   * walks `Error.stack` and looks for a `.test.{ts,js}` spec frame or a
   * `__tests__/` fixture frame anywhere in the call chain. Production
   * code that accidentally (or deliberately) reaches a test seam fails
   * loudly at the call site instead of quietly bypassing framework
   * invariants.
   *
   * Cached per-URL: first call from any source file does the stack
   * walk + cache; subsequent calls from the same site are a Map
   * lookup. The cost is negligible after warmup.
   *
   * The allowlist is "any frame anywhere in the stack is in a test
   * file" — looser than `ExecutionContextApi`'s "immediate caller
   * must match," but right for test seams. Tests legitimately call
   * framework code which might call further framework code; what
   * matters is that some test is at the bottom of the chain, not
   * that every frame between is a test.
   */
  static #testCallerCache: Map<string, boolean> = new Map();

  /**
   * Throw `SecurityError` unless some frame on the current call stack
   * is test code — a `.test.{ts,js}` spec or a `__tests__/` fixture.
   * Call from the top of every `_*ForTest` / `_*ForTesting` method to
   * guarantee production code can't reach the seam.
   *
   * `op` is the seam name; included in the error message so the
   * offender sees exactly which seam was misused.
   */
  public static assertTestOnly(op: string): void {
    // The predicate IS the cache reader — `findFrameMatching` stops at
    // the first frame that returns true, so caching test-frame hits as
    // `true` short-circuits future calls from the same site.
    const matched = ModuleApi.findFrameMatching((url) => {
      const cached = SecurityApi.#testCallerCache.get(url);
      if (cached !== undefined) return cached;
      // Test code is either a `.test.{ts,js}` spec or a shared fixture
      // under a `__tests__/` directory (e.g. `__tests__/test-helpers.ts`).
      // The latter matters because a fixture calling a `*ForTest` seam
      // adds frames that can push the originating `.test.ts` past the
      // captured stack window — and a fixture under `__tests__/` is
      // itself test code, never reachable from production.
      const isTest =
        /\.test\.(ts|js)(\?|$|:)/.test(url) || /\/__tests__\//.test(url);
      SecurityApi.#testCallerCache.set(url, isTest);
      return isTest;
    });
    if (matched === null) {
      throw new SecurityError(
        `${op}: test-only seam called from non-test code. ` +
          `Production code must not reach methods named *ForTest / *ForTesting.`
      );
    }
  }

  /* ─────────────────────────── Runtime gate ─────────────────────────── */
  /*
   * The interceptor is the security framework's plug-in into ProxyApi.
   * Installed via the static initializer below at module-load time, so
   * anyone who imports `SecurityApi` (which everyone does) automatically
   * wires up the runtime gate. `installInterceptor()` is idempotent —
   * calling it again is a no-op — so tests that reset ProxyApi can
   * re-install without duplicating.
   *
   * Runtime responsibilities (in order, per dispatch):
   *
   *   (a) Honour `ShadowApi`'s bypass marker — `Shadow.callBypass()`
   *       and `callDown()` at the bottom of the chain set it to mean
   *       "this single onward read/invocation should run raw,
   *       skipping every check below."
   *   1.  Destroyed-object guard. `isDestroyed` and `toString` exempt.
   *   2.  Resolve and run the entry policy. Caller = previous frame's
   *       target (the spec's "caller = previous target" invariant).
   *   3.  If shadows are attached for this method, dispatch through
   *       them with per-shadow CallFrames. Each shadow runs as its
   *       own target so onward calls show the shadow's identity.
   *   4.  No shadows → push the host's frame and call `next()`, which
   *       runs the raw operation (or the next interceptor when more
   *       are registered).
   */

  /** Tracks whether the interceptor has been installed yet. Set true
   *  by `installInterceptor()`; lets the call be idempotent. */
  static #interceptorInstalled = false;

  /**
   * Late-bound ShadowApi reference, installed by
   * `BootstrapManager.installFrameworkWiring()` (boot + test setup).
   * The interceptor reads this slot at runtime only, so the
   * security-shadow load cycle stays acyclic at module-eval time.
   */
  static #shadowApi: ShadowApiLike | null = null;

  /**
   * Slot for the boot wiring to hand `ShadowApi` to the security gate
   * (`BootstrapManager.installFrameworkWiring`); idempotent.
   * @internal
   */
  public static _registerShadowApi(impl: ShadowApiLike): void {
    SecurityApi.#shadowApi = impl;
  }

  /* ───────────────── Sandbox boundary check (Layer 4) ─────────────────
   *
   * Cross-scope dispatch is denied wholesale: context scope must equal
   * receiver scope, in both directions, with exactly the enumerated
   * pass-throughs below (system omni, infrastructure exemption, the
   * logged inspection aperture, the message-delivery seam, and the rare
   * jurisdiction bound). Zero circles ⇒ two loads and one compare —
   * `null === null` short-circuits before any other work.
   */

  /**
   * Base classes whose instances are boundary-exempt infrastructure
   * (Decision J) — registered by `BootstrapManager.installFrameworkWiring`
   * (`ApiLogic` today). Late-bound like `#shadowApi` so this
   * bootstrap-special module never imports the mud class graph.
   * `instanceof` against a registered base is spoof-proof (prototype
   * chain), unlike a duck-typed marker method.
   */
  static #boundaryExemptBases: Array<abstract new (...a: never[]) => unknown> =
    [];

  /** @internal — boot wiring only; idempotent per class. */
  public static _registerBoundaryExemptBase(
    cls: abstract new (...a: never[]) => unknown
  ): void {
    if (!SecurityApi.#boundaryExemptBases.includes(cls)) {
      SecurityApi.#boundaryExemptBases.push(cls);
    }
  }

  /**
   * Non-`ApiLogic` singletons (registries, catalogues, vocabulary
   * holders) exempted by ENUMERATION, never inference — anything
   * unmarked and unscoped is subject to the ordinary compare, so a new
   * module category fails closed. Classified holder-by-holder in
   * docs/subsystems/sandbox.md; the needs-a-guard members additionally
   * carry per-mutator scope checks.
   */
  static readonly #BOUNDARY_EXEMPT_TEMPLATE_PATHS: ReadonlySet<string> =
    new Set([
      '/obj/EventRegistry',
      '/obj/AccessRegistry',
      '/obj/ParcelRegistry',
      '/obj/OfficeRegistry',
      '/obj/ChattelRegistry',
      '/obj/GroupRegistry',
      '/obj/ReactionRegistry',
      '/obj/MqlSubscriptionRegistry',
      '/obj/SchedulerRegistry',
      '/obj/WorldClockRegistry',
      '/obj/EventSubscriptions',
      '/obj/AddressRegistry',
      '/obj/TopicCatalogue',
      // The staff→player news window. Read-only presentation content
      // (writes are REFUSE'd at the PM layer), and the session
      // ceremony reads it to build a client's bootstrap payload — so a
      // player crossing into a circle must be able to reach it, or the
      // whole ceremony throws and they arrive to a blank screen.
      '/obj/BulletinBoard',
      '/obj/SoulCatalogue',
      '/obj/SubjectCatalogue',
      '/obj/ChannelCatalogue',
      '/obj/CorpoCatalogue',
    ]);

  /**
   * The Sensor delivery pipeline — the ONE allowlisted cross-boundary
   * dispatch channel (comms are seamless; Decision N). Narrow by
   * construction: the frame body is rendered MML materialized
   * per-recipient at compose time and the payload carries `StuffRef`
   * snapshots, so no live reference can ride the exception. A fixed
   * method set, not a predicate authors can widen.
   */
  static readonly #MESSAGE_DELIVERY_METHODS: ReadonlySet<string> = new Set([
    'onMessage',
    'filterMessage',
    'handleMessage',
    'onEnvelope',
    'filterEnvelope',
    'handleEnvelope',
  ]);

  /**
   * Framework identity primitives exempt from the boundary compare —
   * the same reads the destroyed-object guard exempts, plus the scope
   * read itself. These answer "what is this?" (liveness, identity,
   * scope), never touch domain state, and framework plumbing (registry
   * upkeep, MQL result filtering, receipts) must be able to ask them
   * about any object. NOT a read allowlist — a fixed framework set.
   */
  static readonly #BOUNDARY_EXEMPT_METHODS: ReadonlySet<string> = new Set([
    'isDestroyed',
    'toString',
    'getTemplatePath',
    'getCircleScope',
    'getIdentityPath',
    'getPlayerId',
    'getPresentation',
    // The connection-transport seam (HasInteractive): the third
    // principal state is OUT-OF-WORLD plumbing — a socket must attach
    // to / detach from a holder on either side of the boundary (the
    // crossing itself moves Interactives between a field body and a
    // circle vessel). No domain state rides these.
    'getHolder',
    'setHolder',
    'getInteractives',
    'addInteractive',
    'removeInteractive',
    'hasInteractive',
    'isConnected',
    'isLinkdead',
    'onConnectionAttached',
    'onConnectionDetached',
    'onLinkdead',
    'onLinkRestored',
  ]);

  /** Single-dispatch inspection bypass (the ShadowApi `_consumeBypass`
   *  shape). Armed only via {@link _armInspectionBypass}; every arm is
   *  the caller's (SandboxApi's) responsibility to gate and log. */
  static #inspectionBypassArmed = false;

  /**
   * Arm a one-dispatch boundary bypass — the due-process inspection
   * aperture. @internal — `SandboxApi.inspect` is the sole caller and
   * owns gating + receipt logging; this seam just arms the latch.
   */
  public static _armInspectionBypass(): void {
    SecurityApi.#inspectionBypassArmed = true;
  }

  static #consumeInspectionBypass(): boolean {
    if (!SecurityApi.#inspectionBypassArmed) return false;
    SecurityApi.#inspectionBypassArmed = false;
    return true;
  }

  /**
   * Is `target` boundary-exempt infrastructure? Registered-base
   * `instanceof` OR enumerated template path; the verdict is cached on
   * the raw target (a lazily-stamped slot) so the steady-state cost is
   * one property read.
   */
  static #isBoundaryExempt(target: {
    getTemplatePath(): string | null;
  }): boolean {
    const slot = target as unknown as { _boundaryExemptCache?: boolean };
    const cached = slot._boundaryExemptCache;
    if (cached !== undefined) return cached;
    let exempt = false;
    for (const base of SecurityApi.#boundaryExemptBases) {
      if (target instanceof (base as new (...a: unknown[]) => object)) {
        exempt = true;
        break;
      }
    }
    if (!exempt) {
      const path = target.getTemplatePath();
      exempt =
        path !== null && SecurityApi.#BOUNDARY_EXEMPT_TEMPLATE_PATHS.has(path);
    }
    slot._boundaryExemptCache = exempt;
    return exempt;
  }

  /**
   * Fire-and-forget denial receipt (channel `sandbox.boundary`):
   * caller module-id, receiver identity, method, and the scope pair.
   * Dynamic import (the `_recordGuardError` pattern) — diagnostics
   * must never break or slow the deny path.
   */
  static #emitBoundaryReceipt(
    kind: 'dispatch' | 'shadow-attach' | 'shadow-detach' | 'mutation-guard',
    receiver: { stuffId?: string; getTemplatePath?: () => string | null },
    method: string,
    ctxScope: string | null,
    rcvScope: string | null
  ): void {
    // Captured SYNCHRONOUSLY, before the async receipt body: taken
    // inside the IIFE it records only the IIFE. The `caller` line names
    // the principal, but the boundary's hard cases are the ones where
    // the principal is a framework frame (`<unresolved>`) and the only
    // useful question is which walk reached across — a residency sweep,
    // an MQL re-resolve, a per-viewer render. That's the stack.
    const denyStack = new Error('boundary-deny').stack ?? null;
    void (async () => {
      try {
        const caller = ExecutionContextApi.getCurrentTarget();
        const callerCls =
          caller && typeof caller === 'object'
            ? (caller as object).constructor
            : null;
        const callerModule = callerCls ? ModuleApi.lookup(callerCls) : null;
        const receiverPath = receiver.getTemplatePath?.() ?? null;
        const { DiagnosticApi } = await import('./diagnostics');
        await DiagnosticApi.record({
          path: receiverPath,
          channel: 'sandbox.boundary',
          severity: 'error',
          message:
            `sandbox boundary denied ${kind}: ${method}() on ` +
            `${receiver.stuffId ?? '<unknown>'} (${receiverPath ?? 'no path'}) — ` +
            `context scope ${ctxScope ?? 'field'} vs receiver scope ` +
            `${rcvScope ?? 'field'}; caller ${callerModule ?? '<unresolved>'}`,
          stack: denyStack,
        });
      } catch {
        // receipts are best-effort; the deny already threw
      }
    })();
  }

  /**
   * The same scope rule at the SHADOW seam — `ShadowApi.attach`/`detach`
   * call this against the host's stamped scope before any mutation.
   * Omni and the inspection bypass except; mismatch emits the receipt
   * and throws. No message-delivery or exemption pass-throughs here —
   * shadow installation is never a delivery and never infrastructure.
   * @internal
   */
  public static _assertShadowBoundary(
    host: { stuffId: string; getCircleScope(): string | null;
            getTemplatePath(): string | null },
    op: 'attach' | 'detach'
  ): void {
    const rcvScope = host.getCircleScope();
    const ctxScope = ExecutionContextApi.getCircleScope();
    if (rcvScope === ctxScope) return;
    if (ctxScope === '*') return;
    if (SecurityApi.#consumeInspectionBypass()) return;
    SecurityApi.#emitBoundaryReceipt(
      op === 'attach' ? 'shadow-attach' : 'shadow-detach',
      host,
      op,
      ctxScope,
      rcvScope
    );
    throw new SecurityError(
      `sandbox boundary denied shadow ${op} on ${host.stuffId}: ` +
        `context scope ${ctxScope ?? 'field'} vs host scope ` +
        `${rcvScope ?? 'field'}`,
      { stuffId: host.stuffId, methodName: op, policyName: 'SandboxBoundary' }
    );
  }

  /**
   * Per-mutator guard for the audited needs-a-guard singleton methods
   * (docs/subsystems/sandbox.md § exempt-singleton classification): a
   * flagged mutation of field-visible shared state denies under circle
   * scope, with a receipt. One line at the top of each flagged mutator.
   */
  public static assertFieldMutation(
    holder: { stuffId?: string; getTemplatePath?: () => string | null },
    method: string
  ): void {
    const ctxScope = ExecutionContextApi.getCircleScope();
    if (ctxScope === null || ctxScope === '*') return;
    SecurityApi.#emitBoundaryReceipt(
      'mutation-guard',
      holder,
      method,
      ctxScope,
      null
    );
    throw new SecurityError(
      `sandbox boundary denied ${method}: this mutation writes ` +
        `field-visible shared state and may not run from circle scope ` +
        `${ctxScope}`,
      { methodName: method, policyName: 'SandboxBoundary' }
    );
  }

  /**
   * Register the security gate as a `ProxyApi` interceptor. Called
   * automatically by the static initializer at module-load time;
   * idempotent — safe for tests that reset ProxyApi to call again.
   */
  public static installInterceptor(): void {
    if (SecurityApi.#interceptorInstalled) return;
    ProxyApi.registerInterceptor(SecurityApi.#securityGate);
    SecurityApi.#interceptorInstalled = true;
  }

  /**
   * The interceptor function itself. Defined as a static `#`-private
   * arrow-bound method so it can be passed by reference to
   * `ProxyApi.registerInterceptor` without losing the `SecurityApi`
   * binding it closes over.
   */
  static #securityGate: Interceptor = (
    ctx: InterceptionContext,
    next: () => unknown
  ): unknown => {
    const shadowApi = SecurityApi.#shadowApi;

    // (a) bypass marker — single-shot, consumed atomically. Skips the
    // check entirely if ShadowApi hasn't registered yet (only happens
    // during boot before any Stuff exists, so no shadows are possible).
    if (shadowApi?._consumeBypass()) {
      return next();
    }

    // 1. destroyed-object guard — a destroyed Stuff is INERT: any method
    // call is a no-op returning `undefined`, never a throw.
    //
    // Why no-op, not throw: a destroyed object can still be reached
    // transiently — an in-flight async that captured it before destruct,
    // a broadcast iterating a set that hasn't dropped the dead entry yet,
    // a scheduled tick that hadn't been cancelled. Throwing turned those
    // benign races into crashes / unhandled rejections that cascaded
    // (e.g. a guest's destruct racing a thermal reconcile). Making the
    // object inert keeps the whole system robust with ZERO per-call-site
    // instrumentation — content authors never have to know a removed
    // object is still callable; the worst a `value = dead.getFoo()` does
    // is return `undefined` (an ordinary null check), never explode.
    //
    // This is orthogonal to garbage collection: GC reclaims an object
    // when no STRONG ref remains, which is the job of `cleanupOnDestruct`
    // (release stored refs) — not of this gate. The inert no-op just
    // stops the crash; it neither helps nor hinders collection.
    //
    // `isDestroyed` / `toString` / `getTemplatePath` are exempt and run
    // normally: the unregister path reads `getTemplatePath` on a
    // freshly-destroyed Stuff to drop the index entry, and callers must
    // be able to *ask* whether a Stuff is destroyed.
    if (
      ctx.prop !== 'isDestroyed' &&
      ctx.prop !== 'toString' &&
      ctx.prop !== 'getTemplatePath' &&
      ctx.target.isDestroyed()
    ) {
      // First call per dead object → one debug line, so a leaked strong
      // ref stays observable without per-call spam. Bounded set.
      const id = ctx.target.stuffId;
      if (!SecurityApi.#inertCallsSeen.has(id)) {
        if (SecurityApi.#inertCallsSeen.size >= SecurityApi.#INERT_LOG_CAP) {
          SecurityApi.#inertCallsSeen.clear();
        }
        SecurityApi.#inertCallsSeen.add(id);
        console.debug(
          `[inert] ${ctx.prop}() called on destroyed Stuff ${id} ` +
            `(no-op); a strong ref to it outlived destruct.`
        );
      }
      return undefined;
    }

    // 1b. sandbox boundary (Layer 4) — AFTER the destroyed guard (dead
    // objects stay inert no-ops) and BEFORE the entry policy (denials
    // are boundary-attributed). Fast path: two loads, one compare —
    // `null === null` (with no jurisdiction bound) covers the entire
    // zero-circle world. Both context fields come from ONE frame-0
    // read (`_boundaryContext`).
    const rcvScope = ctx.target.getCircleScope();
    const bctx = ExecutionContextApi._boundaryContext();
    const ctxScope = bctx.scope;
    if (rcvScope !== ctxScope || bctx.bound !== null) {
      let pass =
        ctxScope === '*' ||
        SecurityApi.#BOUNDARY_EXEMPT_METHODS.has(ctx.prop) ||
        SecurityApi.#isBoundaryExempt(ctx.target) ||
        SecurityApi.#consumeInspectionBypass() ||
        SecurityApi.#MESSAGE_DELIVERY_METHODS.has(ctx.prop);
      if (!pass && bctx.bound !== null && rcvScope === ctxScope) {
        // Jurisdiction bound (governed eval, Decision K): a FIELD
        // receiver under the bound's extent is in-jurisdiction —
        // writes are real inside, denied outside. Rare path; allowed
        // to be O(path length).
        if (rcvScope === null) {
          const path = ctx.target.getTemplatePath();
          pass = path !== null && path.startsWith(bctx.bound);
        }
      }
      if (!pass) {
        SecurityApi.#emitBoundaryReceipt(
          'dispatch',
          ctx.target,
          ctx.prop,
          ctxScope,
          rcvScope
        );
        throw new SecurityError(
          `sandbox boundary denied ${ctx.prop}() on Stuff ${ctx.target.stuffId}: ` +
            `context scope ${ctxScope ?? 'field'} vs receiver scope ` +
            `${rcvScope ?? 'field'}` +
            (bctx.bound !== null ? ` (jurisdiction ${bctx.bound})` : ''),
          {
            stuffId: ctx.target.stuffId,
            methodName: ctx.prop,
            policyName: 'SandboxBoundary',
          }
        );
      }
    }

    // 2. entry policy
    const policy = SecurityApi.resolveCallPolicy(ctx.target, ctx.prop);
    const caller = ExecutionContextApi.getCurrentTarget();
    const allowedOrPromise = policy.allows(caller, ctx.proxy, ctx.prop, ctx.args);
    const deny = (): never => {
      throw new SecurityError(
        `Policy ${policy.name} denied ${ctx.prop}() on Stuff ${ctx.target.stuffId}`,
        {
          stuffId: ctx.target.stuffId,
          methodName: ctx.prop,
          policyName: policy.name,
        }
      );
    };

    const proceed = (): unknown => {
      // 2a. Residency last-touch instrumentation. Fires only on a
      // successful (non-denied) dispatch — denied calls don't count as
      // touches — and only on a real method call, not a getter read
      // (`!ctx.isGetter`): a passive read shouldn't keep an object
      // resident. `ctx.target` is the raw Stuff, so `touch()` runs
      // un-proxied (no re-entry into this gate) and writes its slot
      // directly.
      if (!ctx.isGetter) {
        ctx.target.touch();
      }

      // 3. shadow dispatch. Lookup keyed by proxyRef — `ShadowApi.attach`
      // stored the proxy, so lookup must use the same identity. When
      // shadows fire, the chain is a complete replacement for the raw
      // call — we don't call next() in this branch.
      const shadows = shadowApi?._shadowsFor(ctx.proxy, ctx.prop) ?? null;
      if (shadows && shadows.length > 0) {
        return shadowApi!._withDispatch(
          ctx.proxy,
          ctx.prop,
          shadows,
          ctx.args as unknown[],
          () => {
            const top = shadows[shadows.length - 1]!;
            return ExecutionContextApi.run(
              caller,
              top,
              ctx.prop,
              undefined,
              () =>
                shadowApi!._invokeOnShadow(
                  top,
                  ctx.prop,
                  ctx.isGetter ? [] : (ctx.args as unknown[])
                )
            );
          }
        );
      }

      // 4. no shadows — push the host's frame and continue the pipeline.
      return ExecutionContextApi.run(
        caller,
        ctx.proxy,
        ctx.prop,
        undefined,
        () => next()
      );
    };

    if (allowedOrPromise instanceof Promise) {
      return allowedOrPromise.then((ok) => {
        if (!ok) deny();
        return proceed();
      });
    }
    if (!allowedOrPromise) deny();
    return proceed();
  };

  /**
   * Static initializer: registers the security gate with `ProxyApi`
   * automatically when this module evaluates. Anyone who imports
   * `SecurityApi` — `StuffApi`, `ShadowApi`, `ProxyApi` consumers,
   * the test seam — implicitly triggers this. No side-effect imports
   * required at the call sites.
   *
   * `SecurityApi` itself, and the other three bootstrap-special Apis
   * (`ModuleApi`, `ProxyApi`, `ExecutionContextApi`), are never
   * self-decorated — wrapping them recurses or pollutes the stack (see
   * call-security.md § Why Some Api Files Don't Self-Decorate). Every
   * other `*Api` facade decorates itself with a module-scope
   * `SecurityApi.decorateApiClass(FooApi)` tail.
   */
  static {
    SecurityApi.installInterceptor();
  }

  /* ─────────────────────────── Test seams ─────────────────────────── */

  /** @internal */
  public static _classDefaultPolicyForTest(
    cls: object
  ): SecurityPolicy | undefined {
    SecurityApi.assertTestOnly('_classDefaultPolicyForTest');
    return SecurityApi.#classDefaultPolicies.get(cls as ClassKey);
  }

  /** @internal */
  public static _methodPolicyForTest(
    cls: object,
    methodName: string
  ): SecurityPolicy | undefined {
    SecurityApi.assertTestOnly('_methodPolicyForTest');
    return SecurityApi.#methodPolicies.get(cls as ClassKey)?.get(methodName);
  }

  /** @internal */
  public static _hasClassUnshadowableForTest(cls: object): boolean {
    SecurityApi.assertTestOnly('_hasClassUnshadowableForTest');
    return SecurityApi.#classUnshadowable.has(cls as ClassKey);
  }

  /** @internal */
  public static _methodUnshadowableForTest(
    cls: object
  ): ReadonlySet<string> | undefined {
    SecurityApi.assertTestOnly('_methodUnshadowableForTest');
    return SecurityApi.#methodUnshadowable.get(cls as ClassKey);
  }
}

// Like ExecutionContextApi and ModuleApi, SecurityApi deliberately does
// NOT call `decorateApiClass(...)` on itself. Wrapping its own resolvers
// in policy + frame-push plumbing would form a bootstrap cycle (the
// wrapper calls SecurityApi.resolveStaticCallPolicy to decide whether
// to allow, which would re-enter the wrapper). It's the framework
// itself, not a consumer of the framework.
