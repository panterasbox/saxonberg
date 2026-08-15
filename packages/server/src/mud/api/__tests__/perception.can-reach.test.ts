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
import Door from '../../obj/Door';
import CartesianZone from '../../obj/location/CartesianZone';
import CartesianLocation from '../../lib/location/CartesianLocation';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

/** An actor that can hold things and be somewhere. */
class Actor extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {}

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
});
