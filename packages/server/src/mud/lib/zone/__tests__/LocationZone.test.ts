import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpatialZone } from '../SpatialZone';
import CartesianZone from '../../../platform/idea/place/CartesianZone';
import SphericalZone from '../../../platform/idea/place/SphericalZone';
import Location from '../../place/Location';
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

  it('a frame still carries the region fields — a horizon override; the frame has no extent', () => {
    const frame = makeStuff(() => new FixtureFrame());
    frame.setHorizon({ reach: ['/test/x'] });
    expect(frame.getHorizon()?.reach).toEqual(['/test/x']);
    frame.setHorizon({ block: 'all' });
    expect(frame.getHorizon()?.blockAll).toBe(true);
    // ⚠ The retired list-of-zones form throws (geography D5).
    expect(() => frame.setHorizon(['/test/x'] as never)).toThrow(RangeError);
    expect(frame.getExtentM()).toBeNull();
  });

  it('addLocation still stamps the back-reference through the gate', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new Location());
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

  it('a zone that gets a room stands up what its horizon reaches — and a zone only SEEN never looks out', async () => {
    const seen = makeStuff(() => new CartesianZone());
    seen.setHorizon({ reach: ['/test/beyond'] });
    const here = makeStuff(() => new CartesianZone());
    here.setHorizon({ reach: ['/test/seen'] });
    const stood: string[] = [];
    const spy = vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      stood.push(p);
      return (p === '/test/seen' ? seen : here) as never;
    });
    here.addLocation(makeStuff(() => new Location()), 0, 0, 0);
    here.addLocation(makeStuff(() => new Location()), 1, 0, 0);
    // Kicked, not awaited: wait for it to land.
    await vi.waitFor(() => expect(stood).toContain('/test/seen'));
    await new Promise((r) => setTimeout(r, 50));
    // What the rooms' horizon reaches, and never what the SEEN zone sees.
    expect(new Set(stood)).toEqual(new Set(['/test/seen']));
    spy.mockRestore();
  });

  it('nothing named and on no chart, nothing stood up', async () => {
    const here = makeStuff(() => new CartesianZone());
    const spy = vi.spyOn(StuffApi, 'singleton');
    here.addLocation(makeStuff(() => new Location()), 0, 0, 0);
    await new Promise((r) => setTimeout(r, 100));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
