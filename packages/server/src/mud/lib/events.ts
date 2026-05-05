/**
 * Engine event vocabulary and per-event default policies.
 *
 * Consolidates the well-known events table, payload type map, and
 * the access-policy lookup that `EventRegistry.postRegister`
 * frontloads at boot. Custom (unlisted) events are first-class —
 * `EventApi.emit` / `EventApi.on` auto-register on first touch with
 * the default `emittableBy()` policy. The well-known set differs
 * only in being declared up-front with tighter per-event allowlists.
 *
 * Adding a new event:
 *   1. Add an entry to `Events` (TS key + dot-notation string).
 *   2. Optionally extend `EventPayloads` with a payload shape.
 *   3. Optionally add a `POLICIES` entry if the default
 *      `emittableBy()` (open-public emit, EventApi-mediated) is too
 *      permissive.
 */

import type { PropAccessCheck, PropValue } from './stuff/Propertied';
import { emittableBy } from '../api/event';
import { StuffApi } from '../api/stuff';
import { PersistenceManager } from '../../backend/PersistenceManager';

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
  ConnectionAttached: 'connection.attached',
  PlayerLoggedIn: 'player.loggedIn',
  PlayerLoggedOut: 'player.loggedOut',
  ModuleReloaded: 'module.reloaded',
  PersistenceFlushed: 'persistence.flushed',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

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
  [Events.ConnectionAttached]: { interactiveId: string; holderId?: string };
  [Events.PlayerLoggedIn]: { playerId: string; userId: string };
  [Events.PlayerLoggedOut]: { playerId: string };
  [Events.ModuleReloaded]: { module: string };
  [Events.PersistenceFlushed]: { collection: string; count: number };
}

/**
 * Resolve the default policy for an event name. Falls back to a
 * permissive (no-allowlist) `emittableBy()` for unknown names so a
 * custom event registered ad-hoc still gets the EventApi-mediated
 * defense without requiring this map to be edited.
 *
 * Lazily initialised on first call so we don't run `emittableBy(...)`
 * at module-top: this file participates in a cycle with `api/event`
 * (which exports `emittableBy`) and `api/stuff` (the StuffApi
 * binding the policy references). At module-load time those
 * imports may resolve to partial modules; deferring the table
 * construction to first-call avoids the trap.
 */
export function defaultPolicyFor(eventName: string): PropAccessCheck<PropValue> {
  const policy = getPolicies()[eventName as EventName];
  return policy ?? emittableBy();
}

let _policies: Record<EventName, PropAccessCheck<PropValue>> | null = null;
function getPolicies(): Record<EventName, PropAccessCheck<PropValue>> {
  if (_policies) return _policies;
  _policies = {
    [Events.StuffCreated]: emittableBy(StuffApi),
    [Events.StuffDestructed]: emittableBy(StuffApi),
    [Events.ConnectionAttached]: emittableBy(),
    [Events.PlayerLoggedIn]: emittableBy(),
    [Events.PlayerLoggedOut]: emittableBy(),
    [Events.ModuleReloaded]: emittableBy(),
    [Events.PersistenceFlushed]: emittableBy(PersistenceManager),
  };
  return _policies;
}
