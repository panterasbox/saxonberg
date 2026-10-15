import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../Location';
import { Idea } from '../Idea';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { SpatialZone } from '../../zone/SpatialZone';
import Structure from '../../../platform/idea/Structure';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class TestZone extends SpatialZone {}

/**
 * ⭐ `stands:` — what loads with a place that it does not CONTAIN (the
 * scan sweep, 2026-10-14). A room names its house, a zone its tower; one
 * list on any place, kicked, never awaited.
 */
describe('SiteMixin', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('every location and every spatial zone is a site', () => {
    expect(MixinApi.isSite(makeStuffAtPath(() => new Location(), '/t/room'))).toBe(true);
    expect(MixinApi.isSite(makeStuffAtPath(() => new TestZone(), '/t'))).toBe(true);
  });

  it('a room stands its house up; standing() reads it once it is up', async () => {
    const room = makeStuffAtPath(() => new Location(), '/t/room');
    expect(room.standing()).toEqual([]);
    const house = makeStuffAtPath(() => new Idea(), '/t/idea/house');
    const single = vi.spyOn(StuffApi, 'singleton');
    await room.applyStands(['/t/idea/house']);
    await room.standsLoaded();
    expect(single).toHaveBeenCalledWith('/t/idea/house');
    expect(room.standing()).toEqual([house]);
    expect(room.standsPaths()).toEqual(['/t/idea/house']);
  });

  it('a path that does not stand up warns, and the rest still load', async () => {
    const room = makeStuffAtPath(() => new Location(), '/t/room');
    const ok = makeStuffAtPath(() => new Idea(), '/t/idea/ok');
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      if (p === '/t/idea/bad') throw new Error('no row');
      return ok;
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await room.applyStands(['/t/idea/bad', '/t/idea/ok']);
    await room.standsLoaded();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(room.standing()).toEqual([ok]);
  });

  it('⭐ kicked, not awaited: applyStands returns before the load does', async () => {
    const room = makeStuffAtPath(() => new Location(), '/t/room');
    let release!: () => void;
    vi.spyOn(StuffApi, 'singleton').mockImplementation(
      () => new Promise((r) => { release = () => r(makeStuffAtPath(() => new Idea(), '/t/idea/slow')); }),
    );
    await room.applyStands(['/t/idea/slow']);
    let done = false;
    void room.standsLoaded().then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    release();
    await room.standsLoaded();
    expect(done).toBe(true);
  });

  it('a zone answers only the structures among what stands in it', async () => {
    const tower = makeStuffAtPath(() => new Structure(), '/t/structure');
    tower.setExtent('/t');
    makeStuffAtPath(() => new Idea(), '/t/idea/house');
    const zone = makeStuffAtPath(() => new TestZone(), '/t');
    await zone.applyStands(['/t/structure', '/t/idea/house']);
    await zone.standsLoaded();
    expect(zone.standing()).toHaveLength(2);
    expect(zone.standingStructures()).toEqual([tower]);
    expect(zone.structureOf('/t/room')).toBe(tower);
  });
});
