/**
 * mustBeHeld — the bound Stuff must be in the actor's hands, and if it
 * is merely *reachable* the refusal says to pick it up.
 *
 * **Why this is not `mustBeInInventory`.** That validator guards verbs
 * whose argument should never have been outside your inventory in the
 * first place (`drop`, `give`), so "you don't have it" is the whole
 * story. This one guards verbs whose argument is deliberately resolved
 * from the wider scope — you can *see* the rock on the ground, the verb
 * is afforded by it, and the answer is not "that does not exist" but
 * "not until you pick it up."
 *
 * **Why the pickup is required at all, rather than folded in.** Bending
 * down and taking hold of a rock is a **public act**. Everyone in the
 * room sees it, and in a world where the same rock is about to become a
 * weapon that is a signal worth making somebody pay for. Silently
 * picking it up as part of the throw would delete the tell — the victim
 * and the bystanders lose the beat of warning that the real act gives
 * them. The friction IS the feature, and it is the same doctrine as the
 * public aim ladder and socially-legible unsafe handling: intent should
 * cost a visible moment.
 *
 * Empty MQL results pass through — the controller owns the
 * nothing-matched prose.
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
  if (!MixinApi.isContainer(giver)) return `you have no hands for that`;
  const held = new Set(giver.getContents().map((s) => s.stuffId));

  for (const stuff of stuffs) {
    if (held.has((stuff as Stuff).stuffId)) continue;
    // Reachable-but-not-held is the teaching case: name the fix.
    return `you'll have to pick up ${stuff.getPresentation()} first`;
  }
  return undefined;
};

export default validator;
