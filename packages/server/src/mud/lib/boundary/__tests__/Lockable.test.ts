import "../../../../test-bootstrap";
import { StuffApi } from '../../../api/stuff';
import { describe, it, expect, beforeEach  } from 'vitest';
import { LockableMixin } from '../Lockable';
import Exit from '../Exit';
import Door from '../../../platform/thing/Door';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { MobileMixin } from '../../spatial/Mobile';
import { CredentialWalletMixin } from '../../credential/CredentialWallet';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';

class TestLockable extends LockableMixin(Idea) {}

const MoverBase = NamedMixin(
  MobileMixin(CredentialWalletMixin(SensorMixin(ContainableMixin(Idea))))
);
class TestMover extends MoverBase {
  protected override handleMessage(): void {}
}

describe('LockableMixin', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

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

  it('Door composes LockableMixin', async () => {
    const door = await StuffApi.create(() => new Door());
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

  it('vetoes with gate "locked" when the door is locked', async () => {
    const door = await StuffApi.create(() => new Door());
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

  it('locked gate fires BEFORE the closed-door gate', async () => {
    const door = await StuffApi.create(() => new Door());
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

  it('is safe with a dangling/unresolvable destination — never resolves it', async () => {
    const door = await StuffApi.create(() => new Door());
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

  it('passes (no lock gate) when the door is unlocked and open', async () => {
    const door = await StuffApi.create(() => new Door());
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

/**
 * ⭐⭐⭐ The reconciliation itself: **the bolt refuses, the key excuses.**
 *
 * Before the lock build these two facts lived in different objects — a
 * boolean bolt on a `Door` Thing with no keyway, and a keyway on three
 * Exit subclasses with no bolt — so neither of these cases could be
 * expressed at all. The first is what makes `lock` worth having; the
 * second is what makes `unlock` worth having.
 */
describe('Exit.canTraverse — the keyway, not just the bolt', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let mover: TestMover;
  const KEYWAY = 'kw-front-door';

  beforeEach(() => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Location A');
    zone.addLocation(locA, 0, 0, 0);
    mover = makeStuff(() => new TestMover());
    mover.setName('Alice');
    ContainmentApi.move(mover, locA);
  });

  async function keyedDoor(): Promise<Door> {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('front door');
    door.setKeyway(KEYWAY);
    door.setLocked(true);
    door.setOpen(true);
    return door;
  }

  function exitWith(door: Door): Exit {
    return makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locA,
          door,
        }),
    );
  }

  it('⭐⭐ a key-holder walks through a LOCKED door without unlocking it', async () => {
    const door = await keyedDoor();
    mover.ensureCredential('key').addKey(KEYWAY, 'pin-tumbler');
    const result = exitWith(door).canTraverse(mover);
    expect(result.ok, `refused: ${result.reason ?? ''}`).toBe(true);
    // ⚠ And the bolt is untouched — passage is not an unlock.
    expect(door.isLocked()).toBe(true);
  });

  it('⛔ a stranger is still refused at the same door', async () => {
    const result = exitWith(await keyedDoor()).canTraverse(mover);
    expect(result.ok).toBe(false);
    expect(result.gate).toBe('locked');
  });

  it('⛔ a key for a DIFFERENT keyway does not open it', async () => {
    const door = await keyedDoor();
    mover.ensureCredential('key').addKey('kw-somewhere-else', 'pin-tumbler');
    const result = exitWith(door).canTraverse(mover);
    expect(result.ok).toBe(false);
    expect(result.gate).toBe('locked');
  });

  it('⛔ the right keyway in the WRONG technology does not open it', async () => {
    const door = await keyedDoor();
    mover.ensureCredential('key').addKey(KEYWAY, 'keycard');
    expect(exitWith(door).canTraverse(mover).ok).toBe(false);
  });

  it('⭐⭐ once UNLOCKED, a stranger with no key walks through', async () => {
    // The capability the old keyed-exit model could not express at all:
    // leaving your own door open for everybody else.
    const door = await keyedDoor();
    door.unlock();
    expect(exitWith(door).canTraverse(mover).ok).toBe(true);
  });

  it('⚠ an EMPTY keyway opens for nobody, key or no key', async () => {
    const door = await keyedDoor();
    door.setKeyway('');
    mover.ensureCredential('key').addKey(KEYWAY, 'pin-tumbler');
    const result = exitWith(door).canTraverse(mover);
    expect(result.ok).toBe(false);
    expect(result.gate).toBe('locked');
  });

  it('a master key for the technology opens it', async () => {
    const door = await keyedDoor();
    mover.ensureCredential('key').addMaster('pin-tumbler');
    expect(exitWith(door).canTraverse(mover).ok).toBe(true);
  });

  it('declares the keyway and technology as persistent authorable fields', () => {
    const meta = (TestLockable as unknown as { fieldMeta: Record<string, unknown> })
      .fieldMeta;
    for (const field of ['locked', 'keyway', 'lockTechnology']) {
      expect(meta[field], `${field} is declared`).toMatchObject({
        persistent: true,
        authorable: true,
      });
    }
  });
});
