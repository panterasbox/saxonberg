/**
 * requiresAuthor — verb-level precondition. Rejects when the giver isn't
 * an author (the `AccessApi.isAuthor` axis — the slice-walk over
 * `Zone.ownerGroup` / `accessGroups` with the `'core'` fallback). Used by
 * `bulletin`, whose effect is publishing to the staff→player broadcast
 * feed (no slice scoping applies — author-or-not).
 *
 * The async preload returns the author-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `allowed`
 * argument. Mirrors `requiresStreamer` / `requiresWizard`.
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
  (context) => AccessApi.isAuthor(context.commandGiver);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
