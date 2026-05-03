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

import type { SecurityPolicy } from '../lib/security/SecurityPolicies';
import { ExecutionContextApi } from './execution-context';
import { SecurityError } from '../lib/security/errors';

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
      if (!policy.allows(caller, cls, methodName)) {
        throw new SecurityError(
          `Policy ${policy.name} denied ${(cls as { name?: string }).name ?? '<class>'}.${methodName}()`,
          { methodName, policyName: policy.name }
        );
      }
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
   * walks `Error.stack` and looks for a `.test.{ts,js}` frame anywhere
   * in the call chain. Production code that accidentally (or
   * deliberately) reaches a test seam fails loudly at the call site
   * instead of quietly bypassing framework invariants.
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
   * is in a `.test.ts` / `.test.js` file. Call from the top of every
   * `_*ForTest` / `_*ForTesting` method to guarantee production code
   * can't reach the seam.
   *
   * `op` is the seam name; included in the error message so the
   * offender sees exactly which seam was misused.
   */
  public static assertTestOnly(op: string): void {
    const stack = new Error().stack ?? '';
    const lines = stack.split('\n');
    let inTest = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('at ')) continue;
      const m =
        trimmed.match(/\((.+):\d+:\d+\)$/) ??
        trimmed.match(/at (file:\/\/[^\s]+|\/[^\s]+):\d+:\d+$/);
      const url = m?.[1];
      if (!url) continue;
      const cached = SecurityApi.#testCallerCache.get(url);
      if (cached === true) {
        inTest = true;
        break;
      }
      if (cached === false) continue;
      const isTest = /\.test\.(ts|js)(\?|$|:)/.test(url);
      SecurityApi.#testCallerCache.set(url, isTest);
      if (isTest) {
        inTest = true;
        break;
      }
    }
    if (!inTest) {
      throw new SecurityError(
        `${op}: test-only seam called from non-test code. ` +
          `Production code must not reach methods named *ForTest / *ForTesting.`
      );
    }
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
