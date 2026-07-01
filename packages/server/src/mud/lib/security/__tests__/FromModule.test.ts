/**
 * End-to-end tests for `FromModule` and `FromTemplate` policies, plus
 * `ApiOnly` (which is sugar for `FromModule('api/**')`). These
 * lean on the Vite plugin actually stamping every `mud/**` module —
 * if stamping ever breaks, this file is the canary.
 */

import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';
import { ModuleApi } from '../../../api/module';
import { StuffApi } from '../../../api/stuff';
import Thing from '../../stuff/Thing';
import { ContainmentApi } from '../../../api/containment';

describe('FromModule (real, plugin-stamped)', () => {
  it('stamps Api classes under mud/api/**', () => {
    expect(ModuleApi.lookup(StuffApi)).toBe('api/stuff#StuffApi');
    expect(ModuleApi.lookup(ContainmentApi)).toBe(
      'api/containment#ContainmentApi'
    );
  });

  it('stamps Stuff classes under mud/lib/stuff/**', () => {
    // Thing now follows the template-backing-class default-export
    // convention — bare-path module id.
    expect(ModuleApi.lookup(Thing)).toBe('lib/stuff/Thing');
  });

  it('matches a stamped class against its module-id glob', () => {
    const policy = SecurityPolicies.FromModule('api/**');
    expect(policy.allows(StuffApi, null, 'm')).toBe(true);
    expect(policy.allows(Thing, null, 'm')).toBe(false);
  });

  it('matches an instance via its class identity', () => {
    const t = new (class FakeApi {})();
    const policy = SecurityPolicies.FromModule('api/**');
    // An anonymous test class has no stamp → fail closed.
    expect(policy.allows(t, null, 'm')).toBe(false);
  });

  it('includeSubclasses walks the prototype chain', () => {
    class StuffSub extends Thing {}
    // StuffSub itself is not stamped (it lives only in this test).
    // With includeSubclasses, the matcher walks up to Thing, which
    // IS stamped, and matches.
    const sub = Object.create(StuffSub.prototype);
    const direct = SecurityPolicies.FromModule('lib/stuff/Thing');
    const recursive = SecurityPolicies.FromModule(
      'lib/stuff/Thing',
      { includeSubclasses: true }
    );
    expect(direct.allows(sub, null, 'm')).toBe(false);
    expect(recursive.allows(sub, null, 'm')).toBe(true);
  });
});

describe('FromTemplate (real, set at clone time)', () => {
  // Without a live MongoDB the clone path doesn't exercise; we
  // simulate the post-clone state by stamping templatePath manually.
  it('matches an instance whose templatePath matches the glob', () => {
    // Post-lockdown: templatePath is hard-private. Stand-in callers
    // must expose the path via `getTemplatePath()`, the inter-Stuff
    // contract shape resolveCallerPath uses.
    const fake = {
      getTemplatePath: () => '/domain/narnia/cair-paravel',
    };
    const policy = SecurityPolicies.FromTemplate('/domain/narnia/**');
    expect(policy.allows(fake, null, 'm')).toBe(true);
  });

  it('denies when templatePath is missing', () => {
    const policy = SecurityPolicies.FromTemplate('/domain/narnia/**');
    expect(policy.allows({}, null, 'm')).toBe(false);
  });

  it('denies when templatePath does not match', () => {
    const fake = {
      getTemplatePath: () => '/domain/other/place',
    };
    const policy = SecurityPolicies.FromTemplate('/domain/narnia/**');
    expect(policy.allows(fake, null, 'm')).toBe(false);
  });
});

describe('ApiOnly (FromModule sugar)', () => {
  it('allows the Api class itself as caller', () => {
    expect(SecurityPolicies.ApiOnly.allows(StuffApi, null, 'destroy')).toBe(true);
  });

  it('denies a non-Api class caller', () => {
    expect(SecurityPolicies.ApiOnly.allows(Thing, null, 'destroy')).toBe(false);
  });

  it('denies null caller (system root must use SystemRoot policy)', () => {
    expect(SecurityPolicies.ApiOnly.allows(null, null, 'destroy')).toBe(false);
  });
});
