/**
 * requiresCoreAccess — verb-level precondition. Rejects when the giver
 * doesn't have permission to perform the verb against the global
 * (null) resource — i.e., the slice walk falls through to the
 * universal `'core'` group.
 *
 * Used by global verbs whose action isn't slice-targeted: `soul`
 * (emote catalog authoring), `broadcast` (one-to-many ESP). Action
 * string is `context.verb` — so the same validator covers every
 * verb of this shape.
 *
 * The decision itself is async (`AccessApi.can` walks the zone tree
 * and consults `GroupApi`). The `preload` hook returns the boolean
 * decision; the dispatcher passes it back to the sync body as the
 * `preloaded` argument. No module-level state and no manual
 * bookkeeping.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the
// whole thing a pure declaration (no free-standing module-scope
// statement). The preload rides the validator function as a
// property, same shape as before.
const body: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};
const preload: NonNullable<CommandValidator<boolean>['preload']> =
  (context) =>
  AccessApi.can(context.commandGiver, context.verb, null);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
