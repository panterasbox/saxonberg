/**
 * requiresHearing — verb-level precondition. Rejects `listen` when
 * the giver's sensorium has no sound modality.
 *
 * Mirrors `requiresSmell` / `requiresTouch` / `requiresTaste` —
 * each gates one of the four contact-family single-sense verbs on
 * the giver's `PerceptionApi.sensorium`. Failure returns a polite
 * refusal string; the dispatcher routes that through the standard
 * validator-failed prose path (`system.command.error`).
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('sound');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return "You can't hear.";
};

export default validator;
