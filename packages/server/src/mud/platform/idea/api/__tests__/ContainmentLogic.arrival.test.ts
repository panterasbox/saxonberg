/**
 * ⭐⭐ `move` just works (size and carrying W8; owner, 2026-11-13): a carrier
 * ROUTES what arrives — a hand, the other hand, a pocket it fits; else it
 * reaches the body (a true move, its witnesses fire) and the body moves it
 * on into a bag it carries, else sets it down where it stands, with a line.
 * Nothing is retargeted. `carrier.directMove(item[, route])` goes around the
 * routing: exactly there, or nothing moves and the refusal comes back. A
 * body that does not carry (a fish) is not routed — `move` throws.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi, ContainmentError } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { Placements } from '../../../../lib/spatial/Placement';
import type { PlacementEntry } from '../../../../lib/spatial/Placing';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms, thing, place, OpenBox } from '../../../../lib/spatial/__tests__/size-fixture';
import { PlacingMixin } from '../../../../lib/spatial/Placing';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import Good from '../../../../lib/stuff/Good';
import { Body, Bag, handsSpecies, makeBody, tool, wornBag, wornGarment } from '../../../../lib/slot/__tests__/carrying-fixture';
import { Actor } from '../../../../lib/creature/Actor';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Containable } from '../../../../lib/spatial/Containable';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import Location from '../../../../lib/location/Location';
import Holder from '../../../../lib/stuff/Holder';

const TROUSERS: PlacementEntry[] = [
  { member: Placements.IN, name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];
const key = () => tool('key', 0.02, [0.06, 0.025, 0.003]);
const mug = () => tool('mug', 0.35, [0.09, 0.09, 0.1]);
const kw = (t: Stuff): string => (t as unknown as { getKeywords(): string[] }).getKeywords()[0] ?? '';

describe('ContainmentApi.move onto a body — the body places what arrives (W8)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a mug lands in a hand; a second in the other; a key in a pocket; a fourth is refused by directMove and set down by move', async () => {
    const { me, plan } = makeBody();
    const here = makeStuff(() => new Location());
    ContainmentApi.move(me, here);
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', TROUSERS);
    const [m1, m2, k, m3] = [mug(), mug(), key(), mug()];
    ContainmentApi.move(m1, me);
    expect(me.tierOf(m1)).toBe('hand');
    ContainmentApi.move(m2, me);
    expect(me.tierOf(m2)).toBe('hand');
    expect(me.freeHands()).toBe(0);
    ContainmentApi.move(k, me);
    expect(k.getPlacement()).toEqual({ host: trousers, name: 'left pocket' });
    expect(me.isHonest(k)).toBe(true);
    // Around the routing: exactly onto the body, or nothing moves.
    const refused = me.directMove(m3);
    expect(refused?.reason).toBe('nowhere-to-carry');
    expect(m3.getContainer()).toBeNull();
    // The one call routes it: it reaches the body, and is set down.
    ContainmentApi.move(m3, me);
    expect(m3.getContainer()).toBe(here);
  });

  it('⭐ the cascade is two TRUE moves — the body first, then the bag (no retarget)', () => {
    const log: string[] = [];
    class WBody extends Body {
      onContainableAdded(t: Stuff & Containable): void {
        log.push(`body+${kw(t)}`);
      }
      onContainableRemoved(t: Stuff & Containable): void {
        log.push(`body-${kw(t)}`);
      }
    }
    class WBag extends Bag {
      onContainableAdded(t: Stuff & Containable): void {
        log.push(`bag+${kw(t)}`);
      }
    }
    const { species, plan } = handsSpecies();
    const me = makeStuff(() => new WBody());
    me.setSpecies(species);
    ContainmentApi.move(me, makeStuff(() => new Location()));
    ContainmentApi.move(tool('a', 0.3, [0.05, 0.05, 0.1]), me);
    ContainmentApi.move(tool('b', 0.3, [0.05, 0.05, 0.1]), me);
    const sack = makeStuff(() => new WBag());
    sack.setShortDescription('sack');
    sack.setKeywords(['sack']);
    sack.setSlotClaims({ [plan]: ['back'] });
    sack.setOpen(true);
    me.seatInSlot(sack, 'back');
    log.length = 0;
    const cup = tool('cup', 0.2, [0.05, 0.05, 0.08]);
    ContainmentApi.move(cup, me);
    expect(cup.getContainer()).toBe(sack);
    expect(log).toEqual(['body+cup', 'body-cup', 'bag+cup']);
  });

  it('⭐ set down: the body first, then the place — and the body is told', () => {
    const log: string[] = [];
    class WBody extends Body {
      onContainableAdded(t: Stuff & Containable): void {
        log.push(`body+${kw(t)}`);
      }
    }
    class WPlace extends Location {
      onContainableAdded(t: Stuff & Containable): void {
        log.push(`place+${kw(t)}`);
      }
    }
    const { species } = handsSpecies();
    const me = makeStuff(() => new WBody());
    me.setSpecies(species);
    const here = makeStuff(() => new WPlace());
    ContainmentApi.move(me, here);
    ContainmentApi.move(tool('a', 0.3, [0.05, 0.05, 0.1]), me);
    ContainmentApi.move(tool('b', 0.3, [0.05, 0.05, 0.1]), me);
    log.length = 0;
    const cup = tool('cup', 0.2, [0.05, 0.05, 0.08]);
    ContainmentApi.move(cup, me);
    expect(cup.getContainer()).toBe(here);
    expect(log).toEqual(['body+cup', 'place+cup']);
  });

  it('a carrier standing nowhere, with no bag, throws — and nothing moved', () => {
    const { me } = makeBody();
    ContainmentApi.move(mug(), me);
    ContainmentApi.move(mug(), me);
    const m3 = mug();
    expect(() => ContainmentApi.move(m3, me)).toThrow(ContainmentError);
    expect(m3.getContainer()).toBeNull();
  });

  it('directMove takes the named route or refuses: into the bag; a full hand refused', () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const sack = wornBag(me, plan, 'sack', 'back');
    const cup = tool('cup', 0.2, [0.05, 0.05, 0.08]);
    expect(me.directMove(cup, { kind: 'into', container: sack })).toBeNull();
    expect(cup.getContainer()).toBe(sack);
    const m = mug();
    ContainmentApi.move(m, me);
    const other = mug();
    const held = me.getOccupant('hand:right') === m ? 'hand:right' : 'hand:left';
    expect(me.directMove(other, { kind: 'seat', slots: [held] })?.reason).toBe('nowhere-to-carry');
    expect(other.getContainer()).toBeNull();
  });

  it('a fish does not carry: move onto it throws, nothing moved', () => {
    class Fish extends Actor {}
    const fish = makeStuff(() => new Fish());
    ContainmentApi.move(fish, makeStuff(() => new Location()));
    const hook = key();
    let thrown: unknown = null;
    try {
      ContainmentApi.move(hook, fish);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ContainmentError);
    expect((thrown as ContainmentError).reason).toBe('nowhere-to-carry');
    expect(hook.getContainer()).toBeNull();
  });

  it('out of a box: leaves the box, lands in a hand', () => {
    const { me } = makeBody();
    const box = makeStuff(() => new Holder());
    const m = mug();
    ContainmentApi.move(m, box);
    ContainmentApi.move(m, me);
    expect(box.getContents()).not.toContain(m);
    expect(me.tierOf(m)).toBe('hand');
  });

  it('a key moved out of its pocket onto its owner goes to a hand, never loose', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', TROUSERS);
    const k = key();
    ContainmentApi.move(k, trousers, 'left pocket');
    expect(me.tierOf(k)).toBe('ready');
    ContainmentApi.move(k, me);
    expect(k.getPlacement()).toBeNull();
    expect(me.tierOf(k)).toBe('hand');
    expect(me.isHonest(k)).toBe(true);
  });

  it('a slot named: seated there, exactly', () => {
    const { me } = makeBody();
    const m = mug();
    me.seatInSlot(m, 'hand:left');
    expect(me.getOccupant('hand:left')).toBe(m);
    expect(me.isSeating(m)).toBe(false);
  });

  it('⭐ a word on a plain container: region zero\'s word lands in its contents; any other throws (W9)', () => {
    const room = place(4, 'ceiling', 'walled');
    const box = thing(() => new OpenBox(), { kg: 2, box: { width: 0.4, depth: 0.4, height: 0.4 } });
    ContainmentApi.move(box, room);
    const k = key();
    ContainmentApi.move(k, box, Placements.IN);
    expect(k.getContainer()).toBe(box);
    expect(k.getPlacement()).toBeNull();
    const k2 = key();
    ContainmentApi.move(k2, box, 'into');
    expect(k2.getContainer()).toBe(box);
    expect(() => ContainmentApi.move(key(), box, 'from')).toThrow(/offers no placement 'from'/);
  });

  it('⭐ a word on a container that also offers an `in` region: the named region first, then region zero (W9)', async () => {
    class Desk extends PlacingMixin(ContainerMixin(Good)) {}
    const room = place(4, 'ceiling', 'walled');
    const desk = thing(() => new Desk(), { kg: 20, box: { width: 1, depth: 0.6, height: 0.8 } });
    await desk.setPlacements([Placements.ON, { member: Placements.IN, name: 'drawer', volumeM3: 0.02 }]);
    ContainmentApi.move(desk, room);
    const k = key();
    ContainmentApi.move(k, desk, 'in');
    expect(k.getContainer()).toBe(desk);
    expect(k.getPlacement()).toEqual({ host: desk, name: 'drawer' });
    expect(desk.getPlaced('drawer')).toEqual([k]);
    const k2 = key();
    ContainmentApi.move(k2, desk, 'on');
    expect(k2.getContainer()).toBe(room);
    expect(k2.getPlacement()).toEqual({ host: desk, name: Placements.ON });
    // No word: the desk has an inside of its own — region zero.
    const k3 = key();
    ContainmentApi.move(k3, desk);
    expect(k3.getContainer()).toBe(desk);
    expect(k3.getPlacement()).toBeNull();
  });

  it('⭐ an enclosing region on a host that holds nothing is refused (W9 refusal 3)', async () => {
    class Shelf extends PlacingMixin(Good) {}
    const shelf = thing(() => new Shelf(), { kg: 2 });
    await expect(shelf.setPlacements([{ member: Placements.IN, name: 'cubby' }])).rejects.toThrow(/is not a Container/);
    class BadHost extends PlacingMixin(Good) {
      static override defaultPlacements: readonly string[] = [Placements.IN];
    }
    expect(() => thing(() => new BadHost(), { kg: 1 })).toThrow(/is not a ContainerMixin/);
  });
});
