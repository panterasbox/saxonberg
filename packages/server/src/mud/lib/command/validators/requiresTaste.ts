/**
 * requiresTaste — verb-level precondition. Rejects `taste` when the
 * giver's sensorium has no taste channel. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { deriveSensorium } from '../../species/BodyPlan';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (deriveSensorium(giver).includes('taste')) return undefined;
  return 'You have no sense of taste.';
};

export default validator;
