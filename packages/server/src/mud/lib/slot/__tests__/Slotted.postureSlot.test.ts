/**
 * ⭐ A posture-bearing slot is where a BODY sits or lies (posture.md) — the
 * handcart's `bed`, a bench's seat. `put` never fills one with a thing:
 * since the flip a hand holds any good (W7-f — `Good` composes
 * `SlottableMixin`), so a ration put in the handcart passed the bed's
 * `accepts: SlottableMixin` and "seated with a click" (the size-and-carrying
 * drive, step 18). It goes into the cart's interior instead.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import Good from '../../../platform/thing/Good';
import Handcart from '../../../platform/thing/equipment/Handcart';
import Location from '../../location/Location';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../spatial/__tests__/size-fixture';
import { makeBody } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('a posture-bearing slot is for a body, never for a put thing', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  function scene() {
    const room = makeStuff(() => new Location());
    const cart = makeStuff(() => new Handcart());
    cart.setShortDescription('wooden handcart');
    cart.setKeywords(['handcart']);
    cart.setMass(Quantity.of(25, 'kg'));
    cart.setDimensions({ width: 0.9, depth: 1.6, height: 0.7 });
    cart.setStaticSlots([
      { name: 'bed', accepts: 'SlottableMixin', capacity: 1, postures: ['sit', 'lie'] },
    ]);
    ContainmentApi.move(cart, room);
    const ration = makeStuff(() => new Good());
    ration.setShortDescription('trail ration');
    ration.setKeywords(['ration']);
    ration.setMass(Quantity.of(0.3, 'kg'));
    ration.setDimensions({ width: 0.12, depth: 0.08, height: 0.04 });
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    ContainmentApi.move(ration, room);
    return { room, cart, ration, me };
  }

  it('a ration is offered no seat', () => {
    const { cart, ration } = scene();
    expect(cart.openSlotFor(ration)).toBeNull();
  });

  it('⭐ `put ration in handcart` goes into the cart, and the bed stays free', async () => {
    const { cart, ration, me } = scene();
    const plan = ContainmentApi.putPlanFor(ration, cart, { prep: 'in', by: me });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.facts.route.kind).toBe('zero');
    const done = await plan.onComplete();
    expect(done.ok).toBe(true);
    expect(ration.getContainer()).toBe(cart);
    expect([...cart.getOccupants('bed')]).toHaveLength(0);
  });
});
