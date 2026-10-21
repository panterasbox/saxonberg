/**
 * ⭐ Work below the waterline (underwater D17): an `identity`-bound item —
 * THIS body, by who it was.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Condition } from '../Condition';
import type { Stuff } from '../../stuff/Stuff';

describe('the identity ref (D17)', () => {
  it('⭐ validates: an identity names one thing', () => {
    expect(Condition.validate({ template: 'delivery', item: { kind: 'identity', identityPath: '/a/body' }, destinationPath: '/x' })).toBeNull();
    expect(Condition.validate({ template: 'delivery', item: { kind: 'identity', identityPath: '' }, destinationPath: '/x' })).toMatch(/identity/);
    expect(Condition.validate({ template: 'supply', count: 2, item: { kind: 'identity', identityPath: '/a' }, destinationPath: '/x' })).toMatch(/KIND/);
  });

  it('⭐ an identity-bound delivery matches THAT body and no other of its kind', () => {
    const c = new Condition({ template: 'delivery', item: { kind: 'identity', identityPath: '/corpse/ann' }, destinationPath: '/x' });
    const ann = { getIdentityPath: () => '/corpse/ann', getTemplatePath: () => '/platform/thing/Corpse' } as unknown as Stuff;
    const bob = { getIdentityPath: () => '/corpse/bob', getTemplatePath: () => '/platform/thing/Corpse' } as unknown as Stuff;
    expect(c.matchesItem(ann)).toBe(true);
    expect(c.matchesItem(bob)).toBe(false);
  });
});
