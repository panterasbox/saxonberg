/**
 * HaulableMixin — the cart side: draftFactor/handedness validation, the
 * draft-load formula (own frame + Vessel-attenuated contents) × draftFactor,
 * and the R2.3 self-heal back-ref.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  vessel,
  massThing,
} from '../../encumbrance/__tests__/encumbrance-fixtures';
import { cart, haulingBearer } from './haulage-fixtures';

describe('HaulableMixin — cart side', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the predicate narrows a cart', () => {
    const c = cart();
    expect(MixinApi.isHaulable(c)).toBe(true);
  });

  describe('draftFactor validation (the transmissionFactor precedent)', () => {
    it('accepts a value in [0, 1]', () => {
      const c = cart();
      c.setDraftFactor(0.03);
      expect(c.getDraftFactor()).toBeCloseTo(0.03);
    });
    it('rejects > 1, < 0, and non-finite', () => {
      const c = cart();
      expect(() => c.setDraftFactor(1.2)).toThrow(RangeError);
      expect(() => c.setDraftFactor(-0.1)).toThrow(RangeError);
      expect(() => c.setDraftFactor(NaN)).toThrow(RangeError);
    });
  });

  describe('handedness validation', () => {
    it('accepts 1 or 2', () => {
      const c = cart();
      c.setHandedness(1);
      expect(c.getHandedness()).toBe(1);
      c.setHandedness(2);
      expect(c.getHandedness()).toBe(2);
    });
    it('rejects anything else', () => {
      const c = cart();
      expect(() => c.setHandedness(0)).toThrow(RangeError);
      expect(() => c.setHandedness(3)).toThrow(RangeError);
    });
  });

  it('passageMode defaults to wheeled', () => {
    expect(cart().passageMode).toBe('wheeled');
  });

  describe('getDraftLoad', () => {
    it('empty cart = frame mass × draftFactor', () => {
      const c = cart(25, 0.04);
      expect(c.getDraftLoad().rawValue()).toBeCloseTo(25 * 0.04);
    });

    it('loaded cart = (frame + cargo) × draftFactor', () => {
      const c = cart(25, 0.04);
      ContainmentApi.move(massThing(100), c);
      expect(c.getDraftLoad().rawValue()).toBeCloseTo((25 + 100) * 0.04);
    });

    it('a bag of holding inside the cart contributes ~0', () => {
      const c = cart(25, 0.04);
      const bag = vessel(0.5, 0.05); // near-zero transmission
      ContainmentApi.move(bag, c);
      ContainmentApi.move(massThing(100), bag);
      // contents = bag(0.5) + 100×0.05 = 5.5; draft = (25 + 5.5)×0.04
      expect(c.getDraftLoad().rawValue()).toBeCloseTo((25 + 0.5 + 100 * 0.05) * 0.04);
      // vastly less than carrying the 100 kg as plain cargo on the cart
      expect(c.getDraftLoad().rawValue()).toBeLessThan((25 + 100) * 0.04);
    });
  });

  it('getHauledBy self-heals when the hauler destructs without witness', () => {
    const c = cart();
    const bearer = haulingBearer();
    // Wire only the cart's back-ref (simulate a half-set / stale pair).
    c.setHauledBy(bearer);
    expect(c.getHauledBy()).toBe(bearer);
    StuffApi.destruct(bearer);
    expect(c.getHauledBy()).toBeNull();
  });
});
