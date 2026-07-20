/**
 * requiresTouch — verb-level precondition. Rejects `feel` when the
 * giver's sensorium has no touch modality. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
// (anatomy + modalities preloaded via PerceptionApi.preloadForSenseGate)

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the
// whole thing a pure declaration (no free-standing module-scope
// statement). The preload rides the validator function as a
// property, same shape as before.
const body: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('touch');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return "You can't feel anything.";
};
const preload: NonNullable<CommandValidator['preload']> =
  (ctx) => PerceptionApi.preloadForSenseGate(ctx.commandGiver);
const validator: CommandValidator = Object.assign(body, {
  preload,
});

export default validator;
