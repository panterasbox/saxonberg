/**
 * LoadBearing observability — the gauge surfaces through the existing
 * `subscribableFields` projection (the `Tangible.mass` precedent), so the
 * inspection / live-query substrate can read borne burden, carry
 * capacity, and load ratio off a bearer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import type { Sensor } from '../../message/Sensor';
import type { Stuff } from '../../stuff/Stuff';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { sensingBearer, massThing } from './encumbrance-fixtures';

describe('LoadBearing — observability via subscribableFields', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('projects borneBurden / carryCapacity / loadRatio matching the getters', () => {
    const bearer = sensingBearer(70);
    ContainmentApi.move(massThing(20), bearer);
    const viewer = bearer as unknown as Stuff & Sensor;

    const projection = MqlSubscriptionApi.projectFields(
      bearer as unknown as Stuff,
      ['borneBurden', 'carryCapacity', 'loadRatio'],
      viewer,
    );

    expect(projection.borneBurden).toEqual({
      value: bearer.getBorneBurden().rawValue(),
      unit: 'kg',
    });
    expect(projection.carryCapacity).toEqual({
      value: bearer.getCarryCapacity().rawValue(),
      unit: 'kg',
    });
    expect(projection.loadRatio).toBeCloseTo(bearer.getLoadRatio());
  });
});
