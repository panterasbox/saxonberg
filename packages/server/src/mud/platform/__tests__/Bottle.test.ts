/**
 * Bottle — the stock vessel every floor product is a row over
 * (libations 1f): the presets a row departs from, the capabilities it
 * composes, and the census key that derives from what it holds.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { MixinApi } from '../../api/mixin';
import { makeStuff, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Bottle from '../thing/Bottle';

describe('Bottle', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('composes chattel, circulating, sealable, graded and bulkable', () => {
    const b = makeStuff(() => new Bottle());
    stampTemplatePathForTest(b, '/obj/test/bottle-1');
    expect(MixinApi.isChattel(b)).toBe(true);
    expect(MixinApi.isCirculating(b)).toBe(true);
    expect(MixinApi.isSealable(b)).toBe(true);
    expect(MixinApi.isBulkable(b)).toBe(true);
    expect(MixinApi.isGraded(b)).toBe(true);
    expect(typeof b.getBrandKey).toBe('function');
  });

  it('the preset: a 0.75 L liquid-tight glass bottle', () => {
    const b = makeStuff(() => new Bottle());
    stampTemplatePathForTest(b, '/obj/test/bottle-2');
    expect(b.getInteriorCapacity()?.value).toBe(0.75);
    expect(b.getClosure()).toBe('liquidTight');
    expect(b.getPrimaryKeyword()).toBe('bottle');
  });

  it('an unauthored census key is empty until it holds something; an authored one wins', () => {
    const b = makeStuff(() => new Bottle());
    stampTemplatePathForTest(b, '/obj/test/bottle-3');
    expect(b.getCensusKey()).toBe('');
    b.setCensusKey('spirit:gin');
    expect(b.getCensusKey()).toBe('spirit:gin');
  });
});
