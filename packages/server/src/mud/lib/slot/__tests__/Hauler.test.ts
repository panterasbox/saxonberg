/**
 * HaulerMixin — the hauler side: the hitch/unhitch live-ref pairing, the
 * draft term folded into getBorneBurden, and the symmetric R2.2 cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { massThing } from '../../encumbrance/__tests__/encumbrance-fixtures';
import { cart, haulingBearer } from './haulage-fixtures';

describe('HaulerMixin — hauler side', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the predicate narrows a hauler', () => {
    expect(MixinApi.isHauling(haulingBearer())).toBe(true);
  });

  describe('hitch / unhitch (symmetric pair)', () => {
    it('hitch couples both sides', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);
      expect(bearer.isHitched()).toBe(true);
      expect(bearer.getHauledCart()).toBe(c);
      expect(c.getHauledBy()).toBe(bearer);
    });

    it('unhitch clears both sides', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);
      bearer.unhitch();
      expect(bearer.isHitched()).toBe(false);
      expect(bearer.getHauledCart()).toBeNull();
      expect(c.getHauledBy()).toBeNull();
    });

    it('hitching a second cart drops the first', () => {
      const bearer = haulingBearer();
      const a = cart();
      const b = cart();
      bearer.hitch(a);
      bearer.hitch(b);
      expect(bearer.getHauledCart()).toBe(b);
      expect(a.getHauledBy()).toBeNull();
      expect(b.getHauledBy()).toBe(bearer);
    });
  });

  describe('getHaulDraft', () => {
    it('is zero when not hitched', () => {
      expect(haulingBearer().getHaulDraft().rawValue()).toBe(0);
    });
    it('is the cart draft load when hitched', () => {
      const bearer = haulingBearer();
      const c = cart(25, 0.04);
      ContainmentApi.move(massThing(100), c);
      bearer.hitch(c);
      expect(bearer.getHaulDraft().rawValue()).toBeCloseTo((25 + 100) * 0.04);
    });
  });

  describe('the draft term folds into getBorneBurden', () => {
    it('burden rises by exactly the cart draft load while hitched', () => {
      const bearer = haulingBearer(70);
      const c = cart(25, 0.04);
      ContainmentApi.move(massThing(100), c);
      const before = bearer.getBorneBurden().rawValue();
      bearer.hitch(c);
      const after = bearer.getBorneBurden().rawValue();
      expect(after - before).toBeCloseTo((25 + 100) * 0.04);
    });

    it('the cart cargo never touches the burden directly (only its draft)', () => {
      const bearer = haulingBearer(70);
      const c = cart(25, 0.04);
      bearer.hitch(c);
      const empty = bearer.getBorneBurden().rawValue();
      // pile 300 kg into the cart — burden rises only by 300×0.04 of draft
      ContainmentApi.move(massThing(300), c);
      const loaded = bearer.getBorneBurden().rawValue();
      expect(loaded - empty).toBeCloseTo(300 * 0.04);
    });
  });

  describe('live-ref cleanup (R2.2 / R2.3)', () => {
    it('destructing the cart clears the hauler side', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);
      StuffApi.destruct(c);
      expect(bearer.getHauledCart()).toBeNull();
      expect(bearer.isHitched()).toBe(false);
    });

    it('destructing the hauler clears the cart side', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);
      StuffApi.destruct(bearer);
      expect(c.getHauledBy()).toBeNull();
    });
  });
});
