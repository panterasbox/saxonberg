import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import CartesianZone from '../../idea/location/CartesianZone';
import Location from '../../../lib/location/Location';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

describe('CartesianZone', () => {
  let zone: CartesianZone;
  let center: Location;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    center = makeStuff(() => new Location());
    zone.addLocation(center, 0, 0, 0);
  });

  it('addLocation stamps coordinates and zone backref', () => {
    expect(center.getCoordinates()).toEqual([0, 0, 0]);
    expect(center.getZone()).toBe(zone);
    expect(zone.contains(center)).toBe(true);
  });

  it('getNeighbor returns the location at the offset cell (a geometry query)', () => {
    const a = makeStuff(() => new Location());
    zone.addLocation(a, 1, 0, 0);
    expect(zone.getNeighbor(center, 'east')).toBe(a);
    expect(zone.getNeighbor(center, 'west')).toBeUndefined();
  });

  it('the grid does NOT synthesize exits — a room connects only to what it declares', () => {
    // A neighbour placed one cell north creates NO exit on its own; exits are
    // authored explicitly. `getExit('north')` is undefined until declared.
    const north = makeStuff(() => new Location());
    zone.addLocation(north, 0, 1, 0);
    expect(center.getExit('north')).toBeUndefined();
    expect(center.getObviousExits()).toHaveLength(0);
  });

  it('exposes the load-bearing cellSize default in linear meters', () => {
    // Graduated from informational to load-bearing alongside the biome
    // substrate — 3 m linear (a typical room) replaces the prior 1 m²
    // sentinel. Volume = 27 m³, ceiling = 3 m, light-scale = 9 m².
    expect(zone.getCellSize()).toBe(3.0);
  });
});
