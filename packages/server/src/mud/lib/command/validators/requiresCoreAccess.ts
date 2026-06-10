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
 * Async work — the actual `AccessApi.can` call — lives in `preload`;
 * the sync body reads the precomputed decision from a per-context
 * cache keyed by validator+context, following the
 * sync-validator-with-async-preload pattern documented on
 * `CommandValidator`.
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
  const allowed = await AccessApi.can(context.commandGiver, context.verb, null);
  decisions.set(context, allowed);
};

export default validator;
