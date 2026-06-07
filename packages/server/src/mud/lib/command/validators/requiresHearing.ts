/**
 * requiresHearing — verb-level precondition. Rejects `listen` when
 * the giver's sensorium has no hearing channel.
 *
 * Mirrors `requiresSmell` / `requiresTouch` / `requiresTaste` —
 * each gates one of the four contact-family single-sense verbs on
 * the giver's `BodyPlan.getModalities()` derived via
 * `deriveSensorium`. Failure returns a polite refusal string; the
 * dispatcher routes that through the standard validator-failed
 * prose path (`system.command.error`).
 *
 * No async preload — `deriveSensorium` reads cached `_speciesPath`
 * resolution; the species preload that `requiresAnimate` performs
 * is implicit (a Perceiver issuing `listen` against the world has
 * already passed the substrate's standard species-resolution
 * machinery).
 */

import type { CommandValidator } from '../../../api/command';
import { deriveSensorium } from '../../species/BodyPlan';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (deriveSensorium(giver).includes('hearing')) return undefined;
  return "You can't hear.";
};

export default validator;
