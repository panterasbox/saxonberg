import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Exit } from '../Exit';
import { Door } from '../Door';
import { CartesianLocation } from '../CartesianLocation';
import { CartesianZone } from '../CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { ProxyApi } from '../../../api/proxy';
import { Stuff } from '../../stuff/Stuff';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../Containable';
import { MobileMixin } from '../Mobile';
import { NamedMixin } from '../../description/Named';
import { makeStuff } from '../../security/__tests__/test-setup';

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
  let locA: CartesianLocation;
  let locB: CartesianLocation;
  let mover: TestMover;
  let peerInA: PeerSensor;
  let peerInB: PeerSensor;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Room A');

    locB = makeStuff(() => new CartesianLocation());
    locB.setShortDescription('Room B');

    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);

    mover = makeStuff(() => new TestMover());
    mover.setName('Alice');
    ContainmentApi.move(mover, locA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.setName('PeerA');
    ContainmentApi.move(peerInA, locA);

    peerInB = makeStuff(() => new PeerSensor());
    peerInB.setName('PeerB');
    ContainmentApi.move(peerInB, locB);
  });

  function bodiesOf(frames: unknown[]): string[] {
    return frames.map((f) => (f as { body: string }).body);
  }

  describe('canTraverse', () => {
    it('returns ok in the normal case', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });

    it('returns not ok when blocked', () => {
      const exit = makeStuff(() => new Exit({
        direction: 'north',
        source: locA,
        destination: locB,
        blocked: true,
      }));
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/blocked/i);
    });

    it('returns not ok when door is closed', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('oak door');
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB, door }));
      const result = exit.canTraverse(mover);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/closed/i);
      expect(result.reason).toContain('oak door');
    });

    it('returns ok when door is open', () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('oak door');
      door.open();
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB, door }));
      expect(exit.canTraverse(mover)).toEqual({ ok: true });
    });
  });

  describe('traverse', () => {
    it('moves the mover to the destination', async () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      await mover.traverse(exit);
      expect(mover.getContainer()).toBe(locB);
    });

    it('broadcasts departure to source peers excluding the mover', async () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      await mover.traverse(exit);

      const peerATexts = bodiesOf(peerInA.received);
      expect(peerATexts.length).toBe(1);
      expect(peerATexts[0]).toContain('leaves to the');
      expect(peerATexts[0]).toContain('north');

      const peerBTexts = bodiesOf(peerInB.received);
      expect(peerBTexts.length).toBe(1);
      expect(peerBTexts[0]).toContain('arrives from the');
      expect(peerBTexts[0]).toContain('south');
    });

    it('uses custom messageIn/messageOut when provided', async () => {
      const exit = makeStuff(() => new Exit({
        direction: 'north',
        source: locA,
        destination: locB,
        messageOut: 'custom departure',
        messageIn: 'custom arrival',
      }));
      await mover.traverse(exit);
      expect(bodiesOf(peerInA.received)).toEqual(['custom departure']);
      expect(bodiesOf(peerInB.received)).toEqual(['custom arrival']);
    });

    it('interpolates {{ mover }} in custom messages', async () => {
      const exit = makeStuff(() => new Exit({
        direction: 'out',
        source: locA,
        destination: locB,
        messageOut: '{{ mover }} leaves the wardrobe.',
        messageIn: '{{ mover }} emerges from the wardrobe.',
      }));
      await mover.traverse(exit);
      const departText = bodiesOf(peerInA.received)[0]!;
      const arriveText = bodiesOf(peerInB.received)[0]!;
      expect(departText).toContain('Alice');
      expect(departText).toContain('leaves the wardrobe.');
      expect(departText).toContain(`stuff-id="${mover.stuffId}"`);
      expect(arriveText).toContain('Alice');
      expect(arriveText).toContain('emerges from the wardrobe.');
    });

    it('degrades arrival message when direction has no inverse', async () => {
      const exit = makeStuff(() => new Exit({ direction: 'office', source: locA, destination: locB }));
      await mover.traverse(exit);
      const arrText = bodiesOf(peerInB.received)[0]!;
      expect(arrText).toContain('arrives');
      expect(arrText).not.toContain('from the');
    });

    it('invokes ContainmentApi.move between broadcasts', async () => {
      const moveSpy = vi.spyOn(ContainmentApi, 'move');
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      await mover.traverse(exit);
      expect(moveSpy).toHaveBeenCalledWith(mover, locB);
      moveSpy.mockRestore();
    });
  });

  describe('inverse back-pointer', () => {
    it('is undefined on a freshly-constructed Exit', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      expect(exit.getInverse()).toBeUndefined();
    });

    it('addBidirectionalExit wires both inverse pointers', () => {
      locA.addBidirectionalExit(locB, 'north');
      const forward = locA.getExit('north');
      const back = locB.getExit('south');
      expect(forward).toBeDefined();
      expect(back).toBeDefined();
      expect(forward!.getInverse()).toBe(back);
      expect(back!.getInverse()).toBe(forward);
    });

    it('inverse?.direction returns the opposite cardinal', () => {
      locA.addBidirectionalExit(locB, 'north');
      const forward = locA.getExit('north')!;
      expect(forward.getInverse()?.getDirection()).toBe('south');
    });

    it('one-way addExit leaves inverse undefined', () => {
      const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB }));
      locA.addExit(exit);
      expect(exit.getInverse()).toBeUndefined();
    });
  });
});

describe('Exit lazy destination resolution', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('throws on sync destination access when path not loaded', () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const exit = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destinationPath: '/zone/never-loaded',
    }));

    expect(() => exit.getDestination()).toThrow(/not yet loaded/);
  });

  it('returns cached live destination once resolved', () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    const exit = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destinationPath: '/zone/b',
    }));

    expect(exit.getDestination()).toBe(b);
    expect(exit.getDestination()).toBe(b);
  });

  it('getDestinationTemplatePath returns the path regardless of resolution', () => {
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    const liveExit = makeStuff(() => new Exit({
      direction: 'east',
      source: a,
      destination: b,
    }));
    expect(liveExit.getDestinationTemplatePath()).toBe('/zone/b');

    const pathExit = makeStuff(() => new Exit({
      direction: 'west',
      source: b,
      destinationPath: '/zone/a',
    }));
    expect(pathExit.getDestinationTemplatePath()).toBe('/zone/a');
  });
});
