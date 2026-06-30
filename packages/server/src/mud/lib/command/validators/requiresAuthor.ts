/**
 * requiresAuthor — verb-level precondition. Rejects when the giver isn't
 * an author (the `AccessApi.isAuthor` axis — the slice-walk over
 * `Zone.ownerGroup` / `accessGroups` with the `'core'` fallback). Used by
 * `announce`, whose effect is publishing to the staff→player broadcast
 * feed (no slice scoping applies — author-or-not).
 *
 * The async preload returns the author-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `allowed`
 * argument. Mirrors `requiresStreamer` / `requiresDeveloper`.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = (context) => AccessApi.isAuthor(context.commandGiver);

export default validator;
