/**
 * requiresGovernor — verb-level precondition for the central bank's
 * controls. Rejects when the giver does not hold the
 * `central-bank-governor` office — the monetary-authority axis. Used by
 * the `reserve` verb (mint / supply), re-gated from `requiresWizard`
 * (the code-trust axis — the wrong axis: minting money is a monetary act,
 * not a code-authoring one).
 *
 * The founder holds the Governor seat by default, so at founding this is
 * no stricter than before; once the seat is handed off, the holder — not
 * an arbitrary wizard — controls the mint, which is the correct axis.
 *
 * The async preload returns `OfficeApi.holdsOffice(giver,
 * 'central-bank-governor')`; the dispatcher threads it back to the sync
 * body via `allowed`. `context.commandGiver` is framework-stamped (the
 * `gated-api-actor-from-context` rule). Imports `OfficeApi` from
 * `api/office.ts` — no cycle (validator → OfficeApi → OfficeLogic →
 * registry; banking is untouched).
 */

import type { CommandValidator } from '../../../api/command';
import { OfficeApi } from '../../../api/office';

const GOVERNOR_OFFICE = 'central-bank-governor';

const validator: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return (
    'you must hold the Governor of the Central Bank office to ' +
    `${context.verb} the central bank's controls`
  );
};

validator.preload = (context) =>
  OfficeApi.holdsOffice(context.commandGiver, GOVERNOR_OFFICE);

export default validator;
