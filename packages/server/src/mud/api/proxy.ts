/**
 * ProxyApi — generic Stuff-instance Proxy infrastructure.
 *
 * Owns the get-trap mechanics: descriptor lookup, wrapper caching,
 * mock-spy passthrough (in a test run only), the `RAW_TARGET` introspection seam. Doesn't
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
/**
 * One cached accessor: the prototype that declares it and its getter (the
 * trap needs the function itself, to call it with `this === proxy`).
 */
interface AccessorEntry {
  readonly holder: object;
  readonly get: () => unknown;
}

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
 *   - `stuffId`: instance field the framework itself reads
 *     constantly; mediation would add noise.
 *   - `host`, `interceptedMethods`: shadow-side framework getters;
 *     mediation would dispatch them through the shadow chain (wrong).
 *   - `RAW_TARGET`: the introspection escape hatch.
 *
 * `templatePath` and `zone` are NOT here: both slots are hard-private
 * (`Stuff.#templatePath`, `Stuff.#zone`) since the ref-shapes
 * lockdown. Access goes through `Stuff.getTemplatePath()` /
 * `Stuff.getZone()` and (for clone-time stamping) the caller-gated
 * `Stuff._stampTemplatePath` / `Stuff._stampZone` statics.
 *
 * Add to this list ONLY for fields/getters that genuinely belong
 * outside the framework's mediation surface.
 */
const PASSTHROUGH_KEYS: ReadonlySet<string | symbol> = new Set<string | symbol>([
  'then',
  'constructor',
  'stuffId',
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
   * ⭐ What the read trap asks of every read that is not an own property:
   * *is this name a GETTER somewhere up the prototype chain?* (A getter
   * must run through the pipeline; anything else is read live.) The
   * answer is a fact about the prototype chain, fixed when the class is
   * defined, so it is cached per prototype object (call-security-
   * performance D1): `null` for "no accessor" (a method, a prototype data
   * property, or nothing at all), else the holder and its getter.
   *
   * Keyed weakly on the prototype OBJECT, so a hot reload — which
   * evaluates a NEW class object and leaves old instances on the old
   * prototype — is a new key by construction, and both answer for
   * themselves. No generation stamp: nothing writes an accessor onto a
   * prototype after its class is defined (a test that wants one builds a
   * new class). A cached accessor is confirmed against its holder on every
   * use, so a getter spied, replaced or removed there is never served
   * stale.
   *
   * It replaced a walk of the whole chain on every read — the largest
   * single line of the world's busy time (14.7%, 2026-11-17).
   */
  static #accessorCache = new WeakMap<object, Map<string | symbol, AccessorEntry | null>>();

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
  public static wrap<T extends Stuff>(
    stuff: T,
    weakFields?: ReadonlySet<string> | null
  ): T {
    // Per-target wrapper cache so repeated `obj.foo` reads return
    // the same function reference. Otherwise every method access
    // allocates a new wrapper, which breaks `obj.foo === obj.foo`
    // and interferes with `removeEventListener`-style patterns that
    // compare callbacks by identity.
    // Keyed/valued by the bound method functions, cached by identity.
    type Fn = (...args: never[]) => unknown;
    const wrapperCache = new WeakMap<Fn, Fn>();

    // The class's `ref: 'instance'` fields, hoisted into the handler
    // closure exactly as `wrapperCache` is — computed once per wrap,
    // never per read. `null` for nearly every class, which makes the
    // hot-path cost of the whole mechanism one `!== null`.
    //
    // Passed IN rather than looked up here: `api/proxy.ts` imports only
    // `SecurityApi`, and a value import of `MixinApi` would close the
    // cycle proxy → mixin → security → proxy. The two callers in
    // `api/stuff.ts` hold both and do the lookup.
    const weak = weakFields ?? null;

    // The accessor answers for this instance's prototype, hoisted for the
    // same reason. Re-checked per read (`getPrototypeOf` is cheap): an
    // instance re-parented after wrap reads its new chain's answers.
    const wrapProto = Object.getPrototypeOf(stuff) as object | null;
    const wrapAccessors = ProxyApi.#accessorsOf(wrapProto);

    // ⛔ The spy passthrough is a TEST-RUNNER affordance: outside a process
    // running vitest a function carrying `_isMockFunction` is wrapped and
    // gated like any method (owner ruling 2026-11-18; D12). Read once per
    // wrap — the environment does not change within a process — so in
    // production the flag is never even read.
    const spyPassthrough = SecurityApi.isTestRunner();

    const handler: ProxyHandler<T> = {
      get(target, prop, receiver) {
        if (prop === RAW_TARGET) return target;
        if (PASSTHROUGH_KEYS.has(prop)) {
          return Reflect.get(target, prop, receiver);
        }

        // Is it a getter? Asked BEFORE `Reflect.get`, which would fire a
        // getter eagerly and lose the chance to dispatch it through the
        // pipeline. An own property first, live, exactly as before (a
        // field, a lazily assigned slot, an instance-level replacement, an
        // own accessor); then the prototype chain's cached answer.
        let getter: (() => unknown) | undefined;
        const own = Object.getOwnPropertyDescriptor(target, prop);
        if (own !== undefined) {
          getter = own.get;
        } else {
          const proto = Object.getPrototypeOf(target) as object | null;
          const accessors = proto === wrapProto ? wrapAccessors : ProxyApi.#accessorsOf(proto);
          getter = accessors === null ? undefined : ProxyApi.#getterOf(accessors, proto!, prop);
        }

        // Getter: run the pipeline immediately. The "raw" operation
        // is invoking the getter with `this === receiver` (the
        // proxy) so any nested access from inside the getter body
        // goes back through the proxy.
        if (getter !== undefined) {
          const methodName = typeof prop === 'symbol' ? prop.toString() : prop;
          const get = getter;
          return ProxyApi.#runPipeline(
            {
              target: target as Stuff,
              proxy: receiver as Stuff,
              prop: methodName,
              args: [],
              isGetter: true,
            },
            () => get.call(receiver)
          );
        }

        // An own property's value is the descriptor already in hand (an own
        // data property's `value` IS what `Reflect.get` would return; an
        // own setter-only accessor reads `undefined` either way). Only an
        // inherited name pays the second lookup.
        const value = own !== undefined ? own.value : Reflect.get(target, prop, receiver);

        // R2.3 self-heal. A slot declared `ref: 'instance'` that holds a
        // destroyed Stuff reads as `null`, and the slot is cleared so
        // the next read is free.
        //
        // Arity is decided HERE, at heal time, not declared: `fieldMeta`
        // carries no single-vs-collection marker and one cannot be
        // inferred from `lifetime` (`Exitable.exits` is an owned Map;
        // `Boundary.anchorA` is an owned single). So this branches on
        // the runtime value and heals only a lone Stuff that answers
        // `isDestroyed()`. An Array/Set/Map is left alone — pruning a
        // collection on every read is O(n) on the exit-listing hot path
        // and buys nothing the R2.4 chokepoints don't already give.
        if (weak !== null && typeof prop === 'string' && weak.has(prop)) {
          const held = value as { isDestroyed?: () => boolean } | null;
          if (
            held !== null &&
            typeof held === 'object' &&
            typeof held.isDestroyed === 'function' &&
            held.isDestroyed()
          ) {
            (target as unknown as Record<string, unknown>)[prop] = null;
            return null;
          }
        }

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
        // escape hatch; let it through unmediated — IN A TEST RUN only.
        // Anywhere else the marker is just a property anyone can set, and
        // honoring it handed out an ungated method.
        if (spyPassthrough && (value as { _isMockFunction?: boolean })._isMockFunction) {
          return value;
        }

        const cached = wrapperCache.get(value as Fn);
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

        wrapperCache.set(value as Fn, wrapper);
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

  /** The per-prototype accessor answers; `null` for a null prototype. */
  static #accessorsOf(
    proto: object | null
  ): Map<string | symbol, AccessorEntry | null> | null {
    if (proto === null) return null;
    let map = ProxyApi.#accessorCache.get(proto);
    if (map === undefined) {
      map = new Map();
      ProxyApi.#accessorCache.set(proto, map);
    }
    return map;
  }

  /**
   * The getter `prop` resolves to on the chain from `proto`, or
   * `undefined` — from the cache, confirmed against its holder (one
   * descriptor read), else by walking the chain once and caching.
   */
  static #getterOf(
    accessors: Map<string | symbol, AccessorEntry | null>,
    proto: object,
    prop: string | symbol
  ): (() => unknown) | undefined {
    const hit = accessors.get(prop);
    if (hit === null) return undefined;
    if (hit !== undefined && Object.getOwnPropertyDescriptor(hit.holder, prop)?.get === hit.get) {
      return hit.get;
    }
    const entry = ProxyApi.#accessorOn(proto, prop);
    accessors.set(prop, entry);
    return entry?.get;
  }

  /**
   * Walk the chain from `proto` to the first descriptor for `prop`: an
   * accessor with a getter is an entry, anything else (a method, a data
   * property, a setter-only accessor, nothing) is `null` — the answer a
   * walk of the whole chain gave on every read before the cache.
   */
  static #accessorOn(proto: object, prop: string | symbol): AccessorEntry | null {
    let cur: object | null = proto;
    while (cur !== null && cur !== Object.prototype) {
      const d = Object.getOwnPropertyDescriptor(cur, prop);
      if (d !== undefined) return d.get ? { holder: cur, get: d.get } : null;
      cur = Object.getPrototypeOf(cur) as object | null;
    }
    return null;
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
    // ⭐ The two shapes the engine actually runs in, walked without
    // allocating a chain link. Production registers exactly ONE
    // interceptor (the security gate) and boot briefly has zero; the
    // generic `next` closure below exists for a chain that no shipped
    // configuration builds, and it was being allocated — and, under the
    // `tsx`/esbuild runtime, `Object.defineProperty`-named — on every
    // method call in the engine. `raw` is already the zero-arg thunk an
    // interceptor's `next` is contracted to be, so the single-
    // interceptor case hands it straight over.
    if (interceptors.length === 1) return interceptors[0]!(ctx, raw);
    if (interceptors.length === 0) return raw();
    let i = 0;
    const next = (): unknown => {
      if (i >= interceptors.length) return raw();
      const interceptor = interceptors[i++]!;
      return interceptor(ctx, next);
    };
    return next();
  }
}

// Like ExecutionContextApi, ModuleApi, and SecurityApi, ProxyApi
// deliberately doesn't call `SecurityApi.decorateApiClass` on itself.
// It's framework infrastructure — wrapping its own `wrap` method in
// security/policy plumbing would require the very Proxy infrastructure
// it's defining.
