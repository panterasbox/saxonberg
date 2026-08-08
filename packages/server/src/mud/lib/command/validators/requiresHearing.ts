/**
 * requiresHearing — verb-level precondition. Rejects `listen` when
 * the giver's sensorium has no sound modality.
 *
 * Mirrors `requiresSmell` / `requiresTouch` / `requiresTaste` —
 * each gates one of the four contact-family single-sense verbs on
 * the giver's `PerceptionApi.sensorium`. Failure returns a polite
 * refusal string; the dispatcher routes that through the standard
 * validator-failed prose path (`shell.error`).
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
  const modality = PerceptionApi.modalityByName('sound');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return "You can't hear.";
};
const preload: NonNullable<CommandValidator['preload']> =
  (ctx) => PerceptionApi.preloadForSenseGate(ctx.commandGiver);
const validator: CommandValidator = Object.assign(body, {
  preload,
});

export default validator;
