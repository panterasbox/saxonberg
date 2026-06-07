/**
 * requiresSmell — verb-level precondition. Rejects `smell` when the
 * giver's sensorium has no smell channel. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { SpeciesApi } from '../../../api/species';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (SpeciesApi.deriveSensorium(giver).includes('smell')) return undefined;
  return 'You have no sense of smell.';
};

export default validator;
