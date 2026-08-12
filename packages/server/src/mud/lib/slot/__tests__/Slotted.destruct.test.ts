/**
 * Slotted / Slottable destruct-time cleanup tests.
 *
 * Covers:
 *  - `Slottable.cleanupOnDestruct` migration from the old instance
 *    `onDestruct` (bypass-resistant; subclass overrides cannot skip).
 *  - `Slotted.cleanupOnDestruct` on the holder side (chair / avatar
 *    destruct actively vacates occupants through the canonical
 *    `Slotted.vacate(slot, candidate)` chokepoint, so the
 *    `onSlotReleased` witness chain fires).
 *  - Walk-order behavior for Container+Slotted composition (avatar
 *    with a wielded sword): Container cleanup evacuates the sword,
 *    Slotted cleanup vacates the slot — both fire correctly.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { Mixins } from '../../mixin';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

// ────────────────────────────────────────────────────────────────
// Slottable migration coverage.
// ────────────────────────────────────────────────────────────────

describe('Slottable.cleanupOnDestruct — migration from instance onDestruct', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  class Chair extends SlottedMixin(Idea) {
    constructor() {
      super();
      this.staticSlots = [
        { name: 'sit:1', accepts: Mixins.Slottable, capacity: 1 },
      ];
    }
  }

  class Sitter extends SlottableMixin(Idea) {}

  it('destructing a Slottable vacates its slots on every host', () => {
    const chair = makeStuff(() => new Chair());
    const sitter = makeStuff(() => new Sitter());
    chair.occupy(sitter, 'sit:1');
    expect(chair.getOccupant('sit:1')).toBe(sitter);

    StuffApi.destruct(sitter);

    expect(chair.getOccupant('sit:1')).toBeNull();
    expect(chair.isSlotOccupied('sit:1')).toBe(false);
  });

  it('subclass onDestruct that omits super.onDestruct() does NOT skip slot vacate', () => {
    let subOnDestructCalled = false;
    class StubbornSitter extends SlottableMixin(Idea) {
      override onDestruct(): void {
        subOnDestructCalled = true;
        // deliberately omits super.onDestruct() — the framework
        // cleanup must still fire because it's a static, not on
        // the prototype chain.
      }
    }
    const chair = makeStuff(() => new Chair());
    const sitter = makeStuff(() => new StubbornSitter());
    chair.occupy(sitter, 'sit:1');

    StuffApi.destruct(sitter);

    expect(subOnDestructCalled).toBe(true);
    expect(chair.getOccupant('sit:1')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// Slotted holder destruct — chair-and-sword scenarios.
// ────────────────────────────────────────────────────────────────

describe('Slotted.cleanupOnDestruct — active vacate via canonical chokepoint', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  class Chair extends SlottedMixin(Idea) {
    constructor() {
      super();
      this.staticSlots = [
        { name: 'sit:1', accepts: Mixins.Slottable, capacity: 1 },
      ];
    }
  }

  class Sitter extends SlottableMixin(Idea) {
    public releasedFrom: Array<[unknown, string]> = [];
    onSlotReleased?(host: unknown, slotName: string): void {
      this.releasedFrom.push([host, slotName]);
    }
  }

  it('Chair destructs → sitter receives onSlotReleased witness', () => {
    const chair = makeStuff(() => new Chair());
    const sitter = makeStuff(() => new Sitter());
    chair.occupy(sitter, 'sit:1');

    StuffApi.destruct(chair);

    expect(sitter.releasedFrom).toHaveLength(1);
    expect(sitter.releasedFrom[0]![1]).toBe('sit:1');
  });

  it('multi-occupant slots all receive vacate witnesses', () => {
    class WideRoom extends SlottedMixin(Idea) {
      constructor() {
        super();
        this.staticSlots = [
          {
            name: 'ground:1',
            accepts: Mixins.Slottable,
            // Use a finite capacity to keep the test deterministic.
            capacity: 8,
          },
        ];
      }
    }
    const room = makeStuff(() => new WideRoom());
    const a = makeStuff(() => new Sitter());
    const b = makeStuff(() => new Sitter());
    const c = makeStuff(() => new Sitter());
    room.occupy(a, 'ground:1');
    room.occupy(b, 'ground:1');
    room.occupy(c, 'ground:1');

    StuffApi.destruct(room);

    expect(a.releasedFrom).toHaveLength(1);
    expect(b.releasedFrom).toHaveLength(1);
    expect(c.releasedFrom).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────
// Walk-order check: Container + Slotted composition.
// ────────────────────────────────────────────────────────────────

describe('Walk order: Container fires before Slotted on a composed host', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  // Avatar-like: holds contents AND has slots. Composition reads
  // most-derived (Container) outermost so its cleanup fires first.
  class Avatar extends ContainerMixin(
    SlottedMixin(ContainableMixin(Idea))
  ) {
    constructor() {
      super();
      this.staticSlots = [
        { name: 'hand:right', accepts: Mixins.Slottable, capacity: 1 },
      ];
    }
  }

  class Sword extends ContainableMixin(SlottableMixin(Idea)) {
    public releasedFrom: Array<[unknown, string]> = [];
    onSlotReleased?(host: unknown, slotName: string): void {
      this.releasedFrom.push([host, slotName]);
    }
  }

  // Plain room: holds the avatar.
  class Room extends ContainerMixin(Idea) {}

  it('avatar destruct: sword ends up in the room AND is cleanly unwielded', () => {
    const room = makeStuff(() => new Room());
    const avatar = makeStuff(() => new Avatar());
    const sword = makeStuff(() => new Sword());

    ContainmentApi.move(avatar, room);
    ContainmentApi.move(sword, avatar);
    avatar.occupy(sword, 'hand:right');
    expect(avatar.getOccupant('hand:right')).toBe(sword);
    expect(sword.getContainer()).toBe(avatar);

    StuffApi.destruct(avatar);

    // Container cleanup ran (most-derived): sword evacuated to room.
    expect(sword.getContainer()).toBe(room);
    // Slotted cleanup ran (next): canonical vacate fired the witness.
    expect(sword.releasedFrom.map(([, s]) => s)).toContain('hand:right');
    // Containable cleanup ran last: avatar unhooked from room.
    expect(room.hasContainable(avatar)).toBe(false);
  });
});
