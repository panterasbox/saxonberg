/**
 * EventApi — thin facade over `EventRegistry` (event-property
 * declarations) and `EventSubscriptions` (runtime listener registry +
 * history).
 *
 * Two-layer reactivity sits alongside this bus: the **Witness pattern**
 * (object-local hooks on Mobile / Container / Containable / Exitable /
 * HasInteractive) handles "X happened to a known target." EventApi
 * handles "X happened, no specific receiver yet" — login, server-wide
 * lifecycle, audit streams.
 *
 * Storage / gate:
 *   - `EventRegistry` (existing) — event-property declarations and the
 *     per-property `checkAccess` policies; `setProp` is the emit gate.
 *   - `EventSubscriptions` (this refactor) — the runtime listener
 *     side-table and the bounded ring-buffer history. Methods carry
 *     `@CallSecurity(FromModule('mud/api/event#EventApi'))` so the
 *     subscription state has one calling surface — this one.
 *
 * Dispatch is non-blocking and isolated: `emit` enqueues a microtask,
 * each listener runs in a fresh `EventDispatch` frame, and a thrown
 * listener doesn't break siblings or the emitter.
 *
 * The narrow-entry pattern: `EventApi` is the only legitimate path to
 * either Stuff's state. State has one home, one calling surface, and
 * one structurally-enforced path between them.
 */

import { ExecutionContextApi, FrameKind } from './execution-context';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityError } from '../lib/security/errors';
import { Events, type EventName } from '../lib/events';
import {
  Property,
  PropOperations,
  type PropAccessCheck,
  type PropValue,
} from '../lib/stuff/Propertied';
import type EventRegistry from '../obj/EventRegistry';
import type EventSubscriptions from '../obj/EventSubscriptions';
import type { SubscriptionRecord } from '../obj/EventSubscriptions';

/**
 * A class reference used in emit/subscribe allowlists. Entries are
 * compared by identity against the call-stack originator, never called
 * or constructed. Matching on the `prototype` property (which every
 * class object carries) accepts any class — including the Api
 * singletons whose `private constructor` would be rejected by an
 * `abstract new (...)` construct-signature type.
 */
type OriginatorRef = { readonly prototype: unknown };

/**
 * Listener invocation context. The triggering frame is the proxy /
 * decorator frame that wrapped whichever method called `emit` —
 * useful for attribution without inheriting the originator's
 * permissions (listeners run in a fresh `EventDispatch` frame).
 */
export interface ListenerContext {
  triggeringContext: {
    caller: unknown | null;
    target: unknown | null;
    method: string;
  } | null;
}

export type Listener<T> = (
  payload: T,
  ctx: ListenerContext
) => void | Promise<void>;

export interface SubscribeOptions<T> {
  /** Pre-dispatch predicate; false skips this listener for the call. */
  filter?: (payload: T) => boolean;
  /** Post-dispatch predicate; true unsubscribes the listener. */
  until?: (payload: T) => boolean;
}

export interface Subscription<T = unknown> {
  unsubscribe(): void;
  readonly eventName: string;
  /** The most recent payload seen by `emit`, or `null` if none yet. */
  readonly lastPayload: T | null;
}

interface InternalSubscription<T> extends Subscription<T> {
  __invoke(payload: T, ctx: ListenerContext): Promise<void> | void;
  __filter?: (payload: T) => boolean;
  __until?: (payload: T) => boolean;
  __lastPayload: T | null;
}

function findClassFrame(
  stack: ReadonlyArray<{ target: unknown }>,
  cls: unknown
): number {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.target === cls) return i;
  }
  return -1;
}

function originatorMatches(
  originator: unknown,
  allowed: OriginatorRef[]
): boolean {
  if (originator == null) return false;
  // Static-decorator frames: target IS the class.
  if (typeof originator === 'function') {
    return allowed.some(
      (c) =>
        originator === c ||
        (originator as { prototype?: unknown }).prototype instanceof
          (c as new (...a: unknown[]) => object)
    );
  }
  // Instance-method frames: target is an instance.
  return allowed.some(
    (c) => originator instanceof (c as new (...a: unknown[]) => object)
  );
}

/**
 * Structural shape for an event that rides the EventApi bus. Any
 * object with a `kind` discriminator and a `payload` qualifies.
 */
export interface BusEvent<P = unknown> {
  readonly kind: string;
  readonly payload: P;
}

/**
 * Constructor shape for class-based `EventApi.fire` / `on` overloads.
 */
export interface EventClassCtor<E extends BusEvent<unknown>> {
  readonly KIND: string;
  new (...args: never[]): E;
}

/** Extract the payload type from an event class. */
type PayloadOf<E> = E extends BusEvent<infer P> ? P : never;

/* ─────────────────────────── EventApi ─────────────────────────── */

export class EventApi {
  static #registryRef: EventRegistry | null = null;
  static #subsRef: EventSubscriptions | null = null;
  static #subsClass: (new () => EventSubscriptions) | null = null;

  /**
   * Subscribe-ownership ledger for `restrictSubscribe`: event name → the
   * set of owner class *names* that have claimed its receive side. Keyed by
   * name (not class identity) so a hot-reload — which mints a fresh class
   * object of the same name — re-asserts its own claim, while a different
   * class (an author trying to hijack a sensitive tap) is refused.
   */
  static #subscribeOwners = new Map<string, Set<string>>();

  /** @internal — called from `obj/EventSubscriptions.ts` module body. */
  public static _registerSubsClass(cls: new () => EventSubscriptions): void {
    EventApi.#subsClass = cls;
  }

  /**
   * Resolve the singleton EventRegistry via the `byTemplatePath`
   * index. Cached after the first lookup. Returns `null` if the
   * registry hasn't been bootstrapped yet — `emit` skips silently
   * in that case so very-early-boot emit sites don't crash.
   */
  static #registry(): EventRegistry | null {
    if (this.#registryRef) return this.#registryRef;
    const reg = StuffApi.findByTemplatePath<EventRegistry>(
      '/obj/EventRegistry'
    );
    if (!reg) return null;
    this.#registryRef = reg;
    return reg;
  }

  /**
   * Resolve the singleton EventSubscriptions, lazy-creating a transient
   * in-memory instance if `BootstrapManager.run()` hasn't seeded one
   * yet. Returns `null` when neither the bootstrap nor the class
   * registration has happened (early-boot emits short-circuit on
   * this).
   */
  static #subs(): EventSubscriptions | null {
    if (this.#subsRef) return this.#subsRef;
    const existing = StuffApi.findByTemplatePath<EventSubscriptions>(
      '/obj/EventSubscriptions'
    );
    if (existing) {
      this.#subsRef = existing;
      return existing;
    }
    if (!EventApi.#subsClass) return null;
    const sub = StuffApi.createSync<EventSubscriptions>(
      () => new EventApi.#subsClass!(),
    );
    sub.setTemplatePath('/obj/EventSubscriptions');
    this.#subsRef = sub;
    return sub;
  }

  /**
   * Build an access-check function for an event property. Two checks:
   *
   *   1. Defense — `setProp`/`getProp` on the registry must have come
   *      via EventApi. Even if a caller gets the registry instance and
   *      tries to call `setProp` directly, this rejects the bypass.
   *   2. Allowlist — for `Set` (emit), the originating caller's class
   *      must be in `allowed`. `Get` (subscribe) is open by default
   *      because a subscriber has no privilege to leak; tighten with
   *      `EventApi.eventPolicy({ emit, subscribe })` if a specific
   *      event needs it.
   *
   * Stack-walks so intervening frames (e.g. PropertiedMixin's own
   * `checkAccess` proxy mediation) don't break the check.
   */
  public static emittableBy(
    ...allowed: OriginatorRef[]
  ): PropAccessCheck<PropValue> {
    return (_prop, op) => {
      const stack = ExecutionContextApi.getCallStack();

      // Defense: somewhere on the stack, EventApi (the API class
      // itself, target on a static-decorator frame) must be present.
      const eventApiIdx = findClassFrame(stack, EventApi);
      if (eventApiIdx < 0) return false;

      if (op === PropOperations.Get) {
        // Subscribe: only the EventApi-mediated path is permitted; the
        // originator class isn't gated by default.
        return true;
      }
      if (op === PropOperations.Configure) {
        // Reconfigure an event's own access policy — allowed iff
        // EventApi-mediated (the defense above already requires the
        // EventApi frame). The only mediated caller is
        // `restrictSubscribe`, which always tightens; no general
        // "configure" surface is exposed. Lets a consumer re-assert its
        // subscribe restriction after a hot-reload changes its class.
        return true;
      }
      if (op !== PropOperations.Set) {
        return false;
      }
      if (allowed.length === 0) {
        // No allowlist supplied: open emit.
        return true;
      }

      // The originator is the frame just BELOW the EventApi frame.
      const originator = stack[eventApiIdx - 1]?.target;
      return originatorMatches(originator, allowed);
    };
  }

  /**
   * Companion to `emittableBy` for events that want to gate subscribe
   * (Get) too. Composes both checks; pass `null` for either side to
   * leave it open.
   */
  public static eventPolicy(opts: {
    emit: OriginatorRef[];
    subscribe?: OriginatorRef[] | null;
  }): PropAccessCheck<PropValue> {
    const emitGate = EventApi.emittableBy(...opts.emit);
    return (prop, op, special) => {
      if (
        op === PropOperations.Get &&
        opts.subscribe &&
        opts.subscribe.length > 0
      ) {
        const stack = ExecutionContextApi.getCallStack();
        const eventApiIdx = findClassFrame(stack, EventApi);
        if (eventApiIdx < 0) return false;
        const originator = stack[eventApiIdx - 1]?.target;
        return originatorMatches(originator, opts.subscribe);
      }
      return emitGate(prop, op, special);
    };
  }

  /**
   * Restrict the **receive** (subscribe) side of an event to an allowlist
   * of consumer classes — the first use of the EventRegistry prop-access
   * apparatus's `Get` half. Emit stays open (`emit: []`); only the listed
   * classes may `EventApi.on(name, …)`. Everyone else's subscribe throws.
   *
   * For **sensitive activity taps** whose payload carries a per-actor id
   * (`comm.received`, `reaction.fired`, `command.dispatched`): broadcasting
   * those on the open-subscribe bus would let any mudlib subscriber snoop a
   * player's command/utterance cadence. Locking subscribe to the single
   * blessed consumer closes that side-channel while keeping the bus's
   * producer-ignorant decoupling.
   *
   * Call from the consumer's tap-install (with the consumer's own class) so
   * the policy is in place before the first subscribe, and re-asserts after
   * a hot-reload (the reloaded install passes the reloaded class). Ownership
   * is tracked by class *name*: a same-named reload re-asserts; a different
   * class is refused (no hijacking another consumer's tap).
   */
  public static restrictSubscribe(
    name: string,
    ...consumers: OriginatorRef[]
  ): void {
    const reg = this.#registry();
    if (!reg) return; // pre-bootstrap; the event isn't declared yet
    const names = consumers.map(
      (c) => (c as { name?: string }).name ?? ''
    );
    const owners = EventApi.#subscribeOwners.get(name);
    if (owners && !names.some((n) => owners.has(n))) {
      console.warn(
        `EventApi.restrictSubscribe('${name}'): refused — already owned ` +
          `by {${[...owners].join(', ')}}, not {${names.join(', ')}}`
      );
      return;
    }
    const prop = Property.of<PropValue>(name);
    const policy = EventApi.eventPolicy({ emit: [], subscribe: consumers });
    if (!reg.initProp(prop, { transient: true, checkAccess: policy })) {
      // Already declared (open default, or a prior same-named owner) —
      // reconfigure to the (possibly reloaded) consumer class.
      reg.configureProp(prop, { checkAccess: policy });
    }
    EventApi.#subscribeOwners.set(
      name,
      new Set([...(owners ?? []), ...names])
    );
  }

  /**
   * Resolve the default policy for an event name. Falls back to a
   * permissive (no-allowlist) `emittableBy()` for unknown names so a
   * custom event registered ad-hoc still gets the EventApi-mediated
   * defense without requiring the well-known map to be edited.
   *
   * The policy table is lazily initialised on first call so we don't
   * run `emittableBy(...)` at module-top: `api/event` participates in
   * a cycle with `lib/events` (the event vocabulary) and `api/stuff`
   * (the StuffApi binding the policy references). Deferring the table
   * construction to first-call avoids resolving partial modules.
   */
  public static defaultPolicyFor(
    eventName: string,
  ): PropAccessCheck<PropValue> {
    const policy = EventApi.#policies()[eventName as EventName];
    return policy ?? EventApi.emittableBy();
  }

  static #defaultPolicies: Record<
    EventName,
    PropAccessCheck<PropValue>
  > | null = null;

  static #policies(): Record<EventName, PropAccessCheck<PropValue>> {
    if (EventApi.#defaultPolicies) return EventApi.#defaultPolicies;
    EventApi.#defaultPolicies = {
      [Events.StuffCreated]: EventApi.emittableBy(StuffApi),
      [Events.StuffDestructed]: EventApi.emittableBy(StuffApi),
      [Events.StuffFieldChanged]: EventApi.emittableBy(),
      [Events.StuffPropertyChanged]: EventApi.emittableBy(),
      [Events.StuffShadowChanged]: EventApi.emittableBy(),
      [Events.ConnectionAttached]: EventApi.emittableBy(),
      [Events.PlayerLoggedIn]: EventApi.emittableBy(),
      [Events.PlayerLoggedOut]: EventApi.emittableBy(),
      [Events.PlayerReconnected]: EventApi.emittableBy(),
      [Events.PlayerDisconnected]: EventApi.emittableBy(),
      [Events.ModuleReloaded]: EventApi.emittableBy(HotReloadApi),
      [Events.ModuleRolledBack]: EventApi.emittableBy(HotReloadApi),
      [Events.ModuleUnloaded]: EventApi.emittableBy(HotReloadApi),
      [Events.ModuleReloadFailed]: EventApi.emittableBy(HotReloadApi),
      // Open emit — the `stream` verb (StreamController) and StreamState
      // are the v1 emitters; no tighter allowlist needed in Phase 1.
      [Events.StreamStateChanged]: EventApi.emittableBy(),
      // Open emit — the `config` verb (ConfigController) is the v1 emitter
      // when the operator changes `livestream.broadcastSources`.
      [Events.StreamSourcesChanged]: EventApi.emittableBy(),
    };
    return EventApi.#defaultPolicies;
  }

  /**
   * Emit `payload` for `name`. Permission gate fires synchronously
   * (a denied caller throws `SecurityError` immediately). Listeners
   * fire on the next microtask in a fresh `EventDispatch` frame
   * each. Pre-bootstrap emits are silently dropped.
   */
  public static emit<T = unknown>(name: string, payload: T): void {
    const reg = this.#registry();
    if (!reg) return;
    this.#ensureRegistered(reg, name);
    const ok = reg.setProp(Property.of<PropValue>(name), payload as PropValue);
    if (!ok) {
      throw new SecurityError(`EventApi.emit('${name}'): not allowed`);
    }

    const subs = this.#subs();
    if (!subs) return;

    const triggeringContext = this.#snapshotTriggeringContext();
    subs.recordHistory(name, {
      payload,
      timestamp: Date.now(),
      triggeringContext,
    });

    const snapshot = subs.snapshotSubscribers(name);
    if (snapshot === null) return;

    queueMicrotask(() => {
      for (const sub of snapshot as InternalSubscription<T>[]) {
        sub.__lastPayload = payload;
        if (sub.__filter && !sub.__filter(payload)) continue;
        const ctx: ListenerContext = { triggeringContext };
        try {
          const result = ExecutionContextApi.run(
            EventApi,
            sub,
            'eventListener',
            { kind: FrameKind.EventDispatch },
            () => sub.__invoke(payload, ctx)
          );
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch((err) =>
              this.#logListenerError(name, err)
            );
          }
        } catch (err) {
          this.#logListenerError(name, err);
        }
        if (sub.__until && sub.__until(payload)) {
          sub.unsubscribe();
        }
      }
    });
  }

  /**
   * Class-based fire — sugar over `emit(event.kind, event.payload)`.
   */
  public static fire<E extends BusEvent<unknown>>(event: E): void {
    this.emit(event.kind, event.payload);
  }

  /**
   * Register a listener for `name`. Returns a `Subscription` whose
   * `unsubscribe()` removes it from the side-table.
   */
  public static on<E extends BusEvent<unknown>>(
    EventClass: EventClassCtor<E>,
    listener: (
      event: BusEvent<PayloadOf<E>>,
      ctx: ListenerContext,
    ) => void | Promise<void>,
    opts?: SubscribeOptions<BusEvent<PayloadOf<E>>>,
  ): Subscription<BusEvent<PayloadOf<E>>>;
  public static on<T = unknown>(
    name: string,
    listener: Listener<T>,
    opts?: SubscribeOptions<T>
  ): Subscription<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static on(
    nameOrClass: string | EventClassCtor<BusEvent<unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (payload: any, ctx: ListenerContext) => void | Promise<void>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opts?: SubscribeOptions<any>,
  ): Subscription<unknown> {
    if (typeof nameOrClass !== 'string') {
      const kind = nameOrClass.KIND;
      const adaptedListener: Listener<unknown> = (payload, ctx) =>
        listener({ kind, payload } as BusEvent<unknown>, ctx);
      let adaptedFilter: ((payload: unknown) => boolean) | undefined;
      if (opts?.filter) {
        const f = opts.filter;
        adaptedFilter = (payload) =>
          f({ kind, payload } as BusEvent<unknown>);
      }
      let adaptedUntil: ((payload: unknown) => boolean) | undefined;
      if (opts?.until) {
        const u = opts.until;
        adaptedUntil = (payload) =>
          u({ kind, payload } as BusEvent<unknown>);
      }
      return this.#onByName(kind, adaptedListener, {
        filter: adaptedFilter,
        until: adaptedUntil,
      });
    }
    return this.#onByName(nameOrClass, listener, opts);
  }

  static #onByName<T = unknown>(
    name: string,
    listener: Listener<T>,
    opts?: SubscribeOptions<T>
  ): Subscription<T> {
    const reg = this.#registry();
    if (!reg) {
      throw new Error(
        'EventApi.on: EventRegistry not bootstrapped. Did BootstrapManager.run() complete?'
      );
    }
    const subs = this.#subs();
    if (!subs) {
      throw new Error(
        'EventApi.on: EventSubscriptions not bootstrapped. Did BootstrapManager.run() complete?'
      );
    }
    this.#ensureRegistered(reg, name);
    const propOpts = reg.checkProp(Property.of<PropValue>(name));
    if (!propOpts) {
      throw new SecurityError(`EventApi.on('${name}'): not allowed`);
    }

    const lastPayload = reg.getProp(Property.of<PropValue>(name)) as
      | T
      | null;

    const sub: InternalSubscription<T> = {
      eventName: name,
      get lastPayload(): T | null {
        return sub.__lastPayload;
      },
      __invoke: listener,
      __filter: opts?.filter,
      __until: opts?.until,
      __lastPayload: lastPayload,
      unsubscribe: () => {
        EventApi._removeSubscriptionForListener(
          name,
          sub as InternalSubscription<unknown>,
        );
      },
    };

    subs.addSubscription(name, sub as unknown as SubscriptionRecord);
    return sub;
  }

  /**
   * Internal seam called by every `Subscription.unsubscribe()` closure
   * so the Registry call is mediated by this Api class — keeping
   * `@CallSecurity(FromModule(EventApi))` satisfied even when the
   * caller of `unsubscribe()` is whatever code held the handle.
   * @internal
   */
  public static _removeSubscriptionForListener(
    name: string,
    sub: InternalSubscription<unknown>,
  ): void {
    const subs = this.#subs();
    if (!subs) return;
    subs.removeSubscription(name, sub as unknown as SubscriptionRecord);
  }

  /**
   * Sugar for "fire once, then auto-unsubscribe."
   */
  public static once<T = unknown>(
    name: string,
    listener: Listener<T>
  ): Subscription<T> {
    return this.on<T>(name, listener, { until: () => true });
  }

  /**
   * Recent emitted payloads for `name`, newest last. Bounded ring
   * buffer; older entries roll off after `HISTORY_LIMIT` emits.
   */
  public static history<T = unknown>(
    name: string,
    limit?: number
  ): ReadonlyArray<{
    payload: T;
    timestamp: number;
    triggeringContext: ListenerContext['triggeringContext'];
  }> {
    const subs = this.#subs();
    if (!subs) return [];
    return subs.getHistory(name, limit) as unknown as ReadonlyArray<{
      payload: T;
      timestamp: number;
      triggeringContext: ListenerContext['triggeringContext'];
    }>;
  }

  /* ─── test seams ─── */

  /**
   * Test seam — wipe subscribers and history. Reset cached
   * pointers so a fresh lookup runs on the next emit. @internal
   */
  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    const subs = this.#subs();
    if (subs) subs._clearAll();
    this.#registryRef = null;
    this.#subsRef = null;
    this.#subscribeOwners = new Map();
  }

  /**
   * Test seam — install an EventRegistry without going through the
   * bootstrap manifest. @internal
   */
  public static _setRegistryForTesting(reg: EventRegistry | null): void {
    SecurityApi.assertTestOnly('_setRegistryForTesting');
    this.#registryRef = reg;
  }

  /**
   * Test seam — install an EventSubscriptions without bootstrap. @internal
   */
  public static _setSubsRegistryForTesting(
    subs: EventSubscriptions | null,
  ): void {
    SecurityApi.assertTestOnly('_setSubsRegistryForTesting');
    this.#subsRef = subs;
  }

  /**
   * HMR seam: drop cached Registry pointers so the next call
   * re-resolves. Called when `api/event.ts` is reloaded. Registry
   * state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    this.#registryRef = null;
    this.#subsRef = null;
  }

  /* ─── internals ─── */

  /**
   * Ensure `name` is declared on the registry with at least the
   * default open-public policy. Idempotent.
   */
  static #ensureRegistered(reg: EventRegistry, name: string): void {
    reg.initProp(Property.of<PropValue>(name), {
      transient: true,
      checkAccess: EventApi.emittableBy(),
    });
  }

  static #snapshotTriggeringContext(): ListenerContext['triggeringContext'] {
    const stack = ExecutionContextApi.getCallStack();
    // Walk down from the top until we exit EventApi frames; the
    // first non-EventApi frame is the originator.
    for (let i = stack.length - 1; i >= 0; i--) {
      const frame = stack[i]!;
      if (frame.target === EventApi) continue;
      return {
        caller: frame.caller,
        target: frame.target,
        method: frame.method,
      };
    }
    return null;
  }

  static #logListenerError(eventName: string, err: unknown): void {
    const message =
      err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(
      `EventApi: listener error on '${eventName}':\n${message}`
    );
  }
}

// Re-export the types module for convenience.
export { Events } from '../lib/events';
export type { EventName, EventPayloads } from '../lib/events';
export type { HistoryRecord } from '../obj/EventSubscriptions';

SecurityApi.decorateApiClass(EventApi);
