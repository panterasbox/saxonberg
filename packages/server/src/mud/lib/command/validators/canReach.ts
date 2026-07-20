/**
 * canReach — every bound Stuff must be physically reachable from the
 * actor right now. The reachability surface is wider than
 * `getContents()` — it includes attached doors and the location
 * itself when the match arrived through a direction (via.exit).
 *
 * **Why the validator exists.** MQL's `scope:` declaration is a
 * search hint, not a security gate. A query like
 * `drop online:bob:i:sword` resolves to bob's sword regardless of
 * the YAML's `scope: "inventory"` because the scope is just the
 * default search anchor. Validators on `type: object` /
 * `type: objects` fields enforce world-state constraints the
 * resolver can't — "this thing must actually be in arm's reach"
 * is the canonical example.
 *
 * Reach criteria, any one passes:
 *
 *   - The Stuff is in the actor's inventory.
 *   - The Stuff is in the actor's current location's contents
 *     (peers, dropped items, detached doors).
 *   - The Stuff is a door currently attached to one of the
 *     location's exits (attached doors have `environment === null`,
 *     so they aren't in any container — but they're reachable
 *     through the exits that reference them).
 *   - The Stuff is the actor's current location AND the binding
 *     carries `via.exit` (the door-via-direction case — `open
 *     north` resolves to the location with the exit attribution;
 *     the controller fetches the door from `via.exit.getDoor()`).
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't see X here` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver;
  const location = context.location;

  const inventoryIds = MixinApi.isContainer(giver)
    ? new Set(giver.getContents().map((s) => s.stuffId))
    : new Set<string>();
  // A locationless giver can still reach things it carries (inventory);
  // it just has no room contents or exits to reach through.
  const locationIds = new Set(
    (location ? location.getContents() : []).map(
      (s) => s.stuffId,
    ),
  );
  const exitDoorIds = new Set<string>();
  if (location && MixinApi.isExitable(location)) {
    for (const exit of location.getObviousExits()) {
      const door = exit.getDoor();
      if (door) exitDoorIds.add(door.stuffId);
    }
  }

  const via = isViaShape(value) ? value.via : undefined;

  for (const stuff of stuffs) {
    const id = (stuff as Stuff).stuffId;
    if (id === giver.stuffId) continue; // the actor themselves
    if (location && id === location.stuffId && via?.exit) continue; // door-via-direction
    if (inventoryIds.has(id)) continue;
    if (locationIds.has(id)) continue;
    if (exitDoorIds.has(id)) continue;
    return `you can't reach ${stuff.getPresentation()}`;
  }
  return undefined;
};

function isViaShape(value: unknown): value is { via?: { exit?: unknown } } {
  return typeof value === 'object' && value !== null && 'via' in value;
}

export default validator;
