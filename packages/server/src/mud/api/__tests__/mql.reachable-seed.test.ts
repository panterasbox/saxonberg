/**
 * MQL `reachable` seed — the generalized "everything reachable from the
 * giver" pool (api/mql/scope-walk.ts `candidatesForReachable`), which
 * absorbed the old `ContainmentApi.findReachable` walk. Asserts the reach
 * legs (self + own hosted updates + slot occupants (+ their hosted) +
 * carried inventory (+ carried hosts' hosted) + location) and the
 * ON-PERSON-FIRST emission order — a `.find` over a multi-match pool
 * returns the on-person match, not the floor's.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { MqlApi } from '../mql';
import { ContainmentApi } from '../containment';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { SlottableMixin } from '../../lib/slot/Slottable';
import Location from '../../lib/stuff/Location';
import { Idea } from '../../lib/stuff/Idea';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// Actor: carries inventory (Container) and installed augs (Slotted).
class TestActor extends SlottedMixin(ContainerMixin(ContainableMixin(Idea))) {}
// A target that can sit in an aug slot AND in inventory.
class TargetThing extends SlottableMixin(ContainableMixin(Idea)) {}

/** The `reachable` pool anchored on `actor`. The fixture actor isn't a
 *  real CommandGiver — the cast satisfies the seed's giver anchor (the
 *  seed only reads the actor's containment/slot/attunement surfaces). */
function reachableFrom(actor: Stuff): Stuff[] {
  return MqlApi.resolveMany('reachable', {
    commandGiver: actor as unknown as Stuff & CommandGiver,
    scope: 'reachable',
  }).stuff;
}

/** First pool member matching one of `ids` (the old first-match contract). */
function findIn(pool: Stuff[], ...ids: string[]): Stuff | null {
  const set = new Set(ids);
  return pool.find((s) => set.has(s.stuffId)) ?? null;
}

/** The on-person `person` pool anchored on `actor` (bearer semantics —
 *  no location leg; see credential `presentsKey`). Same cast rationale
 *  as {@link reachableFrom}. */
function personOf(actor: Stuff): Stuff[] {
  return MqlApi.resolveMany('person', {
    commandGiver: actor as unknown as Stuff & CommandGiver,
    scope: 'person',
  }).stuff;
}

describe('MQL reachable seed — corporeal legs', () => {
  let actor: TestActor;
  let location: Location;

  beforeEach(() => {
    actor = makeStuff(() => new TestActor());
    actor.setStaticSlots([{ name: 'aug:1', accepts: 'SlottableMixin' }]);
    location = makeStuff(() => new Location());
    ContainmentApi.move(actor, location);
  });

  it('returns no match when nothing matches', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, actor);
    expect(findIn(reachableFrom(actor))).toBeNull();
  });

  it('finds a match in carried inventory', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, actor);
    expect(findIn(reachableFrom(actor), item.stuffId)).toBe(item);
  });

  it('finds a match among the location contents', () => {
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, location);
    expect(findIn(reachableFrom(actor), item.stuffId)).toBe(item);
  });

  it('finds an installed aug (slot occupant)', () => {
    const aug = makeStuff(() => new TargetThing());
    actor.occupy(aug, 'aug:1');
    expect(findIn(reachableFrom(actor), aug.stuffId)).toBe(aug);
  });

  it('prefers an aug, then inventory, then the location (on-person first)', () => {
    const aug = makeStuff(() => new TargetThing());
    const carried = makeStuff(() => new TargetThing());
    const onFloor = makeStuff(() => new TargetThing());
    actor.occupy(aug, 'aug:1');
    ContainmentApi.move(carried, actor);
    ContainmentApi.move(onFloor, location);

    const pool = reachableFrom(actor);
    expect(
      findIn(pool, aug.stuffId, carried.stuffId, onFloor.stuffId),
    ).toBe(aug);
    expect(findIn(pool, carried.stuffId, onFloor.stuffId)).toBe(carried);
  });

  it('tolerates a detached actor (inventory/augs only, no location leg)', () => {
    const loner = makeStuff(() => new TestActor());
    const item = makeStuff(() => new TargetThing());
    ContainmentApi.move(item, loner);
    expect(findIn(reachableFrom(loner), item.stuffId)).toBe(item);
  });
});

// ─── Three-base capability model: self + host-descent legs ──────────

import { AetherMixin } from '../../lib/message/Aether';
import { AetherHostedMixin } from '../../lib/augmentation/AetherHosted';

// An attuned actor: hosts updates (AetherMixin) + carries inventory.
class AttunedActor extends AetherMixin(
  ContainerMixin(ContainableMixin(Idea)),
) {}
// A carried attuned Thing (the future radio): a host you carry.
class CarriedRadio extends AetherMixin(ContainableMixin(Idea)) {}
// An incorporeal hosted update.
class HostedUpdate extends AetherHostedMixin(Idea) {}

describe('MQL person seed — bearer semantics (no location leg)', () => {
  let actor: TestActor;
  let location: Location;

  beforeEach(() => {
    actor = makeStuff(() => new TestActor());
    actor.setStaticSlots([{ name: 'aug:1', accepts: 'SlottableMixin' }]);
    location = makeStuff(() => new Location());
    ContainmentApi.move(actor, location);
  });

  it('includes carried and installed, never the floor', () => {
    const carried = makeStuff(() => new TargetThing());
    const aug = makeStuff(() => new TargetThing());
    const onFloor = makeStuff(() => new TargetThing());
    ContainmentApi.move(carried, actor);
    actor.occupy(aug, 'aug:1');
    ContainmentApi.move(onFloor, location);

    const pool = personOf(actor);
    expect(findIn(pool, carried.stuffId)).toBe(carried);
    expect(findIn(pool, aug.stuffId)).toBe(aug);
    // A matching item lying in the room is NOT on your person — the
    // bearer-semantics consumers (presentsKey, payment resolution)
    // anchor here precisely so the floor never "presents".
    expect(findIn(pool, onFloor.stuffId)).toBeNull();
  });
});

describe('MQL reachable seed — self + host-descent legs', () => {
  let actor: AttunedActor;
  let location: Location;

  beforeEach(() => {
    actor = makeStuff(() => new AttunedActor());
    location = makeStuff(() => new Location());
    ContainmentApi.move(actor, location);
  });

  it('self leg: a capability composed intrinsically on the actor is found', () => {
    expect(findIn(reachableFrom(actor), actor.stuffId)).toBe(actor);
  });

  it('host-descent (self): an update hosted on the actor is found', () => {
    const update = makeStuff(() => new HostedUpdate());
    actor.hostUpdate(update);
    expect(findIn(reachableFrom(actor), update.stuffId)).toBe(update);
  });

  it('carried-host-descent: an update hosted on a carried attuned Thing is found', () => {
    const radio = makeStuff(() => new CarriedRadio());
    ContainmentApi.move(radio, actor);
    const update = makeStuff(() => new HostedUpdate());
    radio.hostUpdate(update);
    expect(findIn(reachableFrom(actor), update.stuffId)).toBe(update);
  });

  it('order: a self-hosted update wins over a carried match', () => {
    const update = makeStuff(() => new HostedUpdate());
    actor.hostUpdate(update);
    const carried = makeStuff(() => new HostedUpdate());
    // Park a second matchable update on a carried radio.
    const radio = makeStuff(() => new CarriedRadio());
    ContainmentApi.move(radio, actor);
    radio.hostUpdate(carried);

    expect(
      findIn(reachableFrom(actor), update.stuffId, carried.stuffId),
    ).toBe(update);
  });
});
