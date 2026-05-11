/**
 * requiresPosed — verb-level precondition. Rejects the command when
 * the giver doesn't compose `PosedMixin` (i.e. has no posture
 * state surface).
 *
 * Tagged on every posture / conveyance verb (sit, lie, stand,
 * kneel, mount, dismount). In v1 the predicate is implied by
 * `requiresAnimate` — `Character` composes Posed and animate-Stuff
 * are Characters — but it's tagged explicitly so reordering or
 * future non-Character animates surface the right error.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  if (MixinApi.isPosed(context.commandGiver)) return undefined;
  return `you can't change posture`;
};

export default validator;
