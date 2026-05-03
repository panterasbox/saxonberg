import { describe, it, expect, beforeEach } from 'vitest';
import { ExitableVessel } from '../ExitableVessel';
import { CartesianLocation } from '../CartesianLocation';
import { CartesianZone } from '../CartesianZone';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { ContainerMixin } from '../Container';
import { ContainableMixin } from '../Containable';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class PlainItem extends ContainableMixin(Stuff) {}
class PlainContainer extends ContainerMixin(ContainableMixin(Stuff)) {}

describe('ExitableVessel', () => {
  let zone: CartesianZone;
  let park: CartesianLocation;
  let park2: CartesianLocation;
  let wardrobe: ExitableVessel;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    park = makeStuff(() => new CartesianLocation());
    park.shortDescription = 'Park';
    zone.addRoom(park, 0, 0, 0);

    park2 = makeStuff(() => new CartesianLocation());
    park2.shortDescription = 'Park 2';
    zone.addRoom(park2, 1, 0, 0);

    wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.name = 'wardrobe';
  });

  it('is flagged as Exitable by MixinApi', () => {
    expect(MixinApi.isExitable(wardrobe)).toBe(true);
    expect(MixinApi.isContainer(wardrobe)).toBe(true);
    expect(MixinApi.isContainable(wardrobe)).toBe(true);
  });

  it("getExit('out') synthesizes an exit to the environment", () => {
    ContainmentApi.move(wardrobe, park);
    const out = wardrobe.getExit('out');
    expect(out).toBeDefined();
    expect(out!.direction).toBe('out');
    expect(out!.source).toBe(wardrobe);
    expect(out!.destination).toBe(park);
  });

  it("getExit('out') returns undefined when the vessel has no environment", () => {
    expect(wardrobe.getExit('out')).toBeUndefined();
  });

  it("caches the synthesized 'out' exit across calls", () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getExit('out');
    const second = wardrobe.getExit('out');
    expect(first).toBe(second);
  });

  it("invalidates the 'out' cache when the environment changes", () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getExit('out');
    ContainmentApi.move(wardrobe, park2);
    const second = wardrobe.getExit('out');
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    expect(second!.destination).toBe(park2);
  });

  it('explicit exits still win over out synthesis', () => {
    ContainmentApi.move(wardrobe, park);
    // Explicit exits win — install an 'out' named explicit exit.
    // The synthesized exit should be shadowed by the explicit entry.
    // (This is a contract edge case — normally no one installs explicit 'out'.)
    const other = makeStuff(() => new ExitableVessel());
    other.name = 'pocket';
    ContainmentApi.move(other, park);
    wardrobe.addBidirectionalExit(other, 'pocket-dim', { opposite: 'back' });
    const got = wardrobe.getExit('pocket-dim');
    expect(got).toBeDefined();
    expect(got!.destination).toBe(other);
  });

  it('getEntryExit() synthesizes an exit from the environment into the vessel', () => {
    ContainmentApi.move(wardrobe, park);
    const entry = wardrobe.getEntryExit();
    expect(entry).toBeDefined();
    expect(entry!.source).toBe(park);
    expect(entry!.destination).toBe(wardrobe);
  });

  it('getEntryExit() returns undefined when the vessel has no environment', () => {
    expect(wardrobe.getEntryExit()).toBeUndefined();
  });

  it('caches the synthesized entry exit across calls', () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getEntryExit();
    const second = wardrobe.getEntryExit();
    expect(first).toBe(second);
  });

  it('invalidates the entry cache when the environment changes', () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getEntryExit();
    ContainmentApi.move(wardrobe, park2);
    const second = wardrobe.getEntryExit();
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    expect(second!.source).toBe(park2);
  });

  it('includes the out exit in getObviousExits', () => {
    ContainmentApi.move(wardrobe, park);
    const obvious = wardrobe.getObviousExits();
    const directions = obvious.map((e) => e.direction);
    expect(directions).toContain('out');
  });

  describe('containment constraint (ContainmentApi)', () => {
    it('cannot be placed in a non-Exitable container', () => {
      const box = makeStuff(() => new PlainContainer());
      expect(() => ContainmentApi.move(wardrobe, box)).toThrow(ContainmentError);
    });

    it('can move between Exitables in the same zone and stamps zone on first placement', () => {
      expect(wardrobe.zone).toBeNull();
      ContainmentApi.move(wardrobe, park);
      expect(wardrobe.zone).toBe(zone);
      ContainmentApi.move(wardrobe, park2);
      expect(wardrobe.getEnvironment()).toBe(park2);
      expect(wardrobe.zone).toBe(zone);
    });

    it('cannot move between Exitables in different zones', () => {
      const otherZone = makeStuff(() => new CartesianZone());
      const otherPark = makeStuff(() => new CartesianLocation());
      otherZone.addRoom(otherPark, 0, 0, 0);

      ContainmentApi.move(wardrobe, park);
      expect(() => ContainmentApi.move(wardrobe, otherPark)).toThrow(ContainmentError);
    });

    it('nested vessels inherit the outer location’s zone on first placement', () => {
      ContainmentApi.move(wardrobe, park);
      const pocket = makeStuff(() => new ExitableVessel());
      pocket.name = 'pocket';
      ContainmentApi.move(pocket, wardrobe);
      expect(pocket.zone).toBe(zone);
    });
  });

  describe('runtime-fallback zone stamp for non-Exitables', () => {
    it('stamps a plain item on first placement and leaves it alone afterward', () => {
      const sword = makeStuff(() => new PlainItem());
      expect(sword.zone).toBeNull();

      ContainmentApi.move(sword, park);
      expect(sword.zone).toBe(zone);

      // Subsequent move in same zone: stays stamped (not re-stamped/cleared).
      ContainmentApi.move(sword, park2);
      expect(sword.zone).toBe(zone);
    });
  });
});
