/**
 * The §1.4 invariant: the move / containment substrate stays
 * encumbrance-agnostic. A raw `ContainmentApi.move` of an over-ceiling
 * item onto a bearer neither blocks nor drains — encumbrance consequences
 * live only at the actor-experience layers (`GetController`,
 * `LocomotionApi`), never in the primitive.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { bearerCreature, massThing } from '../../encumbrance/__tests__/encumbrance-fixtures';

describe('move substrate stays encumbrance-agnostic', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a raw move of a 200 kg anvil onto a sparrow Just Works (no block)', () => {
    const sparrow = bearerCreature(0.03); // a 30 g body, capacity ~0
    const anvil = massThing(200);
    // The lift gate would decline this via `get`, but the containment
    // primitive must not — a dev/script move just lands it.
    expect(() => ContainmentApi.move(anvil, sparrow)).not.toThrow();
    expect(anvil.getContainer()).toBe(sparrow);
  });

  it('a raw move does not drain endurance', () => {
    const bearer = bearerCreature(70);
    const before = bearer.getReserve('endurance')!.current.rawValue();
    ContainmentApi.move(massThing(200), bearer);
    expect(bearer.getReserve('endurance')!.current.rawValue()).toBe(before);
  });
});
