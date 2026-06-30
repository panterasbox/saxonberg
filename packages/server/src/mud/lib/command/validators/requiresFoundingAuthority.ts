/**
 * requiresFoundingAuthority — the single meta-level governance-root gate.
 *
 * This is deliberately NOT a per-feature "is the founder" role check.
 * Normal in-world authority flows through *offices* (the
 * `requiresGovernor` / `holdsOffice` pattern), and the founder exercises
 * that authority by *holding the seats by default* — never by a parallel
 * founder check sprinkled on individual verbs.
 *
 * The one power that sits *above* the office system is the power to
 * constitute the government itself — to seat and unseat officeholders.
 * At founding that is the founder's pool-of-one authority (draft
 * constitution Art. XI founding transition); the deferred democratic
 * filling process (investiture / election) supersedes it later. That, and
 * only that, is what this validator guards — the `office assign` / `office
 * vacate` subcommands. If you find yourself reaching for it anywhere else,
 * the answer is almost certainly an office check instead.
 *
 * The async preload returns `OfficeApi.isFounder(giver)`; the dispatcher
 * threads it back to the sync body via `allowed`. `context.commandGiver`
 * is framework-stamped (the `gated-api-actor-from-context` rule — the
 * acting principal is derived from execution context, never a parameter).
 * Returns false until the founder has logged in (no matching `User` yet) —
 * appointment is simply inert until then, which is correct.
 */

import type { CommandValidator } from '../../../api/command';
import { OfficeApi } from '../../../api/office';

const validator: CommandValidator<boolean> = (_context, allowed) => {
  if (allowed) return undefined;
  return 'only the founder may seat or unseat officeholders';
};

validator.preload = (context) => OfficeApi.isFounder(context.commandGiver);

export default validator;
