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
import { makeBody, wornBag, wornGarment } from './carrying-fixture';
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
    expect(me.stow(mug)).toBeNull();
    expect(mug.getContainer()).toBe(satchel);
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
