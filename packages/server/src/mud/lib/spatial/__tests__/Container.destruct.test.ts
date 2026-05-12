/**
 * Container destruct-time evacuation tests (S1).
 *
 * When a Container is destructed via `StuffApi.destruct`, the
 * framework `cleanupOnDestruct` on `ContainerMixin` re-parents every
 * Containable in `contents` to the destructing Container's own outer
 * container (or `null` at top-of-containment), via the canonical
 * `ContainmentApi.move` chokepoint so `onMoved` witnesses fire.
 *
 * Companion to the dispatcher tests in
 * `src/mud/api/__tests__/stuff.cleanup.test.ts`; this file focuses
 * on the substrate behavior end-to-end.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { ContainableMixin, type Containable } from '../Containable';
import { ContainerMixin, type Container } from '../Container';
import type { Stuff } from '../../stuff/Stuff';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

// Container that's also Containable — backpack-in-room shape.
// Convention: Container is the most-derived (outer) mixin so its
// `cleanupOnDestruct` fires first in the most-derived-first walk.
class Bag extends ContainerMixin(ContainableMixin(Idea)) {
  public movesObserved: Array<[
    (Stuff & Container) | null,
    (Stuff & Container) | null,
  ]> = [];
  onMoved?(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    this.movesObserved.push([from, to]);
  }
}

// Container only — top-of-containment shape (Location-like).
class Room extends ContainerMixin(Idea) {}

// Plain Containable item with onMoved capture.
class Item extends ContainableMixin(Idea) {
  public movesObserved: Array<[
    (Stuff & Container) | null,
    (Stuff & Container) | null,
  ]> = [];
  onMoved?(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    this.movesObserved.push([from, to]);
  }
}

describe('Container.cleanupOnDestruct — S1 evacuation to outer', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('evacuates contents to the outer container on Container destruct', () => {
    const room = makeStuff(() => new Room());
    const bag = makeStuff(() => new Bag());
    const apple = makeStuff(() => new Item());
    const sword = makeStuff(() => new Item());

    ContainmentApi.move(bag, room);
    ContainmentApi.move(apple, bag);
    ContainmentApi.move(sword, bag);

    StuffApi.destruct(bag);

    expect(apple.getContainer()).toBe(room);
    expect(sword.getContainer()).toBe(room);
    // Items witnessed the bag → room move.
    expect(apple.movesObserved.at(-1)).toEqual([bag, room]);
    expect(sword.movesObserved.at(-1)).toEqual([bag, room]);
  });

  it('top-of-containment destruct evacuates contents to null', () => {
    const room = makeStuff(() => new Room());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(apple, room);
    StuffApi.destruct(room);
    expect(apple.getContainer()).toBeNull();
    expect(apple.movesObserved.at(-1)).toEqual([room, null]);
  });

  it('Container-only host (no Containable layer) evacuates to null', () => {
    // Room is Container without Containable — its outer is treated
    // as null even though it isn't reachable as Containable.
    const room = makeStuff(() => new Room());
    const item = makeStuff(() => new Item());
    ContainmentApi.move(item, room);
    StuffApi.destruct(room);
    expect(item.getContainer()).toBeNull();
  });

  it('nested containers: destructing the middle container re-parents up', () => {
    // box-in-bag-in-room. Destruct the bag; box ends up in the
    // room with its OWN contents intact.
    const room = makeStuff(() => new Room());
    const bag = makeStuff(() => new Bag());
    const box = makeStuff(() => new Bag());
    const apple = makeStuff(() => new Item());

    ContainmentApi.move(bag, room);
    ContainmentApi.move(box, bag);
    ContainmentApi.move(apple, box);

    StuffApi.destruct(bag);

    expect(box.getContainer()).toBe(room);
    // box's own contents are NOT cascaded — Container cleanup is
    // re-parent, not cascade-destruct.
    expect(apple.getContainer()).toBe(box);
    expect(box.isDestroyed()).toBe(false);
  });

  it('walk order: Container fires before Containable for the destructing host', () => {
    // Without correct ordering, Containable's self-unhook would
    // null out `_container` first, and the evacuation would land
    // items in `null` instead of `room`. The most-derived-first
    // queryMixins walk gets us the right behavior.
    const room = makeStuff(() => new Room());
    const bag = makeStuff(() => new Bag());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(bag, room);
    ContainmentApi.move(apple, bag);

    StuffApi.destruct(bag);

    expect(apple.getContainer()).toBe(room);
    // The destructed bag is unhooked from room's contents AND
    // its onMoved fired (from=room, to=null) — Containable's
    // cleanup ran after the evacuation.
    expect(bag.movesObserved.at(-1)).toEqual([room, null]);
    expect(room.getContents().includes(bag as Stuff & Containable)).toBe(
      false
    );
  });

  it('iteration safety: mutating set during cleanup walk does not skip items', () => {
    // ContainmentApi.move(item, outer) calls setContainer, which
    // invokes the container's removeContainable on the destructing
    // host — mutating `contents` mid-loop. The snapshot from
    // getContents() prevents skipped entries.
    const room = makeStuff(() => new Room());
    const bag = makeStuff(() => new Bag());
    ContainmentApi.move(bag, room);

    const items: Item[] = [];
    for (let i = 0; i < 8; i++) {
      const item = makeStuff(() => new Item());
      ContainmentApi.move(item, bag);
      items.push(item);
    }

    StuffApi.destruct(bag);

    for (const item of items) {
      expect(item.getContainer()).toBe(room);
    }
  });
});

describe('Containable.cleanupOnDestruct — S2 unhook from contents', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('destructed item is removed from its container contents set', () => {
    const room = makeStuff(() => new Room());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(apple, room);
    expect(room.hasContainable(apple as Stuff & Containable)).toBe(true);

    StuffApi.destruct(apple);

    expect(room.hasContainable(apple as Stuff & Containable)).toBe(false);
    expect(room.getContents().length).toBe(0);
  });

  it('unhook fires onMoved(from, null) on the item AND onContainableRemoved on the container', () => {
    class WitnessRoom extends ContainerMixin(Idea) {
      public removes: Array<Stuff & Containable> = [];
      onContainableRemoved?(item: Stuff & Containable): void {
        this.removes.push(item);
      }
    }
    const room = makeStuff(() => new WitnessRoom());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(apple, room);

    StuffApi.destruct(apple);

    expect(room.removes).toContain(apple as Stuff & Containable);
    expect(apple.movesObserved.at(-1)).toEqual([room, null]);
  });
});

describe('Containable.getContainer — R2.3 self-heal backstop', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('returns null and clears the slot when the environment is destroyed', () => {
    // Simulate the bug case: an item's environment field points at
    // a destroyed Container. Normal path goes through framework
    // cleanup — this test forces the bypass by destructing the
    // Container outside the contained item's lifetime, then
    // re-checking via getContainer().
    //
    // We use forceDestruct's call path isn't accessible (AdminOnly
    // stub denies), so instead we hand-roll: destruct the room
    // FIRST while the item still references it.
    //
    // Trick: destructing the room normally evacuates contents to
    // null already (Container cleanup). To exercise the backstop
    // we'd need a path that bypasses Container cleanup. The
    // simplest reproducer is to bypass ContainmentApi entirely:
    // mark a fresh stuff as destroyed via the Stuff lifecycle but
    // leave the back-pointer intact.
    //
    // We do this by destructing room WHILE its cleanup is
    // explicitly inhibited. Easiest: subclass Room and skip
    // ContainerMixin.cleanupOnDestruct contributions via a
    // construction-side hack — but the static is mixin-only and
    // can't be removed.
    //
    // Practical test: destruct room normally (which evacuates),
    // then verify the self-heal is idempotent. Then construct a
    // synthetic bug case by re-assigning the destroyed room
    // through the protected accessor pair via cast.
    const room = makeStuff(() => new Room());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(apple, room);
    // Cache the room ref BEFORE destruct so we can re-inject it.
    const deadRoom = room;
    StuffApi.destruct(room);
    // Normal path already null'd it via Container cleanup.
    expect(apple.getContainer()).toBeNull();

    // Synthetic bug-case re-injection: stamp the dead room back
    // into the item's `environment` field. This bypasses
    // setContainer (which would refuse / error) by reaching the
    // raw target via a cast — simulating a hypothetical bypass.
    (apple as unknown as { environment: unknown }).environment = deadRoom;
    // First read returns null AND clears the slot.
    expect(apple.getContainer()).toBeNull();
    // Slot is now cleared — second read is unchanged.
    expect(
      (apple as unknown as { environment: unknown }).environment
    ).toBeNull();
  });
});
