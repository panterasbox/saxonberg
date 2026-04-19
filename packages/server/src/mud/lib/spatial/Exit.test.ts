import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Exit } from './Exit';
import { Door } from './Door';
import { CartesianLocation } from './CartesianLocation';
import { CartesianZone } from './CartesianZone';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { StuffApi } from '../../api/stuff';
import { Stuff } from '../stuff/Stuff';
import { SensorMixin } from '../message/Sensor';
import { ContainableMixin } from './Containable';
import { MobileMixin } from './Mobile';
import { NamedMixin } from '../character/Named';

const SensorBase = NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Stuff))));
class TestMover extends SensorBase {
  received: unknown[] = [];
  onMessage(msg: unknown): void {
    super.onMessage(msg);
    this.received.push(msg);
  }
}

describe('Exit', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let mover: TestMover;

  beforeEach(() => {
    zone = new CartesianZone();
    StuffApi.register(zone);

    roomA = new CartesianLocation();
    StuffApi.register(roomA);
    roomA.shortDescription = 'Room A';

    roomB = new CartesianLocation();
    StuffApi.register(roomB);
    roomB.shortDescription = 'Room B';

    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);

    mover = new TestMover();
    StuffApi.register(mover);
    mover.firstName = 'Alice';
    ContainmentApi.move(mover, roomA);
  });

  describe('canTraverse', () => {
    it('returns ok in the normal case', () => {
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB });
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });

    it('returns not ok when blocked', () => {
      const exit = new Exit({
        direction: 'north',
        source: roomA,
        destination: roomB,
        blocked: true,
      });
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/blocked/i);
    });

    it('returns not ok when door is closed', () => {
      const door = new Door({ shortDescription: 'oak door' });
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB, door });
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/closed/i);
      expect(result.reason).toContain('oak door');
    });

    it('returns ok when door is open', () => {
      const door = new Door({ shortDescription: 'oak door' });
      door.open();
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB, door });
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });
  });

  describe('traverse', () => {
    it('moves the mover to the destination', () => {
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB });
      mover.traverse(exit);
      expect(mover.getEnvironment()).toBe(roomB);
    });

    it('broadcasts departure to source peers excluding the mover', () => {
      const spy = vi.spyOn(MessageApi, 'messageContents');
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB });
      mover.traverse(exit);

      const [firstCall, secondCall] = spy.mock.calls;
      expect(firstCall?.[0]).toBe(roomA);
      expect(firstCall?.[2]).toEqual({ exclude: mover });
      const depText = (firstCall?.[1] as { payload: { text: string } }).payload.text;
      expect(depText).toContain('leaves to the');
      expect(depText).toContain('north');

      expect(secondCall?.[0]).toBe(roomB);
      expect(secondCall?.[2]).toEqual({ exclude: mover });
      const arrText = (secondCall?.[1] as { payload: { text: string } }).payload.text;
      expect(arrText).toContain('arrives from the');
      expect(arrText).toContain('south');

      spy.mockRestore();
    });

    it('uses custom messageIn/messageOut when provided', () => {
      const spy = vi.spyOn(MessageApi, 'messageContents');
      const exit = new Exit({
        direction: 'north',
        source: roomA,
        destination: roomB,
        messageOut: 'custom departure',
        messageIn: 'custom arrival',
      });
      mover.traverse(exit);

      expect(
        (spy.mock.calls[0]?.[1] as { payload: { text: string } }).payload.text
      ).toBe('custom departure');
      expect(
        (spy.mock.calls[1]?.[1] as { payload: { text: string } }).payload.text
      ).toBe('custom arrival');
      spy.mockRestore();
    });

    it('interpolates {mover} in custom messages', () => {
      const spy = vi.spyOn(MessageApi, 'messageContents');
      const exit = new Exit({
        direction: 'out',
        source: roomA,
        destination: roomB,
        messageOut: '{mover} leaves the wardrobe.',
        messageIn: '{mover} emerges from the wardrobe.',
      });
      mover.traverse(exit);

      expect(
        (spy.mock.calls[0]?.[1] as { payload: { text: string } }).payload.text
      ).toBe('Alice leaves the wardrobe.');
      expect(
        (spy.mock.calls[1]?.[1] as { payload: { text: string } }).payload.text
      ).toBe('Alice emerges from the wardrobe.');
      spy.mockRestore();
    });

    it('degrades arrival message when direction has no inverse', () => {
      const spy = vi.spyOn(MessageApi, 'messageContents');
      const exit = new Exit({ direction: 'office', source: roomA, destination: roomB });
      mover.traverse(exit);
      const arrText = (spy.mock.calls[1]?.[1] as { payload: { text: string } }).payload.text;
      expect(arrText).toContain('arrives');
      expect(arrText).not.toContain('from the');
      spy.mockRestore();
    });

    it('invokes ContainmentApi.move between broadcasts', () => {
      const moveSpy = vi.spyOn(ContainmentApi, 'move');
      const exit = new Exit({ direction: 'north', source: roomA, destination: roomB });
      mover.traverse(exit);
      expect(moveSpy).toHaveBeenCalledWith(mover, roomB);
      moveSpy.mockRestore();
    });
  });
});
