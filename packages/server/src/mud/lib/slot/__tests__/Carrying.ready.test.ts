/**
 * ⭐ Readying (size-and-carrying D15/D16): what is in the hand goes home,
 * the named thing comes out; packed is refused naming the pack; a bench is
 * used where it stands; nothing is ever dropped for you; in a fight it is
 * the switch, priced in two halves by holder.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { CombatApi } from '../../../api/combat';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, hold, wornBag } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import type { CombatSession } from '../../combat/CombatSession';

describe('Carrying — tiers and readying (D15/D16)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('the tiers: hand · ready (worn, a satchel, loose until the flip) · packed (the back) · elsewhere', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const knife = hold(me, plan, tool('knife', 0.3));
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, satchel);
    const pack = wornBag(me, plan, 'rucksack', 'back');
    const map = tool('map', 0.1);
    ContainmentApi.move(map, pack);
    const loose = tool('flint', 0.1);
    ContainmentApi.move(loose, me);
    const floor = tool('stone', 1);
    ContainmentApi.move(floor, room);
    expect(me.tierOf(knife)).toBe('hand');
    expect(me.tierOf(satchel)).toBe('ready');
    expect(me.tierOf(compass)).toBe('ready');
    expect(me.tierOf(loose)).toBe('ready');
    expect(me.tierOf(map)).toBe('packed');
    expect(me.tierOf(floor)).toBe('elsewhere');
  });

  it('sheathe and draw: the sword goes home to its scabbard, the compass comes to hand', () => {
    const { me, plan } = makeBody();
    const scabbard = wornBag(me, plan, 'scabbard', 'torso');
    const sword = tool('sword', 1.2, [0.05, 0.02, 0.9]);
    sword.setSlotClaims({ [plan]: ['hand:right'] });
    ContainmentApi.move(sword, scabbard);
    hold(me, plan, tool('torch', 0.5), 'hand:left');
    // Draw the sword from its scabbard: its home is remembered.
    expect(me.ready(sword)).toBeNull();
    expect(me.tierOf(sword)).toBe('hand');
    expect(me.homeOf(sword)).toBe(scabbard);
    // Now the compass from the satchel: the sword must go home.
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const compass = tool('compass', 0.2);
    compass.setSlotClaims({ [plan]: ['hand:right'] });
    ContainmentApi.move(compass, satchel);
    expect(me.ready(compass)).toBeNull();
    expect(me.tierOf(compass)).toBe('hand');
    expect(sword.getContainer()).toBe(scabbard);
  });

  it('packed refuses, naming the pack and the way out', () => {
    const { me, plan } = makeBody();
    const pack = wornBag(me, plan, 'rucksack', 'back');
    const map = tool('map', 0.1);
    ContainmentApi.move(map, pack);
    const r = me.ready(map);
    expect(r?.reason).toBe('packed');
    expect(me.refusalWords(r!)).toMatch(/packed in the rucksack — take it off first \(`remove rucksack`\)/);
    expect(me.tierOf(map)).toBe('packed');
  });

  it('a bench in the room is used where it stands', () => {
    const { me } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const bench = tool('bench', 30, [1.5, 0.5, 0.8]);
    ContainmentApi.move(bench, room);
    bench.setFixedInPlace(true);
    expect(me.ready(bench)).toBeNull();
    expect(bench.getContainer()).toBe(room);
  });

  it('never dropped for you: a held thing whose home will not take it back refuses, naming both ways out', () => {
    const { me, plan } = makeBody();
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    // The first hand is the one asked (the plan's order): the lantern's.
    const lantern = hold(me, plan, tool('lantern', 1), 'hand:left');
    hold(me, plan, tool('shield', 4), 'hand:right');
    me.setHome(lantern, pouch);
    // The pouch is too small for it now (a box that refuses).
    vi.spyOn(pouch, 'fitRefusal').mockReturnValue({ reason: 'too-big' } as never);
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, me);
    const r = me.ready(compass);
    expect(r?.reason).toBe('hands-full');
    expect(me.refusalWords(r!)).toMatch(/Drop it \(`drop lantern`\) or put it away first/);
    expect(me.tierOf(lantern)).toBe('hand');
  });

  it('two hands by weight: a shield in the other hand refuses, naming it', () => {
    const { me, plan } = makeBody();
    const shield = tool('shield', 4);
    shield.setSlotClaims({ [plan]: ['hand:left'] });
    ContainmentApi.move(shield, me);
    me.occupy(shield, 'hand:left');
    // A home that refuses keeps the shield in hand.
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    me.setHome(shield, pouch);
    vi.spyOn(pouch, 'fitRefusal').mockReturnValue({ reason: 'too-big' } as never);
    const maul = tool('maul', 12);
    ContainmentApi.move(maul, me);
    expect(me.handsFor(maul)).toBe(2);
    const r = me.ready(maul);
    expect(r?.reason).toBe('hands-full');
    expect(me.refusalWords(r!)).toMatch(/shield/);
  });

  it('in a fight it is a switch priced by the holders: a sheath is fast, a shut pouch slow', () => {
    const { me, plan } = makeBody();
    const dagger = tool('dagger', 0.4);
    dagger.setSlotClaims({ [plan]: ['sidearm'] });
    ContainmentApi.move(dagger, me);
    me.occupy(dagger, 'sidearm');
    // Hands empty: only the draw half. A sheath slot is the draw dial.
    expect(me.readySeconds(dagger)).toBeCloseTo(1.5);
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const bandage = tool('bandage', 0.1);
    ContainmentApi.move(bandage, pouch);
    pouch.setOpen(false);
    // A flapped pouch: a reach and the undoing.
    expect(me.readySeconds(bandage)).toBeCloseTo(6);
    // Something in the hand with no home goes loose (a reach) first.
    hold(me, plan, tool('torch', 0.5), 'hand:right');
    hold(me, plan, tool('club', 1), 'hand:left');
    expect(me.readySeconds(dagger)).toBeCloseTo(3 + 1.5);

    // In a session, `ready` starts the switch with those seconds, and
    // the dagger is not in hand until it completes.
    vi.spyOn(CombatApi, 'sessionFor').mockReturnValue({} as CombatSession);
    const begin = vi.spyOn(me, 'beginWeaponSwitch').mockReturnValue({ ok: true });
    expect(me.ready(dagger)).toBeNull();
    expect(begin).toHaveBeenCalledWith(dagger, { seconds: 4.5 });
    expect(me.tierOf(dagger)).toBe('ready');
  });
});
