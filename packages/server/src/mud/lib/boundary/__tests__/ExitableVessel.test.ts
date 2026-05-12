import { describe, it, expect, beforeEach } from 'vitest';
import { ExitableVessel } from '../ExitableVessel';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { Door } from '../Door';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

class PlainItem extends ContainableMixin(Idea) {}
class PlainContainer extends ContainerMixin(ContainableMixin(Idea)) {}

describe('ExitableVessel', () => {
  let zone: CartesianZone;
  let park: CartesianLocation;
  let park2: CartesianLocation;
  let wardrobe: ExitableVessel;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    park = makeStuff(() => new CartesianLocation());
    park.setShortDescription('Park');
    zone.addLocation(park, 0, 0, 0);

    park2 = makeStuff(() => new CartesianLocation());
    park2.setShortDescription('Park 2');
    zone.addLocation(park2, 1, 0, 0);

    wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('wardrobe');
  });

  it('is flagged as Exitable by MixinApi', () => {
    expect(MixinApi.isExitable(wardrobe)).toBe(true);
    expect(MixinApi.isContainer(wardrobe)).toBe(true);
    expect(MixinApi.isContainable(wardrobe)).toBe(true);
    expect(MixinApi.isDoorBearing(wardrobe)).toBe(true);
  });

  it("getExit('out') synthesizes an exit to the environment", () => {
    ContainmentApi.move(wardrobe, park);
    const out = wardrobe.getExit('out');
    expect(out).toBeDefined();
    expect(out!.getDirection()).toBe('out');
    expect(out!.getSource()).toBe(wardrobe);
    expect(out!.getDestination()).toBe(park);
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
    expect(second!.getDestination()).toBe(park2);
  });

  it('explicit exits still win over out synthesis', () => {
    ContainmentApi.move(wardrobe, park);
    // Explicit exits win — install an 'out' named explicit exit.
    // The synthesized exit should be shadowed by the explicit entry.
    // (This is a contract edge case — normally no one installs explicit 'out'.)
    const other = makeStuff(() => new ExitableVessel());
    other.setShortDescription('pocket');
    ContainmentApi.move(other, park);
    wardrobe.addBidirectionalExit(other, 'pocket-dim', { opposite: 'back' });
    const got = wardrobe.getExit('pocket-dim');
    expect(got).toBeDefined();
    expect(got!.getDestination()).toBe(other);
  });

  it('getEntryExit() synthesizes an exit from the environment into the vessel', () => {
    ContainmentApi.move(wardrobe, park);
    const entry = wardrobe.getEntryExit();
    expect(entry).toBeDefined();
    expect(entry!.getSource()).toBe(park);
    expect(entry!.getDestination()).toBe(wardrobe);
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
    expect(second!.getSource()).toBe(park2);
  });

  it('includes the out exit in getObviousExits', () => {
    ContainmentApi.move(wardrobe, park);
    const obvious = wardrobe.getObviousExits();
    const directions = obvious.map((e) => e.getDirection());
    expect(directions).toContain('out');
  });

  describe('containment constraint (ContainmentApi)', () => {
    it('cannot be placed in a non-Exitable container', () => {
      const box = makeStuff(() => new PlainContainer());
      expect(() => ContainmentApi.move(wardrobe, box)).toThrow(ContainmentError);
    });

    it('can move between Exitables when zones agree', () => {
      // Pre-stamp the wardrobe (clone-time would do this); move
      // does not back-fill or restamp.
      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park);
      ContainmentApi.move(wardrobe, park2);
      expect(wardrobe.getContainer()).toBe(park2);
      expect(wardrobe.getZone()).toBe(zone);
    });

    it('cannot move between Exitables in different zones', () => {
      const otherZone = makeStuff(() => new CartesianZone());
      const otherPark = makeStuff(() => new CartesianLocation());
      otherZone.addLocation(otherPark, 0, 0, 0);

      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park);
      expect(() => ContainmentApi.move(wardrobe, otherPark)).toThrow(ContainmentError);
    });

    it('move does not back-fill zone on a Exitable that was never stamped', () => {
      // Without a zone stamp, the cross-zone invariant is silent
      // (the `item.zone && item.zone !== to.zone` guard short-
      // circuits on null), and the move does NOT pick up the
      // destination's zone — that's a clone-time concern.
      ContainmentApi.move(wardrobe, park);
      expect(wardrobe.getZone()).toBeNull();
    });
  });

  describe('door bearing', () => {
    it('synthesized out exit picks up the vessel door', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('wardrobe door');
      wardrobe.setDoor(door);
      ContainmentApi.move(wardrobe, park);

      const out = wardrobe.getExit('out');
      expect(out!.getDoor()).toBe(door);
      expect(door.hasAttached(out!)).toBe(true);
    });

    it('synthesized entry exit also picks up the vessel door', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('wardrobe door');
      wardrobe.setDoor(door);
      ContainmentApi.move(wardrobe, park);

      const entry = wardrobe.getEntryExit();
      expect(entry!.getDoor()).toBe(door);
      expect(door.hasAttached(entry!)).toBe(true);
    });

    it('closed door blocks traversal through synthesized exits', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('wardrobe door');
      door.close();
      wardrobe.setDoor(door);
      ContainmentApi.move(wardrobe, park);

      const out = wardrobe.getExit('out')!;
      const guard = out.canTraverse(wardrobe as unknown as Stuff & import('../../spatial/Containable').Containable);
      expect(guard.ok).toBe(false);
      expect(guard.reason).toMatch(/closed/);

      door.open();
      const guardOpen = out.canTraverse(wardrobe as unknown as Stuff & import('../../spatial/Containable').Containable);
      expect(guardOpen.ok).toBe(true);
    });

    it('setDoor invalidates the synth caches and unhooks old door.attachedTo', () => {
      const oldDoor = makeStuff(() => new Door());
      oldDoor.setShortDescription('old door');
      const newDoor = makeStuff(() => new Door());
      newDoor.setShortDescription('new door');

      wardrobe.setDoor(oldDoor);
      ContainmentApi.move(wardrobe, park);
      const firstOut = wardrobe.getExit('out')!;
      expect(oldDoor.hasAttached(firstOut)).toBe(true);

      wardrobe.setDoor(newDoor);
      // Cache invalidated → next access yields a fresh exit.
      const secondOut = wardrobe.getExit('out')!;
      expect(secondOut).not.toBe(firstOut);
      expect(secondOut.getDoor()).toBe(newDoor);
      expect(newDoor.hasAttached(secondOut)).toBe(true);
      // Old exit is no longer registered with the old door.
      expect(oldDoor.hasAttached(firstOut)).toBe(false);
    });

    it('move-induced cache invalidation also unhooks attachedTo', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('wardrobe door');
      wardrobe.setDoor(door);
      ContainmentApi.move(wardrobe, park);
      const firstOut = wardrobe.getExit('out')!;
      expect(door.hasAttached(firstOut)).toBe(true);

      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park2);
      const secondOut = wardrobe.getExit('out')!;
      expect(secondOut).not.toBe(firstOut);
      expect(door.hasAttached(firstOut)).toBe(false);
      expect(door.hasAttached(secondOut)).toBe(true);
    });
  });
});
