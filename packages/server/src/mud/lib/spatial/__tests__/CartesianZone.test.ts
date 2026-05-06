import { describe, it, expect, beforeEach } from 'vitest';
import { CartesianZone } from '../CartesianZone';
import { CartesianLocation } from '../CartesianLocation';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('CartesianZone', () => {
  let zone: CartesianZone;
  let center: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    center = makeStuff(() => new CartesianLocation());
    zone.addLocation(center, 0, 0, 0);
  });

  it('addLocation stamps coordinates and zone backref', () => {
    expect(center.getCoordinates()).toEqual([0, 0, 0]);
    expect(center.getZone()).toBe(zone);
    expect(zone.contains(center)).toBe(true);
  });

  it('derives each of the 10 cardinal directions from a center location', () => {
    const dirs: Array<[string, number, number, number]> = [
      ['north', 0, 1, 0],
      ['south', 0, -1, 0],
      ['east', 1, 0, 0],
      ['west', -1, 0, 0],
      ['northeast', 1, 1, 0],
      ['northwest', -1, 1, 0],
      ['southeast', 1, -1, 0],
      ['southwest', -1, -1, 0],
      ['up', 0, 0, 1],
      ['down', 0, 0, -1],
    ];

    const neighbors: Record<string, CartesianLocation> = {};
    for (const [dir, x, y, z] of dirs) {
      const location = makeStuff(() => new CartesianLocation());
      zone.addLocation(location, x, y, z);
      neighbors[dir] = location;
    }

    for (const [dir] of dirs) {
      const exit = zone.deriveExit(center, dir);
      expect(exit).toBeDefined();
      expect(exit!.getDirection()).toBe(dir);
      expect(exit!.getSource()).toBe(center);
      expect(exit!.getDestination()).toBe(neighbors[dir]);
    }
  });

  it('direction aliases resolve via normalizeDirection', () => {
    const north = makeStuff(() => new CartesianLocation());
    zone.addLocation(north, 0, 1, 0);

    const viaAlias = zone.deriveExit(center, 'n');
    const viaLong = zone.deriveExit(center, 'north');
    expect(viaAlias).toBeDefined();
    expect(viaAlias).toBe(viaLong);
  });

  it('out-of-grid direction returns undefined', () => {
    expect(zone.deriveExit(center, 'north')).toBeUndefined();
  });

  it('non-cardinal direction returns undefined', () => {
    expect(zone.deriveExit(center, 'office')).toBeUndefined();
  });

  it('source not in zone returns undefined', () => {
    const orphan = makeStuff(() => new CartesianLocation());
    expect(zone.deriveExit(orphan, 'north')).toBeUndefined();
  });

  it('caches derived exits across calls', () => {
    const north = makeStuff(() => new CartesianLocation());
    zone.addLocation(north, 0, 1, 0);

    const first = zone.deriveExit(center, 'north');
    const second = zone.deriveExit(center, 'north');
    expect(first).toBe(second);
  });

  it('invalidates cache on addLocation', () => {
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 1, 0);
    const cachedA = zone.deriveExit(center, 'north');

    // Replace the neighbor cell with a new location.
    zone.removeLocation(a);
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(b, 0, 1, 0);

    const fresh = zone.deriveExit(center, 'north');
    expect(fresh).not.toBe(cachedA);
    expect(fresh!.getDestination()).toBe(b);
  });

  it('invalidates cache on removeLocation', () => {
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 1, 0);
    expect(zone.deriveExit(center, 'north')).toBeDefined();

    zone.removeLocation(a);
    expect(zone.deriveExit(center, 'north')).toBeUndefined();
  });

  it('getNeighbor returns the location at the offset cell', () => {
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 1, 0, 0);
    expect(zone.getNeighbor(center, 'east')).toBe(a);
    expect(zone.getNeighbor(center, 'west')).toBeUndefined();
  });

  it('exposes the informational cellSize default', () => {
    expect(zone.getCellSize()).toBe(1.0);
  });
});
