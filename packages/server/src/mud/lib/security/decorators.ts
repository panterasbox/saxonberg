/**
 * Decorators for the call-security framework.
 *
 * This file holds ONLY the decorator functions and their type
 * declarations. All metadata storage, resolution, and static-method
 * wrapping lives in `SecurityApi` (`mud/api/security.ts`). Each
 * decorator here is a thin wrapper that calls into `SecurityApi`.
 *
 * Six decorators ship today (five in v1, `@TestOnly` added by the
 * tapping build):
 *   - `@CallSecurity` — polymorphic. Method form: mandatory entry
 *     policy for that method. Class form: default policy for every
 *     unannotated method on the class.
 *   - `@Unshadowable` — polymorphic. Method form: that method is
 *     unshadowable. Class form: every method on the class is
 *     unshadowable.
 *   - `@Final` — method-only. Subclass overrides are caught at import
 *     time by the loader-hook validator.
 *   - `@Shadowing` — Shadow-class method-only. Marks a shadow method
 *     as intercepting a host method (matching local name, or
 *     remapped via `@Shadowing('hostName')`).
 *   - `@TestOnly` — Api-static-only. The member only WORKS in a test
 *     environment; in a normal runtime it is replaced by a refusal that
 *     says so.
 *   - `@ShadowSecurity` — host method-only. Per-method gate on
 *     `ShadowApi.attach` / `detach`. Two forms: `@ShadowSecurity(p)`
 *     for both ops, or `@ShadowSecurity({ attach, detach })` for
 *     independent control.
 *
 * Polymorphic decorators (`@CallSecurity`, `@Unshadowable`) decide
 * method-form vs class-form by the argument count TypeScript hands
 * them: 3 args = method, 1 arg = class.
 */

import type { SecurityPolicy } from './SecurityPolicies';
import { SecurityApi, type ShadowSecuritySpec } from '../../api/security';

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
 *   @CallSecurity(SecurityPolicies.Public)
 *   class Application { ... }
 * ```
 *
 * Method-form always wins over class-form; class-form wins over the
 * framework Public default.
 */
export function CallSecurity(policy: SecurityPolicy) {
  return function (...args: unknown[]): void {
    if (isClassDecoratorArgs(args)) {
      const cls = args[0] as object;
      SecurityApi._setClassDefaultPolicy(cls, policy);
      // Class-form must also wrap every static method on the class so
      // static Api calls push frames — otherwise an inner `ApiOnly`
      // check misfires (no Api frame on the stack to match against).
      // Instance methods are mediated by the Proxy at create-time and
      // need no descriptor wrapping. We use `_wrapStaticMethods` (not
      // `decorateApiClass`) because the policy has already been set
      // above; `decorateApiClass` would no-op there but it's clearer
      // to call the narrow helper.
      SecurityApi._wrapStaticMethods(cls);
      return;
    }
    if (isMethodDecoratorArgs(args)) {
      const target = args[0] as { constructor: object };
      const propertyKey = args[1] as string;
      const descriptor = args[2] as PropertyDescriptor;
      const isStatic = typeof target === 'function';
      const cls = isStatic ? (target as object) : target.constructor;
      SecurityApi._setMethodPolicy(cls, propertyKey, policy);
      // Static-method form: also wrap the descriptor with
      // frame-push/pop + entry-policy enforcement. Instance methods
      // get wrapped by the Proxy at instance-creation time, so we
      // only stamp the metadata for those.
      if (isStatic && descriptor && typeof descriptor.value === 'function') {
        SecurityApi._wrapStaticDescriptor(cls, propertyKey, descriptor);
      }
      return;
    }
    throw new Error(
      '@CallSecurity: unsupported decorator target — must be a method or a class'
    );
  };
}

/* ─────────────────────────── @Unshadowable ─────────────────────────── */

/**
 * Forbid shadow attachment. Polymorphic — method or class form.
 * `ShadowApi.attach` consults both maps at attach time and throws
 * `ShadowError` on conflict.
 *
 * Bare `@Unshadowable` on a method is invoked as `@Unshadowable`
 * (no parens) — TS hands as 3 method args. Bare on a class is
 * `@Unshadowable` (still no parens) — 1 class arg.
 */
export function Unshadowable(...args: unknown[]): void {
  if (isClassDecoratorArgs(args)) {
    const cls = args[0] as object;
    SecurityApi._markClassUnshadowable(cls);
    return;
  }
  if (isMethodDecoratorArgs(args)) {
    const target = args[0] as { constructor: object };
    const propertyKey = args[1] as string;
    const cls =
      typeof target === 'function'
        ? (target as object)
        : target.constructor;
    SecurityApi._markMethodUnshadowable(cls, propertyKey);
    return;
  }
  throw new Error(
    '@Unshadowable: unsupported decorator target — must be a method or a class'
  );
}

/* ─────────────────────────── @Final ─────────────────────────── */

/**
 * Forbid subclass overrides. Method-only decorator. The loader-hook
 * validator (inside `ModuleApi.stamp`) walks the prototype chain at
 * class-import time and throws `FinalViolationError` when a subclass
 * has its own descriptor for an ancestor's `@Final`-marked method.
 */
export function Final(target: object, propertyKey: string): void {
  const cls =
    typeof target === 'function'
      ? (target as object)
      : ((target as { constructor: unknown }).constructor as object);
  SecurityApi._markFinalMethod(cls, propertyKey);
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
 * Stored on the Shadow class as a static `_callSecShadowing` Map
 * keyed by HOST method name → LOCAL method name. ShadowApi's
 * dispatcher consults the map to find the actual method to invoke.
 *
 * Polymorphic on first argument: a string ⇒ "remap to this host
 * method name"; a method-decorator triple ⇒ "use the local name as
 * the host name."
 */
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
  if (typeof hostNameOrTarget === 'string') {
    const hostName = hostNameOrTarget;
    return function (target: object, localKey: string, _d: PropertyDescriptor): void {
      const cls = (target as { constructor: object }).constructor;
      _stampShadowing(cls, hostName, localKey);
    };
  }
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

/* ─────────────────────────── @TestOnly ─────────────────────────── */

/**
 * **This member is a test seam, and in a normal runtime calling it is
 * refused.**
 *
 * ```ts
 *   export class WorldClockApi {
 *     @TestOnly('Nothing in the game moves the realm\'s clock.')
 *     public static advance(by: Quantity<'s'> | string): void { ... }
 *   }
 *   SecurityApi.decorateApiClass(WorldClockApi);
 * ```
 *
 * Unlike every other decorator here, this one does not express a
 * *policy* — no question about the caller decides it. It asks what
 * process this is (`SecurityApi.isTestEnvironment()`), and outside a
 * test environment the body is replaced by one that throws
 * `SecurityError` naming the seam, naming the three signals that would
 * make a process a test environment, and repeating whatever guidance
 * the decorator was given.
 *
 * ⚠⚠ **It used to DELETE the property, and that was worse.** Absence
 * is the strongest possible guarantee and the worst possible
 * diagnostic: the caller got `TypeError: WorldClockApi.advance is not a
 * function`, which says nothing about why and reads like a build
 * problem. It is also the wrong shape for this codebase, where **the
 * refusal is the interface** — a thing that is withheld should be able
 * to say it was withheld, and under what condition it would not be.
 * The guarantee is unchanged in the only sense that matters: the seam
 * cannot be *used*.
 *
 * ⭐ It is also a review marker, which is half the reason it exists: a
 * method carrying `@TestOnly` is scaffolding for the suite, and a
 * method without it is the game. That distinction used to be carried
 * only by the `_*ForTesting` naming convention, which `advance` — a
 * perfectly game-shaped name — did not follow.
 *
 * ⚠ **Api statics only, and the class must run the standard tail**
 * (`SecurityApi.decorateApiClass(FooApi)`, or a class-form
 * `@CallSecurity`). The substitution happens there rather than here
 * because TypeScript's `__decorate` helper re-defines the property
 * after every method decorator has run — see `SecurityApi` §
 * Test-ENVIRONMENT withholding. An instance method is refused
 * outright: a Stuff's methods are reached through the call-security
 * Proxy, which resolves against the prototype chain, so replacing one
 * own descriptor would be a half-measure that reads as a guarantee.
 *
 * ⚠ Contrast `SecurityApi.assertTestOnly(op)`, which asks the other
 * question — *is a test frame on the stack* — and is therefore blind to
 * a caller arriving over a socket.
 *
 * @param guidance one or two sentences for the refusal message saying
 *   what the caller should reach for instead. Optional, and worth
 *   writing: the generic half of the message explains the *mechanism*,
 *   and only the seam's owner can explain the *alternative*.
 */
export function TestOnly(guidance: string): MethodDecorator;
export function TestOnly(
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void;
export function TestOnly(
  ...args: unknown[]
): void | ((
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => void) {
  if (args.length === 1 && typeof args[0] === 'string') {
    const guidance = args[0];
    return function (target: object, propertyKey: string): void {
      _markTestOnly(target, propertyKey, guidance);
    };
  }
  _markTestOnly(args[0] as object, args[1] as string, '');
}

function _markTestOnly(
  target: object,
  propertyKey: string,
  guidance: string
): void {
  if (typeof target !== 'function') {
    throw new Error(
      `@TestOnly: ${propertyKey} is an instance method. The decorator ` +
        `withholds an Api STATIC (the surface the sandbox binds); an ` +
        `instance method is reached through the Proxy against the whole ` +
        `prototype chain, where replacing one own descriptor would not ` +
        `withhold it. Gate the Api static that forwards here instead.`
    );
  }
  SecurityApi._markTestOnly(target, propertyKey, guidance);
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
 * Read at attach/detach time by `ShadowApi`. Inheritance + resolution
 * mirror `@CallSecurity`: closest decorator on the prototype chain
 * wins; mixin defaults are fallback.
 */
export function ShadowSecurity(spec: SecurityPolicy | ShadowSecuritySpec) {
  const normalised: ShadowSecuritySpec = isPolicy(spec)
    ? { attach: spec, detach: spec }
    : spec;
  return function (
    target: object,
    propertyKey: string,
    _descriptor: PropertyDescriptor
  ): void {
    const cls = (target as { constructor: object }).constructor;
    SecurityApi._setShadowSecurity(cls, propertyKey, normalised);
  };
}

function isPolicy(v: unknown): v is SecurityPolicy {
  return (
    typeof v === 'object' &&
    v !== null &&
    'name' in v &&
    'allows' in v &&
    typeof (v as { allows?: unknown }).allows === 'function'
  );
}
