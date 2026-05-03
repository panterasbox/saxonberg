/**
 * Decorators for the call-security framework.
 *
 * Three decorators ship in v1:
 *   - `@CallSecurity` — polymorphic. On a method, sets that method's
 *     mandatory entry policy. On a class, sets the default policy for
 *     every unannotated method on the class.
 *   - `@Unshadowable` — polymorphic. On a method, marks that one method
 *     as unshadowable. On a class, marks every method on the class as
 *     unshadowable. Stage 1 stamps the metadata; Stage 3 wires the
 *     attach-time check.
 *   - `@Final` — Stage 2. Stamped by Stage 1 (no-op) so importers can
 *     pre-annotate without runtime side-effects; Stage 2 grows the
 *     loader-hook validator that throws on subclass overrides.
 *
 * Both polymorphic decorators decide method-form vs class-form by the
 * argument count TypeScript hands them: 3 args = method, 1 arg = class.
 *
 * Metadata storage is in module-private WeakMaps keyed by the relevant
 * Function (the constructor for class-form, the prototype's constructor
 * for method-form). The Proxy reads them at dispatch time via the
 * resolver helpers below.
 */

import type { SecurityPolicy } from './SecurityPolicies';
import { ExecutionContext } from './ExecutionContext';
import { SecurityError } from './errors';

/**
 * Local fallback policy used when no decorator is found anywhere on
 * the prototype chain. Mirrors `SecurityPolicies.Public` semantically
 * but defined here to avoid importing `SecurityPolicies` and creating
 * a load-time cycle (SecurityPolicies → PathPatternApi →
 * decorateApiClass → SecurityPolicies).
 */
const PUBLIC_FALLBACK: SecurityPolicy = {
  name: 'Public',
  allows: () => true,
};

/* ─────────────────────────── Storage ─────────────────────────── */

/**
 * Class-constructor-shaped key. A class is a function with a `prototype`
 * property; this matches both concrete (`new …`) and abstract (`abstract
 * new …`) constructors. Authored as an interface intersection so
 * @typescript-eslint/ban-types' "no bare Function" lint passes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClassKey = (abstract new (...args: any[]) => unknown) & {
  prototype: unknown;
};

/** Per-method @CallSecurity. Outer key = class constructor; inner key = method name. */
const _methodPolicies: WeakMap<ClassKey, Map<string, SecurityPolicy>> = new WeakMap();

/** Class-form @CallSecurity — default for unannotated methods. */
const _classDefaultPolicies: WeakMap<ClassKey, SecurityPolicy> = new WeakMap();

/** Per-method @Unshadowable. */
const _methodUnshadowable: WeakMap<ClassKey, Set<string>> = new WeakMap();

/** Class-form @Unshadowable. */
const _classUnshadowable: WeakSet<ClassKey> = new WeakSet();

/** @Final method names per class. Stage 2 reads this in the loader-hook validator. */
const _finalMethods: WeakMap<ClassKey, Set<string>> = new WeakMap();

/* ─────────────────────────── Polymorphism plumbing ─────────────────────────── */

function isMethodDecoratorArgs(args: unknown[]): boolean {
  // Legacy (experimental) decorator signatures:
  //   class    : (target: ClassKey) => void
  //   method   : (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void
  return (
    args.length === 3 &&
    (typeof args[1] === 'string' || typeof args[1] === 'symbol')
  );
}

function isClassDecoratorArgs(args: unknown[]): boolean {
  return args.length === 1 && typeof args[0] === 'function';
}

/* ─────────────────────────── @CallSecurity ─────────────────────────── */

/**
 * Mandatory entry policy. Polymorphic.
 *
 * Method form:
 * ```ts
 *   class Foo {
 *     @CallSecurity(SecurityPolicies.ApiOnly)
 *     destroy(): void { ... }
 *   }
 * ```
 *
 * Class form (sets the default policy for unannotated methods):
 * ```ts
 *   @CallSecurity(PUBLIC_FALLBACK)
 *   class Application { ... }
 * ```
 *
 * Method-form always wins over class-form; class-form wins over the
 * framework Public default.
 */
export function CallSecurity(policy: SecurityPolicy) {
  return function (...args: unknown[]): void {
    if (isClassDecoratorArgs(args)) {
      const cls = args[0] as ClassKey;
      _classDefaultPolicies.set(cls, policy);
      // Class-form must also wrap every static method on the class so
      // static Api calls push frames — otherwise an inner `ApiOnly`
      // check misfires (no Api frame on the stack to match against).
      // Instance methods are mediated by the Proxy at create-time and
      // need no descriptor wrapping.
      _wrapAllStaticMethods(cls);
      return;
    }
    if (isMethodDecoratorArgs(args)) {
      const target = args[0] as { constructor: ClassKey };
      const propertyKey = args[1] as string;
      const descriptor = args[2] as PropertyDescriptor;
      // Instance methods: target is the prototype, target.constructor is the class.
      // Static methods: target IS the class.
      const isStatic = typeof target === 'function';
      const cls = isStatic
        ? (target as unknown as ClassKey)
        : target.constructor;
      let map = _methodPolicies.get(cls);
      if (!map) {
        map = new Map();
        _methodPolicies.set(cls, map);
      }
      map.set(propertyKey, policy);
      // Static method form: also wrap the descriptor with
      // frame-push/pop + entry-policy enforcement. Instance methods
      // get wrapped by the Proxy at instance-creation time, so we
      // only stamp the metadata for those.
      if (isStatic && descriptor && typeof descriptor.value === 'function') {
        _wrapStaticDescriptor(cls, propertyKey, descriptor);
      }
      return;
    }
    throw new Error(
      '@CallSecurity: unsupported decorator target — must be a method or a class'
    );
  };
}

/**
 * Wrap a static method descriptor in-place so each invocation pushes a
 * CallFrame `{ caller: <previous target>, target: <class>, method }`
 * and runs the resolved policy first. The class itself is the frame's
 * `target` so Api → Api hops show up on the stack as a chain of
 * static-class frames.
 *
 * If the policy resolver later changes its mind (a class-form decorator
 * is applied AFTER the per-method decorator stamps metadata), the
 * wrapper still does the right thing — it re-resolves on every call.
 */
function _wrapStaticDescriptor(
  cls: ClassKey,
  methodName: string,
  descriptor: PropertyDescriptor
): void {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  if ((original as { _callSecWrapped?: boolean })._callSecWrapped) {
    // Already wrapped (class-form decorator runs after per-method
    // decorators on the same descriptor). Skip.
    return;
  }
  const wrapped = function (this: unknown, ...args: unknown[]): unknown {
    const policy = resolveStaticCallPolicy(cls, methodName);
    // Caller = previous target; falls back to null at the root.
    const caller = ExecutionContext.getCurrentTarget();
    if (!policy.allows(caller, cls, methodName)) {
      throw new SecurityError(
        `Policy ${policy.name} denied ${(cls as { name?: string }).name ?? '<class>'}.${methodName}()`,
        { methodName, policyName: policy.name }
      );
    }
    return ExecutionContext.run(caller, cls, methodName, undefined, () =>
      original.apply(this, args)
    );
  };
  Object.defineProperty(wrapped, 'name', {
    value: original.name,
    configurable: true,
  });
  (wrapped as { _callSecWrapped?: boolean })._callSecWrapped = true;
  descriptor.value = wrapped;
  // Also rewrite the property on the class itself, since descriptor
  // mutation by a legacy method decorator is only persisted by the TS
  // emitter for value descriptors when the class declaration completes.
  // Belt + braces.
  Object.defineProperty(cls, methodName, descriptor);
}

/**
 * Walk every own static method on `cls` and wrap any that hasn't been
 * wrapped already. Called from the class-form `@CallSecurity` so even
 * undecorated statics push frames.
 */
function _wrapAllStaticMethods(cls: ClassKey): void {
  for (const name of Object.getOwnPropertyNames(cls)) {
    if (name === 'length' || name === 'name' || name === 'prototype') continue;
    const descriptor = Object.getOwnPropertyDescriptor(cls, name);
    if (!descriptor) continue;
    if (typeof descriptor.value !== 'function') continue;
    if ((descriptor.value as { _callSecWrapped?: boolean })._callSecWrapped) {
      continue;
    }
    _wrapStaticDescriptor(cls, name, descriptor);
  }
}

/* ─────────────────────────── @Unshadowable ─────────────────────────── */

/**
 * Forbid shadow attachment. Polymorphic — method or class form.
 * Stage 1 only stamps the metadata; Stage 3's `ShadowApi.attach`
 * consults both maps at attach time and throws `ShadowError`.
 *
 * Note: bare `@Unshadowable` on a method is invoked as
 * `@Unshadowable` (no parens) — which TS hands as 3 method args.
 * Bare on a class is `@Unshadowable` (still no parens) — 1 class arg.
 * No factory wrapper because there are no per-call options.
 */
export function Unshadowable(...args: unknown[]): void {
  if (isClassDecoratorArgs(args)) {
    const cls = args[0] as ClassKey;
    _classUnshadowable.add(cls);
    return;
  }
  if (isMethodDecoratorArgs(args)) {
    const target = args[0] as { constructor: ClassKey };
    const propertyKey = args[1] as string;
    const cls =
      typeof target === 'function'
        ? (target as unknown as ClassKey)
        : target.constructor;
    let set = _methodUnshadowable.get(cls);
    if (!set) {
      set = new Set();
      _methodUnshadowable.set(cls, set);
    }
    set.add(propertyKey);
    return;
  }
  throw new Error(
    '@Unshadowable: unsupported decorator target — must be a method or a class'
  );
}

/* ─────────────────────────── @Final (Stage 2) ─────────────────────────── */

/**
 * Forbid subclass overrides. Method-only decorator. Stage 1 stamps
 * the metadata; Stage 2 wires `validateNoFinalOverrides()` into the
 * loader hook to throw `FinalViolationError` at import time.
 */
export function Final(target: object, propertyKey: string): void {
  const cls =
    typeof target === 'function'
      ? (target as unknown as ClassKey)
      : ((target as { constructor: unknown }).constructor as ClassKey);
  let methods = _finalMethods.get(cls);
  if (!methods) {
    methods = new Set();
    _finalMethods.set(cls, methods);
  }
  methods.add(propertyKey);
}

/* ─────────────────────────── Resolver helpers ─────────────────────────── */

/**
 * Resolve the entry policy for a method on `instance`. Walks the
 * prototype chain looking for the closest method-form `@CallSecurity`
 * — closest wins, mixin defaults are fallback. If none is found,
 * walks the chain again for a class-form default. Falls through to
 * `PUBLIC_FALLBACK` if neither is present.
 *
 * Resolution order:
 *   1. Method-form @CallSecurity (closest in prototype chain)
 *   2. Class-form @CallSecurity (closest in prototype chain)
 *   3. Public (framework default)
 */
export function resolveCallPolicy(
  instance: object,
  methodName: string
): SecurityPolicy {
  let proto: unknown = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const cls = (proto as { constructor: ClassKey }).constructor;
    const map = _methodPolicies.get(cls);
    if (map?.has(methodName)) {
      return map.get(methodName)!;
    }
    proto = Object.getPrototypeOf(proto);
  }
  // No method-form policy; check class-form default along the chain.
  proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const cls = (proto as { constructor: ClassKey }).constructor;
    const policy = _classDefaultPolicies.get(cls);
    if (policy) return policy;
    proto = Object.getPrototypeOf(proto);
  }
  return PUBLIC_FALLBACK;
}

/**
 * Resolve the entry policy for a static method on a class. Walks
 * up the class itself (no prototype walk; statics aren't inherited
 * the same way). Returns Public if no policy was registered.
 */
export function resolveStaticCallPolicy(
  cls: ClassKey,
  methodName: string
): SecurityPolicy {
  let current: ClassKey | null = cls;
  while (current) {
    const map = _methodPolicies.get(current);
    if (map?.has(methodName)) return map.get(methodName)!;
    current = Object.getPrototypeOf(current) as ClassKey | null;
    if (current === Function.prototype || current === null) break;
  }
  // Then class-form default.
  current = cls;
  while (current) {
    const policy = _classDefaultPolicies.get(current);
    if (policy) return policy;
    current = Object.getPrototypeOf(current) as ClassKey | null;
    if (current === Function.prototype || current === null) break;
  }
  return PUBLIC_FALLBACK;
}

/**
 * Returns true if the method is marked unshadowable (either method-form
 * on it directly, or class-form on the host's class or any ancestor).
 * Read at attach time by Stage-3 ShadowApi.
 */
export function isMethodUnshadowable(
  hostInstance: object,
  methodName: string
): boolean {
  let proto: unknown = Object.getPrototypeOf(hostInstance);
  while (proto && proto !== Object.prototype) {
    const cls = (proto as { constructor: ClassKey }).constructor;
    if (_classUnshadowable.has(cls)) return true;
    const set = _methodUnshadowable.get(cls);
    if (set?.has(methodName)) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

/**
 * Returns the set of @Final method names declared on `cls` directly
 * (not inherited). Stage 2's validator walks the prototype chain
 * comparing `Object.hasOwn` overrides against ancestor finals.
 *
 * @internal
 */
export function getFinalMethods(cls: object): ReadonlySet<string> | undefined {
  return _finalMethods.get(cls as ClassKey);
}

/* ─────────────────────────── @Shadowing ─────────────────────────── */

/**
 * Mark a method on a Shadow class as intercepting a host method.
 * Two forms:
 *
 *     @Shadowing
 *     addXp(n: number) { ... }              // intercepts host.addXp
 *
 *     @Shadowing('take')
 *     loggedTake(item: Stuff) { ... }       // intercepts host.take
 *
 * Stored on the Shadow's class as a static `_callSecShadowing` Map
 * keyed by HOST method name → LOCAL method name (which `ShadowApi`'s
 * dispatcher uses to find the actual method to invoke).
 *
 * Polymorphic on first argument: a string ⇒ "remap to this host
 * method name"; a method-decorator triple ⇒ "use the local name as
 * the host name."
 */
// Overloads disambiguate the bare and factory forms for TS's
// strict legacy-decorator signature checks.
export function Shadowing(
  hostName: string
): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function Shadowing(
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void;
export function Shadowing(
  hostNameOrTarget: string | object,
  propertyKey?: string,
  _descriptor?: PropertyDescriptor
): void | ((target: object, propertyKey: string, descriptor: PropertyDescriptor) => void) {
  // Form A: @Shadowing('hostName') — factory-form, returns the real decorator.
  if (typeof hostNameOrTarget === 'string') {
    const hostName = hostNameOrTarget;
    return function (target: object, localKey: string, _d: PropertyDescriptor): void {
      const cls = (target as { constructor: object }).constructor;
      _stampShadowing(cls, hostName, localKey);
    };
  }
  // Form B: @Shadowing — bare, called directly with method-decorator args.
  const target = hostNameOrTarget;
  const localKey = propertyKey as string;
  const cls = (target as { constructor: object }).constructor;
  _stampShadowing(cls, localKey, localKey);
}

function _stampShadowing(cls: object, hostName: string, localName: string): void {
  let map = (cls as { _callSecShadowing?: Map<string, string> })
    ._callSecShadowing;
  if (!map) {
    map = new Map();
    (cls as { _callSecShadowing?: Map<string, string> })._callSecShadowing = map;
  }
  map.set(hostName, localName);
}

/* ─────────────────────────── @ShadowSecurity ─────────────────────────── */

/**
 * Per-method gate on shadow attach / detach operations. Two forms:
 *
 *     @ShadowSecurity(SecurityPolicies.SystemRoot)
 *     sensitiveMethod() { ... }                   // attach AND detach
 *
 *     @ShadowSecurity({ attach: P1, detach: P2 })
 *     sensitiveMethod() { ... }                   // independent
 *
 * Stored in a WeakMap<class, Map<methodName, {attach?, detach?}>>.
 * Read at attach/detach time by `ShadowApi`. Inheritance + resolution
 * mirror `@CallSecurity`: closest decorator on the prototype chain
 * wins; mixin defaults are fallback.
 */
export interface ShadowSecuritySpec {
  attach?: SecurityPolicy;
  detach?: SecurityPolicy;
}

const _shadowSecurity: WeakMap<ClassKey, Map<string, ShadowSecuritySpec>> =
  new WeakMap();

function isPolicy(v: unknown): v is SecurityPolicy {
  return (
    typeof v === 'object' &&
    v !== null &&
    'name' in v &&
    'allows' in v &&
    typeof (v as { allows?: unknown }).allows === 'function'
  );
}

export function ShadowSecurity(spec: SecurityPolicy | ShadowSecuritySpec) {
  const normalised: ShadowSecuritySpec = isPolicy(spec)
    ? { attach: spec, detach: spec }
    : spec;
  return function (
    target: object,
    propertyKey: string,
    _descriptor: PropertyDescriptor
  ): void {
    const cls = (target as { constructor: ClassKey }).constructor;
    let map = _shadowSecurity.get(cls);
    if (!map) {
      map = new Map();
      _shadowSecurity.set(cls, map);
    }
    map.set(propertyKey, normalised);
  };
}

/**
 * Resolve `@ShadowSecurity` for `host[methodName]`. Walks the host's
 * prototype chain, returns the closest spec. `null` if none found —
 * the caller treats absent specs as Public.
 */
export function resolveShadowSecurity(
  host: object,
  methodName: string
): ShadowSecuritySpec | null {
  let proto: unknown = Object.getPrototypeOf(host);
  while (proto && proto !== Object.prototype) {
    const cls = (proto as { constructor: ClassKey }).constructor;
    const map = _shadowSecurity.get(cls);
    const spec = map?.get(methodName);
    if (spec) return spec;
    proto = Object.getPrototypeOf(proto);
  }
  return null;
}

/* ─────────────────────────── decorateApiClass ─────────────────────────── */

/**
 * Apply the standard Api-class decoration imperatively. Equivalent to
 * decorating the class with `@CallSecurity(PUBLIC_FALLBACK)` —
 * stamps the class-default policy and wraps every own static method so
 * static Api calls push frames onto the call stack. Use at the bottom
 * of each Api file rather than the legacy decorator syntax to keep the
 * edit surgical.
 */
export function decorateApiClass(cls: object): void {
  const k = cls as ClassKey;
  _classDefaultPolicies.set(k, PUBLIC_FALLBACK);
  _wrapAllStaticMethods(k);
}

/**
 * Test seam — let tests inspect resolver output without poking the
 * private WeakMaps directly.
 *
 * @internal
 */
export const _decoratorInternals = {
  classDefaultPolicy(cls: ClassKey): SecurityPolicy | undefined {
    return _classDefaultPolicies.get(cls);
  },
  methodPolicy(cls: ClassKey, methodName: string): SecurityPolicy | undefined {
    return _methodPolicies.get(cls)?.get(methodName);
  },
  hasClassUnshadowable(cls: ClassKey): boolean {
    return _classUnshadowable.has(cls);
  },
  methodUnshadowable(cls: ClassKey): ReadonlySet<string> | undefined {
    return _methodUnshadowable.get(cls);
  },
};
