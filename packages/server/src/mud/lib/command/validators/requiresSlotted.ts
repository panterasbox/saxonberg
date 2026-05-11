/**
 * requiresSlotted — verb-level precondition. Rejects the command when
 * the giver doesn't compose `SlottedMixin` (i.e. exposes no slots
 * for things to occupy).
 *
 * Tagged on body-side affordance verbs (wear, remove, wield, unwield)
 * — the actor's body slots are the target slots being claimed.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isSlotted(context.commandGiver)) return undefined;
  return `you have no body slots`;
};

export default validator;
