/**
 * BloodUnit (blood build D13) — `onCreate` stamps the matching
 * `BulkPayload.blood` from the authored fields, because the payload is
 * runtimeState and a row cannot author it. This is what `getLots` counts;
 * if the stamp did not fire, a shelf of units would read empty.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import BloodUnit from '../thing/BloodUnit';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

function seedBloodMaterial(): Material {
  const existing = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
  if (existing) return existing;
  const m = makeStuff(() => new Material());
  m.setTags(['tissue', 'blood', 'liquid', 'organic']);
  stampTemplatePathForTest(m, BLOOD_MATERIAL);
  return m;
}

describe('BloodUnit', () => {
  it('composes Circulating + Branded (a spawn-eligible, brandable unit)', () => {
    const u = makeStuff(() => new BloodUnit());
    expect(MixinApi.isCirculating(u)).toBe(true);
    expect(MixinApi.isBulkable(u)).toBe(true);
    // Branded has no MixinApi predicate; its surface is getBrand/getCorpo.
    expect(typeof (u as unknown as { getCorpo?: unknown }).getCorpo).toBe('function');
  });

  it('⭐ onCreate stamps the payload from the fields (what getLots counts)', async () => {
    const u = makeStuff(() => new BloodUnit());
    // Stand in for the row's authored data.
    u.bloodSystem = 'hominid';
    u.donorKey = '/corpo/goodkin/bloodworks';
    const slot = u.getBulk();
    slot.setMaterial(seedBloodMaterial());
    slot.setAmount(Quantity.of(0.45, 'L'));

    await u.seedBloodType('A');

    const blood = u.getBulk().getPayload()?.blood;
    expect(blood).toBeTruthy();
    expect(blood!.type).toBe('A');
    expect(blood!.system).toBe('hominid');
    expect(blood!.labelled).toBe(true);
    expect(blood!.donorIdentityPath).toBe('/corpo/goodkin/bloodworks');
  });

  it('leaves an already-stamped bag alone (a drawn unit keeps its own)', async () => {
    const u = makeStuff(() => new BloodUnit());
    u.bloodSystem = 'hominid';
    const slot = u.getBulk();
    slot.setMaterial(seedBloodMaterial());
    slot.setAmount(Quantity.of(0.45, 'L'));
    slot.setPayload({
      blood: {
        speciesPath: '',
        system: 'fae',
        type: 'O',
        labelled: false,
        donorIdentityPath: '/who/a-player',
      },
    });

    await u.seedBloodType('A');

    const blood = u.getBulk().getPayload()?.blood;
    expect(blood!.type).toBe('O'); // untouched — the drawn unit's own
    expect(blood!.system).toBe('fae');
  });
});
