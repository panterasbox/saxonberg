/**
 * requiresFinanceMinister — verb-level precondition for the Treasury's
 * controls. Rejects when the giver does not hold the `minister-of-finance`
 * office — the fiscal axis (economic bootstrap D7). Used by the `treasury`
 * verb (the dashboard, `appropriate`).
 *
 * A sibling of `requiresGovernor`, deliberately a separate validator and
 * a separate seat: the reserve's rows and the treasury's spending are
 * the two levers the requirements keep apart so one can be handed off
 * without the other (independence in code — the Minister of Finance
 * cannot reach `reserve set`, the Governor cannot `appropriate`). At
 * bootstrap the founder holds both by default, so nothing is stricter
 * than before until a seat moves.
 *
 * The async preload returns `CompactApi.holdsOffice(giver,
 * 'minister-of-finance')`; the dispatcher threads it back to the sync body
 * via `allowed`. A generic `requiresOffice(<key>)` would want a
 * parameterized validator the schema does not carry — governance.md's
 * deferred seam, still deferred.
 */

import type { CommandValidator } from '../../../api/command';
import { CompactApi } from '../../../api/compact';

const FINANCE_OFFICE = 'minister-of-finance';

const body: CommandValidator<boolean> = (context, allowed) => {
  if (allowed) return undefined;
  return (
    'you must hold the Minister of Finance office to ' +
    `${context.verb} the Treasury's controls`
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> =
  (context) =>
  CompactApi.holdsOffice(context.commandGiver, FINANCE_OFFICE);
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
