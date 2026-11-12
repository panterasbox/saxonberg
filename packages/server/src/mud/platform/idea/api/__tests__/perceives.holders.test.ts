/**
 * ⭐⭐ `PerceptionApi.perceives` — the holder rules (size-and-carrying D24/D25).
 *
 *   (0) the builder lens: inside an extent the viewer holds, everything —
 *       never a player's body;
 *   (1) your own body and everything on it, at any depth;
 *   (2) the holders: a shut container light does not pass hides what is in
 *       it (glass does not); another body shows its hands, its outermost
 *       layers, what hangs from what it wears and an open, uncovered pocket
 *       — never an inner pocket, a buttoned one, or what its clothes cover;
 *   (3) concealment (unchanged).
 *
 * Pockets (W5's rows) and the back slot (W5) are staged here with test
 * fixtures: a coat composing `Placing` with `in`-member entries, a body
 * plan with a `back` slot.
 */
import '../../../../../test-bootstrap';
import { carry } from '../../../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan, { type BodyPart } from '../../species/BodyPlan';
import Glass from '../../material/Glass';
import Location from '../../../../lib/location/Location';
import Thing from '../../../thing/Thing';
import Holder from '../../../../lib/stuff/Holder';
import { SealableMixin } from '../../../../lib/spatial/Sealable';
import { PlacingMixin } from '../../../../lib/spatial/Placing';
import { WearableMixin } from '../../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../../lib/slot/Slottable';
import { WieldableMixin } from '../../../../lib/slot/Wieldable';
import { Placements } from '../../../../lib/spatial/Placement';
import { Quantity } from '../../../../lib/quantity';
import type { SlotSpec } from '../../../../lib/slot/Slotted';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const PLAN = '/stuff/idea/species/BodyPlan/holders-biped';

class Coat extends PlacingMixin(WearableMixin(SlottableMixin(Thing))) {}
class Shirt extends WearableMixin(SlottableMixin(Thing)) {}
// Slottable: a hand holds a box (size and carrying W7).
class Box extends SealableMixin(SlottableMixin(Holder)) {}
class Pack extends SealableMixin(WearableMixin(SlottableMixin(Holder))) {}
class Knife extends WieldableMixin(SlottableMixin(Thing)) {}

const SLOTS: SlotSpec[] = [
  { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
  { name: 'back', accepts: 'WearableMixin', capacity: 1 },
  { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
  { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
];
const PARTS: BodyPart[] = [
  { key: 'body.torso', parent: null, tissues: [] },
  { key: 'body.hand.left', parent: 'body.torso', tissues: [], serves: ['manipulation'] },
  { key: 'body.hand.right', parent: 'body.torso', tissues: [], serves: ['manipulation'] },
];

let species: Species;
function body(): Creature {
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}
function wear<T extends Stuff & { setSlotClaim(plan: string, slots: string[]): void }>(on: Creature, g: T, slot: string): T {
  g.setSlotClaim(PLAN, [slot]);
  on.seatInSlot(g as never, slot);
  return g;
}
function hold(on: Creature, k: Knife, slot = 'hand:right'): Knife {
  k.setSlotClaims({ [PLAN]: [slot] });
  on.seatInSlot(k, slot);
  return k;
}
const thing = (): Thing => makeStuff(() => new Thing());

describe('perceives — the holder rules (D24)', () => {
  let room: Location;
  let me: Creature;
  let bob: Creature;

  beforeEach(() => {
    installV1QuantityMarshallers();
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('holders-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots(SLOTS);
    plan.setBodyParts(PARTS);
    stampTemplatePathForTest(plan, PLAN);
    species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/holders-human');
    room = makeStuff(() => new Location());
    me = body();
    bob = body();
    ContainmentApi.move(me, room);
    ContainmentApi.move(bob, room);
  });
  afterEach(() => StuffApi.clearAll());

  it('rule 1: your own things, always — even in a shut box on you', () => {
    const box = makeStuff(() => new Box());
    const coin = thing();
    carry(me, box);
    ContainmentApi.move(coin, box);
    box.setOpen(false);
    expect(PerceptionApi.perceives(me, coin)).toBe(true);
    expect(PerceptionApi.perceives(me, me)).toBe(true);
  });

  it('a shut opaque box hides what is in it; open, it shows', () => {
    const box = makeStuff(() => new Box());
    const coin = thing();
    ContainmentApi.move(box, room);
    ContainmentApi.move(coin, box);
    box.setOpen(false);
    expect(PerceptionApi.perceives(me, coin)).toBe(false);
    box.setOpen(true);
    expect(PerceptionApi.perceives(me, coin)).toBe(true);
  });

  it('⭐ a shut GLASS jar shows what is in it (Beer–Lambert over its wall)', () => {
    const glass = makeStuffAtPath(() => {
      const m = new Glass();
      m.setName('glass');
      m.setLightAbsorption(Quantity.of(5, '1/m'));
      return m;
    }, '/stuff/idea/material/glass/holders-glass');
    const jar = makeStuff(() => new Box());
    jar.setMaterial(glass);
    const plum = thing();
    ContainmentApi.move(jar, room);
    ContainmentApi.move(plum, jar);
    jar.setOpen(false);
    expect(PerceptionApi.perceives(me, plum)).toBe(true);
  });

  it("another person: their hand, yes; their outer coat, yes; the shirt under it, no", async () => {
    const knife = hold(bob, makeStuff(() => new Knife()));
    const shirt = wear(bob, makeStuff(() => new Shirt()), 'torso');
    const coat = makeStuff(() => new Coat());
    await coat.setPlacements([{ member: Placements.IN, name: 'inner pocket', covered: true }]);
    wear(bob, coat, 'torso');
    expect(PerceptionApi.perceives(me, knife)).toBe(true);
    expect(PerceptionApi.perceives(me, coat)).toBe(true);
    expect(PerceptionApi.perceives(me, shirt)).toBe(false);
    // …and what is in their inner pocket is theirs to know.
    const purse = thing();
    ContainmentApi.move(purse, coat, 'inner pocket');
    expect(PerceptionApi.perceives(me, purse)).toBe(false);
    expect(PerceptionApi.perceives(bob, purse)).toBe(true);
  });

  it('⭐ pockets: an open outer pocket shows; an inner (covered) or buttoned one does not; an outer pocket under a coat does not', async () => {
    const coat = makeStuff(() => new Coat());
    await coat.setPlacements([
      { member: Placements.IN, name: 'side pocket' },
      { member: Placements.IN, name: 'inner pocket', covered: true },
      { member: Placements.IN, name: 'breast pocket', closes: true },
    ]);
    wear(bob, coat, 'torso');
    const apple = thing();
    const letter = thing();
    const cork = thing();
    ContainmentApi.move(apple, coat, 'side pocket');
    ContainmentApi.move(letter, coat, 'inner pocket');
    ContainmentApi.move(cork, coat, 'breast pocket');
    expect(PerceptionApi.perceives(me, apple)).toBe(true);
    expect(PerceptionApi.perceives(me, letter)).toBe(false);
    expect(PerceptionApi.perceives(me, cork)).toBe(false);
    // The bearer knows their own pockets.
    expect(PerceptionApi.perceives(bob, letter)).toBe(true);
    // A cloak over the coat covers even the open side pocket.
    wear(bob, makeStuff(() => new Shirt()), 'torso');
    expect(PerceptionApi.perceives(me, apple)).toBe(false);
  });

  it('what hangs FROM a worn host shows (everyone sees the holster)', async () => {
    const belt = makeStuff(() => new Coat());
    await belt.setPlacements([Placements.FROM]);
    wear(bob, belt, 'torso');
    const holster = thing();
    ContainmentApi.move(holster, belt, Placements.FROM);
    expect(PerceptionApi.perceives(me, holster)).toBe(true);
  });

  it("a packed pack's contents: no (it is shut on their back); an open pack worn, yes", () => {
    const pack = makeStuff(() => new Pack());
    wear(bob, pack, 'back');
    const map = thing();
    ContainmentApi.move(map, pack);
    pack.setOpen(false);
    expect(PerceptionApi.perceives(me, pack)).toBe(true);
    expect(PerceptionApi.perceives(me, map)).toBe(false);
    pack.setOpen(true);
    expect(PerceptionApi.perceives(me, map)).toBe(true);
  });

  it('`perceived` filters a list in order, and the ordinal counts only what is perceived', () => {
    const box = makeStuff(() => new Box());
    const a = thing();
    const b = thing();
    const c = thing();
    ContainmentApi.move(a, room);
    ContainmentApi.move(box, room);
    ContainmentApi.move(b, box);
    ContainmentApi.move(c, room);
    box.setOpen(false);
    expect(PerceptionApi.perceived(me, [a, b, c])).toEqual([a, c]);
    expect(PerceptionApi.perceived(me, [a, b, c], 2)).toEqual([c]);
    expect(PerceptionApi.perceived(me, [a, b, c], -1)).toEqual([c]);
  });

  it('visibleContentsOf groups what is perceived: a stranger sees the coat and the knife; the owner, everything; a shut box says so', async () => {
    const knife = hold(bob, makeStuff(() => new Knife()));
    const shirt = wear(bob, makeStuff(() => new Shirt()), 'torso');
    const coat = makeStuff(() => new Coat());
    await coat.setPlacements([{ member: Placements.IN, name: 'inner pocket', covered: true }]);
    wear(bob, coat, 'torso');
    const purse = thing();
    ContainmentApi.move(purse, coat, 'inner pocket');
    const v = PerceptionApi.visibleContentsOf(me, bob);
    expect(v.held).toEqual([knife]);
    expect(v.worn).toEqual([coat]);
    expect(v.carried).toEqual([]);
    const own = PerceptionApi.visibleContentsOf(bob, bob);
    expect(new Set(own.worn)).toEqual(new Set([shirt, coat]));
    expect(own.carried).toEqual([purse]);
    const box = makeStuff(() => new Box());
    ContainmentApi.move(box, room);
    ContainmentApi.move(thing(), box);
    box.setOpen(false);
    expect(PerceptionApi.visibleContentsOf(me, box).shut).toBe(true);
  });

  it('`perceivedHow` says plain for a plain thing, null for a hidden one (no lens here)', () => {
    const box = makeStuff(() => new Box());
    const coin = thing();
    ContainmentApi.move(box, room);
    ContainmentApi.move(coin, box);
    box.setOpen(false);
    expect(PerceptionApi.perceivedHow(me, box)).toBe('plain');
    expect(PerceptionApi.perceivedHow(me, coin)).toBe(null);
  });
});
