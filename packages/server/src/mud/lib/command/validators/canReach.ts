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
import { MqlApi } from '../../../api/mql';
import { PerceptionApi } from '../../../api/perception';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver;
  const viaExit = isViaShape(value) ? Boolean(value.via?.exit) : false;

  for (const stuff of stuffs) {
    // ⭐ One definition of reach, shared with the pane holds. This
    // validator used to hand-roll it; so did the hold evaluator, and
    // they disagreed about doors.
    if (
      !PerceptionApi.canReach(giver as Stuff, stuff as Stuff, {
        location: context.location ?? null,
        viaExit,
      })
    ) {
      return `you can't reach ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

function isViaShape(value: unknown): value is { via?: { exit?: unknown } } {
  return typeof value === 'object' && value !== null && 'via' in value;
}

export default validator;
