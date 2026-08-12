/**
 * Container destruct-time evacuation tests (S1).
 *
 * When a Container is destructed via `StuffApi.destruct`, the
 * framework `cleanupOnDestruct` on `ContainerMixin` evacuates every
 * Containable in `contents`. Policy:
 *   - Non-null outer: re-parent to the destructing host's own outer
 *     via `ContainmentApi.move` (with `onMoved` witnesses firing).
 *   - Null outer (top-of-containment): per-item policy —
 *     HasInteractive items escape to the void singleton, everything
 *     else cascade-destructs.
 *
 * Companion to the dispatcher tests in
 * `src/mud/api/__tests__/stuff.cleanup.test.ts`; this file focuses
 * on the substrate behavior end-to-end.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { ContainableMixin, type Containable } from '../Containable';
import { ContainerMixin, type Container } from '../Container';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import type { Stuff } from '../../stuff/Stuff';
import { Idea } from '../../stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { AppApi } from '../../../api/app';

// The evac target is the `evacuationFallback` app setting (default
// `/domain/void`). `AppApi.setting` reads a boot-warmed cache that this
// PM-less unit test doesn't have, so we mock it to the configured path.
const EVAC_PATH = '/domain/void';

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

// Containable + HasInteractive — Avatar shape. Stand-in for any
// connection-bound body that must escape rather than cascade-destruct
// when its container disappears with no outer.
class Avatar extends HasInteractiveMixin(ContainableMixin(Idea)) {
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
    vi.spyOn(AppApi, 'setting').mockReturnValue(EVAC_PATH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('top-of-containment destruct cascade-destructs non-HasInteractive contents', () => {
    const room = makeStuff(() => new Room());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(apple, room);
    StuffApi.destruct(room);
    // Apple cascade-destructs along with its container. (Calling a
    // proxy method on a destroyed Stuff throws, so check `isDestroyed`
    // which is one of the allowed post-destruct reads.)
    expect(apple.isDestroyed()).toBe(true);
  });

  it('Container-only host (no Containable layer) cascade-destructs contents', () => {
    // Room is Container without Containable — its outer is treated
    // as null even though it isn't reachable as Containable. Same
    // cascade-destruct policy as a Containable host with a null
    // outer.
    const room = makeStuff(() => new Room());
    const item = makeStuff(() => new Item());
    ContainmentApi.move(item, room);
    StuffApi.destruct(room);
    expect(item.isDestroyed()).toBe(true);
  });

  it('top-of-containment destruct moves HasInteractive contents to the void', () => {
    // The void singleton needs to exist for the escape route to
    // resolve; in production it's bootstrap-pinned. Here we stamp a
    // stand-in Room at the evacuationFallback path and verify the
    // avatar lands in it instead of cascade-destructing.
    const voidRoom = makeStuffAtPath(() => new Room(), EVAC_PATH);
    const room = makeStuff(() => new Room());
    const avatar = makeStuff(() => new Avatar());
    ContainmentApi.move(avatar, room);

    StuffApi.destruct(room);

    expect(avatar.isDestroyed()).toBe(false);
    expect(avatar.getContainer()).toBe(voidRoom);
    expect(avatar.movesObserved.at(-1)).toEqual([room, voidRoom]);
  });

  it('null-outer cascade with mixed contents: HI escapes, non-HI destructs', () => {
    const voidRoom = makeStuffAtPath(() => new Room(), EVAC_PATH);
    const room = makeStuff(() => new Room());
    const avatar = makeStuff(() => new Avatar());
    const apple = makeStuff(() => new Item());
    ContainmentApi.move(avatar, room);
    ContainmentApi.move(apple, room);

    StuffApi.destruct(room);

    expect(avatar.isDestroyed()).toBe(false);
    expect(avatar.getContainer()).toBe(voidRoom);
    expect(apple.isDestroyed()).toBe(true);
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
    // a destroyed Container — the kind of stale ref the cleanup
    // chokepoint normally prevents. R2.3 self-heal is the backstop.
    //
    // Construction: destruct a Room (the apple is NOT inside it, so
    // the cleanup cascade doesn't touch the apple), then synthesise
    // the stale ref by stamping the destroyed Room into the apple's
    // `environment` field via cast — a hypothetical bypass of the
    // setContainer chokepoint. Self-heal must detect on read and
    // clear the slot.
    const deadRoom = makeStuff(() => new Room());
    StuffApi.destruct(deadRoom);
    const apple = makeStuff(() => new Item());

    (apple as unknown as { environment: unknown }).environment = deadRoom;
    // First read returns null AND clears the slot.
    expect(apple.getContainer()).toBeNull();
    // Slot is now cleared — second read is unchanged.
    expect(
      (apple as unknown as { environment: unknown }).environment
    ).toBeNull();
  });
});
