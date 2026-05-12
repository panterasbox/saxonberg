/**
 * ProxyApi — generic Stuff-instance Proxy infrastructure.
 *
 * Owns the get-trap mechanics: descriptor lookup, wrapper caching,
 * mock-spy passthrough, the `RAW_TARGET` introspection seam. Doesn't
 * know anything about security policies, shadows, or destroyed-object
 * guards — those concerns live in `SecurityApi` (see
 * `mud/api/security.ts`), which registers a `#`-private interceptor
 * with this Api at module-load time via a static initializer.
 *
 * The interceptor pipeline is the extension point. Each registered
 * interceptor receives an `InterceptionContext` and a `next()` callback;
 * calling `next()` advances to the next interceptor or, at the end,
 * runs the raw operation. Interceptors fire on every method invocation
 * AND every getter read. Future cross-cutting concerns (a tracing
 * interceptor that logs every call, an instrumentation interceptor
 * that timestamps invocations, etc.) plug in here without touching
 * the framework's core.
 *
 * Order matters: interceptors run in registration order. The security
 * interceptor is registered first so it gates everything else.
 *
 * Like `ExecutionContextApi`, `ModuleApi`, and `SecurityApi`, this
 * class deliberately does NOT call `decorateApiClass` on itself —
 * wrapping its own static methods would form a bootstrap cycle (the
 * wrapping would need a Proxy to mediate the wrapping function).
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { SecurityApi } from './security';

/**
 * Per-invocation context handed to every interceptor.
 *
 * `target` is the raw Stuff; `proxy` is the wrapping Proxy. Use
 * `proxy` when you want onward calls inside `next()` to go through
 * the framework (which they will — `next()` invokes the raw method
 * with `this === proxy`).
 *
 * `prop` is the property/method name being accessed. `isGetter`
 * distinguishes getter reads (no args) from method invocations
 * (args populated). Symbol properties don't reach interceptors —
 * they're passthrough.
 */
export interface InterceptionContext {
  readonly target: Stuff;
  readonly proxy: Stuff;
  readonly prop: string;
  readonly args: readonly unknown[];
  readonly isGetter: boolean;
}

/**
 * Interceptor function signature. Calls `next()` to delegate to the
 * next interceptor in the pipeline, or to the raw operation when
 * at the end. Don't call `next()` to short-circuit the pipeline
 * (e.g. when returning a synthetic result, or throwing).
 */
export type Interceptor = (
  ctx: InterceptionContext,
  next: () => unknown
) => unknown;

/**
 * Symbol used by tests to fish the raw Stuff out of a proxy.
 * `obj[ProxyApi.RAW_TARGET]` returns the underlying target without
 * going through any interceptor.
 */
const RAW_TARGET = Symbol.for('saxonberg.proxy.rawTarget');

/**
 * Property names that bypass the interceptor pipeline entirely.
 * Reading them returns the raw value via `Reflect.get(target, prop,
 * receiver)`.
 *
 * Why each is here:
 *   - `then`: would break Promise resolution if mediated.
 *   - `constructor`: mixin introspection (`obj.constructor`) must see
 *     the raw class.
 *   - `stuffId`, `zone`: instance fields the framework itself reads
 *     constantly; mediation would add noise.
 *   - `host`, `interceptedMethods`: shadow-side framework getters;
 *     mediation would dispatch them through the shadow chain (wrong).
 *   - `RAW_TARGET`: the introspection escape hatch.
 *
 * `templatePath` is NOT here: the slot is hard-private
 * (`Stuff.#templatePath`) since the ref-shapes lockdown. Access goes
 * through `Stuff.getTemplatePath()` and (for the pre-register stamp)
 * the caller-gated `Stuff._stampTemplatePath` static.
 *
 * Add to this list ONLY for fields/getters that genuinely belong
 * outside the framework's mediation surface.
 */
const PASSTHROUGH_KEYS: ReadonlySet<string | symbol> = new Set<string | symbol>([
  'then',
  'constructor',
  'stuffId',
  'zone',
  'host',
  'interceptedMethods',
  RAW_TARGET,
]);

export class ProxyApi {
  private constructor() {}

  /** Symbol seam for unwrapping (re-exported from RAW_TARGET above). */
  public static readonly RAW_TARGET = RAW_TARGET;

  /**
   * Registered interceptors, in invocation order. Mutated only by
   * `registerInterceptor`. Reading from a frozen array would be
   * stricter but the registration surface is internal-only.
   */
  static #interceptors: Interceptor[] = [];

  /**
   * Append `interceptor` to the pipeline. Interceptors run in the
   * order they were registered; the first registered runs outermost.
   *
   * Once registered, an interceptor can't be removed — registration
   * is for boot-time framework wiring, not runtime composition.
   */
  public static registerInterceptor(interceptor: Interceptor): void {
    ProxyApi.#interceptors.push(interceptor);
  }

  /**
   * Wrap a raw Stuff in a Proxy. Returns a Proxy that is type-
   * compatible with the raw instance — TypeScript can't tell the
   * difference, and it's safe to register, hand out, or persist as
   * if it were the original.
   *
   * The Proxy's get-trap routes method invocations and getter reads
   * through the interceptor pipeline. Property writes pass through
   * unchanged (no `set` trap in v1).
   */
  public static wrap<T extends Stuff>(stuff: T): T {
    // Per-target wrapper cache so repeated `obj.foo` reads return
    // the same function reference. Otherwise every method access
    // allocates a new wrapper, which breaks `obj.foo === obj.foo`
    // and interferes with `removeEventListener`-style patterns that
    // compare callbacks by identity.
    const wrapperCache = new WeakMap<Function, Function>();

    const handler: ProxyHandler<T> = {
      get(target, prop, receiver) {
        if (prop === RAW_TARGET) return target;
        if (PASSTHROUGH_KEYS.has(prop)) {
          return Reflect.get(target, prop, receiver);
        }

        // Look at the descriptor BEFORE calling Reflect.get — getters
        // would fire eagerly and we'd lose the chance to dispatch
        // them through the pipeline.
        const descriptor = findDescriptor(target, prop);

        // Getter: run the pipeline immediately. The "raw" operation
        // is invoking the getter with `this === receiver` (the
        // proxy) so any nested access from inside the getter body
        // goes back through the proxy.
        if (descriptor?.get) {
          const methodName = typeof prop === 'symbol' ? prop.toString() : prop;
          return ProxyApi.#runPipeline(
            {
              target: target as Stuff,
              proxy: receiver as Stuff,
              prop: methodName,
              args: [],
              isGetter: true,
            },
            () => descriptor.get!.call(receiver)
          );
        }

        const value = Reflect.get(target, prop, receiver);

        if (typeof value !== 'function') {
          // Non-method properties (instance fields, computed values
          // from built-ins) pass through.
          return value;
        }

        // Test-mocking pass-through: vitest / jest spies carry an
        // `_isMockFunction` flag. Wrapping them in our pipeline
        // breaks `toHaveBeenCalled` assertions because the test
        // sees the wrapper instead of the spy. A method that was
        // deliberately swapped for a spy is the test's intentional
        // escape hatch; let it through unmediated.
        if ((value as { _isMockFunction?: boolean })._isMockFunction) {
          return value;
        }

        const cached = wrapperCache.get(value as Function);
        if (cached) return cached;

        const methodName = typeof prop === 'symbol' ? prop.toString() : prop;
        const proxyRef = receiver as Stuff;

        const wrapper = function (this: unknown, ...args: unknown[]): unknown {
          return ProxyApi.#runPipeline(
            {
              target: target as Stuff,
              proxy: proxyRef,
              prop: methodName,
              args,
              isGetter: false,
            },
            () => (value as (...a: unknown[]) => unknown).apply(proxyRef, args)
          );
        };

        wrapperCache.set(value as Function, wrapper);
        return wrapper;
      },
    };

    return new Proxy(stuff, handler);
  }

  /**
   * Extract the raw underlying Stuff from a proxy. Returns the input
   * as-is if it isn't proxied. Production code should rarely need
   * this — reach for it only when you need to bypass the entire
   * framework (tests, debugging, framework internals).
   */
  public static unwrap<T extends Stuff>(stuffOrProxy: T): T {
    const candidate = (stuffOrProxy as unknown as Record<symbol, T | undefined>)[
      RAW_TARGET
    ];
    return candidate ?? stuffOrProxy;
  }

  /** Test seam: drop every registered interceptor. @internal */
  public static _resetInterceptorsForTest(): void {
    SecurityApi.assertTestOnly('_resetInterceptorsForTest');
    ProxyApi.#interceptors = [];
  }

  /**
   * Run the interceptor pipeline. Invokes interceptors in
   * registration order; each calls `next()` to delegate. At the
   * end, `raw()` runs the underlying operation (descriptor.get for
   * getters, function.apply for methods). @internal — exposed for
   * tests; production code reaches the pipeline only via the
   * Proxy's get-trap.
   */
  static #runPipeline(ctx: InterceptionContext, raw: () => unknown): unknown {
    const interceptors = ProxyApi.#interceptors;
    let i = 0;
    const next = (): unknown => {
      if (i >= interceptors.length) return raw();
      const interceptor = interceptors[i++]!;
      return interceptor(ctx, next);
    };
    return next();
  }
}

/**
 * Walk an object's prototype chain returning the first descriptor
 * found for `prop`, or `undefined`. Used by the get-trap to detect
 * getters before `Reflect.get` would fire them.
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

// Like ExecutionContextApi, ModuleApi, and SecurityApi, ProxyApi
// deliberately doesn't call `SecurityApi.decorateApiClass` on itself.
// It's framework infrastructure — wrapping its own `wrap` method in
// security/policy plumbing would require the very Proxy infrastructure
// it's defining.
