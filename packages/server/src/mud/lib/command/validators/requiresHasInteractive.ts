/**
 * requiresHasInteractive — verb-level precondition. Rejects the
 * command when the giver doesn't compose `HasInteractiveMixin`
 * (i.e. has no Interactive connections to act on).
 *
 * Tagged on verbs whose semantics target the giver's active
 * connections — e.g. `prompt cancel` cancelling pending prompts on
 * every connection the giver owns. NPCs and other Characters that
 * don't carry Interactive state fail this check.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isHasInteractive(context.commandGiver)) return undefined;
  return `this character has no active connection`;
};

export default validator;
