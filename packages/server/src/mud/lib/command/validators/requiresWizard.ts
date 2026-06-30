/**
 * requiresWizard — verb-level precondition. Rejects when the giver
 * isn't a member of the `'wizards'` group — the orthogonal code-trust
 * (TS-escape) axis. Used by `eval`, `reload`, and the rest of the
 * code-doors, whose effect is raw TS execution / module reload (no
 * slice scoping applies). A non-wizard content author is a
 * "protowizard": content-write access without code trust.
 *
 * The async preload returns the wizard-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `preloaded`
 * argument.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = (context) => AccessApi.isWizard(context.commandGiver);

export default validator;
