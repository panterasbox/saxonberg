/**
 * requiresArchwizard — verb-level precondition. Rejects when the giver
 * isn't a member of the `'archwizards'` group — the wizard-conferral
 * axis. Used by `wizard grant/revoke`, whose effect is toggling
 * `'wizards'` membership (no slice scoping applies).
 *
 * The async preload returns the archwizard-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `preloaded`
 * argument. Mirrors `requiresWizard` / `requiresStreamer`.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = (context) => AccessApi.isArchwizard(context.commandGiver);

export default validator;
