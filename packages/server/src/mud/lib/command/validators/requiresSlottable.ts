/**
 * requiresSlottable — verb-level precondition. Rejects the command
 * when the giver doesn't compose `SlottableMixin` (i.e. can't
 * occupy a slot, so can't sit / mount / be worn-by).
 *
 * Tagged on slot-occupying verbs (sit, lie, stand <X>, kneel, mount,
 * dismount). v1 actors are always Slottable via Avatar's composition;
 * this validator surfaces the right error if a non-Slottable Stuff
 * ever issues one of these verbs.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isSlottable(context.commandGiver)) return undefined;
  return `you can't fit in a slot`;
};

export default validator;
