/**
 * requiresSmell — verb-level precondition. Rejects `smell` when the
 * giver's sensorium has no smell modality. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
import { BiomeApi } from '../../../api/biome';
// (anatomy + modalities preloaded via PerceptionApi.preloadForSenseGate)

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the
// whole thing a pure declaration (no free-standing module-scope
// statement). The preload rides the validator function as a
// property, same shape as before.
const body: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('smell');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  // ⭐ A nose under the water (underwater D21): the sense is there, the
  // medium is wrong — said in the body's words.
  const read = BiomeApi.mediumFor(giver);
  if (read.immersed && !read.atSurface) return 'Under the water you would only breathe it in.';
  return 'You have no sense of smell.';
};
const preload: NonNullable<CommandValidator['preload']> =
  (ctx) => PerceptionApi.preloadForSenseGate(ctx.commandGiver);
const validator: CommandValidator = Object.assign(body, {
  preload,
});

export default validator;
