/**
 * requiresStreamer — verb-level precondition. Rejects when the giver
 * isn't a member of the `'streamers'` group — the orthogonal
 * livestream-control axis. Used by `stream`, whose effect is mutating
 * the broadcast overlay state (no slice scoping applies).
 *
 * The async preload returns the streamer-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `preloaded`
 * argument. Mirrors `requiresWizard`.
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
  (context) => AccessApi.isStreamer(context.commandGiver);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
