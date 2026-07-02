/**
 * Engine event vocabulary and per-event default policies.
 *
 * Consolidates the well-known events table, payload type map, and
 * the access-policy lookup that `EventRegistry.postRegister`
 * frontloads at boot. Custom (unlisted) events are first-class —
 * `EventApi.emit` / `EventApi.on` auto-register on first touch with
 * the default `EventApi.emittableBy()` policy. The well-known set differs
 * only in being declared up-front with tighter per-event allowlists.
 *
 * Adding a new event:
 *   1. Add an entry to `Events` (TS key + dot-notation string).
 *   2. Optionally extend `EventPayloads` with a payload shape.
 *   3. Optionally add a `POLICIES` entry if the default
 *      `EventApi.emittableBy()` (open-public emit, EventApi-mediated) is too
 *      permissive.
 */

import type { RelaySpeaker, StreamStateSnapshot } from '@saxonberg/types';

/**
 * Well-known engine event names.
 *
 * The TS keys (`Events.PlayerLoggedIn`) are ergonomic identifiers;
 * the underlying string (`'player.loggedIn'`) is the namespaced path
 * used as the property key on `EventRegistry` and (eventually) for
 * wildcard subscriptions like `EventApi.on('player.*', ...)`.
 *
 * Hierarchy is two-deep on initial ship (`category.event`). Deeper
 * nesting is fine where it organizes better; subscribers always use
 * the full string today — wildcard support is a deferred capability
 * the dot-notation enables.
 */
export const Events = {
  StuffCreated: 'stuff.created',
  StuffDestructed: 'stuff.destructed',
  StuffFieldChanged: 'stuff.fieldChanged',
  StuffPropertyChanged: 'stuff.propertyChanged',
  StuffShadowChanged: 'stuff.shadowChanged',
  ConnectionAttached: 'connection.attached',
  PlayerLoggedIn: 'player.loggedIn',
  PlayerLoggedOut: 'player.loggedOut',
  PlayerReconnected: 'player.reconnected',
  PlayerDisconnected: 'player.disconnected',
  ModuleReloaded: 'module.reloaded',
  ModuleRolledBack: 'module.rolledBack',
  ModuleUnloaded: 'module.unloaded',
  ModuleReloadFailed: 'module.reloadFailed',
  StreamStateChanged: 'stream.stateChanged',
  StreamSourcesChanged: 'stream.sourcesChanged',
  RelayMessage: 'stream.relayMessage',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

/**
 * Payload shape for the four `module.*` lifecycle events emitted by
 * `HotReloadApi`. `versionId` is the truncated sha256 of the module
 * source bytes at load time; `null` for `Unloaded`. `previousVersionId`
 * carries the version that this transition replaced, or `null` when
 * there was no prior. `exports` is the set of class export names from
 * the new module; empty for `Unloaded` / `ReloadFailed`. `error` is
 * present only on `ReloadFailed`.
 */
export interface ReloadEvent {
  path: string;
  versionId: string | null;
  previousVersionId: string | null;
  exports: string[];
  error?: { message: string; stack?: string };
}

/**
 * Optional per-event payload shapes. Subscribers calling
 * `EventApi.on<T>(name, listener)` may supply a type parameter
 * matching one of these.
 *
 * Intentionally loose at the type-system level — emitters and
 * subscribers coordinate on shapes by convention. A stricter
 * mapping (e.g. discriminated union on event name) can land if
 * the looseness causes drift.
 */
export interface EventPayloads {
  [Events.StuffCreated]: { stuffId: string; templatePath?: string };
  [Events.StuffDestructed]: { stuffId: string };
  [Events.StuffFieldChanged]: {
    target: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
  [Events.StuffPropertyChanged]: {
    target: string;
    property: string;
    oldValue: unknown;
    newValue: unknown;
  };
  [Events.StuffShadowChanged]: {
    target: string;
    shadow: string;
    cause: 'attach' | 'detach' | 'mutate';
  };
  [Events.ConnectionAttached]: { interactiveId: string; holderId?: string };
  [Events.PlayerLoggedIn]: { playerId: string; userId: string };
  [Events.PlayerLoggedOut]: { playerId: string };
  [Events.PlayerReconnected]: { playerId: string; userId: string };
  [Events.PlayerDisconnected]: { playerId: string };
  [Events.ModuleReloaded]: ReloadEvent;
  [Events.ModuleRolledBack]: ReloadEvent;
  [Events.ModuleUnloaded]: ReloadEvent;
  [Events.ModuleReloadFailed]: ReloadEvent;
  /**
   * Full overlay-state snapshot, fired whenever `StreamState` mutates
   * (the `stream` verb is the v1 emitter). The `BroadcastFeed`
   * projection listens and re-pushes to broadcast connections. Carries
   * the whole snapshot so the listener never has to re-read the
   * singleton.
   */
  [Events.StreamStateChanged]: StreamStateSnapshot;
  /**
   * One relay-chat line delivered by `StreamRelay.deliver` (inbound read or
   * outbound mirror), emitted per delivered line so the backend
   * `BroadcastFeed` can forward the overlay owner's OWN channels onto the
   * broadcast feed. The relay stays mud-pure (EventApi.emit only); the feed
   * filters to the `OVERLAY_*` channels — nothing else consumes it.
   */
  [Events.RelayMessage]: RelayMessageEvent;
}

/** Payload of {@link Events.RelayMessage}. */
export interface RelayMessageEvent {
  service: 'twitch' | 'youtube';
  /** Transport channel key (broadcasterId / liveChatId). */
  channelKey: string;
  /** Display handle for the channel. */
  channelHandle: string;
  speaker: RelaySpeaker;
  text: string;
}

