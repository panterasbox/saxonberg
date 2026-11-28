/**
 * ⭐ Readying (size-and-carrying D15/D16; D-W10-3): the named thing comes
 * into a FREE hand, or a refusal naming what holds the hands — nothing is
 * put away for you and nothing remembers a home; packed is refused naming
 * the pack; a fixture is used where it stands; a portable thing off your
 * body is `not-on-you`; in a fight it is the switch, priced by its holder.
 */
import '../../../../test-bootstrap';
import { carry, handsOf, carryWords } from './carrying-fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { CombatApi } from '../../../api/combat';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, hold, wornBag } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../place/Location';
import type { CombatSession } from '../../combat/CombatSession';

describe('Carrying — tiers and readying (D15/D16)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('the tiers: hand · ready (worn, a satchel) · packed (the back) · elsewhere', () => {
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
    // A second thing received goes to the other hand (the flip, W7).
    const flint = tool('flint', 0.1);
    carry(me, flint);
    const floor = tool('stone', 1);
    ContainmentApi.move(floor, room);
    expect(me.tierOf(knife)).toBe('hand');
    expect(me.tierOf(satchel)).toBe('ready');
    expect(me.tierOf(compass)).toBe('ready');
    expect(me.tierOf(flint)).toBe('hand');
    expect(me.tierOf(map)).toBe('packed');
    expect(me.tierOf(floor)).toBe('elsewhere');
  });

  it('a sword in hand and a compass in the pouch: hands-needed naming the sword; with a free hand the compass comes to it and the sword stays', () => {
    const { me, plan } = makeBody();
    const sword = hold(me, plan, tool('sword', 1.2, [0.05, 0.02, 0.9]), 'hand:right');
    hold(me, plan, tool('lantern', 1), 'hand:left');
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, pouch);
    const r = me.ready(compass) as { ok: boolean; reason?: string; facts?: { held: unknown[] } } | null;
    expect(r?.reason).toBe('hands-needed');
    expect(r?.facts?.held).toHaveLength(2);
    expect(carryWords(me, r!)).toMatch(/That takes a free hand — you're holding the (sword|lantern) and the (sword|lantern)\. `drop (sword|lantern)` or `drop (sword|lantern)` \(free in a fight\), or put one away first \(`unwield (sword|lantern)`/);
    // ⭐ Each thing held is offered to drop (requirements step 7: the lantern, though the shield is named last).
    expect(carryWords(me, r!)).toMatch(/`drop sword`/);
    expect(carryWords(me, r!)).toMatch(/`drop lantern`/);
    // Nothing moved: the sword and the lantern in hand, the compass in the pouch.
    expect(me.tierOf(sword)).toBe('hand');
    expect(compass.getContainer()).toBe(pouch);
    // Free a hand by an explicit act; now the compass comes to it.
    me.releaseHeld(['hand:left']);
    const out = me.ready(compass);
    expect(out?.ok ?? true).toBe(true);
    expect(me.tierOf(compass)).toBe('hand');
    expect(me.tierOf(sword)).toBe('hand');
  });

  it('packed refuses, naming the pack and the way out', () => {
    const { me, plan } = makeBody();
    const pack = wornBag(me, plan, 'rucksack', 'back');
    const map = tool('map', 0.1);
    ContainmentApi.move(map, pack);
    const r = me.ready(map) as { ok: boolean; reason?: string } | null;
    expect(r?.reason).toBe('packed');
    expect(carryWords(me, r!)).toMatch(/packed in the rucksack — take it off first \(`remove rucksack`\)/);
    expect(me.tierOf(map)).toBe('packed');
  });

  it('a bench in the room is used where it stands', () => {
    const { me } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const bench = tool('bench', 30, [1.5, 0.5, 0.8]);
    ContainmentApi.move(bench, room);
    bench.setFixedInPlace(true);
    expect(me.ready(bench)?.ok ?? true).toBe(true);
    expect(bench.getContainer()).toBe(room);
  });

  it('a portable thing in the room is not yours to ready — `get` is the act', () => {
    const { me } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const stone = tool('stone', 1);
    ContainmentApi.move(stone, room);
    const r = me.ready(stone) as { ok: boolean; reason?: string } | null;
    expect(r?.reason).toBe('not-on-you');
    expect(stone.getContainer()).toBe(room);
  });

  it('a thing in another body is not-on-you', () => {
    const { me } = makeBody();
    const { me: other, plan: otherPlan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    ContainmentApi.move(other, room);
    const knife = hold(other, otherPlan, tool('knife', 0.3));
    const r = me.ready(knife) as { ok: boolean; reason?: string } | null;
    expect(r?.reason).toBe('not-on-you');
  });

  it('two hands by weight: a shield in the other hand refuses hands-needed, naming it', () => {
    const { me, plan } = makeBody();
    const shield = tool('shield', 4);
    shield.setSlotClaims({ [plan]: ['hand:left'] });
    me.seatInSlot(shield, 'hand:left');
    const maul = tool('maul', 12);
    // Slung in a bag at the waist — on you, not in hand (the flip, W7).
    ContainmentApi.move(maul, wornBag(me, plan, 'sling', 'waist'));
    expect(handsOf(me, maul)).toBe(2);
    const r = me.ready(maul) as { ok: boolean; reason?: string } | null;
    expect(r?.reason).toBe('hands-needed');
    expect(carryWords(me, r!)).toMatch(/both hands — you're holding the shield/);
  });

  it('in a fight, `ready` starts the switch (combat prices it — CombatLogic.switch-pricing)', () => {
    const { me, plan } = makeBody();
    const dagger = tool('dagger', 0.4);
    dagger.setSlotClaims({ [plan]: ['sidearm'] });
    me.seatInSlot(dagger, 'sidearm');
    // In a session, `ready` starts the switch with those seconds, and
    // the dagger is not in hand until it completes.
    vi.spyOn(CombatApi, 'sessionFor').mockReturnValue({} as CombatSession);
    const begin = vi.spyOn(me, 'beginWeaponSwitch').mockReturnValue({ ok: true });
    expect(me.ready(dagger)?.ok ?? true).toBe(true);
    expect(begin).toHaveBeenCalledWith(dagger);
    expect(me.tierOf(dagger)).toBe('ready');
  });
});
