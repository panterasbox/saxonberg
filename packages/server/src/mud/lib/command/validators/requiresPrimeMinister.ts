/**
 * requiresPrimeMinister — verb-level precondition for the chief
 * executive's acts. Rejects when the giver does not hold the
 * `prime-minister` office. Used by `config`, the world's Tier B knob board
 * (wizard-axis D12): setting an ordinary key is not authoring TypeScript,
 * so it is the executive's, not a wizard's — and Tier C keys are refused
 * inside `config` and set through their own seat's verb.
 *
 * The founder holds the Prime Minister's seat by default, so at founding
 * this is no stricter than before; once the seat is handed off, the holder
 * — not an arbitrary wizard — sets the dials.
 *
 * ⚠ The third hand-written office twin (after `requiresGovernor` and
 * `requiresFinanceMinister`) — governance.md's signal to parameterize one
 * `requiresOffice(<key>)`, which wants a view schema that can carry the
 * office key. Same split-declaration shape as its twins.
 */

import type { CommandValidator } from '../../../api/command';
import { CompactApi } from '../../../api/compact';

const PRIME_MINISTER = 'prime-minister';

const body: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return (
    "you must hold the Prime Minister's office to " +
    `${context.verb} the world's settings`
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> =
  (context) =>
  CompactApi.holdsOffice(context.commandGiver, PRIME_MINISTER);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
