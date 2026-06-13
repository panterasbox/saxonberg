/**
 * mustBeInInventory — every bound Stuff must currently be in the
 * actor's inventory.
 *
 * **Why the validator exists.** MQL's `scope:` declaration is a
 * search hint, not a security gate; an MQL query can resolve any
 * Stuff in the world. Inventory-acting verbs (`drop`, `give`)
 * MUST validate that the bound Stuff is actually in the actor's
 * inventory before the controller acts on it — otherwise a query
 * like `drop online:bob:i:sword` would let the actor drop another
 * player's sword in another room.
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't have X` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver;
  if (!MixinApi.isContainer(giver)) {
    return `you have no inventory`;
  }
  const inventoryIds = new Set(
    ContainmentApi.getContents(giver).map((s) => s.stuffId),
  );

  for (const stuff of stuffs) {
    if (!inventoryIds.has((stuff as Stuff).stuffId)) {
      return `you don't have ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
