/**
 * mustHoldAppointingAuthority — field-level precondition on the
 * organization an appointment names: the giver must hold **that
 * organization's** appointing authority.
 *
 * ⚠ **A field validator, not a verb-level one**, and the reason is
 * structural rather than stylistic: the authority being checked is a
 * property of an *argument*. `CommandContext` carries the giver but not
 * the bound model, so a `requiresX` verb validator can only ask
 * giver-side questions (`requiresFoundingAuthority`, `requiresGovernor`).
 * The check stays declarative and out of the controller either way — this
 * is the same gate, homed where it can see the thing it gates on.
 *
 * Fails **closed** throughout: an organization that does not resolve, one
 * that is not an organization, and one with no authored authority are all
 * refused. `EmploymentApi.holdsAuthority` supplies the rest of the
 * fail-closed posture (no registry ⇒ no.)
 *
 * ⭐ Holding the authority is the power to **fill** a position, never to
 * exercise one. Nothing that does a position's work may consult this.
 */

import type { FieldValidator } from '../../../api/command';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { EmploymentApi } from '../../../api/employment';

const body: FieldValidator<boolean> = (value, field, _context, allowed) => {
  if (allowed) return undefined;
  return `you don't have the authority to appoint anyone at ${String(
    value ?? `that ${field}`,
  )}`;
};

const preload: NonNullable<FieldValidator<boolean>['preload']> = async (
  value,
  _field,
  context,
) => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (path.length === 0) return false;
  const organization = StuffApi.findByTemplatePath(path);
  if (!organization || !MixinApi.isOrganization(organization)) return false;
  return EmploymentApi.holdsAuthority(
    context.commandGiver,
    organization.getAppointingAuthority(),
  );
};

const validator: FieldValidator<boolean> = Object.assign(body, { preload });

export default validator;
