/**
 * requiresTouch — verb-level precondition. Rejects `feel` when the
 * giver's sensorium has no touch channel. See `requiresHearing`
 * for the broader contract.
 */

import type { CommandValidator } from '../../../api/command';
import { deriveSensorium } from '../../species/BodyPlan';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (deriveSensorium(giver).includes('touch')) return undefined;
  return "You can't feel anything.";
};

export default validator;
