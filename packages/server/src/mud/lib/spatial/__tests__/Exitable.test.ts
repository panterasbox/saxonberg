import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Stuff } from '../../stuff/Stuff';
import { ProxyApi } from '../../../api/proxy';
import { CartesianZone } from '../CartesianZone';
import { CartesianLocation } from '../CartesianLocation';
import { SphericalLocation } from '../SphericalLocation';
import { SphericalZone } from '../SphericalZone';
import { Exit } from '../Exit';
import { Door } from '../Door';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Test helper: construct + register a Stuff at a known templatePath
 * so the singleton index can find it. Mirrors the stamping that
 * `StuffApi.clone()` does at runtime.
 */
function makeStuffAtPath<T extends Stuff>(factory: () => T, path: string): T {
  const prev = Stuff._beginConstruction();
  let raw: T;
  try {
    raw = factory();
  } finally {
    Stuff._endConstruction(prev);
  }
  const proxy = ProxyApi.wrap(raw);
  (proxy as unknown as { templatePath?: string }).templatePath = path;
  StuffApi.register(proxy);
  return proxy;
}

describe('ExitableMixin', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let roomC: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    roomA = makeStuff(() => new CartesianLocation());
    roomB = makeStuff(() => new CartesianLocation());
    roomC = makeStuff(() => new CartesianLocation());
    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);
    zone.addRoom(roomC, 0, 2, 0);
  });

  it('addExit installs an explicit exit; duplicate addExit returns false', () => {
    const exit = makeStuff(() => new Exit({ direction: 'up', source: roomA, destination: roomC }));
    expect(roomA.addExit(exit)).toBe(true);
    expect(roomA.addExit(exit)).toBe(false);
    expect(roomA.getExits().size).toBe(1);
  });

  it('removeExit deletes by direction', () => {
    const exit = makeStuff(() => new Exit({ direction: 'up', source: roomA, destination: roomC }));
    roomA.addExit(exit);
    expect(roomA.removeExit('up')).toBe(true);
    expect(roomA.removeExit('up')).toBe(false);
    expect(roomA.getExits().size).toBe(0);
  });

  it('CartesianLocation rejects non-cardinal directions', () => {
    const exit = makeStuff(() => new Exit({ direction: 'portal', source: roomA, destination: roomC }));
    expect(() => roomA.addExit(exit)).toThrow(/not a cardinal direction/);
  });

  it('explicit exit wins over zone-derived lookup in the same direction', () => {
    const explicit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomC }));
    roomA.addExit(explicit);
    const exit = roomA.getExit('north');
    expect(exit).toBe(explicit);
    expect(exit!.destination).toBe(roomC);
  });

  it('returns undefined for an unknown non-cardinal lookup (no portal installed)', () => {
    expect(roomA.getExit('portal')).toBeUndefined();
  });

  it('zone-derived exit returned when no explicit entry exists', () => {
    const exit = roomA.getExit('north');
    expect(exit).toBeDefined();
    expect(exit!.destination).toBe(roomB);
  });

  it('getExit for a direction without neighbor returns undefined', () => {
    expect(roomA.getExit('east')).toBeUndefined();
    expect(roomA.getExit('south')).toBeUndefined();
  });

  it('returns undefined for a non-cardinal when zone has no explicit exit', () => {
    expect(roomA.getExit('office')).toBeUndefined();
  });

  it('getObviousExits merges explicit and derived, filters hidden', () => {
    const hidden = makeStuff(() => new Exit({
      direction: 'up',
      source: roomA,
      destination: roomC,
      hidden: true,
    }));
    const visible = makeStuff(() => new Exit({
      direction: 'down',
      source: roomA,
      destination: roomC,
    }));
    roomA.addExit(hidden);
    roomA.addExit(visible);

    const obvious = roomA.getObviousExits();
    const directions = obvious.map((e) => e.direction);
    expect(directions).toContain('down');
    expect(directions).toContain('north');
    expect(directions).not.toContain('up');
  });

  it('getExitDoors collects doors from obvious exits', () => {
    const oak = makeStuff(() => new Door());
    oak.shortDescription = 'oak door';
    const iron = makeStuff(() => new Door());
    iron.shortDescription = 'iron gate';
    const withDoor = makeStuff(() => new Exit({
      direction: 'up',
      source: roomA,
      destination: roomC,
      door: oak,
    }));
    roomA.addExit(withDoor);

    // Attach an iron door to the zone-derived north exit: doing that
    // realistically requires creating an explicit exit (derived exits are
    // doorless). Validate that doored explicit exits are picked up.
    const explicitNorth = makeStuff(() => new Exit({
      direction: 'north',
      source: roomA,
      destination: roomB,
      door: iron,
    }));
    roomA.addExit(explicitNorth);

    const doors = roomA.getExitDoors();
    expect(doors).toContain(oak);
    expect(doors).toContain(iron);
    expect(doors).toHaveLength(2);
  });

  it('spherical-zoned rooms receive no derived exits', () => {
    const sphZone = makeStuff(() => new SphericalZone());
    const room = makeStuff(() => new SphericalLocation());
    sphZone.addRoom(room);

    expect(room.getExit('north')).toBeUndefined();
    expect(room.getObviousExits()).toHaveLength(0);
  });

  it('addBidirectionalExit infers the opposite direction for cardinals', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'heavy gate';
    roomA.addBidirectionalExit(roomC, 'up', { door });

    const forward = roomA.getExit('up');
    const back = roomC.getExit('down');
    expect(forward).toBeDefined();
    expect(back).toBeDefined();
    expect(forward!.door).toBe(door);
    expect(back!.door).toBe(door);

    door.open();
    expect(forward!.door!.isOpen).toBe(true);
    expect(back!.door!.isOpen).toBe(true);
  });

  it('addBidirectionalExit requires explicit opposite for non-cardinal labels', () => {
    // Use spherical locations — cartesian rejects labeled directions entirely.
    const sphZone = makeStuff(() => new SphericalZone());
    const plaza = makeStuff(() => new SphericalLocation());
    const office = makeStuff(() => new SphericalLocation());
    sphZone.addRoom(plaza);
    sphZone.addRoom(office);

    expect(() => plaza.addBidirectionalExit(office, 'office')).toThrow(/opposite/);
    plaza.addBidirectionalExit(office, 'office', { opposite: 'plaza' });
    expect(plaza.getExit('office')).toBeDefined();
    expect(office.getExit('plaza')).toBeDefined();
  });

  it('MixinApi.isExitable narrows to Exitable', () => {
    expect(MixinApi.isExitable(roomA)).toBe(true);
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

  it('wires inverse pointers when destination is loaded with matching back-exit', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

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
    a.addExit(east);
    b.addExit(west);

    expect(east.inverse).toBeUndefined();
    expect(west.inverse).toBeUndefined();

    a.verifyOutboundExits();

    expect(east.inverse).toBe(west);
    expect(west.inverse).toBe(east);
    expect(east.blocked).toBe(false);
  });

  it('skips exits whose destination is not yet loaded', () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destinationPath: '/zone/b',
    }));
    a.addExit(east);

    a.verifyOutboundExits();

    expect(east.blocked).toBe(false);
    expect(east.inverse).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('marks blocked when destination loaded but missing back-exit', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 5, 5, 5);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
    }));
    a.addExit(east);

    a.verifyOutboundExits();

    expect(east.blocked).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('marks blocked when back-exit points elsewhere', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    const c = makeStuffAtPath(() => new CartesianLocation(), '/zone/c');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 5, 5, 5);
    zone.addRoom(c, 9, 9, 9);

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
    a.addExit(east);
    b.addExit(wrongBack);

    a.verifyOutboundExits();

    expect(east.blocked).toBe(true);
    expect(east.inverse).toBeUndefined();
  });

  it('skips oneWay exits even with no back-exit', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 5, 5, 5);

    const east = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
      oneWay: true,
    }));
    a.addExit(east);

    a.verifyOutboundExits();

    expect(east.blocked).toBe(false);
    expect(east.inverse).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips already-wired exits', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    a.addBidirectionalExit(b, 'east');
    const east = a.exits.get('east')!;
    const wiredInverse = east.inverse;

    a.verifyOutboundExits();

    expect(east.inverse).toBe(wiredInverse);
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
    a.exits.set('office', semantic);

    a.verifyOutboundExits();

    expect(semantic.blocked).toBe(false);
    expect(semantic.inverse).toBeUndefined();
  });
});

describe('ExitableMixin.prepareDestroy / Location destroy choreography', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('marks neighbor inbound exits blocked and destructs outbound exits', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    zone.addRoom(a, 0, 0, 0);
    zone.addRoom(b, 0, 1, 0);

    a.addBidirectionalExit(b, 'north');
    const aNorth = a.exits.get('north')!;
    const bSouth = b.exits.get('south')!;

    StuffApi.destruct(a as unknown as Stuff);

    expect(bSouth.blocked).toBe(true);
    expect(bSouth.inverse).toBeUndefined();
    expect((aNorth as unknown as Stuff).isDestroyed()).toBe(true);
    expect(zone.contains(a)).toBe(false);
  });

  it('Zone destruct refuses while rooms are live', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    zone.addRoom(room, 0, 0, 0);

    expect(() => StuffApi.destruct(zone as unknown as Stuff)).toThrow(
      /live room/,
    );
  });

  it('Zone destruct succeeds after rooms are drained', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    zone.addRoom(room, 0, 0, 0);

    StuffApi.destruct(room as unknown as Stuff);
    expect(zone.rooms.size).toBe(0);

    expect(() => StuffApi.destruct(zone as unknown as Stuff)).not.toThrow();
    expect((zone as unknown as Stuff).isDestroyed()).toBe(true);
  });
});
