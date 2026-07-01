/**
 * Narrow-entry gates on clone-per-execution controllers.
 *
 * Controllers are cloned from `/obj/command/<name>` per dispatch
 * (`CommandGiver._executeOne`), so the running caller is a Stuff that has
 * BOTH a clone template path (set at clone time) AND a stamped class
 * module id. With per-identity resolution, `FromModule` matches such a
 * caller by its **class module id** (code provenance) — so a single
 * `FromModule('/obj/command/<name>')` admits the cloned controller
 * directly, no `FromTemplate` arm needed. `FromModule` and `FromTemplate`
 * read *different* identities, which stays meaningful when a class is
 * cloned into a foreign template.
 *
 * (This is the design that retired the original bug, where a single
 * template-first caller string + a slash discriminator made `FromModule`
 * miss the cloned controller entirely.)
 */

import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';
import { ModuleApi } from '../../../api/module';

const CTRL = '/obj/command/governance/OfficeController';

/** A clone-per-execution controller: instance of a stamped class that
 *  also carries a clone template path. */
function makeClonedController(moduleId: string, templatePath: string): unknown {
  const Ctor = class {};
  ModuleApi._stampForTest(Ctor, moduleId);
  return Object.assign(new Ctor(), { getTemplatePath: () => templatePath });
}

describe('narrow-entry gate on a cloned controller', () => {
  it('FromModule admits the cloned controller by its class module id', () => {
    const cloned = makeClonedController(CTRL, CTRL);
    expect(
      SecurityPolicies.FromModule(CTRL).allows(cloned as never, null as never, 'assign' as never),
    ).toBe(true);
  });

  it('FromModule denies an unrelated controller', () => {
    const other = makeClonedController(
      '/obj/command/social/GroupController',
      '/obj/command/social/GroupController',
    );
    expect(
      SecurityPolicies.FromModule(CTRL).allows(other as never, null as never, 'assign' as never),
    ).toBe(false);
  });

  it('multi-controller AnyOf (forceMove shape) admits each cloned controller, denies others', () => {
    const teleport = makeClonedController(
      '/obj/command/author/TeleportController',
      '/obj/command/author/TeleportController',
    );
    const goto = makeClonedController(
      '/obj/command/author/GotoController',
      '/obj/command/author/GotoController',
    );
    const stranger = makeClonedController(
      '/obj/command/author/DestructController',
      '/obj/command/author/DestructController',
    );
    const gate = SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('/obj/command/author/TeleportController'),
      SecurityPolicies.FromModule('/obj/command/author/GotoController'),
    );
    expect(gate.allows(teleport as never, null as never, 'forceMove' as never)).toBe(true);
    expect(gate.allows(goto as never, null as never, 'forceMove' as never)).toBe(true);
    expect(gate.allows(stranger as never, null as never, 'forceMove' as never)).toBe(false);
  });

  it('FromModule (provenance) and FromTemplate (lineage) read different identities', () => {
    // A class from module /obj/A cloned into a foreign template /obj/B.
    const inst = makeClonedController('/obj/A', '/obj/B');
    // FromModule matches by code provenance (A), not lineage (B).
    expect(SecurityPolicies.FromModule('/obj/A').allows(inst as never, null as never, 'm' as never)).toBe(true);
    expect(SecurityPolicies.FromModule('/obj/B').allows(inst as never, null as never, 'm' as never)).toBe(false);
    // FromTemplate matches by clone lineage (B), not provenance (A).
    expect(SecurityPolicies.FromTemplate('/obj/B').allows(inst as never, null as never, 'm' as never)).toBe(true);
    expect(SecurityPolicies.FromTemplate('/obj/A').allows(inst as never, null as never, 'm' as never)).toBe(false);
  });
});
