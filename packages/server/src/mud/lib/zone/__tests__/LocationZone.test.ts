import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialZone } from '../SpatialZone';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import SphericalZone from '../../../platform/idea/location/SphericalZone';
import CartesianLocation from '../../location/CartesianLocation';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, seedKernelContentStore } from '../../security/__tests__/test-setup';

/**
 * The frame split (maritime A0): a SpatialZone is a REGION; holding rooms
 * is `LocationZoneMixin`'s, composed by the two room zones and by nothing
 * else. A frame that holds no rooms inherits no room surface.
 */
class FixtureFrame extends SpatialZone {}

describe('LocationZoneMixin', () => {
  beforeEach(() => {
    seedKernelContentStore();
    StuffApi.clearAll();
  });

  it('the room zones compose it; a bare frame does not', () => {
    expect(MixinApi.isLocationZone(makeStuff(() => new CartesianZone()))).toBe(true);
    expect(MixinApi.isLocationZone(makeStuff(() => new SphericalZone()))).toBe(true);
    const frame = makeStuff(() => new FixtureFrame());
    expect(MixinApi.isLocationZone(frame)).toBe(false);
    const raw = frame as unknown as Record<string, unknown>;
    expect(raw.addLocation).toBeUndefined();
    expect(raw.getLocations).toBeUndefined();
  });

  it('a frame still carries the region fields, landmarks included', () => {
    const frame = makeStuff(() => new FixtureFrame());
    frame.setVisibleLandmarks(['/test/x/tower']);
    expect(frame.getVisibleLandmarks()).toEqual(['/test/x/tower']);
    frame.setVisibleLandmarks([]);
    expect(frame.getVisibleLandmarks()).toEqual([]);
  });

  it('addLocation still stamps the back-reference through the gate', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 1, 2, 0);
    expect(room.getZone()).toBe(zone);
    expect(zone.contains(room)).toBe(true);
    expect(zone.canDestruct().ok).toBe(false);
    zone.removeLocation(room);
    expect(room.getZone()).toBeNull();
    expect(zone.canDestruct().ok).toBe(true);
  });
});
