/**
 * requiresMounted — verb-level precondition. Rejects the command
 * when the giver isn't currently in `Postures.Mounted`.
 *
 * Tagged on `dismount`.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { Postures } from '../../slot/Postured';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (!MixinApi.isPosed(giver)) return `you aren't mounted`;
  if (giver.getPosture() !== Postures.Mounted) return `you aren't mounted`;
  return undefined;
};

export default validator;
