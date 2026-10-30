/**
 * ⭐ Butter is an ACT and the churn's judgment is the thermometer (dairy
 * D5): cream worked at the right warmth breaks; the buttermilk draws off
 * and stops; the butter is the residue, and it is a FAT.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Churn from '../thing/Churn';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { Graded } from '@saxonberg/server/mud/lib/craft/Graded';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MAT } from './rows';
import { standUp, tearDown, at, vessel, TestPail } from './world';

const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;
const churn = (tempK: number): Churn =>
  vessel(() => new Churn(), 8, tempK, { material: mat(MAT.cream), litres: 2 });

describe('the churn', () => {
  beforeEach(standUp);
  afterEach(tearDown);

  it('cream at a cool-room warmth breaks; buttermilk draws off; butter stays', () => {
    at(0);
    const c = churn(287);
    const line = String(c.workByHand('churned')?.line);
    expect(line).toMatch(/butter has come/);
    // ⭐ Broken: the churning schedule is running, and what the next litre
    // drawn IS (the read a pour stamps a jug with) is the buttermilk.
    expect(c.getRunPhase()).toBe('running');
    expect(c.getRunSchedule()?.getKey()).toBe('churning');
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.buttermilk);

    const jug = vessel(() => new TestPail(), 4, 287);
    const drawn = BulkableApi.transfer(
      BulkableApi.slotFor(c, undefined)!,
      BulkableApi.slotFor(jug, undefined)!,
      { kind: 'all' },
    ).applied;
    expect(jug.getBulkMaterialPath('interior')).toBe(MAT.buttermilk);
    // Cream fat 40 % × 1.15 = 46 % butter.
    expect(drawn).toBeCloseTo(2 * (1 - 0.46), 3);
    expect(c.getRunPhase()).toBe('spent');
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.butter);
    expect(mat(MAT.butter).hasTag('fat')).toBe(true);
  });

  it('too cold, it will not come — the cream is unchanged', () => {
    at(0);
    const c = churn(278);
    expect(String(c.workByHand('churned')?.line)).toMatch(/will not come/);
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.cream);
  });

  it('too warm, it comes greasy — butter, but no better than fair', () => {
    at(0);
    const c = churn(298);
    const g = c as unknown as Graded;
    g.setGrade(Grade.of('fine'));
    expect(String(c.workByHand('churned')?.line)).toMatch(/greasy/);
    expect(c.getRunSchedule()?.getKey()).toBe('churning');
    expect(g.getGrade().compareTo(Grade.of('fair'))).toBeLessThanOrEqual(0);
  });

  it('only cream churns, and another method does nothing', () => {
    at(0);
    const c = vessel(() => new Churn(), 8, 287, { material: mat(MAT.milk), litres: 2 });
    expect(String(c.workByHand('churned')?.line)).toMatch(/Only cream/);
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.milk);
    expect(churn(287).workByHand('stirred')).toBeNull();
  });
});
