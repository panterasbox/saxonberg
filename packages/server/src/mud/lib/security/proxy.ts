/**
 * Proxy handler — the runtime enforcement surface for the call-security
 * framework.
 *
 * Every Stuff instance returned by `StuffApi.create` / `StuffApi.clone` is
 * wrapped in a Proxy whose only trap is `get`. When a method is read off
 * the proxy, the trap returns a wrapper function that:
 *
 *   1. Checks the destroyed flag → throws `DestroyedObjectError`.
 *   2. Resolves the entry policy via the decorator metadata.
 *   3. Runs the policy with the immediate caller from `ExecutionContext`.
 *      On deny, throws `SecurityError`.
 *   4. Pushes a CallFrame and runs the underlying method.
 *   5. Pops the frame on return (or exception).
 *
 * Stage 1 doesn't consult shadows — Stage 3 folds them into step 4.
 *
 * Trusted-method bypass: inside a method body, accessing private fields
 * via `this.#x` or own-class state never re-enters the proxy because `#`
 * fields are unreachable through Proxy traps. That's deliberate; the
 * layer rule mandates `#` in mud/api/ and mud/backend/ for exactly this
 * reason.
 */

import type { Stuff } from '../stuff/Stuff';
import { ExecutionContext } from './ExecutionContext';
import { resolveCallPolicy } from './decorators';
import { DestroyedObjectError, SecurityError } from './errors';
import { ShadowApi } from '../../api/shadow';

/** Symbol used by tests to fish the raw Stuff out of a proxy if needed. */
const RAW_TARGET = Symbol.for('saxonberg.callsec.rawTarget');

/**
 * Methods/symbols the proxy must NOT mediate. Reading them returns the
 * underlying value as-is — no destroyed check, no frame push, no policy.
 *
 * - `then` / Symbol.toPrimitive: would break Promise resolution and
 *   coercion if mediated (e.g., `await someStuff` would invoke a
 *   `then` wrapper).
 * - `constructor`: code that does `obj.constructor` for mixin
 *   introspection must see the raw class.
 * - The RAW_TARGET seam.
 */
const PASSTHROUGH_KEYS: ReadonlySet<string | symbol> = new Set<string | symbol>([
  'then',
  'constructor',
  'stuffId',
  'zone',
  'templatePath',
  // Shadow-side framework getters — these read framework-private
  // state via WeakMaps keyed by the proxy itself, so they MUST run
  // with `this === proxy`. Dispatching them through the shadow
  // chain would also be wrong (the host wouldn't have these on its
  // prototype).
  'host',
  'interceptedMethods',
  RAW_TARGET,
]);

/**
 * Wrap a raw Stuff instance in the call-security Proxy. Returns a Proxy
 * that is type-compatible with the raw instance (TypeScript can't tell
 * the difference) and is safe to register, hand out, or persist as if
 * it were the original.
 *
 * `wrapInProxy` is idempotent in spirit — wrapping a proxy returns a
 * proxy. We don't try to detect double-wrapping; the call sites in
 * `StuffApi.#registerAndInit` are the only entry point.
 */
export function wrapInProxy<T extends Stuff>(stuff: T): T {
  // Cache wrapped methods per (raw target, method name) so repeated
  // `obj.foo` reads return the same function reference. Otherwise every
  // method access allocates a new wrapper, which breaks
  // `obj.foo === obj.foo` and — more importantly — interferes with
  // `removeEventListener`-style patterns that compare callbacks by
  // identity. The cache is bound to the closure of this proxy, so it
  // dies with the target via WeakMap semantics.
  const wrapperCache = new WeakMap<Function, Function>();

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === RAW_TARGET) return target;
      if (PASSTHROUGH_KEYS.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }

      // Look at the descriptor BEFORE calling Reflect.get — getters
      // would fire eagerly and we'd lose the chance to dispatch them
      // through the shadow chain. Walk the prototype chain (data
      // properties on the instance shadow prototype-defined ones,
      // which is fine: instance fields aren't shadowable anyway).
      const descriptor = findDescriptor(target, prop);

      // Getter — treat as a 0-arg method invocation that may have
      // shadows. `setProp = (target, name, val) => …` (a setter) is
      // intentionally NOT trapped here; setters need a separate `set`
      // trap which Stage 3 doesn't ship (no v1 consumer).
      if (descriptor?.get) {
        const methodName = typeof prop === 'symbol' ? prop.toString() : prop;
        return runWithMediation(
          target as Stuff,
          receiver as Stuff,
          methodName,
          [],
          () => descriptor.get!.call(receiver),
          /* isGetter */ true
        );
      }

      // Non-method properties (instance fields, computed values from
      // built-ins like Symbol.iterator) pass through as-is. Reading
      // a field on a destroyed Stuff returns the field value; the
      // method-invocation guard fires for actual method calls below.
      const value = Reflect.get(target, prop, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      // Test-mocking pass-through: vitest / jest spies carry an
      // `_isMockFunction` flag. Wrapping them in our policy wrapper
      // breaks `toHaveBeenCalled` assertions because the test sees
      // the wrapper instead of the spy. Tests still go through the
      // proxy's destroyed-object guard for any other method, but a
      // method that was deliberately swapped for a spy is the
      // test's intentional escape hatch.
      if ((value as { _isMockFunction?: boolean })._isMockFunction) {
        return value;
      }

      // Cache and return the wrapper.
      const cached = wrapperCache.get(value as Function);
      if (cached) return cached;

      const methodName = typeof prop === 'symbol' ? prop.toString() : prop;
      const proxyRef = receiver;

      const wrapper = function (this: unknown, ...args: unknown[]): unknown {
        return runWithMediation(
          target as Stuff,
          proxyRef as Stuff,
          methodName,
          args,
          () => (value as Function).apply(proxyRef, args),
          /* isGetter */ false
        );
      };

      wrapperCache.set(value as Function, wrapper);
      return wrapper;
    },
  };

  return new Proxy(stuff, handler);
}

/**
 * Test seam: extract the raw underlying Stuff from a proxy. Returns
 * the input as-is if it isn't proxied. Production code should never
 * need this.
 *
 * @internal
 */
export function unwrapProxy<T extends Stuff>(stuffOrProxy: T): T {
  const candidate = (stuffOrProxy as unknown as Record<symbol, T | undefined>)[
    RAW_TARGET
  ];
  return candidate ?? stuffOrProxy;
}

/**
 * Walk an object's prototype chain and return the first descriptor
 * found for `prop`, or `undefined`. Used by the get-trap to detect
 * getters before Reflect.get fires them.
 */
function findDescriptor(
  obj: object,
  prop: string | symbol
): PropertyDescriptor | undefined {
  let cur: object | null = obj;
  while (cur && cur !== Object.prototype) {
    const d = Object.getOwnPropertyDescriptor(cur, prop);
    if (d) return d;
    cur = Object.getPrototypeOf(cur);
  }
  return undefined;
}

/**
 * Shared mediation pipeline used by both the method wrapper and the
 * getter intercept. Steps mirror the §3.5 dispatch algorithm:
 *
 *   (a) bypass-marker check — set by `Shadow.callBypass()` and
 *       `callDown()` at the bottom of the chain. Honour and run the
 *       raw invocation, skipping every check below.
 *   1.  destroyed-object guard. `isDestroyed` and `toString` exempt.
 *   2.  resolve+run the entry policy (uses `getCurrentTarget()` as
 *       caller per the spec invariant "caller = previous target").
 *   3.  if shadows are attached for this method, dispatch through
 *       them with per-shadow CallFrames. The shadow chain ends with
 *       `callDown` setting the bypass marker and re-entering this
 *       same pipeline, where step (a) catches it and runs raw.
 *   4.  no shadows → push host frame, invoke raw via `invokeRaw`.
 *
 * `invokeRaw` for methods runs `value.apply(proxy, args)`; for
 * getters runs `descriptor.get!.call(proxy)`. The pipeline doesn't
 * care which.
 */
function runWithMediation(
  target: Stuff,
  proxyRef: Stuff,
  methodName: string,
  args: unknown[],
  invokeRaw: () => unknown,
  isGetter: boolean
): unknown {
  // (a) bypass marker
  if (ShadowApi._consumeBypass()) {
    return invokeRaw();
  }
  // 1. destroyed-object guard
  if (
    methodName !== 'isDestroyed' &&
    methodName !== 'toString' &&
    target.isDestroyed()
  ) {
    throw new DestroyedObjectError(target.stuffId, methodName);
  }
  // 2. entry policy
  const policy = resolveCallPolicy(target, methodName);
  const caller = ExecutionContext.getCurrentTarget();
  if (!policy.allows(caller, proxyRef, methodName)) {
    throw new SecurityError(
      `Policy ${policy.name} denied ${methodName}() on Stuff ${target.stuffId}`,
      { stuffId: target.stuffId, methodName, policyName: policy.name }
    );
  }
  // 3. shadow dispatch — keyed by proxyRef (attach() stored the
  //    proxy; lookup must use the same identity).
  const shadows = ShadowApi._shadowsFor(proxyRef, methodName);
  if (shadows && shadows.length > 0) {
    return ShadowApi._withDispatch(proxyRef, methodName, shadows, args, () => {
      const top = shadows[shadows.length - 1]!;
      return ExecutionContext.run(caller, top, methodName, undefined, () =>
        ShadowApi._invokeOnShadow(top, methodName, isGetter ? [] : args)
      );
    });
  }
  // 4. no shadows
  return ExecutionContext.run(caller, proxyRef, methodName, undefined, () =>
    invokeRaw()
  );
}
