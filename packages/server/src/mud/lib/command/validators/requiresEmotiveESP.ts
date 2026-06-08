/**
 * requiresEmotiveESP — verb-level precondition for emote-style ESP
 * verbs (broadcast feelings/moods over the implant network). No v1
 * consumer yet; ships ahead of the future remote-emote verb so the
 * substrate's symmetry stays visible.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
// (anatomy + modalities preloaded via PerceptionApi.preloadForSenseGate)

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('emotive-esp');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return 'You have no way to send a feeling.';
};

validator.preload = (ctx) => PerceptionApi.preloadForSenseGate(ctx.commandGiver);

export default validator;
