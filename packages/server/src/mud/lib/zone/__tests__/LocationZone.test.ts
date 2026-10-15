import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('a frame still carries the region fields — a horizon names zones; the frame has no extent', () => {
    const frame = makeStuff(() => new FixtureFrame());
    frame.setHorizon(['/test/x']);
    expect(frame.getHorizon()).toEqual(['/test/x']);
    frame.setHorizon([]);
    expect(frame.getHorizon()).toEqual([]);
    expect(frame.getExtentM()).toBeNull();
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

describe('⭐ what a place can see loads with the place (maritime review, 2026-10-14)', () => {
  beforeEach(() => {
    seedKernelContentStore();
    StuffApi.clearAll();
  });

  it('a zone that gets a room stands up what its horizon names, once — and a zone only SEEN never looks out', async () => {
    const seen = makeStuff(() => new CartesianZone());
    seen.setHorizon(['/test/beyond']);
    const here = makeStuff(() => new CartesianZone());
    here.setHorizon(['/test/seen']);
    const stood: string[] = [];
    const spy = vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      stood.push(p);
      return (p === '/test/seen' ? seen : here) as never;
    });
    here.addLocation(makeStuff(() => new CartesianLocation()), 0, 0, 0);
    here.addLocation(makeStuff(() => new CartesianLocation()), 1, 0, 0);
    await Promise.resolve();
    // Once per target, however many rooms; never what the SEEN zone sees.
    expect(stood).toEqual(['/test/seen']);
    spy.mockRestore();
  });

  it('nothing named, nothing stood up', () => {
    const here = makeStuff(() => new CartesianZone());
    const spy = vi.spyOn(StuffApi, 'singleton');
    here.addLocation(makeStuff(() => new CartesianLocation()), 0, 0, 0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
