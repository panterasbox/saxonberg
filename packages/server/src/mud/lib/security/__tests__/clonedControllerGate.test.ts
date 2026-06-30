/**
 * Ground-truth for the narrow-entry gate on clone-per-execution
 * controllers. Controllers are cloned from `/obj/command/<name>` per
 * dispatch (`CommandGiver._executeOne`), so the running controller is a
 * Stuff whose `templatePath` is set at clone time. `resolveCallerPath`
 * reads `getTemplatePath()` FIRST, so such a caller resolves to its
 * template path (`/obj/command/...`), not its module id — and
 * `FromModule` explicitly rejects `/`-prefixed paths. The correct gate
 * for a cloned controller is therefore `FromTemplate` on the template
 * path (or an `AnyOf` including it), not `FromModule` on the module id.
 */

import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';

const TEMPLATE_PATH = '/obj/command/governance/OfficeController';
const MODULE_ID = 'mud/obj/command/governance/OfficeController';

/** A stand-in for the cloned controller caller the gate actually sees. */
const clonedController = {
  getTemplatePath: () => TEMPLATE_PATH,
} as unknown;

describe('narrow-entry gate on a cloned controller', () => {
  it('FromModule(module-id) does NOT match a cloned-controller caller', () => {
    const p = SecurityPolicies.FromModule(MODULE_ID);
    expect(p.allows(clonedController as never, null as never, 'assign' as never)).toBe(
      false,
    );
  });

  it('FromTemplate(template-path) matches the cloned-controller caller', () => {
    const p = SecurityPolicies.FromTemplate(TEMPLATE_PATH);
    expect(p.allows(clonedController as never, null as never, 'assign' as never)).toBe(
      true,
    );
  });

  it('AnyOf(FromModule, FromTemplate) admits the cloned controller', () => {
    const p = SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule(MODULE_ID),
      SecurityPolicies.FromTemplate(TEMPLATE_PATH),
    );
    expect(p.allows(clonedController as never, null as never, 'assign' as never)).toBe(
      true,
    );
    // An unrelated caller is still denied.
    const stranger = { getTemplatePath: () => '/obj/command/social/GroupController' };
    expect(p.allows(stranger as never, null as never, 'assign' as never)).toBe(false);
  });
});
