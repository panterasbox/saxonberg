/**
 * KeenMixin — the working-surface (edge) axis: accessor clamps, the four
 * presentation bands, dull/hone cycling, and the delivery-factor lerp
 * against the `crafting.keenness.deliveryFloor` dial fallback.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Weapon from '../../../platform/thing/equipment/Weapon';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

function makeBlade(): Weapon {
  return makeStuff(() => new Weapon());
}

afterEach(() => {
  StuffApi.clearAll();
});

describe('KeenMixin', () => {
  it('clamps the gauge into 0..1 on every write', () => {
    const w = makeBlade();
    expect(MixinApi.isKeen(w)).toBe(true);
    expect(w.getKeenness()).toBe(1); // default fully keen
    w.setKeenness(2);
    expect(w.getKeenness()).toBe(1);
    w.setKeenness(-1);
    expect(w.getKeenness()).toBe(0);
  });

  it('bands: keen / serviceable / dulled / blunted', () => {
    const w = makeBlade();
    expect(w.getKeennessBand()).toBe('keen');
    w.setKeenness(0.6);
    expect(w.getKeennessBand()).toBe('serviceable');
    w.setKeenness(0.3);
    expect(w.getKeennessBand()).toBe('dulled');
    w.setKeenness(0.1);
    expect(w.getKeennessBand()).toBe('blunted');
  });

  it('dull steps the gauge down (dial default); hone restores to 1', () => {
    const w = makeBlade();
    w.dull(); // the crafting.keenness.wearPerUse fallback (0.08)
    expect(w.getKeenness()).toBeCloseTo(0.92, 9);
    w.dull(0.5);
    expect(w.getKeenness()).toBeCloseTo(0.42, 9);
    w.hone();
    expect(w.getKeenness()).toBe(1);
  });

  it('the delivery factor lerps floor..1 with keenness', () => {
    const w = makeBlade();
    expect(w.keennessDeliveryFactor()).toBeCloseTo(1, 9); // keen = full
    w.setKeenness(0);
    expect(w.keennessDeliveryFactor()).toBeCloseTo(0.7, 9); // the floor
    w.setKeenness(0.5);
    expect(w.keennessDeliveryFactor()).toBeCloseTo(0.85, 9); // the lerp
  });

  it('keenness and condition are independent axes', () => {
    const w = makeBlade();
    w.dull(0.9); // blunted…
    expect(w.getCondition()).toBe(1); // …but structurally sound
    w.wear(0.5); // nicked…
    w.hone();
    expect(w.getKeenness()).toBe(1); // …the hone never touches structure
    expect(w.getCondition()).toBeCloseTo(0.5, 9);
  });
});
