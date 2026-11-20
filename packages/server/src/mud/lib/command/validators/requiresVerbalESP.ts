/**
 * requiresVerbalESP — verb-level precondition for the aether verbs that
 * are NOT held (`forum`, `broadcast`): rejects when the giver's sensorium
 * has no verbal-ESP modality, in the person's own words (the fix — a
 * phone, ready it, switch it on).
 *
 * ⚠ Not on `dm`, `reply` or `chat` since aether-devices W4: those ask the
 * person's `sendOrHold`, which HOLDS the line and sends it later. A
 * validator would refuse before the hold could happen.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
import { MixinApi } from '../../../api/mixin';
// (anatomy + modalities preloaded via PerceptionApi.preloadForSenseGate)

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the
// whole thing a pure declaration (no free-standing module-scope
// statement). The preload rides the validator function as a
// property, same shape as before.
const body: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('verbal-esp');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  // ⭐ The person says why, and the fix (aether-devices D8) — the same
  // line a held `dm` says. Anything that is not a person has no comms.
  return (
    (MixinApi.isComms(giver) ? giver.cannotSendLine() : null) ??
    'You have no way to send a thought.'
  );
};
const preload: NonNullable<CommandValidator['preload']> =
  (ctx) => PerceptionApi.preloadForSenseGate(ctx.commandGiver);
const validator: CommandValidator = Object.assign(body, {
  preload,
});

export default validator;
