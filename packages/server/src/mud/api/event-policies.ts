/**
 * Per-event default access policies. Consulted by
 * `EventRegistry.postRegister` to install each well-known event's
 * `checkAccess` function.
 *
 * Granularity is class-level: who's allowed to emit a given event.
 * Subscribe is open by default for every event (a subscriber can't
 * leak privilege). Tighten with `eventPolicy({ emit, subscribe })`
 * if a specific event needs gated subscribe — none do today.
 *
 * The actual class allowlists are deliberately permissive on initial
 * ship. Production wiring (Phase 6) routes emits through specific
 * Apis and Managers; the gate prevents unrelated callers from
 * forging events. As more events land, narrow the allowlists here
 * rather than at the call sites.
 */

import type { PropAccessCheck, PropValue } from '../lib/stuff/Propertied';
import { emittableBy } from './event';
import { Events, type EventName } from './event-types';
import { StuffApi } from './stuff';
import { PersistenceManager } from '../../backend/PersistenceManager';

/**
 * Resolve the default policy for an event name. Falls back to a
 * permissive (no-allowlist) `emittableBy()` for unknown names so a
 * future event registered ad-hoc still gets the EventApi-mediated
 * defense without requiring this map to be edited.
 */
export function defaultPolicyFor(eventName: string): PropAccessCheck<PropValue> {
  const policy = POLICIES[eventName as EventName];
  return policy ?? emittableBy();
}

const POLICIES: Record<EventName, PropAccessCheck<PropValue>> = {
  [Events.StuffCreated]: emittableBy(StuffApi),
  [Events.StuffDestructed]: emittableBy(StuffApi),
  [Events.ConnectionAttached]: emittableBy(),
  [Events.PlayerLoggedIn]: emittableBy(),
  [Events.PlayerLoggedOut]: emittableBy(),
  [Events.ModuleReloaded]: emittableBy(),
  [Events.PersistenceFlushed]: emittableBy(PersistenceManager),
};
