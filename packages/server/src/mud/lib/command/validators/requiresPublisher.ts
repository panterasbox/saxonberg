/**
 * requiresPublisher — verb-level precondition for the `press` verb.
 * Rejects when the giver holds **no publishing position anywhere**.
 *
 * ## Why this exists at all
 *
 * ⚠ It replaces `requiresAuthor`, and the swap is the fix for a real
 * break rather than a tidy-up. `AccessApi.isAuthor` is membership of the
 * `core` group — **which `seedCoreGroup()` creates EMPTY**. `WIZARD_PLAYER_IDS`
 * seeds `wizards`, not `core`, and the only code path that adds anyone is a
 * dev/test provisioning helper. So on a fresh box *nobody* is an author,
 * the founder included, and the shipped gate refused the founder the verb
 * outright.
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
 * `requiresAuthor` itself is untouched and keeps its other consumers.
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
