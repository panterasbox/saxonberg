/**
 * requiresVerbalESP — verb-level precondition. Rejects `tell` (and
 * future addressed-ESP verbs) when the giver's sensorium has no
 * verbal-ESP modality.
 *
 * Pairs with the method-level `@RequiresActive('AetherMixin')`
 * decorator on `AetherMixin.tell`: the verb validator is the polite
 * early-catch (clean refusal string at dispatch time); the decorator
 * is the runtime backstop for any non-verb caller. Both check the
 * same gate (augment-conferred AetherMixin → ESP modalities in
 * sensorium) from different angles.
 */

import type { CommandValidator } from '../../../api/command';
import { PerceptionApi } from '../../../api/perception';
import { preloadActorAnatomy } from './preloadActorAnatomy';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const modality = PerceptionApi.modalityByName('verbal-esp');
  if (PerceptionApi.canPerceive(giver, modality)) return undefined;
  return 'You have no way to send a thought.';
};

validator.preload = preloadActorAnatomy;

export default validator;
