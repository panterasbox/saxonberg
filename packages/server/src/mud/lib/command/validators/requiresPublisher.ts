/**
 * requiresPublisher — verb-level precondition for the `press` verb.
 * Rejects when the giver holds **no publishing position anywhere**.
 *
 * ## Why this exists at all
 *
 * ⚠ It replaced the retired `requiresAuthor`, and the swap was the fix
 * for a real break rather than a tidy-up: the author tier was membership
 * of a group that seeded EMPTY, so on a fresh box *nobody* was an author,
 * the founder included, and the shipped gate refused the founder the verb
 * outright. There is no author tier any more (content-packs wave 3):
 * capability is title over a resource, and publishing is a position.
 *
 * The affordance was never the barrier — `AuthorMixin` rides
 * `ShelledCharacter`, so every Avatar already carries the verb
 * contribution. The **validator** was.
 *
 * ## Why it is not the banned helper
 *
 * The preload answers *does the giver hold **any** publishing position?* —
 * a boolean, for affordance. ⚠ It **selects nothing**, which is precisely
 * what keeps it from being the pick-a-publisher shape the requirements
 * ban: that shape turns a refusal ("you hold no publishing position") into
 * a downgrade ("...so here is the one you do hold"). The per-publisher
 * `mayPublishAs` check inside `PressApi.publish` stays authoritative, and
 * this gate can only ever be coarser than it.
 *
 * (`requiresAuthor` is gone; `press` holds no other gate.)
 */

import type { CommandValidator } from '../../../api/command';
import { PressApi } from '../../../api/press';

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the whole
// thing a pure declaration (no free-standing module-scope statement).
const body: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return (
    `you hold no publishing position, so there is nobody you can ` +
    `${context.verb} as`
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> = async (
  context,
) => PressApi.holdsAnyPublishingPosition(context.commandGiver);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
