/**
 * requiresTaste — verb-level precondition. Rejects `taste` when the
 * giver's sensorium has no taste modality. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('taste');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return 'You have no sense of taste.';
};

export default validator;
