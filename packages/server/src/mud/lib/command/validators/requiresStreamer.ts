/**
 * requiresStreamer — verb-level precondition. Rejects when the giver
 * isn't a member of the `'streamers'` group — the orthogonal
 * livestream-control axis. Used by `stream`, whose effect is mutating
 * the broadcast overlay state (no slice scoping applies).
 *
 * The async preload returns the streamer-axis boolean directly; the
 * dispatcher threads it back to the sync body via the `preloaded`
 * argument. Mirrors `requiresDeveloper`.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return `you don't have permission to ${context.verb}`;
};

validator.preload = (context) => AccessApi.isStreamer(context.commandGiver);

export default validator;
