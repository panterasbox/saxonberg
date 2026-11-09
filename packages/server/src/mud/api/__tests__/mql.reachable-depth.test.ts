/**
 * ⭐ Controller-liquidity W2 — reach has named rungs, `here` is the place,
 * and MQL addresses through shut things while the verb refuses.
 *
 *   - D5: `reachable` is what you could lay hands on now — down through the
 *     open vessels you carry, one level into open things here, never into a
 *     shut thing — and `PerceptionApi.canReach` reads the SAME walk
 *     (`Container.getReachableContents`), so they cannot disagree.
 *   - D4: the rung rides `MqlContext.depth` (`top` · `open` · `deep`).
 *   - D6: `:i` / `:I` address through a shut box of yours or the room's;
 *     `Containable.reachRefusal` names the lid; another body's shut things
 *     stay perception's.
 *   - D7: `here` is the place — past a boat; `me:e` is the boat.
 *   - `:held`.
 */
import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MqlApi } from '../mql';
import { PerceptionApi } from '../perception';
import { ContainmentApi } from '../containment';
import { PerceptionMixin } from '../../lib/perception/Perception';
import { SensorMixin } from '../../lib/message/Sensor';
import { VisibleMixin } from '../../lib/description/Visible';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { Idea } from '../../lib/stuff/Idea';
import { Agent } from '../../lib/stuff/Agent';
import Place from '../../lib/stuff/Place';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MqlContext } from '../mql/types';
import type { ReachDepth } from '../command';
import type { Stuff } from '../../lib/stuff/Stuff';

class River extends VisibleMixin(PerceptibleMixin(ContainerMixin(Place))) {}
class Person extends CommandGiverMixin(
  PerceptionMixin(SensorMixin(ContainerMixin(ContainableMixin(Agent)))),
) {}
class Vessel extends SealableMixin(
  ContainerMixin(VisibleMixin(PerceptibleMixin(ContainableMixin(Idea)))),
) {}
class Apple extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}

function named<T extends Stuff & { setShortDescription(s: string): void; setKeywords(k: string[]): void }>(
  s: T,
  word: string,
): T {
  s.setShortDescription(`a ${word}`);
  s.setKeywords([word]);
  return s;
}
const vessel = (word: string, open: boolean): Vessel => {
  const v = named(makeStuff(() => new Vessel()), word);
  v.setOpen(open);
  return v;
};
const apple = (): Apple => named(makeStuff(() => new Apple()), 'apple');

function world() {
  const river = named(makeStuff(() => new River()), 'river');
  const me = makeStuff(() => new Person());
  ContainmentApi.move(me, river);
  return { river, me };
}
function ctx(me: Person, scope: string, depth?: ReachDepth): MqlContext {
  return { commandGiver: me as never, scope, ...(depth ? { depth } : {}) };
}
const ids = (xs: readonly Stuff[]): string[] => xs.map((s) => s.stuffId);
const find = (me: Person, q: string, depth?: ReachDepth): string[] =>
  ids(MqlApi.resolveMany(q, ctx(me, 'reachable', depth)).stuff);

describe('reachable — the rungs (D4, D5)', () => {
  it('finds the apple in the open bag in your open pack; not at top; not in a shut box', () => {
    const { me } = world();
    const pack = vessel('pack', true);
    const bag = vessel('bag', true);
    const a = apple();
    ContainmentApi.move(pack, me);
    ContainmentApi.move(bag, pack);
    ContainmentApi.move(a, bag);
    expect(find(me, 'apple')).toContain(a.stuffId);
    expect(find(me, 'apple', 'top')).not.toContain(a.stuffId);
    bag.setOpen(false);
    expect(find(me, 'apple')).not.toContain(a.stuffId);
    expect(find(me, 'apple', 'deep')).toContain(a.stuffId);
  });

  it('reaches one level into an open crate standing here, not into a box inside it', () => {
    const { river, me } = world();
    const crate = vessel('crate', true);
    const box = vessel('box', true);
    const a = apple();
    const b = apple();
    ContainmentApi.move(crate, river);
    ContainmentApi.move(a, crate);
    ContainmentApi.move(box, crate);
    ContainmentApi.move(b, box);
    expect(find(me, 'apple')).toEqual([a.stuffId]);
    expect(find(me, 'apple', 'deep').sort()).toEqual([a.stuffId, b.stuffId].sort());
  });

  it('what you can name is what you can touch: canReach reads the same walk', () => {
    const { river, me } = world();
    const pack = vessel('pack', true);
    const bag = vessel('bag', true);
    const a = apple();
    ContainmentApi.move(pack, me);
    ContainmentApi.move(bag, pack);
    ContainmentApi.move(a, bag);
    const chest = vessel('chest', false);
    const c = apple();
    ContainmentApi.move(chest, river);
    ContainmentApi.move(c, chest);
    for (const [thing, rung] of [
      [a, 'open'],
      [a, 'top'],
      [c, 'open'],
      [c, 'deep'],
    ] as const) {
      const named = find(me, 'apple', rung).includes(thing.stuffId);
      expect(PerceptionApi.canReach(me, thing, { depth: rung })).toBe(named);
      expect(PerceptionApi.reachableAmong(me, [thing], { depth: rung }).length > 0).toBe(named);
    }
  });
});

describe('MQL addresses; the verb refuses (D6)', () => {
  it('me:I:apple finds the apple in your shut box, and the box is the refusal', () => {
    const { me } = world();
    const box = vessel('box', false);
    const a = apple();
    ContainmentApi.move(box, me);
    ContainmentApi.move(a, box);
    expect(ids(MqlApi.resolveMany('me:I:apple', ctx(me, 'reachable')).stuff)).toContain(a.stuffId);
    expect(ids(MqlApi.resolveMany('me:i:i', ctx(me, 'reachable')).stuff)).toContain(a.stuffId);
    const refusal = a.reachRefusal(me);
    expect(refusal?.reason).toBe('enclosed-shut');
    expect(refusal?.facts.by.stuffId).toBe(box.stuffId);
    box.setOpen(true);
    expect(a.reachRefusal(me)).toBeNull();
  });

  it("addresses through the room's shut chest; never another body's shut box", () => {
    const { river, me } = world();
    const chest = vessel('chest', false);
    const a = apple();
    ContainmentApi.move(chest, river);
    ContainmentApi.move(a, chest);
    expect(ids(MqlApi.resolveMany('here:I:apple', ctx(me, 'reachable')).stuff)).toContain(a.stuffId);

    const other = makeStuff(() => new Person());
    ContainmentApi.move(other, river);
    const box = vessel('box', false);
    const b = apple();
    ContainmentApi.move(box, other);
    ContainmentApi.move(b, box);
    expect(ids(MqlApi.resolveMany('here:I:apple', ctx(me, 'reachable')).stuff)).not.toContain(b.stuffId);
  });

  it('a lid around the actor is not between the actor and its neighbor', () => {
    const { river, me } = world();
    const wardrobe = vessel('wardrobe', true);
    ContainmentApi.move(wardrobe, river);
    ContainmentApi.move(me, wardrobe);
    const coat = apple();
    ContainmentApi.move(coat, wardrobe);
    wardrobe.setOpen(false);
    expect(coat.reachRefusal(me)).toBeNull();
  });
});

describe('here is the place (D7)', () => {
  it('in a boat on the river: here is the river, me:e the boat', () => {
    const { river, me } = world();
    const boat = vessel('boat', true);
    ContainmentApi.move(boat, river);
    ContainmentApi.move(me, boat);
    expect(me.getEnclosingPlace()?.stuffId).toBe(river.stuffId);
    expect(ids(MqlApi.resolveMany('here', ctx(me, 'reachable')).stuff)).toEqual([river.stuffId]);
    expect(ids(MqlApi.resolveMany('me:e', ctx(me, 'reachable')).stuff)).toEqual([boat.stuffId]);
  });

  it('peers takes the place and the boat you sit in; :here agrees', () => {
    const { river, me } = world();
    const boat = vessel('boat', false);
    ContainmentApi.move(boat, river);
    ContainmentApi.move(me, boat);
    const onBank = apple();
    const inBoat = apple();
    ContainmentApi.move(onBank, river);
    ContainmentApi.move(inBoat, boat);
    const peers = ids(MqlApi.resolveMany('peers:apple', ctx(me, 'peers')).stuff);
    expect(peers.sort()).toEqual([onBank.stuffId, inBoat.stuffId].sort());
    const here = ids(MqlApi.resolveMany('peers:here', ctx(me, 'peers')).stuff);
    expect(here).toContain(onBank.stuffId);
    expect(here).toContain(inBoat.stuffId);
  });

  it('with no place up the chain, here is what holds you', () => {
    const me = makeStuff(() => new Person());
    const box = vessel('box', true);
    ContainmentApi.move(me, box);
    expect(me.getEnclosingPlace()?.stuffId).toBe(box.stuffId);
  });
});

describe(':held', () => {
  it('is what a body carries loose; not what lies in a bag or on the ground', () => {
    const { river, me } = world();
    const bag = vessel('bag', true);
    const inHand = apple();
    const inBag = apple();
    const onGround = apple();
    ContainmentApi.move(inHand, me);
    ContainmentApi.move(bag, me);
    ContainmentApi.move(inBag, bag);
    ContainmentApi.move(onGround, river);
    const held = ids(MqlApi.resolveMany('reachable:held', ctx(me, 'reachable')).stuff);
    expect(held).toContain(inHand.stuffId);
    expect(held).toContain(bag.stuffId);
    expect(held).not.toContain(inBag.stuffId);
    expect(held).not.toContain(onGround.stuffId);
  });
});
