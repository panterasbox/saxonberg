/**
 * requiresAlias — verb-level precondition. Rejects the command
 * when the giver doesn't compose `AliasMixin` (i.e. has no alias
 * store to operate on).
 *
 * Tagged on the `alias` verb. NPCs and other Characters that don't
 * carry alias state fail this check.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isAlias(context.commandGiver)) return undefined;
  return `this character has no aliases`;
};

export default validator;
