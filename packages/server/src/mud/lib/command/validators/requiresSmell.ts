/**
 * requiresSmell — verb-level precondition. Rejects `smell` when the
 * giver's sensorium has no smell modality. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('smell');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return 'You have no sense of smell.';
};

export default validator;
