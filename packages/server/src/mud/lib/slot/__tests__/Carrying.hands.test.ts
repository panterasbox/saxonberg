/**
 * ⭐ Hands (size-and-carrying D9/D10/D18): a hand is a slot whose body part
 * serves manipulation; how many a thing takes is derived from the holder —
 * its weight against the holder's own carry, its length against the
 * holder's stature — or authored by use; a hurt hand does not grip; a
 * cart's handles take the hands the cart says.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { CARRYING_DEFAULTS } from '../Carrying';
import { makeBody, tool, hold, handsOf, carryWords } from './carrying-fixture';
import { cart } from './haulage-fixtures';
import { makeStuff } from '../../security/__tests__/test-setup';
import { HaulerMixin } from '../Hauler';
import { Body } from './carrying-fixture';
import Good from '../../../platform/thing/Good';
import Garment from '../../../platform/thing/equipment/Garment';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';

class HaulingBody extends HaulerMixin(Body) {}

describe('Carrying — hands (D9/D10)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the hands are the slots whose part serves manipulation — a ring slot at the hand is worn, not a hand; a horse has none', () => {
    const { me } = makeBody();
    expect(me.handSlots().sort()).toEqual(['hand:left', 'hand:right']);
    expect(me.freeHands()).toBe(2);
    const { me: horse } = makeBody({ hands: false });
    expect(horse.handSlots()).toEqual([]);
    expect(horse.freeHands()).toBe(0);
  });

  it('a human holds 10 kg in one hand and needs both for 11 kg or a 1.2 m staff', () => {
    const { me } = makeBody();
    expect(handsOf(me, tool('kettlebell', 10))).toBe(1);
    expect(handsOf(me, tool('anvil-horn', 11))).toBe(2);
    expect(handsOf(me, tool('staff', 1.5, [0.04, 0.04, 1.2]))).toBe(2);
    expect(handsOf(me, tool('knife', 0.3, [0.03, 0.02, 0.25]))).toBe(1);
  });

  it("the gnome's threshold sits below the human's: 4 kg / 0.6 m", () => {
    const { me: gnome } = makeBody({ mass: 27, stature: 1.0 });
    expect(handsOf(gnome, tool('sack', 3.9))).toBe(1);
    expect(handsOf(gnome, tool('sack', 4.2))).toBe(2);
    expect(handsOf(gnome, tool('shortsword', 1, [0.05, 0.02, 0.65]))).toBe(2);
    const { me: human } = makeBody();
    expect(handsOf(human, tool('shortsword', 1, [0.05, 0.02, 0.65]))).toBe(1);
    expect(CARRYING_DEFAULTS.TWO_HAND_LENGTH).toBe(0.6);
  });

  it('past the strain ceiling nothing can lift it; an authored two-hand claim is honored', () => {
    const { me, plan } = makeBody();
    expect(handsOf(me, tool('boulder', 200))).toBeNull();
    const bow = tool('bow', 1, [0.05, 0.03, 0.9]);
    bow.setSlotClaims({ [plan]: ['hand:left', 'hand:right'] });
    expect(handsOf(me, bow)).toBe(2);
  });

  it('a held thing takes its hand', () => {
    const { me, plan } = makeBody();
    hold(me, plan, tool('knife', 0.3));
    expect(me.freeHands()).toBe(1);
    expect(me.heldThings().map((t) => t.getPresentation())).toEqual(['a knife']);
  });

  it("a hitched cart's handles take the hands it says", () => {
    const n = makeBody();
    const me = makeStuff(() => new HaulingBody());
    me.setSpecies(n.me.getSpecies()!);
    const c = cart();
    expect(c.getHandedness()).toBe(2);
    me.hitch(c);
    expect(me.freeHands()).toBe(0);
    const r = me.canReceive(tool('cup', 0.2));
    expect(r?.reason).toBe('hands-on-cart');
    expect(carryWords(me, r!)).toMatch(/hands are on/);
  });

  it('nowhere to carry: the refusal names the hands and what was tried', () => {
    const { me, plan } = makeBody();
    hold(me, plan, tool('knife', 0.3), 'hand:right');
    hold(me, plan, tool('torch', 0.5), 'hand:left');
    const r = me.canReceive(tool('cup', 0.2));
    expect(r?.reason).toBe('nowhere-to-carry');
    // ⭐ The refusal is the tutorial (the flip, W7): the hands' contents,
    // what did not fit, and the next command.
    expect(carryWords(me, r!)).toMatch(/^Your hands are full — the (knife and the torch|torch and the knife) — and the cup has nowhere to go\. Set something down \(`drop (knife|torch)`\)\.$/);
  });
});

describe('Carrying — a hand holds any good (W7)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ a plain good (a mug: not wieldable, not worn) is slottable, and a hand closes on it', () => {
    const { me } = makeBody();
    const mug = makeStuff(() => new Good());
    mug.setShortDescription('mug');
    mug.setMass(Quantity.of(0.35, 'kg'));
    expect(MixinApi.isSlottable(mug)).toBe(true);
    expect(MixinApi.isWieldable(mug)).toBe(false);
    expect(me.canOccupy(mug, 'hand:right')).toBe(true);
    me.seatInSlot(mug, 'hand:right');
    expect(me.heldThings()).toContain(mug);
    expect(me.tierOf(mug)).toBe('hand');
  });

  it('a good that is also worn composes Slottable once (no second layer)', () => {
    const chain: string[] = [];
    for (let c: unknown = Garment; typeof c === 'function'; c = Object.getPrototypeOf(c)) {
      if (Object.prototype.hasOwnProperty.call(c, '_mixinName')) chain.push((c as unknown as { _mixinName: string })._mixinName);
    }
    expect(chain.filter((n) => n === 'SlottableMixin')).toHaveLength(1);
  });

  it('a non-hand slot still asks its accepts (a mug is not worn on the torso)', () => {
    const { me } = makeBody();
    const mug = makeStuff(() => new Good());
    expect(me.canOccupy(mug, 'torso')).toBe(false);
  });
});
