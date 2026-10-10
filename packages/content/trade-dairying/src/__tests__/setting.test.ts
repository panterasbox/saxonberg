/**
 * ⭐ Cream rises in a setting pan (dairy D4): the pan is a fractionating
 * vessel, the charge must STAND before it separates, and the cream it
 * leaves is a share of the milk DERIVED from the milk's own fat.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SettingPan from '../thing/SettingPan';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MAT } from './rows';
import { standUp, tearDown, at, vessel, TestPail, HOUR } from './world';

const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;

function pan(milkPath: string): SettingPan {
  const p = vessel(() => new SettingPan(), 10, 288, { material: mat(milkPath), litres: 5 });
  p.getRunPhase(); // the charge lands at the first read
  return p;
}
const pail = (): TestPail => vessel(() => new TestPail(), 10, 288);

function drawAll(from: SettingPan, to: TestPail): number {
  return BulkableApi.transfer(
    BulkableApi.slotFor(from, undefined)!,
    BulkableApi.slotFor(to, undefined)!,
    { kind: 'all' },
  ).applied;
}

/** The cream a pan of `milkPath` leaves, as a share of the charge. */
function creamShare(milkPath: string): number {
  at(0);
  const p = pan(milkPath);
  at(8 * HOUR);
  drawAll(p, pail());
  return p.getBulkAmount('interior').rawValue() / 5;
}

describe('the setting pan', () => {
  beforeEach(standUp);
  afterEach(tearDown);

  it('poured before the cream has risen, it gives back milk', () => {
    at(0);
    const p = pan(MAT.milk);
    expect(p.getRunPhase()).toBe('charged');
    at(2 * HOUR);
    const into = pail();
    expect(drawAll(p, into)).toBeCloseTo(5, 6);
    expect(into.getBulkMaterialPath('interior')).toBe(MAT.milk);
  });

  it('after the rest, the skim draws off and stops at the cream', () => {
    at(0);
    const p = pan(MAT.milk);
    at(8 * HOUR);
    expect(p.getRunPhase()).toBe('running');
    const into = pail();
    const drawn = drawAll(p, into);
    expect(into.getBulkMaterialPath('interior')).toBe(MAT.skim);
    // Cow's milk: fat 34000 → 3.4 % × 2.5 = 8.5 % cream.
    expect(drawn).toBeCloseTo(5 * (1 - 0.085), 3);
    expect(p.getRunPhase()).toBe('spent');
    expect(p.getBulkMaterialPath('interior')).toBe(MAT.cream);
  });

  it('the richer the milk, the more cream: ewe > goat > cow', () => {
    const cow = creamShare(MAT.milk);
    const goat = creamShare(MAT.goatMilk);
    const ewe = creamShare(MAT.eweMilk);
    expect(ewe).toBeGreaterThan(goat);
    expect(goat).toBeGreaterThan(cow);
    expect(ewe).toBeGreaterThan(cow * 1.8);
  });
});
