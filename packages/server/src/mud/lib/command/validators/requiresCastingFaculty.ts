/**
 * requiresCastingFaculty — verb-level precondition for the `magic`
 * category. Rejects the command when the giver's casting faculty is not
 * **active** — the species doesn't confer `CasterMixin` (or no augment
 * does), or it carries no faculty profile. The affordance side already
 * hides `cast`/`spells` from a non-caster (the `CasterMixin` instance-
 * contribution seam); this validator is the honest refusal for a typed
 * verb (affordances are discovery, never security).
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (MixinApi.isCaster(giver)) return undefined;
  return 'You have no gift for the arts.';
};

export default validator;
