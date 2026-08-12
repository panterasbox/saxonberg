/**
 * The reserve → condition-band feed: a floored biological reserve
 * (exhaustion / starvation / dehydration) degrades the derived band.
 * The reserves are themed `biological`, never a magic pool.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('VitalsMixin — reserve → band feed', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a floored biological reserve worsens the condition band', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getConditionBand()).toBe('healthy');

    c.adjustReserve('endurance', Quantity.of(-100, '%')); // → 0
    expect(c.getConditionBand()).not.toBe('healthy');
  });

  it('biological reserves are themed biological, not a magic pool', () => {
    const c = makeStuff(() => new Creature());
    for (const r of c.getReserves().values()) {
      expect(r.theme).toBe('biological');
    }
  });
});
