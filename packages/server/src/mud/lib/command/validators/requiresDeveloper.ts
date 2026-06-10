/**
 * requiresDeveloper — verb-level precondition. Rejects when the giver
 * isn't a member of the `'developers'` group — the orthogonal
 * TS-escape axis. Used by `eval` and `reload`, whose effect is
 * raw TS execution and module reload (no slice scoping applies).
 *
 * The async preload returns the developer-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `preloaded`
 * argument.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = (context) => AccessApi.isDeveloper(context.commandGiver);

export default validator;
