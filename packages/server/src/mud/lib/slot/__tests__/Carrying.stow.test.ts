/**
 * ⭐ `stow` is the route off the hands (size and carrying D-W10-2): the
 * first of the carrier's places that takes a held thing, in D11's order
 * (a pocket of a worn garment, a hook, a hung or pocketed container, a worn
 * bag, the pack) — and when nothing takes it, `nowhere-to-carry`, nothing
 * moves, it stays in the hand. Never the floor; no homes.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../spatial/__tests__/size-fixture';
import { makeBody, wornBag, wornGarment, pack, tool } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Quantity } from '../../quantity';
import Good from '../../../platform/thing/Good';
import Location from '../../location/Location';

const POCKET = { member: '/platform/placements/in', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 };

function good(name: string, kg: number, box: [number, number, number]): Good {
  const g = makeStuff(() => new Good());
  g.setShortDescription(name);
  g.setKeywords([name]);
  g.setMass(Quantity.of(kg, 'kg'));
  g.setDimensions({ width: box[0], depth: box[1], height: box[2] });
  return g;
}

describe('Carrying.stow — off the hands, by the one order (D-W10-2)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
  });
  afterEach(() => StuffApi.clearAll());

  it('a held mug with no pocket that fits and no bag: refused `nowhere-to-carry`, the mug stays in the hand', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    await wornGarment(me, plan, 'trousers', 'legs', [{ ...POCKET, name: 'left pocket' }]);
    const mug = good('mug', 0.35, [0.09, 0.09, 0.1]);
    ContainmentApi.move(mug, room);
    ContainmentApi.move(mug, me);
    expect(me.tierOf(mug)).toBe('hand');
    expect(me.stowPlaceFor(mug)).toBeNull();
    const r = me.stow(mug);
    expect(r?.reason).toBe('nowhere-to-carry');
    expect(me.tierOf(mug)).toBe('hand');
    expect(mug.getContainer()).toBe(me);
  });

  it('with a satchel worn, the mug goes there', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const mug = good('mug', 0.35, [0.09, 0.09, 0.1]);
    ContainmentApi.move(mug, room);
    ContainmentApi.move(mug, me);
    // Asked dry first (the unwield line names it before the hand moves).
    expect(me.stowPlaceFor(mug)?.host).toBe(satchel);
    expect(me.tierOf(mug)).toBe('hand');
    expect(me.stow(mug)).toBeNull();
    expect(mug.getContainer()).toBe(satchel);
  });

  // ⭐ Finalize drive run 15, step 6: `unwield sword` put an arming sword up
  // in the belt pouch beside its own scabbard — the pouch hung first, and an
  // open pouch lets a rod stand out of its mouth. A holder SHAPED for the
  // thing (the scabbard for its sword, the holster for its pistol) is where
  // it is put away, before the order's first fit.
  it('a holder shaped for the thing takes it before the first place that merely fits', () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const scabbard = pack('scabbard', 0.3, [0.06, 0.02, 0.95], 'WieldableMixin');
    scabbard.setSlotClaims({ [plan]: ['waist'] });
    me.seatInSlot(scabbard as never, 'waist');
    const sword = tool('sword', 1.2, [0.05, 0.01, 0.9]);
    ContainmentApi.move(sword, room);
    ContainmentApi.move(sword, me);
    expect(me.tierOf(sword)).toBe('hand');
    expect(satchel.fitRefusal(sword)).toBeNull(); // the satchel would take it too
    expect(me.stowPlaceFor(sword)?.host).toBe(scabbard);
    expect(me.stow(sword)).toBeNull();
    expect(sword.getContainer()).toBe(scabbard);
  });

  it('a key goes to a pocket before the satchel', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', [{ ...POCKET, name: 'left pocket' }]);
    wornBag(me, plan, 'satchel', 'torso');
    const key = good('key', 0.02, [0.06, 0.025, 0.003]);
    ContainmentApi.move(key, room);
    ContainmentApi.move(key, me);
    expect(me.tierOf(key)).toBe('hand');
    expect(me.stow(key)).toBeNull();
    expect(key.getPlacement()).toEqual({ host: trousers, name: 'left pocket' });
  });
});
