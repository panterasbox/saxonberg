import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../spatial/CartesianZone';
import CartesianLocation from '../../spatial/CartesianLocation';
import SphericalLocation from '../../spatial/SphericalLocation';
import SphericalZone from '../../spatial/SphericalZone';
import Exit from '../Exit';
import Door from '../Door';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

describe('ExitableMixin', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let locB: CartesianLocation;
  let locC: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locB = makeStuff(() => new CartesianLocation());
    locC = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    zone.addLocation(locC, 0, 2, 0);
  });

  it('addExit installs an explicit exit; duplicate addExit returns false', async () => {
    const exit = makeStuff(() => new Exit({ direction: 'up', source: locA, destination: locC }));
    expect(await locA.addExit(exit)).toBe(true);
    expect(await locA.addExit(exit)).toBe(false);
    expect(locA.getExits().size).toBe(1);
  });

  it('removeExit deletes by direction', async () => {
    const exit = makeStuff(() => new Exit({ direction: 'up', source: locA, destination: locC }));
    await locA.addExit(exit);
    expect(locA.removeExit('up')).toBe(true);
    expect(locA.removeExit('up')).toBe(false);
    expect(locA.getExits().size).toBe(0);
  });

  it('CartesianLocation allows orphan non-cardinal exit (no source templatePath → permissive)', async () => {
    // Without a sourcePath (makeStuff'd locA has no template path), the
    // cardinal-rule check falls into the permissive branch — see
    // CartesianLocation.addExit. The intra-zone non-cardinal failure
    // case is exercised in CartesianLocation.cardinalRule.test.ts using
    // makeStuffAtPath fixtures.
    const exit = makeStuff(() => new Exit({ direction: 'portal', source: locA, destination: locC }));
    expect(await locA.addExit(exit)).toBe(true);
  });

  it('explicit exit wins over zone-derived lookup in the same direction', async () => {
    const explicit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locC }));
    await locA.addExit(explicit);
    const exit = locA.getExit('north');
    expect(exit).toBe(explicit);
    expect(exit!.getDestination()).toBe(locC);
  });

  it('returns undefined for an unknown non-cardinal lookup (no portal installed)', () => {
    expect(locA.getExit('portal')).toBeUndefined();
  });

  it('zone-derived exit returned when no explicit entry exists', () => {
    const exit = locA.getExit('north');
    expect(exit).toBeDefined();
    expect(exit!.getDestination()).toBe(locB);
  });

  it('getExit for a direction without neighbor returns undefined', () => {
    expect(locA.getExit('east')).toBeUndefined();
    expect(locA.getExit('south')).toBeUndefined();
  });

  it('returns undefined for a non-cardinal when zone has no explicit exit', () => {
    expect(locA.getExit('office')).toBeUndefined();
  });

  it('getObviousExits merges explicit and derived, filters hidden', async () => {
    const hidden = makeStuff(() => new Exit({
      direction: 'up',
      source: locA,
      destination: locC,
      hidden: true,
    }));
    const visible = makeStuff(() => new Exit({
      direction: 'down',
      source: locA,
      destination: locC,
    }));
    await locA.addExit(hidden);
    await locA.addExit(visible);

    const obvious = locA.getObviousExits();
    const directions = obvious.map((e) => e.getDirection());
    expect(directions).toContain('down');
    expect(directions).toContain('north');
    expect(directions).not.toContain('up');
  });

  it('getExitDoors collects doors from obvious exits', async () => {
    const oak = makeStuff(() => new Door());
    oak.setShortDescription('oak door');
    const iron = makeStuff(() => new Door());
    iron.setShortDescription('iron gate');
    const withDoor = makeStuff(() => new Exit({
      direction: 'up',
      source: locA,
      destination: locC,
      door: oak,
    }));
    await locA.addExit(withDoor);

    // Attach an iron door to the zone-derived north exit: doing that
    // realistically requires creating an explicit exit (derived exits are
    // doorless). Validate that doored explicit exits are picked up.
    const explicitNorth = makeStuff(() => new Exit({
      direction: 'north',
      source: locA,
      destination: locB,
      door: iron,
    }));
    await locA.addExit(explicitNorth);

    const doors = locA.getExitDoors();
    expect(doors).toContain(oak);
    expect(doors).toContain(iron);
    expect(doors).toHaveLength(2);
  });

  it('spherical-zoned locations receive no derived exits', () => {
    const sphZone = makeStuff(() => new SphericalZone());
    const loc = makeStuff(() => new SphericalLocation());
    sphZone.addLocation(loc);

    expect(loc.getExit('north')).toBeUndefined();
    expect(loc.getObviousExits()).toHaveLength(0);
  });

  it('addBidirectionalExit infers the opposite direction for cardinals', async () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('heavy gate');
    await locA.addBidirectionalExit(locC, 'up', { door });

    const forward = locA.getExit('up');
    const back = locC.getExit('down');
    expect(forward).toBeDefined();
    expect(back).toBeDefined();
    expect(forward!.getDoor()).toBe(door);
    expect(back!.getDoor()).toBe(door);

    door.open();
    expect(forward!.getDoor()!.isOpen()).toBe(true);
    expect(back!.getDoor()!.isOpen()).toBe(true);
  });

  it('addBidirectionalExit requires explicit opposite for non-cardinal labels', async () => {
    // Use spherical locations — cartesian rejects labeled directions entirely.
    const sphZone = makeStuff(() => new SphericalZone());
    const plaza = makeStuff(() => new SphericalLocation());
    const office = makeStuff(() => new SphericalLocation());
    sphZone.addLocation(plaza);
    sphZone.addLocation(office);

    await expect(
      plaza.addBidirectionalExit(office, 'office')
    ).rejects.toThrow(/opposite/);
    await plaza.addBidirectionalExit(office, 'office', { opposite: 'plaza' });
    expect(plaza.getExit('office')).toBeDefined();
    expect(office.getExit('plaza')).toBeDefined();
  });

  it('MixinApi.isExitable narrows to Exitable', () => {
    expect(MixinApi.isExitable(locA)).toBe(true);
    expect(MixinApi.isExitable(zone)).toBe(false);
  });
});

describe('ExitableMixin.verifyOutboundExits', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    StuffApi.clearAll();
  });

  it('wires inverse pointers when destination is loaded with matching back-exit', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
    }));
    const west = makeStuff(() => new Exit({
      direction: 'west',
      source: b,
      destination: a,
    }));
    await a.addExit(east);
    await b.addExit(west);

    expect(east.getInverse()).toBeUndefined();
    expect(west.getInverse()).toBeUndefined();

    a.verifyOutboundExits();

    expect(east.getInverse()).toBe(west);
    expect(west.getInverse()).toBe(east);
    expect(east.isBlocked()).toBe(false);
  });

  it('skips exits whose destination is not yet loaded', async () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destinationPath: '/zone/b',
    }));
    await a.addExit(east);

    a.verifyOutboundExits();

    expect(east.isBlocked()).toBe(false);
    expect(east.getInverse()).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('marks blocked when destination loaded but missing back-exit', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 5, 5, 5);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
    }));
    await a.addExit(east);

    a.verifyOutboundExits();

    expect(east.isBlocked()).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('marks blocked when back-exit points elsewhere', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    const c = makeStuffAtPath(() => new CartesianLocation(), '/zone/c');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 5, 5, 5);
    zone.addLocation(c, 9, 9, 9);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
    }));
    const wrongBack = makeStuff(() => new Exit({
      direction: 'west',
      source: b,
      destination: c,
    }));
    await a.addExit(east);
    await b.addExit(wrongBack);

    a.verifyOutboundExits();

    expect(east.isBlocked()).toBe(true);
    expect(east.getInverse()).toBeUndefined();
  });

  it('skips oneWay exits even with no back-exit', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 5, 5, 5);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
      oneWay: true,
    }));
    await a.addExit(east);

    a.verifyOutboundExits();

    expect(east.isBlocked()).toBe(false);
    expect(east.getInverse()).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips already-wired exits', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    await a.addBidirectionalExit(b, 'east');
    const east = a.getExits().get('east')!;
    const wiredInverse = east.getInverse();

    a.verifyOutboundExits();

    expect(east.getInverse()).toBe(wiredInverse);
  });

  it('skips non-cardinal directions (semantic exits)', () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    const semantic = makeStuff(() => new Exit({
      direction: 'office',
      source: a,
      destination: b,
    }));
    // Bypass addExit's cardinal check by writing directly to the map.
    // test seam: bracket access bypasses the protected `exits` modifier.
    (a as unknown as { exits: Map<string, Exit> }).exits.set('office', semantic);

    a.verifyOutboundExits();

    expect(semantic.isBlocked()).toBe(false);
    expect(semantic.getInverse()).toBeUndefined();
  });
});

describe('ExitableMixin.onDestruct / Location destroy choreography', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('marks neighbor inbound exits blocked and destructs outbound exits', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    await a.addBidirectionalExit(b, 'north');
    const aNorth = a.getExits().get('north')!;
    const bSouth = b.getExits().get('south')!;

    StuffApi.destruct(a as unknown as Idea);

    expect(bSouth.isBlocked()).toBe(true);
    expect(bSouth.getInverse()).toBeUndefined();
    expect((aNorth as unknown as Idea).isDestroyed()).toBe(true);
    expect(zone.contains(a)).toBe(false);
  });

  it('Zone destruct refuses while locations are live', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    zone.addLocation(loc, 0, 0, 0);

    expect(() => StuffApi.destruct(zone as unknown as Idea)).toThrow(
      /live location/,
    );
  });

  it('Zone destruct succeeds after locations are drained', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    zone.addLocation(loc, 0, 0, 0);

    StuffApi.destruct(loc as unknown as Idea);
    expect(zone.getLocations().size).toBe(0);

    expect(() => StuffApi.destruct(zone as unknown as Idea)).not.toThrow();
    expect((zone as unknown as Idea).isDestroyed()).toBe(true);
  });
});
