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

import type { PropAccessCheck, PropValue } from './stuff/Propertied';
import { EventApi } from '../api/event';
import { StuffApi } from '../api/stuff';
import { HotReloadApi } from '../api/hot-reload';

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
  ModuleReloaded: 'module.reloaded',
  ModuleRolledBack: 'module.rolledBack',
  ModuleUnloaded: 'module.unloaded',
  ModuleReloadFailed: 'module.reloadFailed',
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
  [Events.ModuleReloaded]: ReloadEvent;
  [Events.ModuleRolledBack]: ReloadEvent;
  [Events.ModuleUnloaded]: ReloadEvent;
  [Events.ModuleReloadFailed]: ReloadEvent;
}

/**
 * Resolve the default policy for an event name. Falls back to a
 * permissive (no-allowlist) `EventApi.emittableBy()` for unknown names so a
 * custom event registered ad-hoc still gets the EventApi-mediated
 * defense without requiring this map to be edited.
 *
 * Lazily initialised on first call so we don't run `EventApi.emittableBy(...)`
 * at module-top: this file participates in a cycle with `api/event`
 * (which owns `EventApi.emittableBy`) and `api/stuff` (the StuffApi
 * binding the policy references). At module-load time those
 * imports may resolve to partial modules; deferring the table
 * construction to first-call avoids the trap.
 */
export function defaultPolicyFor(eventName: string): PropAccessCheck<PropValue> {
  const policy = getPolicies()[eventName as EventName];
  return policy ?? EventApi.emittableBy();
}

let _policies: Record<EventName, PropAccessCheck<PropValue>> | null = null;
function getPolicies(): Record<EventName, PropAccessCheck<PropValue>> {
  if (_policies) return _policies;
  _policies = {
    [Events.StuffCreated]: EventApi.emittableBy(StuffApi),
    [Events.StuffDestructed]: EventApi.emittableBy(StuffApi),
    [Events.StuffFieldChanged]: EventApi.emittableBy(),
    [Events.StuffPropertyChanged]: EventApi.emittableBy(),
    [Events.StuffShadowChanged]: EventApi.emittableBy(),
    [Events.ConnectionAttached]: EventApi.emittableBy(),
    [Events.PlayerLoggedIn]: EventApi.emittableBy(),
    [Events.PlayerLoggedOut]: EventApi.emittableBy(),
    [Events.ModuleReloaded]: EventApi.emittableBy(HotReloadApi),
    [Events.ModuleRolledBack]: EventApi.emittableBy(HotReloadApi),
    [Events.ModuleUnloaded]: EventApi.emittableBy(HotReloadApi),
    [Events.ModuleReloadFailed]: EventApi.emittableBy(HotReloadApi),
  };
  return _policies;
}
