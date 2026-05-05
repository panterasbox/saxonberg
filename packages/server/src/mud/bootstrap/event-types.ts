/**
 * Well-known engine event names — hierarchical dot-notation strings.
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
 *
 * Adding a new event:
 *   1. Add an entry here (TS key + string value).
 *   2. Optionally extend `EventPayloads` with a payload shape.
 *   3. Add an `emittableBy(...)` policy entry in `event-policies.ts`
 *      (or rely on the default).
 *   4. Update the `Events` reference in `EventRegistry.postRegister`
 *      if anything beyond the per-event policy needs it.
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
