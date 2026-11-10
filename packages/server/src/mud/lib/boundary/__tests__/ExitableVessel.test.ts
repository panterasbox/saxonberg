import "../../../../test-bootstrap";
import { StuffApi } from '../../../api/stuff';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ExitableVessel from '../ExitableVessel';
import Location from '../../location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { Stuff } from '../../stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

class PlainContainer extends ContainerMixin(ContainableMixin(Idea)) {}

describe('ExitableVessel', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  let zone: CartesianZone;
  let park: Location;
  let park2: Location;
  let wardrobe: ExitableVessel;

  beforeEach(async () => {
    zone = makeStuff(() => new CartesianZone());

    park = makeStuff(() => new Location());
    park.setShortDescription('Park');
    zone.addLocation(park, 0, 0, 0);

    park2 = makeStuff(() => new Location());
    park2.setShortDescription('Park 2');
    zone.addLocation(park2, 1, 0, 0);

    wardrobe = await StuffApi.create(() => new ExitableVessel());
    wardrobe.setShortDescription('wardrobe');
  });

  it('is flagged as Exitable by MixinApi', async () => {
    expect(MixinApi.isExitable(wardrobe)).toBe(true);
    expect(MixinApi.isContainer(wardrobe)).toBe(true);
    expect(MixinApi.isContainable(wardrobe)).toBe(true);
  });

  it("getExit('out') synthesizes an exit to the environment", async () => {
    ContainmentApi.move(wardrobe, park);
    const out = wardrobe.getExit('out');
    expect(out).toBeDefined();
    expect(out!.getDirection()).toBe('out');
    expect(out!.getSource()).toBe(wardrobe);
    expect(out!.getDestination()).toBe(park);
  });

  it("getExit('out') returns undefined when the vessel has no environment", async () => {
    expect(wardrobe.getExit('out')).toBeUndefined();
  });

  it("caches the synthesized 'out' exit across calls", async () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getExit('out');
    const second = wardrobe.getExit('out');
    expect(first).toBe(second);
  });

  it("⭐ REBINDS the 'out' exit when the environment changes", async () => {
    // A vessel is a room that goes places, so it keeps ONE `out` exit
    // and re-points it. (It used to build a fresh `new Exit` per
    // environment; now the exit is a clone of a row, minted once at
    // `onCreate` — which is what `Exit.rebind` exists for.)
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getExit('out');
    ContainmentApi.move(wardrobe, park2);
    const second = wardrobe.getExit('out');
    expect(second).toBeDefined();
    expect(second).toBe(first);
    expect(second!.getDestination()).toBe(park2);
  });

  it('explicit exits still win over out synthesis', async () => {
    ContainmentApi.move(wardrobe, park);
    // Explicit exits win — install an 'out' named explicit exit.
    // The synthesized exit should be shadowed by the explicit entry.
    // (This is a contract edge case — normally no one installs explicit 'out'.)
    const other = await StuffApi.create(() => new ExitableVessel());
    other.setShortDescription('pocket');
    ContainmentApi.move(other, park);
    await wardrobe.addBidirectionalExit(other, 'pocket-dim', { opposite: 'back' });
    const got = wardrobe.getExit('pocket-dim');
    expect(got).toBeDefined();
    expect(got!.getDestination()).toBe(other);
  });

  it('getEntryExit() synthesizes an exit from the environment into the vessel', async () => {
    ContainmentApi.move(wardrobe, park);
    const entry = wardrobe.getEntryExit();
    expect(entry).toBeDefined();
    expect(entry!.getSource()).toBe(park);
    expect(entry!.getDestination()).toBe(wardrobe);
  });

  it('getEntryExit() returns undefined when the vessel has no environment', async () => {
    expect(wardrobe.getEntryExit()).toBeUndefined();
  });

  it('caches the synthesized entry exit across calls', async () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getEntryExit();
    const second = wardrobe.getEntryExit();
    expect(first).toBe(second);
  });

  it('⭐ REBINDS the entry exit when the environment changes', async () => {
    ContainmentApi.move(wardrobe, park);
    const first = wardrobe.getEntryExit();
    ContainmentApi.move(wardrobe, park2);
    const second = wardrobe.getEntryExit();
    expect(second).toBeDefined();
    expect(second).toBe(first);
    expect(second!.getSource()).toBe(park2);
  });

  it('includes the out exit in getObviousExits', async () => {
    ContainmentApi.move(wardrobe, park);
    const obvious = wardrobe.getObviousExits();
    const directions = obvious.map((e) => e.getDirection());
    expect(directions).toContain('out');
  });

  describe('containment constraint (ContainmentApi)', () => {
    it('cannot be placed in a non-Exitable container', async () => {
      const box = makeStuff(() => new PlainContainer());
      expect(() => ContainmentApi.move(wardrobe, box)).toThrow(ContainmentError);
    });

    it('can move between Exitables when zones agree', async () => {
      // Pre-stamp the wardrobe (clone-time would do this); move
      // does not back-fill or restamp.
      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park);
      ContainmentApi.move(wardrobe, park2);
      expect(wardrobe.getContainer()).toBe(park2);
      expect(wardrobe.getZone()).toBe(zone);
    });

    it('cannot move between Exitables in different zones', async () => {
      const otherZone = makeStuff(() => new CartesianZone());
      const otherPark = makeStuff(() => new Location());
      otherZone.addLocation(otherPark, 0, 0, 0);

      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park);
      expect(() => ContainmentApi.move(wardrobe, otherPark)).toThrow(ContainmentError);
    });

    it('⭐ may go down the column of the water it belongs to (the diving bell — underwater walk)', async () => {
      // A water's bands are the column's zone; the bell is its quay's. The
      // one opening: the band's SURFACE is in the vessel's own zone.
      const columnZone = makeStuff(() => new CartesianZone());
      const band = makeStuff(() => new Location());
      columnZone.addLocation(band, 0, 0, 0);
      const real = MixinApi.isWaterPlace.bind(MixinApi);
      vi.spyOn(MixinApi, 'isWaterPlace').mockImplementation(((o: Stuff) => o === band || real(o)) as never);
      Object.assign(band, { surfacePlace: () => park });

      try {
        Stuff._stampZone(wardrobe, zone);
        ContainmentApi.move(wardrobe, park);
        ContainmentApi.move(wardrobe, band);
        expect(wardrobe.getContainer()).toBe(band);
        expect(wardrobe.getZone()).toBe(zone);
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('move does not back-fill zone on a Exitable that was never stamped', async () => {
      // Without a zone stamp, the cross-zone invariant is silent
      // (the `item.zone && item.zone !== to.zone` guard short-
      // circuits on null), and the move does NOT pick up the
      // destination's zone — that's a clone-time concern.
      ContainmentApi.move(wardrobe, park);
      expect(wardrobe.getZone()).toBeNull();
    });
  });

  describe('the door is the vessel\'s own seal (boundary build D11)', () => {
    it('the synthesized out and entry exits carry no boundary', async () => {
      ContainmentApi.move(wardrobe, park);
      expect(wardrobe.getExit('out')!.getBoundary()).toBeNull();
      expect(wardrobe.getEntryExit()!.getBoundary()).toBeNull();
      expect(wardrobe.getExit('out')!.wayState()).toBe('open');
    });

    it('a move rebinds the same out exit, still with no boundary', async () => {
      ContainmentApi.move(wardrobe, park);
      const firstOut = wardrobe.getExit('out')!;
      Stuff._stampZone(wardrobe, zone);
      ContainmentApi.move(wardrobe, park2);
      const secondOut = wardrobe.getExit('out')!;
      expect(secondOut).toBe(firstOut);
      expect(secondOut.getDestination()).toBe(park2);
      expect(secondOut.getBoundary()).toBeNull();
    });
  });
});
