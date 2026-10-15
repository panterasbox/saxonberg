import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Structure from '../Structure';
import Ship from '../Ship';
import { SpatialZone } from '../../../lib/zone/SpatialZone';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

class TestZone extends SpatialZone {}

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

  it('⭐ a zone NAMES its structures and loading it stands them up — nothing is searched for', async () => {
    const tower = makeStuffAtPath(() => new Structure(), '/test/t/structure');
    tower.setExtent('/test/t');
    tower.setLandmark(true);
    const zone = makeStuffAtPath(() => new TestZone(), '/test/t');
    const singleton = vi.spyOn(StuffApi, 'singleton');
    await zone.applyStands(['/test/t/structure']);
    await zone.standsLoaded();
    expect(singleton).toHaveBeenCalledWith('/test/t/structure');
    expect(zone.standingStructures()).toEqual([tower]);
    expect(zone.standingStructures()[0]!.isLandmark()).toBe(true);
  });

  it('the zone answers the structure a place is in — the innermost extent', async () => {
    const hall = makeStuffAtPath(() => new Structure(), '/test/a/structure');
    hall.setExtent('/test/a');
    const wing = makeStuffAtPath(() => new Structure(), '/test/a/wing/structure');
    wing.setExtent('/test/a/wing');
    const zone = makeStuffAtPath(() => new TestZone(), '/test/a');
    await zone.applyStands(['/test/a/structure', '/test/a/wing/structure']);
    await zone.standsLoaded();
    expect(zone.structureOf('/test/a/wing/attic')).toBe(wing);
    expect(zone.structureOf('/test/a/hall')).toBe(hall);
    expect(zone.structureOf('/test/elsewhere')).toBeNull();
  });
});
