/**
 * `PerceptionApi.canReach` — the ONE definition of reach.
 *
 * ⭐ **Why this file exists.** Reach was hand-rolled twice and the two
 * copies disagreed. The `canReach` validator counted doors attached to
 * the location's exits; the card-hold evaluator compared container ids
 * and so did not. The result was a live contradiction: a card held
 * `inReach` on a door released as `out-of-reach` while `open north` on
 * that same door worked perfectly.
 *
 * ⚠⚠ The door case is the whole point. **An attached door is in no
 * container** — it rides `exit.getDoor()` — so any reach test built out
 * of containment alone misses every door in the game, and misses it
 * silently, because a door that is merely unreachable looks like a door
 * that is far away.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { PerceptionApi } from '../perception';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { MixinApi } from '../mixin';
import Thing from '../../lib/stuff/Thing';
import Door from '../../platform/thing/Door';
import CartesianZone from '../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../lib/location/CartesianLocation';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { DetailedMixin } from '../../lib/description/Detailed';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

/** An actor that can hold things and be somewhere. */
class Actor extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {}

/** An open-topped holder: a rack, a crate, a stock counter. No lid. */
class Rack extends ContainerMixin(ContainableMixin(DetailedMixin(Thing))) {}

/** Somebody: an actor who takes commands. Their pockets are their own. */
class Person extends CommandGiverMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Idea))),
) {}

/** A holder with a lid — shut by default. */
class Chest extends SealableMixin(
  ContainerMixin(ContainableMixin(DetailedMixin(Thing))),
) {}

describe('PerceptionApi.canReach', () => {
  let zone: CartesianZone;
  let here: CartesianLocation;
  let there: CartesianLocation;
  let actor: Actor;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    zone = makeStuff(() => new CartesianZone());
    here = makeStuff(() => new CartesianLocation());
    here.setShortDescription('Here');
    there = makeStuff(() => new CartesianLocation());
    there.setShortDescription('There');
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);
    actor = makeStuff(() => new Actor());
    actor.setName('Alice');
    ContainmentApi.move(actor, here as unknown as never);
  });

  const s = (x: unknown): Stuff => x as unknown as Stuff;

  it('reaches what it carries', async () => {
    const coin = makeStuff(() => new Thing());
    ContainmentApi.move(coin, actor as unknown as never);
    expect(PerceptionApi.canReach(s(actor), s(coin))).toBe(true);
  });

  it('reaches what is in the room, and not what is elsewhere', async () => {
    const lantern = makeStuff(() => new Thing());
    ContainmentApi.move(lantern, here as unknown as never);
    expect(PerceptionApi.canReach(s(actor), s(lantern))).toBe(true);

    ContainmentApi.move(lantern, there as unknown as never);
    expect(PerceptionApi.canReach(s(actor), s(lantern))).toBe(false);
  });

  it('reaches itself', () => {
    expect(PerceptionApi.canReach(s(actor), s(actor))).toBe(true);
  });

  /*
   * ⚠⚠ THE regression. Both halves matter: the door must be reachable,
   * AND it must genuinely be in no container — otherwise the test would
   * pass under the containment-only rule too and prove nothing about
   * the bug it exists for.
   */
  it('reaches a door attached to an exit — which is in NO container', async () => {
    const door = makeStuff(() => new Door());
    door.setShortDescription('a heavy oak door');
    await here.addBidirectionalExit(there, 'north', { door });

    // The half that makes the other half meaningful.
    const asStuff = s(door);
    const container = MixinApi.isContainable(asStuff)
      ? asStuff.getContainer()
      : null;
    expect(
      container,
      'an attached door is expected to have no container — if this ever ' +
        'changes, the reach rule can be simplified and this test rewritten',
    ).toBeNull();

    expect(PerceptionApi.canReach(s(actor), s(door))).toBe(true);
  });

  /*
   * The door-via-direction binding: `open north` resolves to the
   * LOCATION carrying an exit attribution, and the controller reads the
   * door off `via.exit`. Without this clause the commonest way to open a
   * door is unreachable.
   */
  it('reaches the location itself only when the binding came via an exit', () => {
    expect(PerceptionApi.canReach(s(actor), s(here))).toBe(false);
    expect(PerceptionApi.canReach(s(actor), s(here), { viaExit: true })).toBe(
      true,
    );
  });
  // ⭐ ONE LEVEL into an open container, and the negatives are the point:
  // this clause is what four callers had each hand-rolled, so the rule it
  // encodes has to be exactly the shared one (`MixinApi.isOpenContainer`).
  describe('one level into an open container', () => {
    it('reaches a coupe standing in an open rack in the room', () => {
      const rack = makeStuff(() => new Rack());
      const coupe = makeStuff(() => new Thing());
      ContainmentApi.move(rack, here as unknown as never);
      ContainmentApi.move(coupe, rack as unknown as never);
      expect(PerceptionApi.canReach(s(actor), s(coupe))).toBe(true);
    });

    it('reaches into an open holder the actor is CARRYING', () => {
      const pouch = makeStuff(() => new Rack());
      const coin = makeStuff(() => new Thing());
      ContainmentApi.move(pouch, actor as unknown as never);
      ContainmentApi.move(coin, pouch as unknown as never);
      expect(PerceptionApi.canReach(s(actor), s(coin))).toBe(true);
    });

    it('does NOT reach into a shut chest — and does once it is opened', () => {
      const chest = makeStuff(() => new Chest());
      const coupe = makeStuff(() => new Thing());
      ContainmentApi.move(chest, here as unknown as never);
      ContainmentApi.move(coupe, chest as unknown as never);
      chest.setOpen(false);
      expect(PerceptionApi.canReach(s(actor), s(coupe))).toBe(false);
      chest.setOpen(true);
      expect(PerceptionApi.canReach(s(actor), s(coupe))).toBe(true);
    });

    it("does NOT reach into somebody else's inventory, open or not", () => {
      const other = makeStuff(() => new Person());
      other.setName('Bob');
      const coin = makeStuff(() => new Thing());
      ContainmentApi.move(other, here as unknown as never);
      ContainmentApi.move(coin, other as unknown as never);
      expect(PerceptionApi.canReach(s(actor), s(coin))).toBe(false);
    });

    it('stops at ONE level — a box inside the crate is not reachable', () => {
      const crate = makeStuff(() => new Rack());
      const box = makeStuff(() => new Rack());
      const gem = makeStuff(() => new Thing());
      ContainmentApi.move(crate, here as unknown as never);
      ContainmentApi.move(box, crate as unknown as never);
      ContainmentApi.move(gem, box as unknown as never);
      expect(PerceptionApi.canReach(s(actor), s(box))).toBe(true);
      expect(PerceptionApi.canReach(s(actor), s(gem))).toBe(false);
    });
  });
});
