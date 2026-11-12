/**
 * ⭐ What `shelf consign` takes after the flip (the size-and-carrying
 * drive's open finding: *Wen Hartley's `shelf consign crate` answering
 * `not-held`*). The view binds the good from your inventory — everything
 * you CARRY: a hand, a pocket, hung from a belt, in a bag. What you WEAR is
 * on you too, and before this nothing stopped it going up: the shelf moved
 * a worn shirt off its wearer's back onto the counter. A consignor hands
 * the shop a good; you take off what you wear first.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import Good from '../../../platform/thing/Good';
import Location from '../../location/Location';
import { Vessel } from '../../stuff/Vessel';
import { DetailedMixin } from '../../description/Detailed';
import { PersistableMixin } from '../../persistence/Persistable';
import { ConsignmentShelfMixin } from '../ConsignmentShelf';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../spatial/__tests__/size-fixture';
import { makeBody, wornGarment } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';

class Shelf extends PersistableMixin(ConsignmentShelfMixin(DetailedMixin(Vessel))) {}

const POCKET = { member: '/platform/placements/pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 };

describe('consign takes what you carry, never what you wear', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  async function scene() {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const shirt = await wornGarment(me, plan, 'shirt', 'torso', [{ ...POCKET, name: 'breast pocket' }]);
    const shelf = makeStuff(() => new Shelf());
    ContainmentApi.move(shelf, room);
    return { room, me, shirt, shelf };
  }
  function good(name: string, box: [number, number, number]): Good {
    const g = makeStuff(() => new Good());
    g.setShortDescription(name);
    g.setKeywords([name]);
    g.setMass(Quantity.of(0.05, 'kg'));
    g.setDimensions({ width: box[0], depth: box[1], height: box[2] });
    return g;
  }

  it('⭐ a worn shirt is refused `worn`, and stays on its wearer', async () => {
    const { me, shirt, shelf } = await scene();
    const answer = await shelf.consignBy(me, shirt, 6);
    expect(answer).toEqual({ ok: false, reason: 'worn' });
    expect(shirt.getContainer()).toBe(me);
    expect(me.wears(shirt)).toBe(true);
  });

  it('a good in a hand or a pocket passes the worn gate (the next gate is the account)', async () => {
    const { room, me, shelf } = await scene();
    const mug = good('mug', [0.09, 0.09, 0.1]);
    const key = good('key', [0.06, 0.025, 0.003]);
    ContainmentApi.move(mug, room);
    ContainmentApi.move(key, room);
    expect(me.receive(mug)).toBeNull();
    expect(me.receive(key, { prefer: 'pockets' })).toBeNull();
    expect(me.wears(mug)).toBe(false);
    expect(me.wears(key)).toBe(false);
    for (const g of [mug, key]) {
      const answer = await shelf.consignBy(me, g, 6);
      expect(answer.ok ? 'ok' : answer.reason).toBe('no-account');
    }
  });
});
