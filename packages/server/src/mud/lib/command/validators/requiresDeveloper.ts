/**
 * requiresDeveloper — verb-level precondition. Rejects when the giver
 * isn't a member of the `'developers'` group — the orthogonal
 * TS-escape axis. Used by `eval` and `reload`, whose effect is
 * raw TS execution and module reload (no slice scoping applies).
 *
 * Async preload populates a per-context cache; the sync validator body
 * reads the decision.
 */

import type { CommandContext, CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const decisions = new WeakMap<CommandContext, boolean>();

const validator: CommandValidator = (context) => {
  const allowed = decisions.get(context);
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = async (context) => {
  decisions.set(
    context,
    await AccessApi.isDeveloper(context.commandGiver),
  );
};

export default validator;
