/**
 * `ExitableMixin.getObviousNeighbours` — the five hazard guards, in
 * the one place they now live.
 *
 * ⚠⚠ **Every guard here is a real incident, not a hypothesis**, and
 * each had been written out separately in four propagation walks plus
 * two `Atmospheric` counters. That is six chances to be missing one,
 * and the comments in `Atmospheric` admitted they had been *copied
 * from the light walk*. A test per guard is the point: the reason to
 * put them in one place is only worth anything if the one place is
 * right.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Exit from '../Exit';
import Door from '../../../platform/thing/Door';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';

describe('getObviousNeighbours', () => {
  let zone: CartesianZone;
  let here: CartesianLocation;
  let there: CartesianLocation;

  beforeEach(() => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    here = makeStuff(() => new CartesianLocation());
    there = makeStuff(() => new CartesianLocation());
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);
  });

  it('pairs each obvious exit with the live room it reaches', async () => {
    await here.addBidirectionalExit(there, 'north');
    const out = here.getObviousNeighbours();
    expect(out).toHaveLength(1);
    expect(out[0]!.dest).toBe(there);
    expect(out[0]!.exit.getDirection()).toBe('north');
  });

  it('omits a HIDDEN exit — it is not obvious', async () => {
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: here, destination: there }),
    );
    exit.setHidden(true);
    await here.addExit(exit);
    expect(here.getObviousNeighbours()).toEqual([]);
  });

  describe('doors — the one axis callers genuinely differ on', () => {
    it("by default SKIPS a doored exit, open or shut (the boundary walk's)", async () => {
      await here.addBidirectionalExit(there, 'north');
      const door = makeStuff(() => new Door());
      here.getExit('north')!.setDoor(door);
      door.setOpen(true);
      expect(here.getObviousNeighbours()).toEqual([]);
      expect(here.getObviousNeighbours({ doors: 'skip' })).toEqual([]);
    });

    it("'open-only' keeps an OPEN door and drops a shut one (an opening)", async () => {
      await here.addBidirectionalExit(there, 'north');
      const door = makeStuff(() => new Door());
      here.getExit('north')!.setDoor(door);

      door.setOpen(true);
      expect(here.getObviousNeighbours({ doors: 'open-only' })).toHaveLength(1);

      door.setOpen(false);
      expect(here.getObviousNeighbours({ doors: 'open-only' })).toEqual([]);
    });
  });

  describe('the five guards', () => {
    it('1 · an exit that names NO ROOM is dropped (the wardrobe names the wire)', async () => {
      await here.addBidirectionalExit(there, 'north');
      const exit = here.getExit('north')!;
      vi.spyOn(exit, 'hasSpatialDestination').mockReturnValue(false);
      expect(here.getObviousNeighbours()).toEqual([]);
    });

    it('2 · a destination template with NO live clone is dropped, not resolved', async () => {
      // A Warren hub exit names a template with many live clones and
      // the singleton lookup THROWS on it; the guard is existence, not
      // identity. Nothing registered at this path ⇒ nothing live.
      await here.addBidirectionalExit(there, 'north');
      const exit = here.getExit('north')!;
      vi.spyOn(exit, 'getDestinationTemplatePath').mockReturnValue(
        '/test/nowhere/unminted',
      );
      expect(StuffApi.findAllByTemplatePath('/test/nowhere/unminted')).toHaveLength(0);
      expect(here.getObviousNeighbours()).toEqual([]);
    });

    it('3 · a THROWING getDestination is caught, not propagated', async () => {
      await here.addBidirectionalExit(there, 'north');
      const exit = here.getExit('north')!;
      vi.spyOn(exit, 'getDestinationTemplatePath').mockReturnValue(null);
      vi.spyOn(exit, 'getDestination').mockImplementation(() => {
        throw new Error('resolve failed');
      });
      expect(() => here.getObviousNeighbours()).not.toThrow();
      expect(here.getObviousNeighbours()).toEqual([]);
    });

    it('4 · a far side that is not a CONTAINER is dropped', async () => {
      await here.addBidirectionalExit(there, 'north');
      const exit = here.getExit('north')!;
      vi.spyOn(exit, 'getDestinationTemplatePath').mockReturnValue(null);
      vi.spyOn(exit, 'getDestination').mockReturnValue(
        makeStuff(() => new Exit({ direction: 'x', source: here, destination: there })) as never,
      );
      expect(here.getObviousNeighbours()).toEqual([]);
    });

    it('5 · a room REAPED MID-WALK is dropped — a destroyed proxy answers undefined', async () => {
      await here.addBidirectionalExit(there, 'north');
      vi.spyOn(there, 'isDestroyed').mockReturnValue(true);
      expect(here.getObviousNeighbours()).toEqual([]);
    });
  });
});
