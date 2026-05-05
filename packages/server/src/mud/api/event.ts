/**
 * EventApi — global pub/sub bus for engine-level events with no
 * specific target to shadow.
 *
 * Two-layer reactivity sits alongside this bus: the **Witness pattern**
 * (object-local hooks on Mobile / Container / Containable / Exitable /
 * HasInteractive) handles "X happened to a known target." EventApi
 * handles "X happened, no specific receiver yet" — login, server-wide
 * lifecycle, audit streams.
 *
 * Storage gate: events are properties on the `EventRegistry` Idea. The
 * registry's per-property `checkAccess` decides who may emit (Set) and
 * who may subscribe (Get). Subscribers themselves live in a side-table
 * inside this class, NOT in registry props — they're runtime
 * registrations, not declarations.
 *
 * Dispatch is non-blocking and isolated: `emit` enqueues a microtask,
 * each listener runs in a fresh `EventDispatch` frame, and a thrown
 * listener doesn't break siblings or the emitter.
 */

import { ExecutionContextApi, FrameKind } from './execution-context';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { SecurityError } from '../lib/security/errors';
import {
  Property,
  PropOperations,
  type PropAccessCheck,
  type PropValue,
} from '../lib/stuff/Propertied';
import type { EventRegistry } from '../obj/EventRegistry';

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

interface HistoryEntry<T> {
  payload: T;
  timestamp: number;
  triggeringContext: ListenerContext['triggeringContext'];
}

const HISTORY_LIMIT = 100;

/**
 * Build an access-check function for an event property. Two checks:
 *
 *   1. Defense — `setProp`/`getProp` on the registry must have come
 *      via EventApi. Even if a caller gets the registry instance and
 *      tries to call `setProp` directly, this rejects the bypass.
 *   2. Allowlist — for `Set` (emit), the originating caller's class
 *      must be in `allowed`. `Get` (subscribe) is open by default
 *      because a subscriber has no privilege to leak; tighten with
 *      `eventPolicy({ emit, subscribe })` if a specific event needs
 *      it.
 *
 * Stack-walks so intervening frames (e.g. PropertiedMixin's own
 * `checkAccess` proxy mediation) don't break the check.
 */
export function emittableBy(
  ...allowed: Function[]
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

function findClassFrame(
  stack: ReadonlyArray<{ target: unknown }>,
  cls: unknown
): number {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.target === cls) return i;
  }
  return -1;
}

/**
 * Companion to `emittableBy` for events that want to gate subscribe
 * (Get) too. Composes both checks; pass `null` for either side to
 * leave it open.
 */
export function eventPolicy(opts: {
  emit: Function[];
  subscribe?: Function[] | null;
}): PropAccessCheck<PropValue> {
  const emitGate = emittableBy(...opts.emit);
  return (prop, op, special) => {
    if (op === PropOperations.Get && opts.subscribe && opts.subscribe.length > 0) {
      const stack = ExecutionContextApi.getCallStack();
      const eventApiIdx = findClassFrame(stack, EventApi);
      if (eventApiIdx < 0) return false;
      const originator = stack[eventApiIdx - 1]?.target;
      return originatorMatches(originator, opts.subscribe);
    }
    return emitGate(prop, op, special);
  };
}

function originatorMatches(
  originator: unknown,
  allowed: Function[]
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

/* ─────────────────────────── EventApi ─────────────────────────── */

export class EventApi {
  static #subs = new Map<string, Set<InternalSubscription<unknown>>>();
  static #history = new Map<string, HistoryEntry<unknown>[]>();
  static #registryRef: EventRegistry | null = null;

  /**
   * Resolve the singleton EventRegistry via the `byTemplatePath`
   * index. Cached after the first lookup. Returns `null` if the
   * registry hasn't been bootstrapped yet — `emit` skips silently
   * in that case so very-early-boot emit sites (e.g.,
   * `StuffApi.create` for the EventRegistry itself) don't crash.
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
   * Emit `payload` for `name`. Permission gate fires synchronously
   * (a denied caller throws `SecurityError` immediately). Listeners
   * fire on the next microtask in a fresh `EventDispatch` frame
   * each.
   *
   * Custom events are first-class: any string `name` works.
   * Well-known events (the `Events.*` table) are frontloaded into
   * the registry by `EventRegistry.postRegister` with their
   * specific policies. Anything else is auto-registered on first
   * touch with the default `emittableBy()` policy (open-public
   * emit, but still requires the EventApi-mediated path — direct
   * `reg.setProp` from non-EventApi code stays denied).
   *
   * Pre-bootstrap emits are silently dropped (no registry to gate
   * them, no subscribers to deliver to). This keeps engine startup
   * paths that emit `StuffCreated` on the very EventRegistry being
   * created from triggering self-recursion errors.
   */
  public static emit<T = unknown>(name: string, payload: T): void {
    const reg = this.#registry();
    if (!reg) return;
    this.#ensureRegistered(reg, name);
    const ok = reg.setProp(Property.of<PropValue>(name), payload as PropValue);
    if (!ok) {
      throw new SecurityError(`EventApi.emit('${name}'): not allowed`);
    }

    // Stash history. Bounded ring buffer per event for diagnostics.
    const triggeringContext = this.#snapshotTriggeringContext();
    let hist = this.#history.get(name);
    if (!hist) {
      hist = [];
      this.#history.set(name, hist);
    }
    hist.push({ payload, timestamp: Date.now(), triggeringContext });
    if (hist.length > HISTORY_LIMIT) hist.splice(0, hist.length - HISTORY_LIMIT);

    // Fan-out: snapshot subscribers so listeners that mutate the set
    // (e.g. an `until`-driven unsubscribe) don't hit "modified during
    // iteration" surprises.
    const subs = this.#subs.get(name);
    if (!subs || subs.size === 0) return;
    const snapshot = [...subs] as InternalSubscription<T>[];

    queueMicrotask(() => {
      for (const sub of snapshot) {
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
   * Register a listener for `name`. Returns a `Subscription` whose
   * `unsubscribe()` removes it from the side-table. Throws
   * `SecurityError` when the caller is denied subscribe access.
   */
  public static on<T = unknown>(
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
        const set = this.#subs.get(name);
        if (set) {
          set.delete(sub as InternalSubscription<unknown>);
          if (set.size === 0) this.#subs.delete(name);
        }
      },
    };

    let set = this.#subs.get(name);
    if (!set) {
      set = new Set();
      this.#subs.set(name, set);
    }
    set.add(sub as InternalSubscription<unknown>);

    return sub;
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
  ): ReadonlyArray<HistoryEntry<T>> {
    const hist = (this.#history.get(name) ?? []) as HistoryEntry<T>[];
    if (typeof limit === 'number') {
      return hist.slice(Math.max(0, hist.length - limit));
    }
    return [...hist];
  }

  /**
   * Test seam — wipe subscribers and history. Reset the cached
   * registry pointer so a fresh `findByTemplatePath` lookup runs on
   * the next emit. @internal
   */
  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    this.#subs.clear();
    this.#history.clear();
    this.#registryRef = null;
  }

  /**
   * Test seam — install a registry without going through the
   * bootstrap manifest. @internal
   */
  public static _setRegistryForTesting(reg: EventRegistry | null): void {
    SecurityApi.assertTestOnly('_setRegistryForTesting');
    this.#registryRef = reg;
  }

  /* ─────────────────────────── Internals ─────────────────────────── */

  /**
   * Ensure `name` is declared on the registry with at least the
   * default open-public policy. Idempotent — `initProp` returns
   * false when the prop already has a config (well-known events
   * frontloaded by `EventRegistry.postRegister` skip here, custom
   * events get their first-touch declaration).
   *
   * This closes the "raw setProp auto-init bypass" path: if a
   * caller tries `reg.setProp('forged.event', ...)` directly,
   * setProp's auto-init runs `initProp(prop)` with no options, which
   * falls back to `defaultPropAccess`. EventRegistry overrides that
   * to deny everything, so the bypass fails. Going through
   * EventApi, this helper installs `emittableBy()` first — the
   * defense passes for EventApi-mediated calls and rejects bypass
   * attempts.
   */
  static #ensureRegistered(reg: EventRegistry, name: string): void {
    reg.initProp(Property.of<PropValue>(name), {
      transient: true,
      checkAccess: emittableBy(),
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
    // MudlogApi requires a recipient and isn't appropriate for
    // anonymous listener errors. Use console.error: the design says
    // listener errors are isolated, the logging path is secondary.
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(
      `EventApi: listener error on '${eventName}':\n${message}`
    );
  }
}

// Re-export the types module for convenience.
export { Events } from './event-types';
export type { EventName, EventPayloads } from './event-types';

SecurityApi.decorateApiClass(EventApi);
