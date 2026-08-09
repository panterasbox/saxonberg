import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { Zone } from '../Zone';
import { SpatialZone } from '../SpatialZone';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Bare-Zone tests. After the Phase Z1 refactor, `Zone` carries only the
 * scope identity (a name); spatial behavior lives on `SpatialZone`. This
 * suite proves a non-spatial Zone subclass — the Clade-shaped one used as
 * a fixture below — composes cleanly without inheriting location-aware
 * methods.
 */
class FixtureNonSpatialZone extends Zone {}

describe('Zone (bare scope)', () => {
  it('is constructible as a non-spatial subclass', () => {
    const z = makeStuff(() => new FixtureNonSpatialZone());
    expect(z).toBeInstanceOf(Zone);
  });

  it('does not expose location-aware methods on the bare base', () => {
    const z = makeStuff(() => new FixtureNonSpatialZone()) as unknown as
      Record<string, unknown>;
    expect(z.addLocation).toBeUndefined();
    expect(z.getLocations).toBeUndefined();
    expect(z.removeLocation).toBeUndefined();
    expect(z.contains).toBeUndefined();
    expect(z.deriveExit).toBeUndefined();
    expect(z.hasDerivedAdjacency).toBeUndefined();
  });

  it('carries the name surface from the bare base', () => {
    const z = makeStuff(() => new FixtureNonSpatialZone());
    expect(z.getName()).toBe('');
    z.setName('Animalia');
    expect(z.getName()).toBe('Animalia');
  });

  it('a non-spatial Zone is NOT a SpatialZone', () => {
    const z = makeStuff(() => new FixtureNonSpatialZone());
    expect(z instanceof SpatialZone).toBe(false);
  });
});
