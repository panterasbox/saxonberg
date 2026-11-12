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
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';
import { PerceptionApi } from '../../../api/perception';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver;
  if (!MixinApi.isContainer(giver)) {
    return `you have no inventory`;
  }
  // ⭐ Anything you CARRY, at any depth (size and carrying, the flip):
  // nothing sits loose on a body any more — a sword is in its scabbard on
  // your belt, a key in your pocket, a mug may be in your pack — and each
  // is yours to wield, give or put. Direct contents alone answered "you
  // don't have a greatsword" for the one in your scabbard (the drive,
  // step 7). Never into another body (`getCarriedContents`).
  const inventoryIds = new Set(
    PerceptionApi.perceived(giver, giver.getCarriedContents()).map((s) => s.stuffId),
  );

  for (const stuff of stuffs) {
    if (!inventoryIds.has((stuff as Stuff).stuffId)) {
      return `you don't have ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
