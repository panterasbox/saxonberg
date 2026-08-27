import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { LockableMixin } from '../Locked';
import Exit from '../Exit';
import Door from '../../../platform/thing/Door';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { MobileMixin } from '../../spatial/Mobile';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestLockable extends LockableMixin(Idea) {}

const MoverBase = NamedMixin(
  MobileMixin(SensorMixin(ContainableMixin(Idea)))
);
class TestMover extends MoverBase {
  protected override handleMessage(): void {}
}

describe('LockableMixin', () => {
  it('defaults to unlocked', () => {
    const s = makeStuff(() => new TestLockable());
    expect(s.isLocked()).toBe(false);
  });

  it('lock() and unlock() flip state idempotently', () => {
    const s = makeStuff(() => new TestLockable());
    s.lock();
    expect(s.isLocked()).toBe(true);
    s.lock();
    expect(s.isLocked()).toBe(true);
    s.unlock();
    expect(s.isLocked()).toBe(false);
    s.unlock();
    expect(s.isLocked()).toBe(false);
  });

  it('setLocked flips state and rejects non-boolean', () => {
    const s = makeStuff(() => new TestLockable());
    s.setLocked(true);
    expect(s.isLocked()).toBe(true);
    s.setLocked(false);
    expect(s.isLocked()).toBe(false);
    expect(() => s.setLocked(1 as unknown as boolean)).toThrow(TypeError);
  });

  it('MixinApi.isLockable narrows correctly', () => {
    const s = makeStuff(() => new TestLockable());
    expect(MixinApi.isLockable(s)).toBe(true);
  });

  it('declares persistent field "locked" (noun form)', () => {
    expect(
      MixinApi.getAllPersistentFields(TestLockable)
    ).toContain('locked');
  });

  it('Door composes LockableMixin', () => {
    const door = makeStuff(() => new Door());
    expect(MixinApi.isLockable(door)).toBe(true);
    expect(door.isLocked()).toBe(false);
  });
});

describe('Exit.canTraverse — locked gate', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let mover: TestMover;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Location A');
    zone.addLocation(locA, 0, 0, 0);
    mover = makeStuff(() => new TestMover());
    mover.setName('Alice');
    ContainmentApi.move(mover, locA);
  });

  it('vetoes with gate "locked" when the door is locked', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('iron gate');
    door.setLocked(true);
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locA,
          door,
        })
    );
    const result = exit.canTraverse(mover);
    expect(result.ok).toBe(false);
    expect(result.gate).toBe('locked');
    expect(result.reason).toMatch(/locked/i);
    // Sentence-start: the presentation is capitalized, no re-prefixed
    // article ("Iron gate is locked.", not "The iron gate…").
    expect(result.reason).toMatch(/iron gate/i);
  });

  it('locked gate fires BEFORE the closed-door gate', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('iron gate');
    // closed AND locked → should report locked, not closed
    door.setLocked(true);
    expect(door.isOpen()).toBe(false);
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locA,
          door,
        })
    );
    const result = exit.canTraverse(mover);
    expect(result.gate).toBe('locked');
  });

  it('is safe with a dangling/unresolvable destination — never resolves it', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('iron gate');
    door.setLocked(true);
    // destinationPath points at an unloaded zone: resolving it would throw.
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destinationPath: '/zone/never-loaded',
          door,
        })
    );
    // Spy proves the destination getter is never touched during the veto.
    let resolved = false;
    const spy = exit as unknown as { getDestination(): unknown };
    const original = spy.getDestination.bind(spy);
    spy.getDestination = () => {
      resolved = true;
      return original();
    };

    let result: ReturnType<Exit['canTraverse']> | undefined;
    expect(() => {
      result = exit.canTraverse(mover);
    }).not.toThrow();
    expect(resolved).toBe(false);
    expect(result?.ok).toBe(false);
    expect(result?.gate).toBe('locked');
  });

  it('passes (no lock gate) when the door is unlocked and open', () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('iron gate');
    door.open();
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locA,
          door,
        })
    );
    expect(exit.canTraverse(mover)).toEqual({ ok: true });
  });
});
