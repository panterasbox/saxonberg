/**
 * canReach — every bound Stuff must be physically reachable from the
 * actor right now. The reachability surface is wider than
 * `getContents()` — it includes attached doors and the location
 * exits themselves (a direction binds the way).
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
 *   - The Stuff is one of the location's exits (`open north` binds
 *     the way; `MqlApi.effectiveTarget` reaches its door).
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't see X here` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MqlApi } from '../../../api/mql';
import { PerceptionApi } from '../../../api/perception';
import { MixinApi } from '../../../api/mixin';
import { GrammarApi } from '../../../api/grammar';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver;

  for (const stuff of stuffs) {
    // ⭐ One definition of reach, shared with the card holds. This
    // validator used to hand-roll it; so did the hold evaluator, and
    // they disagreed about doors.
    if (
      !PerceptionApi.canReach(giver as Stuff, stuff as Stuff, {
        location: context.location ?? null,
      })
    ) {
      // ⭐ A lid is the honest reason when there is one (D6).
      if (MixinApi.isContainable(stuff)) {
        const shut = stuff.reachRefusal(giver as Stuff);
        if (shut !== null) {
          return `${GrammarApi.cap(shut.facts.by.describeFor(giver as Stuff))} is shut.`;
        }
      }
      return `you can't reach ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
