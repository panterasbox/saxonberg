import { describe, it, expect, beforeEach } from 'vitest';
import SphericalZone from '../SphericalZone';
import SphericalLocation from '../SphericalLocation';
import Exit from '../../boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('SphericalZone', () => {
  let zone: SphericalZone;
  let plaza: SphericalLocation;
  let office: SphericalLocation;

  beforeEach(() => {
    zone = makeStuff(() => new SphericalZone());
    plaza = makeStuff(() => new SphericalLocation());
    plaza.setCoordinates([0, 0, 0]);
    plaza.setRadius(5);
    office = makeStuff(() => new SphericalLocation());
    office.setCoordinates([10, 1.23, -2.5]);
    office.setRadius(2);
    zone.addLocation(plaza);
    zone.addLocation(office);
  });

  it('tracks membership via addLocation', () => {
    expect(zone.contains(plaza)).toBe(true);
    expect(zone.contains(office)).toBe(true);
    expect(plaza.getZone()).toBe(zone);
  });

  it('deriveExit always returns undefined', () => {
    for (const dir of ['north', 'south', 'east', 'up', 'office', 'out']) {
      expect(zone.deriveExit(plaza, dir)).toBeUndefined();
    }
  });

  it('explicit exits on spherical locations still work', async () => {
    const toOffice = makeStuff(() => new Exit({
      direction: 'office',
      source: plaza,
      destination: office,
    }));
    await plaza.addExit(toOffice);
    expect(plaza.getExit('office')).toBe(toOffice);
  });

  it('maintains a debug focus index', () => {
    const key = '10.00,1.23,-2.50';
    expect(zone.getFocusIndex().get(key)).toBe(office);
  });

  it('removeLocation clears membership and focus index', () => {
    zone.removeLocation(office);
    expect(zone.contains(office)).toBe(false);
    expect(office.getZone()).toBeNull();
    expect(zone.getFocusIndex().get('10.00,1.23,-2.50')).toBeUndefined();
  });
});
