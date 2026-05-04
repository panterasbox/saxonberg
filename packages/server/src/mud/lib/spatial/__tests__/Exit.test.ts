import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Exit } from '../Exit';
import { Door } from '../Door';
import { CartesianLocation } from '../CartesianLocation';
import { CartesianZone } from '../CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../../stuff/Stuff';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../Containable';
import { MobileMixin } from '../Mobile';
import { NamedMixin } from '../../character/Named';
import { makeStuff } from '../../security/__tests__/test-setup';

const SensorBase = NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Stuff))));
class TestMover extends SensorBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

const PeerBase = NamedMixin(SensorMixin(ContainableMixin(Stuff)));
class PeerSensor extends PeerBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

describe('Exit', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let mover: TestMover;
  let peerInA: PeerSensor;
  let peerInB: PeerSensor;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    roomA = makeStuff(() => new CartesianLocation());
    roomA.shortDescription = 'Room A';

    roomB = makeStuff(() => new CartesianLocation());
    roomB.shortDescription = 'Room B';

    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);

    mover = makeStuff(() => new TestMover());
    mover.firstName = 'Alice';
    ContainmentApi.move(mover, roomA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.firstName = 'PeerA';
    ContainmentApi.move(peerInA, roomA);

    peerInB = makeStuff(() => new PeerSensor());
    peerInB.firstName = 'PeerB';
    ContainmentApi.move(peerInB, roomB);
  });

  function bodiesOf(frames: unknown[]): string[] {
    return frames.map((f) => (f as { body: string }).body);
  }

  describe('canTraverse', () => {
    it('returns ok in the normal case', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });

    it('returns not ok when blocked', () => {
      const exit = makeStuff(() => new Exit({
        direction: 'north',
        source: roomA,
        destination: roomB,
        blocked: true,
      }));
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/blocked/i);
    });

    it('returns not ok when door is closed', () => {
      const door = makeStuff(() => new Door());
      door.shortDescription = 'oak door';
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB, door }));
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/closed/i);
      expect(result.reason).toContain('oak door');
    });

    it('returns ok when door is open', () => {
      const door = makeStuff(() => new Door());
      door.shortDescription = 'oak door';
      door.open();
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB, door }));
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });
  });

  describe('traverse', () => {
    it('moves the mover to the destination', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      mover.traverse(exit);
      expect(mover.getEnvironment()).toBe(roomB);
    });

    it('broadcasts departure to source peers excluding the mover', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      mover.traverse(exit);

      const peerATexts = bodiesOf(peerInA.received);
      expect(peerATexts.length).toBe(1);
      expect(peerATexts[0]).toContain('leaves to the');
      expect(peerATexts[0]).toContain('north');

      const peerBTexts = bodiesOf(peerInB.received);
      expect(peerBTexts.length).toBe(1);
      expect(peerBTexts[0]).toContain('arrives from the');
      expect(peerBTexts[0]).toContain('south');
    });

    it('uses custom messageIn/messageOut when provided', () => {
      const exit = makeStuff(() => new Exit({
        direction: 'north',
        source: roomA,
        destination: roomB,
        messageOut: 'custom departure',
        messageIn: 'custom arrival',
      }));
      mover.traverse(exit);
      expect(bodiesOf(peerInA.received)).toEqual(['custom departure']);
      expect(bodiesOf(peerInB.received)).toEqual(['custom arrival']);
    });

    it('interpolates {mover} in custom messages', () => {
      const exit = makeStuff(() => new Exit({
        direction: 'out',
        source: roomA,
        destination: roomB,
        messageOut: '{mover} leaves the wardrobe.',
        messageIn: '{mover} emerges from the wardrobe.',
      }));
      mover.traverse(exit);
      expect(bodiesOf(peerInA.received)).toEqual(['Alice leaves the wardrobe.']);
      expect(bodiesOf(peerInB.received)).toEqual(['Alice emerges from the wardrobe.']);
    });

    it('degrades arrival message when direction has no inverse', () => {
      const exit = makeStuff(() => new Exit({ direction: 'office', source: roomA, destination: roomB }));
      mover.traverse(exit);
      const arrText = bodiesOf(peerInB.received)[0]!;
      expect(arrText).toContain('arrives');
      expect(arrText).not.toContain('from the');
    });

    it('invokes ContainmentApi.move between broadcasts', () => {
      const moveSpy = vi.spyOn(ContainmentApi, 'move');
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      mover.traverse(exit);
      expect(moveSpy).toHaveBeenCalledWith(mover, roomB);
      moveSpy.mockRestore();
    });
  });

  describe('inverse back-pointer', () => {
    it('is undefined on a freshly-constructed Exit', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      expect(exit.inverse).toBeUndefined();
    });

    it('addBidirectionalExit wires both inverse pointers', () => {
      roomA.addBidirectionalExit(roomB, 'north');
      const forward = roomA.getExit('north');
      const back = roomB.getExit('south');
      expect(forward).toBeDefined();
      expect(back).toBeDefined();
      expect(forward!.inverse).toBe(back);
      expect(back!.inverse).toBe(forward);
    });

    it('inverse?.direction returns the opposite cardinal', () => {
      roomA.addBidirectionalExit(roomB, 'north');
      const forward = roomA.getExit('north')!;
      expect(forward.inverse?.direction).toBe('south');
    });

    it('one-way addExit leaves inverse undefined', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: roomA, destination: roomB }));
      roomA.addExit(exit);
      expect(exit.inverse).toBeUndefined();
    });
  });
});
