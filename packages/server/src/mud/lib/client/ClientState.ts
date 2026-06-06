/**
 * ClientStateMixin — server-side substrate for client UI state
 * persisted server-side.
 *
 * This is the third persistence category in Saxonberg, distinct
 * from settings (`EnvironmentMixin`) and PropertiedMixin:
 *
 *   - `EnvironmentMixin`: player-tunable knobs mutated via the
 *     `settings` shell command. Configuration UX surface.
 *   - `PropertiedMixin`: universal per-Stuff property bag composed
 *     onto every Stuff in the world. Generic key/value store.
 *   - `ClientStateMixin`: client UI state (tabs, theme,
 *     notification prefs, channel mutes, keybinds, …) mutated
 *     through UI gestures, persisted because that's where the
 *     player's identity lives. Composed only where a client
 *     attaches (Avatar today; mobile / admin tools / future
 *     cockpit variants tomorrow).
 *
 * Feature contribution: each feature declares its keys via a
 * small per-feature mixin carrying `static clientStateSchema:
 * ClientStateSchemaEntry[]`. The walker concatenates entries
 * across the prototype chain. The wire surface is shared —
 * a single inbound `client-state-write` message handles every
 * feature's writes by validating the key against the aggregated
 * schema.
 *
 * NOT for arbitrary code state. ClientStateMixin is for state the
 * server holds on behalf of UIs. If a value gets mutated by world
 * logic rather than a UI gesture, it belongs on PropertiedMixin
 * or as a typed field on a domain class.
 *
 * v1 ships without validators on individual schema entries — the
 * cockpit is the only client and we trust it. When third-party
 * clients become real, each entry gains its `validator` function.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * One entry in a feature's `clientStateSchema`. Mirrors the
 * `SettingsSchemaEntry` shape minus the privacy / type / lifetime
 * machinery — client-state values are JSON-shaped, validators
 * are optional, and there's no `set`-command privacy story.
 */
export interface ClientStateSchemaEntry<T = unknown> {
  /** Dotted key (e.g. `'console.tabs'`). */
  key: string;
  /** Default surfaced when nothing has been written. */
  defaultValue: T;
  /**
   * Optional structural check. Returns true to accept, an error
   * message string to reject (the wire handler ships the message
   * back to the client). v1 leaves this unset on every entry.
   */
  validator?: (value: unknown) => true | string;
}

/**
 * Shape of any prototype-chain layer that may declare schema
 * entries — a mixin layer (`_mixinName` present) or a concrete
 * class (`name` only). `clientStateSchema` is read via
 * `hasOwnProperty` so inherited entries don't double-count.
 */
interface LayerWithSchema {
  _mixinName?: string;
  name?: string;
  clientStateSchema?: ClientStateSchemaEntry[];
}

/**
 * Walk the host constructor's prototype chain and concatenate every
 * own `clientStateSchema` array. Mirrors `EnvironmentMixin`'s
 * `collectSchema` walker. Throws on duplicate keys across layers
 * — a key may only be contributed in one place.
 */
function collectClientStateSchema(
  host: object,
): ClientStateSchemaEntry[] {
  const ctor = (host as { constructor: unknown }).constructor as
    | (Function & { prototype: unknown })
    | undefined;
  if (!ctor) return [];
  const out: ClientStateSchemaEntry[] = [];
  const seen = new Map<string, string>();
  let current: unknown = ctor;
  while (
    current &&
    current !== Object &&
    (current as LayerWithSchema & { prototype: unknown }).prototype
  ) {
    const layer = current as LayerWithSchema;
    if (
      Object.prototype.hasOwnProperty.call(layer, 'clientStateSchema')
    ) {
      const entries = layer.clientStateSchema;
      if (Array.isArray(entries)) {
        const sourceMixin =
          layer._mixinName ?? layer.name ?? '<anonymous>';
        for (const entry of entries) {
          const prev = seen.get(entry.key);
          if (prev) {
            throw new Error(
              `ClientStateMixin: key '${entry.key}' is declared on ` +
                `both '${prev}' and '${sourceMixin}'. Each key may ` +
                `only be declared once across the host's chain.`,
            );
          }
          seen.set(entry.key, sourceMixin);
          out.push(entry);
        }
      }
    }
    current = Object.getPrototypeOf(current);
  }
  return out;
}

/**
 * Public shape provided by `ClientStateMixin`. Methods only, per
 * the inter-stuff contract. `_clientState` lives as a public field
 * (so the Hydrator can reflect into it) but is NOT contract
 * surface; external callers go through these methods.
 */
export interface ClientState {
  getClientState<T = unknown>(key: string): T;
  setClientState(key: string, value: unknown): void;
  snapshotClientState(): Record<string, unknown>;
}

export function ClientStateMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ClientStateMixin extends Base implements ClientState {
    static _mixinName = 'ClientStateMixin';

    /**
     * Single persistent slot holding every authored / mutated key.
     * Keys are the dotted strings declared by contributing mixins'
     * schemas; values are JSON-shaped (whatever feature mixins
     * declare).
     */
    public _clientState: Record<string, unknown> = {};

    static persistentFields = ['_clientState'];

    /**
     * Static surface for resolving the effective schema. Walks the
     * prototype chain of the constructor; mirrors
     * `EnvironmentMixin.getAggregatedSchema` in spirit.
     */
    public static getClientStateSchema(
      hostCtor: unknown,
    ): ClientStateSchemaEntry[] {
      // Synthesize a fake host {} typed against the constructor so the
      // walker can find the chain.
      const synth = { constructor: hostCtor as Function };
      return collectClientStateSchema(synth);
    }

    /**
     * Return the stored value if present, else the schema default.
     * Throws when the key is not declared in any contributing
     * schema — silent fallthrough would hide bugs.
     */
    public getClientState<T = unknown>(key: string): T {
      const schema = collectClientStateSchema(this);
      const entry = schema.find((e) => e.key === key);
      if (!entry) {
        throw new Error(
          `ClientStateMixin.getClientState: unknown key '${key}'. ` +
            `Declare it via a static clientStateSchema on a mixin in ` +
            `the host's chain.`,
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

    /**
     * Validate the key against the aggregated schema, run the
     * optional entry validator, then write into `_clientState`.
     * Rejects unknown keys; rejects values the entry's validator
     * marks invalid.
     */
    public setClientState(key: string, value: unknown): void {
      const schema = collectClientStateSchema(this);
      const entry = schema.find((e) => e.key === key);
      if (!entry) {
        throw new Error(
          `ClientStateMixin.setClientState: unknown key '${key}'.`,
        );
      }
      if (entry.validator) {
        const ok = entry.validator(value);
        if (ok !== true) {
          throw new Error(
            `ClientStateMixin.setClientState: validator rejected ` +
              `'${key}': ${ok}`,
          );
        }
      }
      if (!this._clientState) this._clientState = {};
      this._clientState[key] = value;
    }

    /**
     * Dense snapshot — every declared key carries either its stored
     * value or its default. Fed to the client on session-establish
     * via `ConnectionEstablishedPayload.clientState`.
     */
    public snapshotClientState(): Record<string, unknown> {
      const schema = collectClientStateSchema(this);
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
  }
  return ClientStateMixin;
}
