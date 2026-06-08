/**
 * requiresTouch — verb-level precondition. Rejects `feel` when the
 * giver's sensorium has no touch modality. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
import { preloadActorAnatomy } from './preloadActorAnatomy';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('touch');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return "You can't feel anything.";
};

validator.preload = preloadActorAnatomy;

export default validator;
