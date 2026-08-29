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
import Material from '../idea/material/Material';
import { Quantity } from '../../lib/quantity';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

let seq = 0;

/** Fill a bottle with a freshly-registered bulk material. */
function fill(bottle: Bottle, name: string, amountL = 0.5): void {
  const material = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setTags(['liquid']);
    return m;
  }, `/stuff/idea/material/bulk/${name}-${seq++}`) as unknown as Material;
  bottle.setBulkMaterial('interior', material as never);
  bottle.setBulkAmount('interior', Quantity.of(amountL, 'L'));
}

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

  it('an unauthored census key derives from what it holds; an authored one wins', () => {
    const b = makeStuff(() => new Bottle());
    stampTemplatePathForTest(b, '/obj/test/bottle-3');
    fill(b, 'gin');
    expect(b.getCensusKey()).toBe('material:gin');
    b.setCensusKey('spirit:gin');
    expect(b.getCensusKey()).toBe('spirit:gin');
  });

  // ⭐ The census counts PRODUCT. An emptied bottle is not a bottle of
  // gin — it is a bottle. Before this, an empty kept its authored key
  // for ever, so a world drunk dry read as *at target* while the shelf
  // stood bare and the sweep never restocked.
  describe('the census counts product, not vessels', () => {
    it('an empty vessel reports vessel:<keyword>, whatever its row authored', () => {
      const b = makeStuff(() => new Bottle());
      stampTemplatePathForTest(b, '/obj/test/bottle-4');
      b.setCensusKey('spirit:gin');
      expect(b.getCensusKey()).toBe('vessel:bottle');
    });

    it('filling makes it product and draining makes it a vessel again', () => {
      const b = makeStuff(() => new Bottle());
      stampTemplatePathForTest(b, '/obj/test/bottle-5');
      b.setCensusKey('spirit:gin');
      expect(b.getCensusKey()).toBe('vessel:bottle');

      fill(b, 'gin');
      expect(b.getCensusKey()).toBe('spirit:gin');

      b.setBulkAmount('interior', Quantity.of(0, 'L'));
      expect(b.getCensusKey()).toBe('vessel:bottle');
    });

    it("the empty's key is derived, never authored — so nothing can target it and the sweep never mints empties", () => {
      const b = makeStuff(() => new Bottle());
      stampTemplatePathForTest(b, '/obj/test/bottle-6');
      b.setKeywords(['can', 'tin']);
      b.setPrimaryKeyword('can');
      expect(b.getCensusKey()).toBe('vessel:can');
    });
  });
});
