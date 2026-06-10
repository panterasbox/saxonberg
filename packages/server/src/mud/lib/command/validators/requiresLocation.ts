/**
 * requiresLocation — verb-level precondition. Rejects the command when
 * the giver has no location (`ctx.location` is null).
 *
 * Location is optional context at dispatch (an incorporeal `Login`, or
 * an embodied giver glitched into nowhere, both dispatch with a null
 * location — so recovery/meta verbs like `help` and `recall` keep
 * working). Verbs whose semantics genuinely require a surrounding
 * Container to act on — `look`, `get`, `drop`, the sense verbs, etc. —
 * tag this validator so they reject cleanly ("you're nowhere") instead
 * of dereferencing null. The rejection doubles as wayfinding.
 *
 * This is the single home of the "you're nowhere" message; tagged
 * controllers can then treat `ctx.location` as present.
 */

import type { CommandValidator } from '../../../api/command';
import { DescribeApi } from '../../../api/describe';

const validator: CommandValidator = (context) => {
  if (context.location) return undefined;
  const name = DescribeApi.getDisplayName(context.commandGiver);
  return `${name} is nowhere in particular — there's nothing here to do that with. Try 'recall' to return somewhere, or 'help'.`;
};

export default validator;
