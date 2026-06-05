/**
 * requiresEnvironment — verb-level precondition. Rejects the
 * command when the giver doesn't compose `EnvironmentMixin`
 * (i.e. has no settings/var storage to operate on).
 *
 * Tagged on verbs whose semantics target the giver's session
 * variables or schema-validated settings — `var`, `settings`.
 * NPCs and other Characters that don't carry environment state
 * fail this check.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isEnvironment(context.commandGiver)) return undefined;
  return `this character has no session storage`;
};

export default validator;
