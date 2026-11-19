/**
 * The zone section's frame (navigation-server D7): what kind of frame, its
 * cell where it has one, a label — never an extent or levels.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import CartesianZone from '../location/CartesianZone';
import SphericalZone from '../location/SphericalZone';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

describe('SpatialZone.frameFacts', () => {
  it('a grid says it is one, with its cell', () => {
    const z = makeStuff(() => new CartesianZone());
    const facts = z.frameFacts();
    expect(facts.kind).toBe('grid');
    expect(typeof facts.cellSizeM).toBe('number');
    expect(Object.keys(facts).sort()).toEqual(['cellSizeM', 'kind', 'label']);
  });

  it('a sphere says it is one, with no cell', () => {
    const z = makeStuff(() => new SphericalZone());
    expect(Object.keys(z.frameFacts()).sort()).toEqual(['kind', 'label']);
    expect(z.frameFacts().kind).toBe('sphere');
  });
});
