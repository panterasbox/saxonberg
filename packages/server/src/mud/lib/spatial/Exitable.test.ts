import { describe, it, expect, beforeEach } from 'vitest';
import { CartesianZone } from './CartesianZone';
import { CartesianLocation } from './CartesianLocation';
import { SphericalLocation } from './SphericalLocation';
import { SphericalZone } from './SphericalZone';
import { Exit } from './Exit';
import { Door } from './Door';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

describe('ExitableMixin', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let roomC: CartesianLocation;

  beforeEach(() => {
    zone = new CartesianZone();
    StuffApi.register(zone);
    roomA = new CartesianLocation();
    StuffApi.register(roomA);
    roomB = new CartesianLocation();
    StuffApi.register(roomB);
    roomC = new CartesianLocation();
    StuffApi.register(roomC);
    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);
    zone.addRoom(roomC, 0, 2, 0);
  });

  it('addExit installs an explicit exit; duplicate addExit returns false', () => {
    const exit = new Exit({ direction: 'up', source: roomA, destination: roomC });
    expect(roomA.addExit(exit)).toBe(true);
    expect(roomA.addExit(exit)).toBe(false);
    expect(roomA.getExits().size).toBe(1);
  });

  it('removeExit deletes by direction', () => {
    const exit = new Exit({ direction: 'up', source: roomA, destination: roomC });
    roomA.addExit(exit);
    expect(roomA.removeExit('up')).toBe(true);
    expect(roomA.removeExit('up')).toBe(false);
    expect(roomA.getExits().size).toBe(0);
  });

  it('CartesianLocation rejects non-cardinal directions', () => {
    const exit = new Exit({ direction: 'portal', source: roomA, destination: roomC });
    expect(() => roomA.addExit(exit)).toThrow(/not a cardinal direction/);
  });

  it('explicit exit wins over zone-derived lookup in the same direction', () => {
    const explicit = new Exit({ direction: 'north', source: roomA, destination: roomC });
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
    const hidden = new Exit({
      direction: 'up',
      source: roomA,
      destination: roomC,
      hidden: true,
    });
    const visible = new Exit({
      direction: 'down',
      source: roomA,
      destination: roomC,
    });
    roomA.addExit(hidden);
    roomA.addExit(visible);

    const obvious = roomA.getObviousExits();
    const directions = obvious.map((e) => e.direction);
    expect(directions).toContain('down');
    expect(directions).toContain('north');
    expect(directions).not.toContain('up');
  });

  it('getExitDoors collects doors from obvious exits', () => {
    const oak = new Door();
    oak.shortDescription = 'oak door';
    const iron = new Door();
    iron.shortDescription = 'iron gate';
    const withDoor = new Exit({
      direction: 'up',
      source: roomA,
      destination: roomC,
      door: oak,
    });
    roomA.addExit(withDoor);

    // Attach an iron door to the zone-derived north exit: doing that
    // realistically requires creating an explicit exit (derived exits are
    // doorless). Validate that doored explicit exits are picked up.
    const explicitNorth = new Exit({
      direction: 'north',
      source: roomA,
      destination: roomB,
      door: iron,
    });
    roomA.addExit(explicitNorth);

    const doors = roomA.getExitDoors();
    expect(doors).toContain(oak);
    expect(doors).toContain(iron);
    expect(doors).toHaveLength(2);
  });

  it('spherical-zoned rooms receive no derived exits', () => {
    const sphZone = new SphericalZone();
    StuffApi.register(sphZone);
    const room = new SphericalLocation();
    StuffApi.register(room);
    sphZone.addRoom(room);

    expect(room.getExit('north')).toBeUndefined();
    expect(room.getObviousExits()).toHaveLength(0);
  });

  it('addBidirectionalExit infers the opposite direction for cardinals', () => {
    const door = new Door();
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
    const sphZone = new SphericalZone();
    StuffApi.register(sphZone);
    const plaza = new SphericalLocation();
    StuffApi.register(plaza);
    const office = new SphericalLocation();
    StuffApi.register(office);
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
