/**
 * ⭐ Reach is ONE rule (size-and-carrying D17, rewritten from
 * controller-liquidity W2's rungs), `here` is the place, and MQL names
 * through shut things while the verb refuses.
 *
 *   - D17: `reachable` holds your whole carried tree (shut and packed
 *     included — the binder binds it and the verb says why) and one level
 *     into open things here; `PerceptionApi.canReach` is membership AND
 *     the object's `reachRefusal`, so naming and touching cannot disagree
 *     about the reason. ⚠ Meaning changed: the `top`/`deep` rungs are gone,
 *     and a thing in your own shut box is now NAMED by `reachable` (it was
 *     hidden at `open`).
 *   - D6 / D23: `:i` / `:I` name through any shut box — another body's
 *     too, now (MQL is universal); what a viewer may see of it is
 *     `PerceptionApi.perceived`'s.
 *   - D7: `here` is the place — past a boat; `me:e` is the boat.
 *   - `:held`.
 */
import '../../../test-bootstrap';
import { carry } from '../../lib/slot/__tests__/carrying-fixture';
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
function ctx(me: Person, scope: string): MqlContext {
  return { commandGiver: me as never, scope };
}
const ids = (xs: readonly Stuff[]): string[] => xs.map((s) => s.stuffId);
const find = (me: Person, q: string): string[] => ids(MqlApi.resolveMany(q, ctx(me, 'reachable')).stuff);

describe('reachable — one rule (D17)', () => {
  it('names the apple in the bag in your pack, open or shut; a shut bag is the refusal', () => {
    const { me } = world();
    const pack = vessel('pack', true);
    const bag = vessel('bag', true);
    const a = apple();
    carry(me, pack);
    ContainmentApi.move(bag, pack);
    ContainmentApi.move(a, bag);
    expect(find(me, 'apple')).toContain(a.stuffId);
    expect(PerceptionApi.canReach(me, a)).toBe(true);
    bag.setOpen(false);
    expect(find(me, 'apple')).toContain(a.stuffId);
    expect(PerceptionApi.canReach(me, a)).toBe(false);
    expect(a.reachRefusal(me)?.reason).toBe('enclosed-shut');
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
  });

  it('canReach is membership in the one walk AND no refusal from the object', () => {
    const { river, me } = world();
    const pack = vessel('pack', true);
    const bag = vessel('bag', true);
    const a = apple();
    carry(me, pack);
    ContainmentApi.move(bag, pack);
    ContainmentApi.move(a, bag);
    const chest = vessel('chest', false);
    const c = apple();
    ContainmentApi.move(chest, river);
    ContainmentApi.move(c, chest);
    for (const thing of [a, c]) {
      const named = find(me, 'apple').includes(thing.stuffId);
      const ok = named && thing.reachRefusal(me) === null;
      expect(PerceptionApi.canReach(me, thing)).toBe(ok);
      expect(PerceptionApi.reachableAmong(me, [thing]).length > 0).toBe(ok);
    }
    expect(find(me, 'apple')).not.toContain(c.stuffId);
  });
});

describe('MQL addresses; the verb refuses (D6)', () => {
  it('me:I:apple finds the apple in your shut box, and the box is the refusal', () => {
    const { me } = world();
    const box = vessel('box', false);
    const a = apple();
    carry(me, box);
    ContainmentApi.move(a, box);
    expect(ids(MqlApi.resolveMany('me:I:apple', ctx(me, 'reachable')).stuff)).toContain(a.stuffId);
    expect(ids(MqlApi.resolveMany('me:i:i', ctx(me, 'reachable')).stuff)).toContain(a.stuffId);
    const refusal = a.reachRefusal(me);
    expect(refusal?.reason).toBe('enclosed-shut');
    expect(refusal?.facts.by.stuffId).toBe(box.stuffId);
    box.setOpen(true);
    expect(a.reachRefusal(me)).toBeNull();
  });

  it("names through the room's shut chest AND another body's (MQL is universal — D23); perception hides the latter", () => {
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
    carry(other, box);
    ContainmentApi.move(b, box);
    const named = MqlApi.resolveMany('here:I:apple', ctx(me, 'reachable')).stuff;
    expect(ids(named)).toContain(b.stuffId);
    expect(ids(PerceptionApi.perceived(me, named))).not.toContain(b.stuffId);
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
    carry(me, inHand);
    carry(me, bag);
    ContainmentApi.move(inBag, bag);
    ContainmentApi.move(onGround, river);
    const held = ids(MqlApi.resolveMany('reachable:held', ctx(me, 'reachable')).stuff);
    expect(held).toContain(inHand.stuffId);
    expect(held).toContain(bag.stuffId);
    expect(held).not.toContain(inBag.stuffId);
    expect(held).not.toContain(onGround.stuffId);
  });
});
