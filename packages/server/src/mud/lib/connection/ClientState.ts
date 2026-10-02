/**
 * ClientStateMixin — the MECHANISM by which a client persists and is
 * pushed state, and **no vocabulary at all**.
 *
 * ⭐⭐ This mixin declares **zero keys**. That is the whole point of it
 * existing separately from {@link SaxonbergClientMixin}: the schema
 * walk, the two stores, the fork slice and the push channel are what
 * *any* client needs, while `console.*`, `cards.*`, `style.overlay` and
 * `cockpit.*` are **one client's words** and live on that client's
 * mixin.
 *
 * The three-way split reads, outermost first:
 *
 *   `SaxonbergClientMixin` → `ClientStateMixin` → `HasInteractiveMixin`
 *      our client's words      the mechanism         a human is here
 *
 * and the dependency arrow only ever points right: the push channel
 * iterates the connection set (so CS requires CONN), and nothing in
 * CONN knows a key exists. The one back-edge the old single file had —
 * `snapshotClientState` hard-coding one client's keys — is now an override
 * on the client's own mixin calling `super`.
 *
 * ⭐ The schema is a CHAIN WALK, not a static array. A mixin anywhere
 * on the chain may declare `static clientStateSchema`, and every
 * declaration is unioned — the `Environment.collectSchema` shape. The
 * old file's own comment asked for this once the array outgrew it; it
 * had reached 415 lines.
 *
 * ⚠ `getClientState` **throws** on a key no entry declares. It is not a
 * soft read. A reader that outlives its declaration is a crash at the
 * command bus, which is why `HasInteractive.schema.test.ts` pins the
 * key set by name.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type Interactive from '../../platform/idea/Interactive';
import type { HasInteractive } from './HasInteractive';

/**
 * Strategy-injected `client-state-update` push function. The
 * Application module calls `setClientStateUpdatePush` once during
 * boot to wire its own `sendClientStateUpdateToInteractive` here —
 * we don't import `Application` directly because doing so creates
 * a load-time cycle (Application → Avatar/Login → ClientState),
 * and this module is consumed at module-evaluation time by Login.
 * The setter pattern defers the resolution until after both modules
 * have finished loading.
 */
type PushImpl = (interactive: Interactive, key: string, value: unknown) => void;
let _pushImpl: PushImpl | null = null;

/**
 * Wire the client-state-update push. Called once by `Application`
 * during boot; tests can call it with a spy to assert push behavior
 * without standing up a real backend.
 */
// eslint-disable-next-line no-restricted-syntax -- documented exception: DI injection seam (backend → mudlib). Application wires the client-state push at boot; tests inject a spy. See architecture.md § sanctioned-exception registry.
export function setClientStateUpdatePush(impl: PushImpl | null): void {
  _pushImpl = impl;
}

/**
 * One client-state schema entry. Declared on any mixin in the chain as
 * `static clientStateSchema`; every declaration is unioned by the walk.
 * `key` is the dotted string the client uses (`'console.tabs'`, …);
 * `defaultValue` is surfaced when the host has not written that key
 * yet; optional `validator` rejects bad writes.
 */
export interface ClientStateSchemaEntry<T = unknown> {
  key: string;
  defaultValue: T;
  description?: string;
  validator?: (value: unknown) => true | string;
  /**
   * Transient keys live with the live session, not the character: held
   * in an in-memory store that is never persisted (so they reset to the
   * default on a fresh login) and never round-trips through the applier.
   * Used for ephemeral UI scoping like per-bar input modes. Defaults to
   * persisted (`false`/absent).
   */
  transient?: boolean;
}

/**
 * Memoized per-constructor schema walk. A `WeakMap` so a hot-reloaded
 * class does not pin its predecessor.
 */
const SCHEMA_CACHE = new WeakMap<object, ClientStateSchemaEntry[]>();

/**
 * Union every `static clientStateSchema` on `ctor`'s prototype chain,
 * nearest declaration winning on a duplicate key.
 *
 * ⚠ Walks the CONSTRUCTOR chain, not the instance's: a mixin's static
 * is an own property of the class object it was declared on, and the
 * outermost declaration SHADOWS the inner ones on plain property
 * access — the same trap `CommandApi.collectContributions` exists for.
 */
function collectClientStateSchema(ctor: object): ClientStateSchemaEntry[] {
  const hit = SCHEMA_CACHE.get(ctor);
  if (hit) return hit;
  const byKey = new Map<string, ClientStateSchemaEntry>();
  const chain: object[] = [];
  let c: unknown = ctor;
  while (c && c !== Function.prototype) {
    chain.push(c as object);
    c = Object.getPrototypeOf(c);
  }
  // Furthest ancestor first, so a nearer declaration overwrites it.
  for (const link of chain.reverse()) {
    if (!Object.prototype.hasOwnProperty.call(link, 'clientStateSchema')) {
      continue;
    }
    const declared = (link as { clientStateSchema?: ClientStateSchemaEntry[] })
      .clientStateSchema;
    if (!Array.isArray(declared)) continue;
    for (const entry of declared) byKey.set(entry.key, entry);
  }
  const out = [...byKey.values()];
  SCHEMA_CACHE.set(ctor, out);
  return out;
}

/**
 * Public shape provided by ClientStateMixin.
 *
 * ⭐ Extends `HasInteractive` because it genuinely requires it — the
 * push channel iterates the connection set — and because the narrow
 * must say so: `MixinApi.isClientState(x)` has to hand back something
 * you can also ask *is anyone connected?*, which is the question the
 * push answers before it sends.
 */
export interface ClientState extends HasInteractive {
  /**
   * Return the stored value for a schema-declared key, or the
   * default if the host has not written it. Throws on unknown
   * keys — declarations live on any chain member's
   * `static clientStateSchema`.
   */
  getClientState<T = unknown>(key: string): T;

  /**
   * Validate `key` + `value` against the walked schema, then
   * persist. Throws on unknown keys or when the entry's optional
   * validator rejects.
   */
  setClientState(key: string, value: unknown): void;

  /**
   * Dense snapshot of every declared key (stored or default).
   * Fed to the client on session-establish via
   * `ConnectionEstablishedPayload.clientState`.
   */
  snapshotClientState(): Record<string, unknown>;

  /**
   * Push an authoritative client-state value to every connected
   * Interactive on this host (server→client `client-state-update`).
   * Caller is responsible for having already called `setClientState`
   * and persisted; this is the push half only.
   */
  pushClientStateUpdate(key: string, value: unknown): void;
}

export function ClientStateMixin<
  TBase extends MixinConstructor<HasInteractive>,
>(Base: TBase) {
  return class ClientStateMixin extends Base {
    static _mixinName: string = 'ClientStateMixin';

    /**
     * ⭐ Declares NOTHING. The mechanism has no vocabulary; a client's
     * mixin brings the keys. Present so the walk always finds a link.
     */
    static clientStateSchema: ClientStateSchemaEntry[] = [];

    /**
     * Persistent UI state slot. Keys come from
     * `clientStateSchema`; values are the JSON-shape the schema
     * declares. Round-trips via the applier like any other
     * persistent field; populated wholesale on session-establish
     * via the welcome payload, updated by `client-state-write`.
     */
    public _clientState: Record<string, unknown> = {};

    /**
     * Transient client-state slot — keys whose schema entry is
     * `transient`. In-memory only: deliberately NOT in `persistentFields`,
     * so it never reaches the applier and resets to defaults on a fresh
     * login. Per-bar input modes live here (ephemeral input scoping that
     * belongs to the session, not the character).
     */
    public _transientClientState: Record<string, unknown> = {};

    /**
     * Fork the cockpit's client state onto a wire body (sandbox
     * Decision Q). Layout, theme, per-bar input modes — the player's
     * SHELL, not world state: it describes how they like to look at
     * the game, and it should not reset because they stepped through a
     * door. Found live: clicking "Test in holodeck" from the builder
     * layout crossed you correctly and then dumped you back into the
     * world layout, because the vessel is a fresh body with default
     * client state.
     *
     * Fork-only, deliberately — there is no `mergeSlice_`. Preferences
     * changed inside a circle discard with it, like everything else
     * that is not on the epistemic merge allowlist.
     */
    forkSlice_ClientState(): unknown {
      return { clientState: { ...this._clientState } };
    }

    /**
     * Apply a forked cockpit state. Reached in the MINT direction only
     * — the sandbox's merge-back allowlist is epistemic slices, so a
     * theme changed inside a circle discards with it.
     */
    mergeSlice_ClientState(slice: unknown): void {
      const s = slice as { clientState?: Record<string, unknown> };
      if (s?.clientState) this._clientState = { ...s.clientState };
    }

    static fieldMeta: FieldMeta = {
      _clientState: { persistent: true, runtimeState: true },
    };

    /**
     * Every key this host's chain declares, memoized per constructor.
     */
    protected clientStateSchemaFor(): ClientStateSchemaEntry[] {
      return collectClientStateSchema(this.constructor as object);
    }

    public getClientState<T = unknown>(key: string): T {
      const entry = this.clientStateSchemaFor().find((e) => e.key === key);
      if (!entry) {
        throw new Error(
          `ClientState.getClientState: unknown key '${key}'. ` +
            `Add an entry to a clientStateSchema on this host's chain.`,
        );
      }
      const store = entry.transient
        ? this._transientClientState
        : this._clientState;
      if (store && Object.prototype.hasOwnProperty.call(store, key)) {
        return store[key] as T;
      }
      return entry.defaultValue as T;
    }

    public setClientState(key: string, value: unknown): void {
      const entry = this.clientStateSchemaFor().find((e) => e.key === key);
      if (!entry) {
        throw new Error(`ClientState.setClientState: unknown key '${key}'.`);
      }
      if (entry.validator) {
        const ok = entry.validator(value);
        if (ok !== true) {
          throw new Error(
            `ClientState.setClientState: validator rejected ` +
              `'${key}': ${ok}`,
          );
        }
      }
      if (entry.transient) {
        if (!this._transientClientState) this._transientClientState = {};
        this._transientClientState[key] = value;
        return;
      }
      if (!this._clientState) this._clientState = {};
      this._clientState[key] = value;
    }

    /**
     * The dense snapshot — every declared key, stored value or default.
     *
     * ⭐ Pure, and deliberately so. The cockpit axes used to be resolved
     * here, which made the mechanism know one client's keyspace;
     * `SaxonbergClientMixin` overrides this, calls `super`, and applies
     * its own resolution on top.
     */
    public snapshotClientState(): Record<string, unknown> {
      const schema = this.clientStateSchemaFor();
      const out: Record<string, unknown> = {};
      for (const entry of schema) {
        const store = entry.transient
          ? this._transientClientState
          : this._clientState;
        if (store && Object.prototype.hasOwnProperty.call(store, entry.key)) {
          out[entry.key] = store[entry.key];
        } else {
          out[entry.key] = entry.defaultValue;
        }
      }
      return out;
    }

    /**
     * Push an authoritative client-state value out to every
     * connected Interactive on this host. Parallel to the existing
     * `client-state-write` inbound flow but flips the direction —
     * server mutates, client follows. Used by the `style` verb
     * (and future server-initiated client-state changes) so the
     * client re-renders without waiting for a reconnect snapshot.
     *
     * Caller MUST have already called `setClientState(key, value)`
     * + `save()`. This is the push half; persistence is upstream.
     */
    public pushClientStateUpdate(
      this: HasInteractive,
      key: string,
      value: unknown,
    ): void {
      if (!_pushImpl) return; // Pre-boot or test without wired push
      for (const interactive of this.getInteractives()) {
        _pushImpl(interactive, key, value);
      }
    }
  };
}
