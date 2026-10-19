/**
 * ⭐ Water wets what it touches, by the share it touched (cleanliness B56):
 * a wash wets what it washes, a wade wets the share of the body under
 * water, and a towel takes the water off into itself.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rug from '../../../platform/thing/Rug';
import Cloth from '../../../platform/thing/Cloth';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import type { WashSpec } from '../Soilable';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { soilBody, wear, installDirtKinds } from './soil-fixtures';

const DIRT = [
  { key: 'mud', form: 'film', answersTo: ['surfactant'], waterLifts: 0.7 },
];
const spec = (over: Partial<WashSpec> = {}): WashSpec => ({
  waterK: 293, hardnessDgh: 4, cleansers: [], effort: 1, ...over,
});

beforeEach(() => {
  installV1QuantityMarshallers();
  installDirtKinds(DIRT as Record<string, unknown>[]);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a wash wets what it washes', () => {
  it('⭐ a washed rug comes out wet through (not only a garment)', () => {
    const rug = makeStuff(() => new Rug());
    rug.soil('mud', 1, null);
    rug.washSite(spec());
    expect(rug.getWetness()).toBeGreaterThanOrEqual(0.99);
  });

  it('⭐ washing a hand wets the body by a hand\'s share; a bath soaks it', () => {
    const body = soilBody();
    const hand = body.handSites()[0]!;
    body.washSite(spec(), hand);
    const afterHand = body.getWetness();
    expect(afterHand).toBeGreaterThan(0);
    expect(afterHand).toBeLessThan(0.5);
    body.bathe(spec({ waterK: 310 }), 60);
    expect(body.getWetness()).toBeGreaterThanOrEqual(0.99);
  });
});

describe('a wade wets the share under water', () => {
  it('⭐ feet in the water: the body is partly wet, the shirt stays dry', () => {
    const body = soilBody();
    const shirt = wear(body, 'torso');
    const boots = wear(body, 'feet');
    body.immerse((k) => k.endsWith('foot'));
    expect(body.getWetness()).toBeGreaterThan(0);
    expect(body.getWetness()).toBeLessThan(1);
    expect(boots.getWetness()).toBeGreaterThanOrEqual(0.99);
    expect(shirt.getWetness()).toBe(0);
  });
});

describe('a towel', () => {
  function towel(): Cloth {
    const t = makeStuff(() => new Cloth());
    t.setMass(Quantity.of(0.5, 'kg'));
    t.setAbsorbency(2);
    return t;
  }

  it('⭐⭐ takes the bath off you into itself — you are dry, it is damp', () => {
    const body = soilBody();
    body.immerse();
    const t = towel();
    const out = t.soakUp(body);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.left).toBe('dry');
    expect(t.getWetness()).toBeGreaterThan(0);
    expect(t.getWetness()).toBeLessThan(0.5);
  });

  it('a sodden towel takes up no more', () => {
    const body = soilBody();
    body.immerse();
    const t = towel();
    t.wet(1);
    expect(t.soakUp(body)).toEqual({ ok: false, reason: 'cloth-sodden' });
  });

  it('a dry thing has nothing to give', () => {
    const t = towel();
    expect(t.soakUp(soilBody())).toEqual({ ok: false, reason: 'already-dry' });
  });
});
