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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';
import type Interactive from '../../obj/Interactive';
import type { CommandContributions } from '../../api/command';
import { ShellApi } from '../../api/shell';
import { GoogleProfile } from '../identity/GoogleProfile';
import {
  LAYOUT_NAMES,
  COCKPIT_MODES,
  COCKPIT_ARRANGEMENTS,
  DEFAULT_COCKPIT_MODE,
  LEGACY_LAYOUT_MIGRATION,
  LEGACY_LAYOUT_FOR,
  MAX_ARRANGEMENT_NAME_LENGTH,
  MAX_SAVED_ARRANGEMENTS_PER_MODE,
  SHELF_ROW_IDS,
  DEFAULT_SHELF,
  type ArrangementSpec,
  type CockpitMode,
  type LayoutName,
} from '@saxonberg/types';

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
// eslint-disable-next-line no-restricted-syntax -- documented exception: DI injection seam (backend → mudlib). Application wires the client-state push at boot; tests inject a spy. See architecture.md § sanctioned-exception registry.
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
  /**
   * Transient keys live with the live session, not the character: held
   * in an in-memory store that is never persisted (so they reset to the
   * default on a fresh login) and never round-trips through the Hydrator.
   * Used for ephemeral UI scoping like per-bar input modes. Defaults to
   * persisted (`false`/absent).
   */
  transient?: boolean;
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

  /**
   * The active cockpit mode, legacy-migration aware. Prefer this over
   * `getClientState('cockpit.mode')`: a player who last played before
   * the mode axis existed has no `cockpit.mode` at all, only a legacy
   * `cockpit.layout`, and only this resolves it.
   */
  getCockpitMode(): CockpitMode;

  /**
   * The arrangement active in a mode (the mode's remembered choice, its
   * shipped default, or the legacy migration's answer — in that order).
   * Defaults to the active mode.
   */
  getCockpitArrangement(mode?: CockpitMode): string;

  /** Shipped defaults then saved names — what `cockpit layout` resolves against. */
  getArrangementNames(mode?: CockpitMode): string[];

  /** Is `name` one of `mode`'s shipped defaults? */
  isShippedArrangement(mode: CockpitMode, name: string): boolean;

  /** Which mode owns `name`, skipping `except`. Null when nobody does. */
  findArrangementMode(name: string, except?: CockpitMode): CockpitMode | null;

  /** This player's saved arrangements for one mode. */
  savedArrangementsFor(mode: CockpitMode): Record<string, ArrangementSpec>;

  /** Error string for a player-supplied arrangement name, or null if fine. */
  validateArrangementName(mode: CockpitMode, raw: string): string | null;

  /** Compat: the legacy LayoutName that best paints (mode, arrangement). */
  legacyLayoutFor(mode: CockpitMode, arrangement: string): LayoutName;

  /**
   * Resolve the display portrait URL for this connected identity.
   * Chain: the `identity.portrait` setting (empty on a Login, value-
   * or-unset on an Avatar) → the connected account's Google photo →
   * empty (the client renders a generated placeholder). Lives here, on
   * the connection layer, so the portrait is available from the moment
   * of connection — on a `Login` (start screen / character-select) as
   * well as an in-world `Avatar`.
   */
  getPortraitUrl(): Promise<string>;
}

export function HasInteractiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HasInteractiveMixin extends Base {
    static _mixinName = 'HasInteractiveMixin';

    /**
     * Residency veto: a session holder (Avatar / Login) is never culled
     * by the self-eviction sweep — its lifecycle is owned by connection
     * teardown. Unconditional (does not chain `super`).
     */
    public canEvict(_context: EvictionContext): VetoResult {
      return { ok: false, reason: 'interactive session holder' };
    }

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
      {
        key: 'cockpit.layout',
        defaultValue: 'world',
        description:
          'The cockpit layout this player is in — the server-' +
          'authoritative view axis (world | forum | livestream-' +
          'viewer | streamer | builder). Set by `cockpit layout`; ' +
          'the client holds a layout→component registry and swaps the ' +
          'whole cockpit on change.',
        validator: (v) =>
          typeof v === 'string' &&
          (LAYOUT_NAMES as readonly string[]).includes(v)
            ? true
            : `unknown layout (known: ${LAYOUT_NAMES.join(', ')})`,
      },
      {
        key: 'cockpit.mode',
        // ⚠ `null`, not 'play', so "never set" stays distinguishable
        // from "deliberately set to the default". A legacy player has
        // no `cockpit.mode` but DOES have a `cockpit.layout` that
        // already names their mode — `getCockpitMode()` reads this null
        // as its cue to migrate. A 'play' default here would silently
        // answer for them and the migration would never run.
        defaultValue: null,
        description:
          'The cockpit activity mode — the front-door axis (chat | ' +
          'play | watch | build | govern), answering "what am I here ' +
          'to do". Set by `cockpit mode`. Null means never set: read ' +
          'through `getCockpitMode()`, which migrates a legacy ' +
          '`cockpit.layout` rather than assuming the default.',
        validator: (v) =>
          v === null ||
          (typeof v === 'string' &&
            (COCKPIT_MODES as readonly string[]).includes(v))
            ? true
            : `unknown cockpit mode (known: ${COCKPIT_MODES.join(', ')})`,
      },
      {
        key: 'cockpit.arrangements',
        // Per-mode arrangement memory: `{ [mode]: arrangementName }`.
        // Switching modes and back returns you where you were.
        defaultValue: {},
        description:
          'Per-mode arrangement memory — a { mode → arrangement name } ' +
          'map. Switching modes and back restores the arrangement last ' +
          'used in that mode. Written by `cockpit layout`; read through ' +
          '`getCockpitArrangement()`, which falls back to the mode’s ' +
          'shipped default.',
        validator: (v) => {
          if (typeof v !== 'object' || v === null || Array.isArray(v)) {
            return 'must be a { mode: arrangement } object';
          }
          for (const [mode, name] of Object.entries(
            v as Record<string, unknown>,
          )) {
            if (!(COCKPIT_MODES as readonly string[]).includes(mode)) {
              return `unknown cockpit mode '${mode}'`;
            }
            if (typeof name !== 'string') {
              return 'every arrangement name must be a string';
            }
          }
          return true;
        },
      },
      {
        key: 'cockpit.savedArrangements',
        // `{ [mode]: { [name]: ArrangementSpec } }`. Scoped by mode
        // because an arrangement only means anything inside one — the
        // same reason `cockpit layout` refuses a name from elsewhere
        // instead of quietly switching modes for you.
        defaultValue: {},
        description:
          'Player-composed pane arrangements, per mode — a ' +
          '{ mode → { name → { panes } } } map. Written by ' +
          '`cockpit layout save` / `forget`. These sit BESIDE the ' +
          'shipped per-mode defaults; a saved name may never shadow a ' +
          'shipped one, so the union is unambiguous.',
        validator: (v) => {
          if (typeof v !== 'object' || v === null || Array.isArray(v)) {
            return 'must be a { mode: { name: spec } } object';
          }
          for (const [mode, byName] of Object.entries(
            v as Record<string, unknown>,
          )) {
            if (!(COCKPIT_MODES as readonly string[]).includes(mode)) {
              return `unknown cockpit mode '${mode}'`;
            }
            if (
              typeof byName !== 'object' ||
              byName === null ||
              Array.isArray(byName)
            ) {
              return `arrangements for '${mode}' must be an object`;
            }
            for (const [name, spec] of Object.entries(
              byName as Record<string, unknown>,
            )) {
              if (name.length === 0 || name.length > MAX_ARRANGEMENT_NAME_LENGTH) {
                return `arrangement name '${name}' must be 1..${MAX_ARRANGEMENT_NAME_LENGTH} characters`;
              }
              if (
                typeof spec !== 'object' ||
                spec === null ||
                !Array.isArray((spec as { panes?: unknown }).panes)
              ) {
                return `arrangement '${name}' must carry a panes array`;
              }
            }
          }
          return true;
        },
      },
      {
        key: 'cockpit.inputModes',
        // Transient: input scoping belongs to the live session, not the
        // character. Resets to {} on a fresh login — no persisted barId
        // vocabulary to maintain across sessions. The barId is just an
        // in-session routing handle, not a saved key.
        transient: true,
        defaultValue: {},
        description:
          'Per-bar input modes — a { barId → prefix } map. The ' +
          'command interpreter prepends a bar’s prefix to bare ' +
          'input submitted from that bar (escape with `/`; the ' +
          '`cockpit` verb and its whole subtree are exempt — interface ' +
          'control is not world input). Set/cleared by `cockpit scope` ' +
          'from a given bar; the client renders the prefix as an inline ' +
          'uneditable span. Transient — never persisted; clears on ' +
          'a fresh session.',
        // Shape: a flat object whose values are all strings. The
        // resolver/interpreter tolerate a missing key (= that bar is
        // unset); this validator only rejects non-objects and non-
        // string values so a malformed write can't poison the map.
        validator: (v) => {
          if (typeof v !== 'object' || v === null || Array.isArray(v)) {
            return 'must be a { barId: prefix } object';
          }
          for (const val of Object.values(v as Record<string, unknown>)) {
            if (typeof val !== 'string') return 'every mode prefix must be a string';
          }
          return true;
        },
      },
      {
        key: 'cockpit.watch',
        // Transient: the focal-embed target belongs to the live session, not
        // the character. Resets to null on a fresh login — matching the
        // `cockpit.inputModes` precedent. Set by the `watch` verb.
        transient: true,
        defaultValue: null,
        description:
          'The livestream-viewer focal-embed target — a server-' +
          'authoritative per-viewer WatchTarget ({platform,channel} | ' +
          '{platform,videoId} | {platform,channelId}) or null. Set by the ' +
          '`watch` verb; the client mirrors it and renders the platform ' +
          'player iframe. Transient — never persisted; clears on a fresh ' +
          'session.',
        // Shape: null (nothing watched) or an embed-shaped object with a
        // `platform` and one of channel/videoId/channelId.
        validator: (v) => {
          if (v === null) return true;
          if (typeof v !== 'object' || Array.isArray(v)) {
            return 'must be null or a { platform, … } object';
          }
          const o = v as Record<string, unknown>;
          if (
            (o.platform === 'twitch' || o.platform === 'kick') &&
            typeof o.channel === 'string'
          ) {
            return true;
          }
          if (
            o.platform === 'youtube' &&
            (typeof o.videoId === 'string' || typeof o.channelId === 'string')
          ) {
            return true;
          }
          return 'unknown watch target shape';
        },
      },
      {
        key: 'cockpit.shelf',
        // ⚠ NOT transient, unlike `inputModes` and `watch`. A shelf is a
        // preference — the same kind of thing as `cockpit.layout` — and
        // a player who arranged their figures expects to find them
        // arranged tomorrow. `inputModes` and `watch` are session
        // routing, which is why those two reset.
        defaultValue: [...DEFAULT_SHELF],
        description:
          'The widget shelf — which figures are pinned to the top bar, ' +
          'in order. An array of ShelfRowId. Edited by `cockpit shelf ' +
          'pin|unpin`; defaults to all nine rows, most of which render ' +
          'their honest not-wired state rather than a number. ' +
          'Server-authoritative on purpose: a pin affordance that ' +
          'mutated local state would falsify the claim the status bar ' +
          'makes, that every click sends a command.',
        // Shape: an array of known row ids, no duplicates. The id
        // vocabulary is `SHELF_ROW_IDS` in `@saxonberg/types` — one
        // list, shared, so the server's validation and the client's
        // catalogue cannot drift into two.
        validator: (v) => {
          if (!Array.isArray(v)) return 'must be an array of shelf row ids';
          const seen = new Set<string>();
          for (const row of v) {
            if (typeof row !== 'string') return 'every row must be a string';
            if (!(SHELF_ROW_IDS as readonly string[]).includes(row)) {
              return `unknown shelf row '${row}' (known: ${SHELF_ROW_IDS.join(', ')})`;
            }
            if (seen.has(row)) return `duplicate shelf row '${row}'`;
            seen.add(row);
          }
          return true;
        },
      },
    ];

    /**
     * Verbs that travel with every HasInteractive-bearing host
     * (Avatar today, future cockpit-bearing classes tomorrow). The
     * `cockpit` verb belongs here because the state it edits IS the
     * client state on this mixin; co-locating verb + schema keeps the
     * wiring local.
     *
     * One entry, not three: `layout`, `style` and `mode` were absorbed
     * as `cockpit layout` / `cockpit style` / `cockpit scope`. They
     * each wrote this same `cockpit.*` keyspace, so three top-level
     * verbs was scatter, not separation.
     */
    static commandContributions: CommandContributions = {
      self: ['shell/cockpit.yaml'],
      peers: [],
      environment: [],
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

    /**
     * Transient client-state slot — keys whose schema entry is
     * `transient`. In-memory only: deliberately NOT in `persistentFields`,
     * so it never reaches the Hydrator and resets to defaults on a fresh
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
      const store = entry.transient
        ? this._transientClientState
        : this._clientState;
      if (store && Object.prototype.hasOwnProperty.call(store, key)) {
        return store[key] as T;
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
      if (entry.transient) {
        if (!this._transientClientState) this._transientClientState = {};
        this._transientClientState[key] = value;
        return;
      }
      if (!this._clientState) this._clientState = {};
      this._clientState[key] = value;
    }

    /**
     * The active cockpit mode, resolving the legacy `cockpit.layout`
     * when no mode was ever set.
     *
     * ⚠ **The migration is a MAPPING, not a rename.** Before the mode
     * axis existed, `cockpit.layout` held one of five values that were
     * really *a mode plus that mode's arrangement* flattened into one
     * string. Every player who ever ran `layout builder` has that
     * string persisted. Resolution order:
     *
     *   1. an explicitly set `cockpit.mode` — the post-migration world;
     *   2. the legacy `cockpit.layout`, mapped through
     *      {@link LEGACY_LAYOUT_MIGRATION};
     *   3. {@link DEFAULT_COCKPIT_MODE}, for a genuinely fresh player.
     *
     * Derive-on-read rather than a one-shot rewrite: nothing has to run
     * against every stored Avatar, and a player who never logs in again
     * costs nothing.
     */
    public getCockpitMode(): CockpitMode {
      const explicit = this.getClientState<CockpitMode | null>('cockpit.mode');
      if (explicit !== null && explicit !== undefined) return explicit;
      return this.migratedLegacyLayout()?.mode ?? DEFAULT_COCKPIT_MODE;
    }

    /**
     * The arrangement active in `mode` (default: the active mode).
     * Resolution order mirrors {@link getCockpitMode}: the remembered
     * per-mode choice, then the legacy layout's arrangement when that
     * legacy value maps to *this* mode, then the mode's shipped default.
     *
     * The legacy step is scoped to the matching mode on purpose. The
     * two livestream layouts collapse into one `watch` mode with
     * different arrangements, so `livestream-viewer` may answer for
     * `watch` — but it must not answer for `play`.
     */
    public getCockpitArrangement(mode?: CockpitMode): string {
      const active = mode ?? this.getCockpitMode();
      const remembered = this.getClientState<Record<string, string>>(
        'cockpit.arrangements',
      );
      const stored = remembered?.[active];
      if (typeof stored === 'string' && stored.length > 0) return stored;

      const legacy = this.migratedLegacyLayout();
      if (legacy && legacy.mode === active) return legacy.arrangement;

      return COCKPIT_ARRANGEMENTS[active][0] ?? 'default';
    }

    /**
     * Every arrangement name available in `mode` — the shipped
     * defaults first, then this player's saved ones. This union is what
     * `cockpit layout <name>` resolves against; there is deliberately
     * no frozen list, because the slate's arrangements are *savable*.
     */
    public getArrangementNames(mode?: CockpitMode): string[] {
      const active = mode ?? this.getCockpitMode();
      const shipped = [...COCKPIT_ARRANGEMENTS[active]];
      const saved = Object.keys(this.savedArrangementsFor(active));
      return [...shipped, ...saved.filter((n) => !shipped.includes(n))];
    }

    /** Is `name` a shipped default of `mode`? */
    public isShippedArrangement(mode: CockpitMode, name: string): boolean {
      return (COCKPIT_ARRANGEMENTS[mode] as readonly string[]).includes(name);
    }

    /**
     * The mode that owns `name`, or null. Used to refuse a cross-mode
     * recall *with a reason naming the mode* — "unknown arrangement" is
     * a bad answer when the player has one by that name one door over.
     * Skips `except` so a caller can ask "who else has this?".
     */
    public findArrangementMode(
      name: string,
      except?: CockpitMode,
    ): CockpitMode | null {
      for (const mode of COCKPIT_MODES) {
        if (mode === except) continue;
        if (this.getArrangementNames(mode).includes(name)) return mode;
      }
      return null;
    }

    /** This player's saved arrangements for one mode (never null). */
    public savedArrangementsFor(
      mode: CockpitMode,
    ): Record<string, ArrangementSpec> {
      const all = this.getClientState<
        Record<string, Record<string, ArrangementSpec>>
      >('cockpit.savedArrangements');
      return all?.[mode] ?? {};
    }

    /**
     * Validate a player-supplied arrangement name. Returns an error
     * string, or null when acceptable.
     *
     * ⚠ A saved name may never shadow a shipped default. Allowing it
     * would make `cockpit layout viewer` ambiguous with no way for the
     * player to say which they meant — so the collision is refused at
     * save time, where it can still be explained, rather than resolved
     * silently at recall time in favour of whichever we happened to
     * check first.
     */
    public validateArrangementName(
      mode: CockpitMode,
      raw: string,
    ): string | null {
      const name = raw.trim();
      if (name.length === 0) return 'an arrangement needs a name';
      if (name.length > MAX_ARRANGEMENT_NAME_LENGTH) {
        return `name is too long (max ${MAX_ARRANGEMENT_NAME_LENGTH} characters)`;
      }
      if (/\s/.test(name)) return 'an arrangement name cannot contain spaces';
      if (this.isShippedArrangement(mode, name)) {
        return `'${name}' is a shipped ${mode} arrangement and cannot be overwritten`;
      }
      /*
       * ⚠ The COUNT, not just the name. A save writes a player-chosen
       * key into a persisted map, so uncapped it is unbounded growth of
       * the player's own stored document — self-inflicted, which is
       * precisely why it is easy to leave open: the cost lands on
       * storage and on every read of that document rather than on the
       * player doing it. Overwriting an existing name is always allowed,
       * because that adds no key.
       */
      const existing = this.savedArrangementsFor(mode);
      if (
        existing[name] === undefined &&
        Object.keys(existing).length >= MAX_SAVED_ARRANGEMENTS_PER_MODE
      ) {
        return (
          `you have ${MAX_SAVED_ARRANGEMENTS_PER_MODE} saved ${mode} ` +
          `arrangements — forget one first`
        );
      }
      return null;
    }

    /**
     * The legacy {@link LayoutName} that best paints (mode,
     * arrangement).
     *
     * ⚠ Compatibility only. The shipped client still swaps its frame
     * off `cockpit.layout`, and repainting it is a separate cycle, so
     * the server keeps that key populated while mode + arrangement
     * carry the truth. A saved arrangement and the `govern` mode have
     * no legacy name by construction — both fall back to the mode's
     * first mapping, which is the honest answer: the old client cannot
     * render them, so it renders the nearest thing it has.
     */
    public legacyLayoutFor(mode: CockpitMode, arrangement: string): LayoutName {
      const forMode = LEGACY_LAYOUT_FOR[mode];
      const exact = forMode[arrangement];
      if (exact) return exact;
      const fallback = Object.values(forMode)[0];
      return fallback ?? 'world';
    }

    /**
     * The legacy `cockpit.layout` as a (mode, arrangement) pair, or
     * null when this host never stored one.
     *
     * Host-internal: reads `_clientState` directly to tell "stored" from
     * "schema default", which `getClientState` deliberately collapses.
     * The distinction is the whole migration — a host still sitting on
     * the `world` default must NOT be treated as having chosen `play`,
     * because it has chosen nothing.
     */
    private migratedLegacyLayout(): { mode: CockpitMode; arrangement: string } | null {
      const store = this._clientState;
      if (!store || !Object.prototype.hasOwnProperty.call(store, 'cockpit.layout')) {
        return null;
      }
      const legacy = store['cockpit.layout'];
      if (typeof legacy !== 'string') return null;
      return LEGACY_LAYOUT_MIGRATION[legacy as LayoutName] ?? null;
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

    /**
     * Empty `portraitUrl` sentinel — "no image; client renders a
     * generated placeholder" (initials/icon from the name). We don't
     * mint a fake asset URL server-side; the empty string is the
     * honest "default" the client interprets.
     */
    static DEFAULT_PORTRAIT = '';

    public async getPortraitUrl(): Promise<string> {
      // 1. The per-character setting (Persona-declared).
      //    `ShellApi.resolveSetting` returns '' (the schema default)
      //    when unset on an Avatar, and `undefined` on a Login that has
      //    no such setting — both fall through. No per-layer override
      //    needed.
      const set = ShellApi.resolveSetting<string>(
        this as unknown as Parameters<typeof ShellApi.resolveSetting>[0],
        'identity.portrait',
      );
      if (set) return set;

      // 2. The connected account's Google photo. Any interactive will
      //    do — they all belong to the same user.
      for (const interactive of this.interactives) {
        const googleProfileId = interactive.getUser().googleProfileId;
        if (!googleProfileId) continue;
        const profile = await GoogleProfile.findById<GoogleProfile>(
          googleProfileId,
        );
        if (profile?.photoUrl) return profile.photoUrl;
        break;
      }

      // 3. No image — client generates a placeholder.
      return HasInteractiveMixin.DEFAULT_PORTRAIT;
    }

    public snapshotClientState(): Record<string, unknown> {
      const schema =
        (this.constructor as { clientStateSchema?: ClientStateSchemaEntry[] })
          .clientStateSchema ?? [];
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

      // The cockpit axes go out RESOLVED, never raw. A legacy host
      // stores `cockpit.mode: null` and a `cockpit.layout` that has to
      // be mapped — and the client owns zero semantics, so it must not
      // be the thing doing that mapping. Resolving here keeps the
      // migration in exactly one place and means the client can read
      // the snapshot literally.
      const mode = this.getCockpitMode();
      out['cockpit.mode'] = mode;
      out['cockpit.arrangements'] = {
        ...(out['cockpit.arrangements'] as Record<string, string>),
        [mode]: this.getCockpitArrangement(mode),
      };
      return out;
    }
  };
}
