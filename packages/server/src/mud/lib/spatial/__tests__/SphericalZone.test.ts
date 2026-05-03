import { describe, it, expect, beforeEach } from 'vitest';
import { SphericalZone } from '../SphericalZone';
import { SphericalLocation } from '../SphericalLocation';
import { Exit } from '../Exit';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/test-setup';

describe('SphericalZone', () => {
  let zone: SphericalZone;
  let plaza: SphericalLocation;
  let office: SphericalLocation;

  beforeEach(() => {
    zone = makeStuff(() => new SphericalZone());
    plaza = makeStuff(() => new SphericalLocation());
    plaza.coordinates = [0, 0, 0];
    plaza.radius = 5;
    office = makeStuff(() => new SphericalLocation());
    office.coordinates = [10, 1.23, -2.5];
    office.radius = 2;
    zone.addRoom(plaza);
    zone.addRoom(office);
  });

  it('tracks membership via addRoom', () => {
    expect(zone.contains(plaza)).toBe(true);
    expect(zone.contains(office)).toBe(true);
    expect(plaza.zone).toBe(zone);
  });

  it('deriveExit always returns undefined', () => {
    for (const dir of ['north', 'south', 'east', 'up', 'office', 'out']) {
      expect(zone.deriveExit(plaza, dir)).toBeUndefined();
    }
  });

  it('explicit exits on spherical rooms still work', () => {
    const toOffice = makeStuff(() => new Exit({
      direction: 'office',
      source: plaza,
      destination: office,
    }));
    plaza.addExit(toOffice);
    expect(plaza.getExit('office')).toBe(toOffice);
  });

  it('maintains a debug focus index', () => {
    const key = '10.00,1.23,-2.50';
    expect(zone.focusIndex.get(key)).toBe(office);
  });

  it('removeRoom clears membership and focus index', () => {
    zone.removeRoom(office);
    expect(zone.contains(office)).toBe(false);
    expect(office.zone).toBeNull();
    expect(zone.focusIndex.get('10.00,1.23,-2.50')).toBeUndefined();
  });
});
