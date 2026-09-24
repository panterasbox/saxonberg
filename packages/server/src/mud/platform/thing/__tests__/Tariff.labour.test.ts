/**
 * ⭐⭐ The labour-indexed tariff (recovery D13) — a treatment's bill bends
 * with the CUSTOMER's wage × how badly the harm impaired them. A well-paid
 * body with a failing leg pays more than an unemployed one with the same
 * wound; an unhurt or destitute body pays the base.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Tariff from '../Tariff';
import { Creature } from '../../../lib/creature/Creature';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../../lib/stuff/Stuff';

function tariff(): Tariff {
  const t = makeStuff(() => new Tariff());
  t.setPrice('treatment', 12);
  (t as unknown as { services: Record<string, string> }).services = {
    treatment: 'treatment',
  };
  t.setLabourIndexed(true);
  return t;
}

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('Tariff.labourIndexFor', () => {
  it('⭐ an unhurt body pays base (shortfall 0 → multiplier 1)', () => {
    const t = tariff();
    const body = makeStuff(() => new Creature());
    expect(t.labourIndexFor(body as unknown as Stuff)).toBeCloseTo(1, 5);
  });

  it('⭐⭐ an UNEMPLOYED body pays base (wage 0 → the destitute pay base, whatever the harm)', () => {
    const t = tariff();
    const body = makeStuff(() => new Creature());
    body.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.leg.left',
      severity: 2,
    });
    // A Creature is not Employed, so wage is 0 → multiplier 1 regardless of
    // shortfall. The wage × shortfall math is pinned in the next test.
    expect(MixinApi.isEmployed(body as unknown as Stuff)).toBe(false);
    expect(t.labourIndexFor(body as unknown as Stuff)).toBeCloseTo(1, 5);
  });

  it('⭐⭐ a wage-6 body with a half-lost capacity pays 1.5× (wage × shortfall)', () => {
    const t = tariff();
    // A controlled body: employed at wage 6, half its worst capacity gone.
    const fakeOrg = {
      getPosition: () => ({ wageRate: 6 }),
    };
    const body = {
      getEmployments: () => [
        { organizationPath: '/org', positionKey: 'miner', status: 'on-shift' },
      ],
      minCapacityScalar: () => 0.5,
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true as never);
    vi.spyOn(MixinApi, 'isVitals').mockReturnValue(true as never);
    vi.spyOn(MixinApi, 'isOrganization').mockReturnValue(true as never);
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(
      fakeOrg as never,
    );
    // 1 + LABOUR_INDEX(1) × (6/6) × (1 − 0.5) = 1.5
    expect(t.labourIndexFor(body)).toBeCloseTo(1.5, 5);
  });
});

describe('Tariff.priceFor', () => {
  it('⭐ a flat tariff never bends', () => {
    const t = makeStuff(() => new Tariff());
    t.setPrice('treatment', 12);
    (t as unknown as { services: Record<string, string> }).services = {
      treatment: 'treatment',
    };
    // labourIndexed is false by default.
    expect(t.priceFor('treatment')).toBe(12);
  });

  it('⭐ a labour-indexed tariff falls back to base with no acting customer', () => {
    // No execution-context author in a bare unit test → base.
    const t = tariff();
    expect(t.priceFor('treatment')).toBe(12);
  });
});
