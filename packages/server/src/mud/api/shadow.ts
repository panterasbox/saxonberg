/**
 * ShadowApi — public + framework-internal surface for the shadow
 * subsystem.
 *
 * Single class, mirroring the `StuffApi` precedent: state and
 * behaviour co-located. Public methods (`attach`, `detach`, `clear`,
 * `getShadows`, `getAllShadows`) are what callers use; the
 * framework-internal helpers (`_hostOf`, `_methodsOf`, `_dispatch`,
 * `_callDown`, `_callBypass`, `_clearAllForTesting`) are exposed with
 * an underscore prefix per existing convention so tests and the proxy
 * can reach them without an `Internal` companion class.
 *
 * Reference discipline: both directions of the host↔shadow link live
 * in `#`-private WeakMaps owned by this class. User code cannot read
 * or mutate them directly — `Shadow.host` and `Shadow.interceptedMethods`
 * are read-only getters that delegate to `_hostOf` / `_methodsOf`. The
 * framework's own `attach` / `detach` / privileged-detach paths are
 * the only mutators; they always update both maps in the same call.
 *
 * Stage 3 implements §3.3–§3.10 from the requirements doc:
 *   - inferred surface = methods explicitly defined in the shadow's
 *     own class body (own properties of `shadow.constructor.prototype`,
 *     minus `constructor`) PLUS any `@Shadowing`-decorated methods.
 *     Methods inherited from composed mixin layers are part of the
 *     shadow's *type contract* but NOT its *intercept set* — composing
 *     a mixin to satisfy a Witness interface no longer auto-enrolls
 *     every method on every layer. Only what the shadow itself
 *     declares (or remaps via `@Shadowing`) intercepts.
 *   - dispatch invokes shadows in install order (newest first),
 *     entry policy fires once at the top, per-shadow CallFrames push
 *     individually so `getCaller()` inside each shadow sees the
 *     previous shadow.
 *   - `callDown` walks down the dispatch stack via ALS state.
 *   - `callBypass` sets an ALS bypass marker the proxy honours.
 *   - lifecycle: privileged detach during `StuffApi.destruct(host)`
 *     happens AFTER `prepareDestroy` and BEFORE `destroy`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Shadow } from '../lib/stuff/Shadow';
import {
  ShadowError,
  DestroyedObjectError,
  SecurityError,
} from '../lib/security/errors';
import { ExecutionContextApi } from './execution-context';
import { SecurityApi } from './security';
import { AsyncLocalStorage } from 'node:async_hooks';

const EMPTY_METHODS: ReadonlySet<string> = new Set();

/**
 * Per-active-dispatch state. ALS-stored so reentrant calls (a method
 * dispatch nested inside a shadow body) get fresh state.
 */
interface DispatchState {
  host: Stuff;
  methodName: string;
  /** Shadows in install order; index 0 oldest, length-1 newest. */
  shadows: Shadow[];
  originalArgs: unknown[];
  /** Set when a `callBypass` is active so the proxy returns raw method. */
  bypassNext: boolean;
}

const _dispatchALS = new AsyncLocalStorage<DispatchState>();

export class ShadowApi {
  static #hostShadows: WeakMap<Stuff, Map<string, Shadow[]>> = new WeakMap();
  static #shadowHost: WeakMap<Shadow, Stuff> = new WeakMap();
  static #shadowMethods: WeakMap<Shadow, ReadonlySet<string>> = new WeakMap();

  /* ─────────────────────────── Public API ─────────────────────────── */

  /**
   * Attach `shadow` to `host`. Computes the inferred surface from the
   * shadow's class composition (every method on every layer marked
   * with `_mixinName`) plus any `@Shadowing`-decorated methods. Runs
   * `@Unshadowable` and `@ShadowSecurity({ attach })` validation.
   * Atomic: nothing mutates if any check fails.
   */
  public static attach(host: Stuff, shadow: Shadow): void {
    if (host.isDestroyed()) {
      throw new DestroyedObjectError(host.stuffId, 'attach');
    }
    if (shadow.isDestroyed()) {
      throw new DestroyedObjectError(shadow.stuffId, 'attach');
    }
    if (this.#shadowHost.has(shadow)) {
      throw new ShadowError('shadow already attached; detach first', {
        shadowId: shadow.stuffId,
      });
    }

    const intercept = ShadowApi.#computeInterceptSet(shadow);
    if (intercept.size === 0) {
      throw new ShadowError(
        'shadow class has no surface — compose a mixin or mark methods with @Shadowing',
        { shadowId: shadow.stuffId }
      );
    }

    // Validate @Unshadowable + @ShadowSecurity(attach) BEFORE any mutation.
    for (const m of intercept) {
      if (SecurityApi.isMethodUnshadowable(host, m)) {
        throw new ShadowError(
          `host method ${m} is marked @Unshadowable`,
          { shadowId: shadow.stuffId, hostId: host.stuffId, methodName: m }
        );
      }
      const secs = SecurityApi.resolveShadowSecurity(host, m);
      if (secs?.attach) {
        const caller = ExecutionContextApi.getCurrentTarget();
        if (!secs.attach.allows(caller, host, m)) {
          throw new SecurityError(
            `@ShadowSecurity({ attach }) denied attach of ${m} on ${host.stuffId}`,
            { stuffId: host.stuffId, methodName: m, policyName: secs.attach.name }
          );
        }
      }
    }

    // Atomic install. All mutation inside this method, both maps
    // updated in the same call — no externally-reachable
    // intermediate state.
    let methodMap = this.#hostShadows.get(host);
    if (!methodMap) {
      methodMap = new Map();
      this.#hostShadows.set(host, methodMap);
    }
    for (const m of intercept) {
      let arr = methodMap.get(m);
      if (!arr) {
        arr = [];
        methodMap.set(m, arr);
      }
      arr.push(shadow);
    }
    this.#shadowHost.set(shadow, host);
    this.#shadowMethods.set(shadow, Object.freeze(new Set(intercept)));
  }

  /**
   * Detach `shadow` from its current host. No-op if unattached.
   * Runs `@ShadowSecurity({ detach })` for each intercepted method
   * before any mutation. Atomic: a deny on any method aborts the
   * whole detach.
   */
  public static detach(shadow: Shadow): void {
    const host = this.#shadowHost.get(shadow);
    if (!host) return;
    const methods = this.#shadowMethods.get(shadow) ?? EMPTY_METHODS;

    for (const m of methods) {
      const secs = SecurityApi.resolveShadowSecurity(host, m);
      if (secs?.detach) {
        const caller = ExecutionContextApi.getCurrentTarget();
        if (!secs.detach.allows(caller, host, m)) {
          throw new SecurityError(
            `@ShadowSecurity({ detach }) denied detach of ${m} on ${host.stuffId}`,
            { stuffId: host.stuffId, methodName: m, policyName: secs.detach.name }
          );
        }
      }
    }

    ShadowApi.#removeAtomic(shadow, host, methods);
  }

  /** Read-only snapshot of shadows attached to `host` for `methodName`. */
  public static getShadows(host: Stuff, methodName: string): readonly Shadow[] {
    const arr = this.#hostShadows.get(host)?.get(methodName);
    return arr ? [...arr] : [];
  }

  /** Read-only snapshot of every shadow attached to `host`, by method. */
  public static getAllShadows(host: Stuff): ReadonlyMap<string, readonly Shadow[]> {
    const methodMap = this.#hostShadows.get(host);
    if (!methodMap) return new Map();
    const out = new Map<string, Shadow[]>();
    for (const [k, v] of methodMap) out.set(k, [...v]);
    return out;
  }

  /* ─────────────────── Framework-internal API ─────────────────── */

  /** Backs `Shadow.host`. @internal */
  public static _hostOf(shadow: Shadow): Stuff | null {
    return this.#shadowHost.get(shadow) ?? null;
  }

  /** Backs `Shadow.interceptedMethods`. @internal */
  public static _methodsOf(shadow: Shadow): ReadonlySet<string> {
    return this.#shadowMethods.get(shadow) ?? EMPTY_METHODS;
  }

  /**
   * Look up shadows for the given host+method. Returns null when
   * no shadows are attached to that method on that host so the
   * proxy can short-circuit. @internal
   */
  public static _shadowsFor(
    host: Stuff,
    methodName: string
  ): readonly Shadow[] | null {
    const arr = this.#hostShadows.get(host)?.get(methodName);
    if (!arr || arr.length === 0) return null;
    return arr;
  }

  /**
   * Initialise dispatch state and run `fn` inside it. The proxy calls
   * this once when it's about to dispatch a method that has shadows.
   * @internal
   */
  public static _withDispatch<T>(
    host: Stuff,
    methodName: string,
    shadows: readonly Shadow[],
    args: unknown[],
    fn: () => T
  ): T {
    const state: DispatchState = {
      host,
      methodName,
      shadows: [...shadows],
      originalArgs: args,
      bypassNext: false,
    };
    return _dispatchALS.run(state, fn);
  }

  /**
   * Read the bypass marker if currently set, then clear it. Returns
   * true exactly once per `callBypass` to tell the proxy to return
   * the raw method without further mediation. @internal
   */
  public static _consumeBypass(): boolean {
    const state = _dispatchALS.getStore();
    if (!state) return false;
    if (state.bypassNext) {
      state.bypassNext = false;
      return true;
    }
    return false;
  }

  /**
   * Backs `Shadow.callDown`. Walks the shadow array to find the
   * caller, dispatches to the next layer down. At the bottom, sets
   * the bypass marker and invokes through the proxy so we re-enter
   * via the host's normal dispatch path with shadows skipped.
   * @internal
   */
  public static _callDown(callingShadow: Shadow, args: unknown[]): unknown {
    const state = _dispatchALS.getStore();
    if (!state) {
      throw new ShadowError('callDown called outside of dispatch', {
        shadowId: callingShadow.stuffId,
      });
    }
    const idx = state.shadows.indexOf(callingShadow);
    if (idx < 0) {
      throw new ShadowError(
        'callDown: calling shadow not part of current dispatch',
        { shadowId: callingShadow.stuffId }
      );
    }
    if (idx > 0) {
      // Next shadow down.
      const next = state.shadows[idx - 1]!;
      return ExecutionContextApi.run(
        callingShadow,
        next,
        state.methodName,
        undefined,
        () => ShadowApi.#invokeOn(next, state.methodName, args)
      );
    }
    // Bottom of chain — invoke host's original via bypass marker.
    // For methods: read returns the wrapper, invoke with args
    // (wrapper consumes the bypass and runs raw). For getters:
    // reading the property IS the invocation — the proxy's getter
    // path consumes the bypass and runs the raw getter, returning
    // a value directly. Detect which form by walking the host's
    // descriptor.
    state.bypassNext = true;
    return ExecutionContextApi.run(
      callingShadow,
      state.host,
      state.methodName,
      undefined,
      () => {
        const descriptor = ShadowApi.#findDescriptor(state.host, state.methodName);
        if (descriptor?.get) {
          // Reading the proxy property fires the getter through the
          // mediation pipeline, which sees bypassNext and runs raw.
          return (state.host as unknown as Record<string, unknown>)[
            state.methodName
          ];
        }
        const fn = (state.host as unknown as Record<string, unknown>)[
          state.methodName
        ];
        if (typeof fn !== 'function') {
          throw new ShadowError(
            `host has no method ${state.methodName}`,
            { hostId: state.host.stuffId, methodName: state.methodName }
          );
        }
        return (fn as (...a: unknown[]) => unknown).apply(state.host, args);
      }
    );
  }

  /** Walk an object's prototype chain returning the first descriptor for `name`. */
  static #findDescriptor(obj: object, name: string): PropertyDescriptor | undefined {
    let cur: object | null = obj;
    while (cur && cur !== Object.prototype) {
      const d = Object.getOwnPropertyDescriptor(cur, name);
      if (d) return d;
      cur = Object.getPrototypeOf(cur);
    }
    return undefined;
  }

  /**
   * Backs `Shadow.callBypass`. Sets bypass marker, invokes the named
   * method on the host through the proxy. The proxy honours the
   * marker and returns the raw method bypassing both entry policy
   * and shadow chain. @internal
   */
  public static _callBypass(
    shadow: Shadow,
    method: string,
    args: unknown[]
  ): unknown {
    const host = this.#shadowHost.get(shadow);
    if (!host) {
      throw new ShadowError('callBypass: shadow has no host', {
        shadowId: shadow.stuffId,
      });
    }
    if (typeof method !== 'string') {
      throw new ShadowError('callBypass: method must be a string', {
        shadowId: shadow.stuffId,
      });
    }
    // We may or may not be inside an existing dispatch. Either way,
    // start a fresh dispatch context with bypassNext set so the
    // single next call through the host's proxy returns the raw
    // method. After the call, the dispatch state goes out of scope
    // and the marker dies with it.
    return _dispatchALS.run(
      {
        host,
        methodName: method,
        shadows: [],
        originalArgs: args,
        bypassNext: true,
      },
      () =>
        ExecutionContextApi.run(shadow, host, method, undefined, () => {
          const fn = (host as unknown as Record<string, unknown>)[method];
          if (typeof fn !== 'function') {
            throw new ShadowError(`host has no method ${method}`, {
              hostId: host.stuffId,
              methodName: method,
            });
          }
          return (fn as (...a: unknown[]) => unknown).apply(host, args);
        })
    );
  }

  /**
   * Privileged detach used by `StuffApi.destruct(host)`. Skips
   * `@ShadowSecurity({ detach })` because host destruction is
   * unconditional. @internal
   */
  public static _detachAllForHost(host: Stuff): void {
    const methodMap = this.#hostShadows.get(host);
    if (!methodMap) return;
    const all: Set<Shadow> = new Set();
    for (const arr of methodMap.values()) {
      for (const s of arr) all.add(s);
    }
    for (const shadow of all) {
      const methods = this.#shadowMethods.get(shadow) ?? EMPTY_METHODS;
      ShadowApi.#removeAtomic(shadow, host, methods);
    }
  }

  /**
   * Public adapter for the proxy's dispatch path: invoke the
   * `hostMethodName` on `shadow` with descriptor-aware dispatch
   * (value methods, getters, setters). @internal
   */
  public static _invokeOnShadow(
    shadow: Shadow,
    hostMethodName: string,
    args: unknown[]
  ): unknown {
    return ShadowApi.#invokeOn(shadow, hostMethodName, args);
  }

  /** Test seam — wipe all shadow state. @internal */
  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    this.#hostShadows = new WeakMap();
    this.#shadowHost = new WeakMap();
    this.#shadowMethods = new WeakMap();
  }

  /* ─────────────────────────── Internals ─────────────────────────── */

  /**
   * Compute the inferred intercept set for a shadow class. Two
   * sources, unioned:
   *
   * 1. Own properties of `shadow.constructor.prototype` (minus
   *    `constructor`) — methods the shadow class explicitly declares.
   *    Methods inherited from composed mixin layers do NOT enrol.
   *    A shadow that composes `Foo` to satisfy a type interface but
   *    only declares its own `bar()` method will intercept `bar`,
   *    not all of `Foo`'s methods.
   * 2. `@Shadowing(hostName)` decorations on the shadow's own class —
   *    declare an interception even when the local method name
   *    differs from the host's, or for shadows that don't compose a
   *    matching mixin at all.
   */
  static #computeInterceptSet(shadow: Shadow): Set<string> {
    const out = new Set<string>();
    const ownProto = shadow.constructor.prototype as object | null;
    if (ownProto) {
      for (const name of Object.getOwnPropertyNames(ownProto)) {
        if (name === 'constructor') continue;
        out.add(name);
      }
    }
    const ctor = shadow.constructor as object;
    const shadowingMap = (ctor as { _callSecShadowing?: Map<string, string> })
      ._callSecShadowing;
    if (shadowingMap) {
      for (const hostName of shadowingMap.keys()) out.add(hostName);
    }
    return out;
  }

  /**
   * Resolve which local method a shadow should run when intercepting
   * `hostMethodName`. For mixin-derived intercepts the local name
   * equals the host name (identity). For `@Shadowing('hostMethod')
   * localMethod() {}` patterns the map remaps `hostMethod` →
   * `localMethod`.
   */
  static #resolveLocalMethodName(shadow: Shadow, hostMethodName: string): string {
    const ctor = shadow.constructor as object;
    const map = (ctor as { _callSecShadowing?: Map<string, string> })
      ._callSecShadowing;
    return map?.get(hostMethodName) ?? hostMethodName;
  }

  /**
   * Invoke a method on a shadow, dispatching based on the
   * descriptor's shape (value / get / set). For mixin-derived
   * intercepts and bare `@Shadowing`s, the local name equals the
   * host method name; for `@Shadowing('hostName')` patterns it's
   * remapped.
   */
  static #invokeOn(shadow: Shadow, hostMethodName: string, args: unknown[]): unknown {
    const localName = ShadowApi.#resolveLocalMethodName(shadow, hostMethodName);
    // Walk the prototype chain to find the descriptor — getters and
    // setters live on the prototype, not on the instance, and value
    // methods do too. `Reflect.get` returns the resolved value but
    // doesn't tell us if it was an accessor. Find descriptor first.
    let proto: unknown = Object.getPrototypeOf(shadow);
    let descriptor: PropertyDescriptor | undefined;
    while (proto && proto !== Object.prototype) {
      const d = Object.getOwnPropertyDescriptor(proto, localName);
      if (d) {
        descriptor = d;
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
    if (!descriptor) {
      throw new ShadowError(
        `shadow has no method ${localName} for host method ${hostMethodName}`,
        { shadowId: shadow.stuffId, methodName: hostMethodName }
      );
    }
    if (typeof descriptor.value === 'function') {
      return (descriptor.value as (...a: unknown[]) => unknown).apply(
        shadow,
        args
      );
    }
    if (descriptor.get && args.length === 0) {
      return descriptor.get.call(shadow);
    }
    if (descriptor.set && args.length === 1) {
      descriptor.set.call(shadow, args[0]);
      return undefined;
    }
    throw new ShadowError(
      `shadow descriptor for ${localName} doesn't match dispatch shape`,
      { shadowId: shadow.stuffId, methodName: hostMethodName }
    );
  }

  /**
   * Mutate both maps to remove `shadow` from `host`. Caller has
   * already validated security. Invariant: both directions of the
   * link clear in the same synchronous call — no externally-
   * reachable intermediate state.
   */
  static #removeAtomic(
    shadow: Shadow,
    host: Stuff,
    methods: ReadonlySet<string>
  ): void {
    const methodMap = this.#hostShadows.get(host);
    if (methodMap) {
      for (const m of methods) {
        const arr = methodMap.get(m);
        if (!arr) continue;
        const idx = arr.indexOf(shadow);
        if (idx >= 0) arr.splice(idx, 1);
        if (arr.length === 0) methodMap.delete(m);
      }
      if (methodMap.size === 0) this.#hostShadows.delete(host);
    }
    this.#shadowHost.delete(shadow);
    this.#shadowMethods.delete(shadow);
  }
}

SecurityApi.decorateApiClass(ShadowApi);

// Register ShadowApi with SecurityApi's interceptor. SecurityApi
// can't `import { ShadowApi }` directly without forming a load-time
// cycle (security.ts → shadow.ts → SecurityApi.decorateApiClass while
// SecurityApi is still mid-load). Instead, the interceptor reads a
// late-bound slot which we populate here at module-bottom.
SecurityApi._registerShadowApi(ShadowApi);
