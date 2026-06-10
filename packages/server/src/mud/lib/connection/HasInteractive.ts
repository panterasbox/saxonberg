/**
 * HasInteractiveMixin — Stuff that has one or more connected
 * `Interactive` objects driving it.
 *
 * `Avatar` composes this for multiplexing (many connections, one
 * avatar). `Login` composes it too with a singleton-set seeded from
 * its constructor: a Login owns exactly one Interactive for the brief
 * window between connection-up and avatar-switch, and routing it
 * through the same mixin keeps `MixinApi.isHasInteractive` the
 * canonical detector.
 *
 * The interface gives policy/messaging code a stable name for
 * "which HasInteractive did this?" instead of branching on
 * `instanceof Avatar || instanceof Login`. Use
 * `MixinApi.isHasInteractive(obj)` to narrow.
 *
 * Client-state surface lives here too. Anything that has a client
 * attached has UI state worth persisting for that client (tabs,
 * theme, notification prefs, keybinds, channel mutes, saved
 * queries, onboarding flags). `_clientState` is the storage;
 * `getClientState` / `setClientState` / `snapshotClientState` are
 * the access surface; `clientStateSchema` is the declared keys
 * with their defaults. The wire surface
 * (`client-state-write` inbound + `clientState` on the welcome
 * payload) lives on `Application` + `Avatar.enter` respectively.
 */

import type { MixinConstructor } from '../mixin';
import type Interactive from '../../obj/Interactive';
import type { CommandContributions } from '../../api/command';

/**
 * Strategy-injected `client-state-update` push function. The
 * Application module calls `setClientStateUpdatePush` once during
 * boot to wire its own `sendClientStateUpdateToInteractive` here —
 * we don't import `Application` directly because doing so creates
 * a load-time cycle (Application → Avatar/Login → HasInteractive),
 * and HasInteractive is consumed at module-evaluation time by Login.
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
export function setClientStateUpdatePush(impl: PushImpl | null): void {
  _pushImpl = impl;
}

/**
 * One client-state schema entry. Declared in
 * `HasInteractiveMixin.clientStateSchema`. `key` is the dotted
 * string the client uses (`'console.tabs'`, …); `defaultValue` is
 * surfaced when the host has not written that key yet; optional
 * `validator` rejects bad writes (none ship in v1).
 *
 * If the schema ever grows past the point where a single TS array
 * is comfortable, externalize it (YAML / a per-feature mixin with
 * a walker / …). Until then, one array, one place.
 */
export interface ClientStateSchemaEntry<T = unknown> {
  key: string;
  defaultValue: T;
  description?: string;
  validator?: (value: unknown) => true | string;
}

/**
 * Public shape provided by HasInteractiveMixin.
 *
 * Witness hooks (optional methods) — fire from `ConnectionApi`:
 *   - `onConnectionAttached(conn)` / `onConnectionDetached()` —
 *     per-connection events, fire on every transfer/detach.
 *   - `onLinkdead()` / `onLinkRestored()` — presence transitions,
 *     fire only when the connection count crosses 0/1.
 */
export interface HasInteractive {
  /**
   * Read-only view of the connected `Interactive` set. To mutate, use
   * `addInteractive` / `removeInteractive`.
   */
  getInteractives(): ReadonlySet<Interactive>;

  /** Add an Interactive connection. */
  addInteractive(interactive: Interactive): void;

  /** Remove an Interactive connection. Returns true iff it was present. */
  removeInteractive(interactive: Interactive): boolean;

  /** Membership test. */
  hasInteractive(interactive: Interactive): boolean;

  /** Drop every connection in one call. Used during destruct. */
  clearInteractives(): void;

  /** True iff at least one Interactive is connected. */
  isConnected(): boolean;

  /** True iff no Interactives are connected. MUD-style alias for `!isConnected()`. */
  isLinkdead(): boolean;

  /** Per-connection notification fired after attach. */
  onConnectionAttached?(conn: Interactive): void;
  /** Per-connection notification fired after detach. */
  onConnectionDetached?(): void;
  /** Fired when the connection count drops to zero. */
  onLinkdead?(): void;
  /** Fired when the connection count rises from zero to one. */
  onLinkRestored?(): void;

  /**
   * Return the stored value for a schema-declared key, or the
   * default if the host has not written it. Throws on unknown
   * keys — declarations live on `static clientStateSchema`.
   */
  getClientState<T = unknown>(key: string): T;

  /**
   * Validate `key` + `value` against the static schema, then
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
   * Used after server-initiated mutations (the `style` verb) so the
   * client re-renders without waiting on a reconnect snapshot.
   * Caller is responsible for having already called `setClientState`
   * and persisted; this is the push half only.
   */
  pushClientStateUpdate(key: string, value: unknown): void;
}

export function HasInteractiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HasInteractiveMixin extends Base {
    static _mixinName = 'HasInteractiveMixin';

    /**
     * Client-state schema. Declares every persisted UI key + its
     * default. One flat array — no chain walker, no per-feature
     * mixin layer. Add an entry to ship a new key.
     *
     * Scope rule: only put a key here if it's substrate-level
     * (meaningful for every HasInteractive-bearing thing). If a
     * key is owned by a narrower mixin, the right move is to
     * promote a small registry / walker — but defer that until
     * the array genuinely outgrows a single file.
     */
    static clientStateSchema: ClientStateSchemaEntry[] = [
      {
        key: 'console.tabs',
        defaultValue: [{ name: 'All', muted: [] }],
        description:
          'Cockpit tabbed-terminal tabs. Each tab carries its ' +
          'own name and a list of muted topic strings.',
      },
      {
        key: 'console.activeTab',
        defaultValue: 'All',
        description:
          'Cockpit tabbed-terminal active tab name. Falls back ' +
          'to "All" if the named tab is unknown.',
      },
      {
        key: 'style.overlay',
        defaultValue: {},
        description:
          "Reader-owned visual customization overlay (themes, " +
          "channel colors, plain-mode, mention prefs). One JSON " +
          "blob keyed by dotted selector; edited via the `style` " +
          "verb. The cockpit's stylesheet engine reads this and " +
          "layers it on top of the theme.",
        // Permissive validator: only require an object at the top
        // level. Selector / treatment shape is enforced lazily by
        // the resolver (unknown selectors no-op) so mid-edit
        // partial states from a future visual editor don't trip.
        validator: (v) =>
          typeof v === 'object' && v !== null && !Array.isArray(v)
            ? true
            : 'must be a JSON object',
      },
    ];

    /**
     * Verbs that travel with every HasInteractive-bearing host
     * (Avatar today, future cockpit-bearing classes tomorrow). The
     * `style` verb belongs here because the overlay it edits IS the
     * client state on this mixin; co-locating verb + schema keeps
     * the wiring local.
     */
    static commandContributions: CommandContributions = {
      self: ['style.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Connected Interactives. Host-internal storage; external consumers
     * use `addInteractive` / `removeInteractive` / `getInteractives()`.
     */
    protected interactives: Set<Interactive> = new Set();

    /**
     * Persistent UI state slot. Keys come from
     * `clientStateSchema`; values are the JSON-shape the schema
     * declares. Round-trips via the Hydrator like any other
     * persistent field; populated wholesale on session-establish
     * via the welcome payload, updated by `client-state-write`.
     */
    public _clientState: Record<string, unknown> = {};

    static persistentFields = ['_clientState'];

    public getInteractives(): ReadonlySet<Interactive> {
      return this.interactives;
    }

    public addInteractive(interactive: Interactive): void {
      this.interactives.add(interactive);
    }

    public removeInteractive(interactive: Interactive): boolean {
      return this.interactives.delete(interactive);
    }

    public hasInteractive(interactive: Interactive): boolean {
      return this.interactives.has(interactive);
    }

    /** Drop every connection in one call. Used during destruct. */
    public clearInteractives(): void {
      this.interactives.clear();
    }

    public isConnected(): boolean {
      return this.interactives.size > 0;
    }

    public isLinkdead(): boolean {
      return !this.isConnected();
    }

    public getClientState<T = unknown>(key: string): T {
      const entry = (
        this.constructor as { clientStateSchema?: ClientStateSchemaEntry[] }
      ).clientStateSchema?.find((e) => e.key === key);
      if (!entry) {
        throw new Error(
          `HasInteractive.getClientState: unknown key '${key}'. ` +
            `Add an entry to HasInteractiveMixin.clientStateSchema.`,
        );
      }
      if (
        this._clientState &&
        Object.prototype.hasOwnProperty.call(this._clientState, key)
      ) {
        return this._clientState[key] as T;
      }
      return entry.defaultValue as T;
    }

    public setClientState(key: string, value: unknown): void {
      const entry = (
        this.constructor as { clientStateSchema?: ClientStateSchemaEntry[] }
      ).clientStateSchema?.find((e) => e.key === key);
      if (!entry) {
        throw new Error(
          `HasInteractive.setClientState: unknown key '${key}'.`,
        );
      }
      if (entry.validator) {
        const ok = entry.validator(value);
        if (ok !== true) {
          throw new Error(
            `HasInteractive.setClientState: validator rejected ` +
              `'${key}': ${ok}`,
          );
        }
      }
      if (!this._clientState) this._clientState = {};
      this._clientState[key] = value;
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
    public pushClientStateUpdate(key: string, value: unknown): void {
      if (!_pushImpl) return; // Pre-boot or test without wired push
      for (const interactive of this.interactives) {
        _pushImpl(interactive, key, value);
      }
    }

    public snapshotClientState(): Record<string, unknown> {
      const schema =
        (this.constructor as { clientStateSchema?: ClientStateSchemaEntry[] })
          .clientStateSchema ?? [];
      const out: Record<string, unknown> = {};
      for (const entry of schema) {
        if (
          this._clientState &&
          Object.prototype.hasOwnProperty.call(this._clientState, entry.key)
        ) {
          out[entry.key] = this._clientState[entry.key];
        } else {
          out[entry.key] = entry.defaultValue;
        }
      }
      return out;
    }
  };
}
