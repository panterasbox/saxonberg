/**
 * ⭐ When the body stops (size-and-carrying D13): a grip that fails lets go.
 * Unconscious drops the sword and keeps the belt; a severed hand drops what
 * it held; the room hears it.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, hold, wornBag } from './carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';

describe('Carrying — releaseHeld (D13)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('lets go of what the hands hold, to the place; worn things stay', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const sword = hold(me, plan, tool('sword', 1.2));
    const belt = wornBag(me, plan, 'belt', 'torso');
    const dropped = me.releaseHeld();
    expect(dropped).toEqual([sword]);
    expect(sword.getContainer()).toBe(room);
    expect(me.isSlotOccupied('hand:right')).toBe(false);
    expect(belt.getContainer()).toBe(me);
    expect(me.isSlotOccupied('torso')).toBe(true);
  });

  it('going under lets go: unconscious drops the sword, keeps the belt', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const sword = hold(me, plan, tool('sword', 1.2));
    const belt = wornBag(me, plan, 'belt', 'torso');
    // Conscious first: nothing moves.
    expect(me.getConsciousness()).toBe('conscious');
    expect(sword.getContainer()).toBe(me);
    // Sedated — the consciousness read says unconscious.
    vi.spyOn(me as never as { isSedated(): boolean }, 'isSedated').mockReturnValue(true);
    expect(me.getConsciousness()).toBe('unconscious');
    expect(sword.getContainer()).toBe(room);
    expect(belt.getContainer()).toBe(me);
  });

  it('a severed hand drops what it held', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const knife = hold(me, plan, tool('knife', 0.3), 'hand:right');
    const torch = hold(me, plan, tool('torch', 0.5), 'hand:left');
    me.severPart('body.hand.right');
    expect(knife.getContainer()).toBe(room);
    expect(torch.getContainer()).toBe(me);
  });
});
