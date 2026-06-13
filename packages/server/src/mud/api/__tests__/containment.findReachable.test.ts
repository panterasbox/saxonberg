/**
 * ContainmentApi.findReachable — the generalized "first reachable Stuff
 * matching a predicate" finder. Asserts the reach surface (slot occupants
 * + inventory + location contents) and the on-your-person-first ordering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainmentApi } from '../containment';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { SlottableMixin } from '../../lib/slot/Slottable';
import Location from '../../lib/stuff/Location';
import { Idea } from '../../lib/stuff/Idea';
import type { Stuff } from '../../lib/stuff/Stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// Actor: carries inventory (Container) and installed augs (Slotted).
class TestActor extends SlottedMixin(ContainerMixin(ContainableMixin(Idea))) {}
// A target that can sit in an aug slot AND in inventory.
class TargetThing extends SlottableMixin(ContainableMixin(Idea)) {}

describe('ContainmentApi.findReachable', () => {
  let actor: TestActor;
  let location: Location;

  // Predicate keyed by identity — lets one test stage a distinct match in
  // each tier and assert which one wins, independent of any real mixin.
  function matching(...ids: string[]) {
    const set = new Set(ids);
    return (s: Stuff): s is Stuff => set.has(s.stuffId);
  }

  beforeEach(() => {
    actor = makeStuff(() => new TestActor());
    actor.setStaticSlots([{ name: 'aug:1', accepts: 'SlottableMixin' }]);
    location = makeStuff(() => new Location());
    ContainmentApi.move(actor, location);
  });

  it('returns null when nothing matches', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, actor);
    expect(ContainmentApi.findReachable(actor, location, matching())).toBeNull();
  });

  it('finds a match in carried inventory', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, actor);
    expect(
      ContainmentApi.findReachable(actor, location, matching(item.stuffId)),
    ).toBe(item);
  });

  it('finds a match among the location contents', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, location);
    expect(
      ContainmentApi.findReachable(actor, location, matching(item.stuffId)),
    ).toBe(item);
  });

  it('finds an installed aug (slot occupant)', () => {
    const aug = makeStuff(() => new TargetThing());
    actor.occupy(aug, 'aug:1');
    expect(
      ContainmentApi.findReachable(actor, location, matching(aug.stuffId)),
    ).toBe(aug);
  });

  it('prefers an aug, then inventory, then the location (on-person first)', () => {
    const aug = makeStuff(() => new TargetThing());
    const carried = makeStuff(() => new TargetThing());
    const onFloor = makeStuff(() => new TargetThing());
    actor.occupy(aug, 'aug:1');
    ContainmentApi.move(carried, actor);
    ContainmentApi.move(onFloor, location);

    const all = matching(aug.stuffId, carried.stuffId, onFloor.stuffId);
    expect(ContainmentApi.findReachable(actor, location, all)).toBe(aug);

    const carriedOrFloor = matching(carried.stuffId, onFloor.stuffId);
    expect(ContainmentApi.findReachable(actor, location, carriedOrFloor)).toBe(
      carried,
    );
  });

  it('tolerates a null location (inventory/augs only)', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, actor);
    expect(
      ContainmentApi.findReachable(actor, null, matching(item.stuffId)),
    ).toBe(item);
  });
});
