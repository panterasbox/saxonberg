import { describe, it, expect, afterEach } from 'vitest';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';
import { CartesianZone } from '../../lib/spatial/CartesianZone';
import { SphericalLocation } from '../../lib/spatial/SphericalLocation';
import { SphericalZone } from '../../lib/spatial/SphericalZone';
import { LocationApi } from '../location';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('LocationApi — geometry-agnostic wrappers', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Cartesian room volume + ceiling read through the Api', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    Stuff._stampZone(room, zone);

    expect(LocationApi.getVolume(room)!.rawValue()).toBe(27);
    expect(LocationApi.getCeilingHeight(room)!.rawValue()).toBe(3);
  });

  it('Spherical room volume + ceiling read through the Api', () => {
    const zone = makeStuff(() => new SphericalZone());
    const room = makeStuff(() => new SphericalLocation());
    Stuff._stampZone(room, zone);
    room.setRadius(2);

    expect(LocationApi.getVolume(room)!.rawValue()).toBeCloseTo(
      (4 / 3) * Math.PI * 8,
      5,
    );
    expect(LocationApi.getCeilingHeight(room)!.rawValue()).toBeCloseTo(
      4 / Math.sqrt(3),
      5,
    );
  });
});
