/**
 * ⭐ Butter is an ACT and the churn's judgment is the thermometer (dairy
 * D5): cream worked at the right warmth breaks; the buttermilk draws off
 * and stops; the butter is the residue, and it is a FAT.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Churn from '../thing/Churn';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { Graded } from '@saxonberg/server/mud/lib/craft/Graded';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MAT } from './rows';
import { standUp, tearDown, at, vessel, TestPail } from './world';

const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;
const churn = (tempK: number): Churn =>
  vessel(() => Object.assign(new Churn(), { churnsTo: '/trade/dairying/idea/material/churned-cream' }) /* its row's fields (load-on-use W8) */, 8, tempK, { material: mat(MAT.cream), litres: 2 });

describe('the churn', () => {
  beforeEach(standUp);
  afterEach(tearDown);

  it('⭐ `churn` is its own verb (W18): the churn affords it and plans the working', async () => {
    at(0);
    const c = churn(287);
    expect(Churn.commandContributions.environment).toEqual(['trade/dairying/cmd/crafting/churn.yaml']);
    const plan = c.handWorkPlan();
    expect(plan.durationMs).toBe(8000);
    expect(await plan.onComplete()).toEqual({ ok: true, facts: { result: 'came' } });
  });

  it('⭐ a churn is washed like any working vessel — `wash churn` binds (found by the matter-model-overlaps drive)', () => {
    at(0);
    const c = churn(287);
    expect(MixinApi.isSoilable(c)).toBe(true);
    expect(() => c.washSite({ waterK: 320, hardnessDgh: 0, cleansers: [], effort: 3 })).not.toThrow();
  });

  it('cream at a cool-room warmth breaks; buttermilk draws off; butter stays', () => {
    at(0);
    const c = churn(287);
    // ⭐ The churn answers what came of it; `churn` words it (D4).
    expect(c.workByHand()?.facts.result).toBe('came');
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
    expect(c.workByHand()?.facts.result).toBe('too-cold');
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.cream);
  });

  it('too warm, it comes greasy — butter, but no better than fair', () => {
    at(0);
    const c = churn(298);
    // The CREAM is fine (its payload's grade, matter-model-overlaps D2).
    c.setBulkPayload('interior', { ...(c.getBulkPayload('interior') ?? {}), grade: 'fine' });
    expect(c.workByHand()?.facts.result).toBe('came-greasy');
    expect(c.getRunSchedule()?.getKey()).toBe('churning');
    const butter = c.getBulkPayload('interior')?.grade;
    expect(butter).toBeDefined();
    expect(Grade.of(butter!).compareTo(Grade.of('fair'))).toBeLessThanOrEqual(0);
    // …and the churn keeps its own making.
    expect((c as unknown as Graded).getGradeBand()).toBe('fair');
  });

  it('only cream churns', () => {
    at(0);
    const c = vessel(() => Object.assign(new Churn(), { churnsTo: '/trade/dairying/idea/material/churned-cream' }) /* its row's fields (load-on-use W8) */, 8, 287, { material: mat(MAT.milk), litres: 2 });
    expect(c.workByHand()?.facts.result).toBe('not-cream');
    expect(c.getBulkMaterialPath('interior')).toBe(MAT.milk);
  });
});
