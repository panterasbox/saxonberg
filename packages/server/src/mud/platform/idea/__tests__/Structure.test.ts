import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Structure from '../Structure';
import Ship from '../Ship';
import { NavigationApi } from '../../../api/navigation';
import { attachGraph } from '../../../lib/location/__tests__/attachments-fixture';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

/**
 * The Structure (maritime D4): membership by extent prefix, sparse. ⭐ A
 * building carries no position and no voyage; a {@link Ship} — a
 * Structure whose position is a variable — does (maritime review).
 */
describe('Structure', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('a member is any room under the extent, on a segment boundary', () => {
    const s = makeStuff(() => new Structure());
    s.setExtent('/test/ship/');
    expect(s.hasMember('/test/ship/deck')).toBe(true);
    expect(s.hasMember('/test/ship')).toBe(true);
    expect(s.hasMember('/test/shipyard/slip')).toBe(false);
  });

  it('⭐ a building has no position and does not voyage; a ship does — a subclass, not a blank field', () => {
    const tower = makeStuff(() => new Structure());
    expect(MixinApi.isPositioned(tower)).toBe(false);
    expect(MixinApi.isVoyaging(tower)).toBe(false);
    expect(MixinApi.isPersistable(tower)).toBe(false);
    const ship = makeStuff(() => new Ship());
    expect(ship).toBeInstanceOf(Structure);
    expect(MixinApi.isPositioned(ship)).toBe(true);
    expect(MixinApi.isVoyaging(ship)).toBe(true);
    expect(MixinApi.isPersistable(ship)).toBe(true);
    expect(ship.getExpansePosition()).toBeNull();
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    expect(ship.getExpansePosition()!.latDeg).toBe(50);
  });

  it('⭐ the lookout seat sees from the masthead; everybody else from the deck', () => {
    const s = makeStuff(() => new Ship());
    s.setDeckHeightM(3);
    s.setMastheadHeightM(20);
    s.setHouse('/test/ship/idea/outfit');
    const job = { positionKey: 'lookout', status: 'on-shift' };
    const lookout = makeStuff(() => new Structure());
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation((o) => o === lookout);
    (lookout as unknown as { getEmployment: () => unknown }).getEmployment = () => job;
    expect(s.sightHeightFor(lookout)).toBe(20);
    job.status = 'employed';
    expect(s.sightHeightFor(lookout)).toBe(3);
    expect(s.sightHeightFor(makeStuff(() => new Structure()))).toBe(3);
  });

  it('⭐ a structure is Visible and Detailed — described the ordinary way, no second "outside" field', () => {
    const s = makeStuff(() => new Structure());
    expect(MixinApi.isVisible(s)).toBe(true);
    expect(MixinApi.isDetailed(s)).toBe(true);
    s.setShortDescription('terminal clock tower');
    expect(s.getShortDescription()).toBe('terminal clock tower');
    expect(s.isLandmark()).toBe(false);
    s.setLandmark(true);
    expect(s.isLandmark()).toBe(true);
  });

  it('⭐ a place\'s structure is ATTACHED to it in the location graph — stood up, never searched for', async () => {
    const tower = makeStuffAtPath(() => new Structure(), '/test/t/structure');
    tower.setExtent('/test/t');
    tower.setLandmark(true);
    attachGraph({ '/test/t': [['/test/t/structure', 'structure']] });
    const singleton = vi.spyOn(StuffApi, 'singleton');
    expect(await NavigationApi.structureAt('/test/t/room')).toBe(tower);
    expect(singleton).toHaveBeenCalledWith('/test/t/structure');
  });

  it('the innermost extent answers — a wing inside a hall', async () => {
    const hall = makeStuffAtPath(() => new Structure(), '/test/a/structure');
    hall.setExtent('/test/a');
    const wing = makeStuffAtPath(() => new Structure(), '/test/a/wing/structure');
    wing.setExtent('/test/a/wing');
    attachGraph({
      '/test/a': [['/test/a/structure', 'structure']],
      '/test/a/wing': [['/test/a/wing/structure', 'structure']],
    });
    expect(NavigationApi.structureAtNow('/test/a/wing/attic')).toBe(wing);
    expect(NavigationApi.structureAtNow('/test/a/hall')).toBe(hall);
    expect(NavigationApi.structureAtNow('/test/elsewhere')).toBeNull();
  });
});
