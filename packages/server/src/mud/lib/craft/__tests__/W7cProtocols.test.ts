/**
 * The kernel act protocols behind `heat`, `wash` and `sweep`
 * (controller-liquidity W7c, D13 rung 1): one act each, planned by the
 * THING — its time, its effort and what came of it — so the verb only
 * engages the plan and words the facts. ⭐ And the acts W18 took back out
 * of false unifications, each with one host and no protocol: `stir` (the
 * build's `stirPlan`), `churn` (`HandWorked.handWorkPlan`) and `rake`
 * (`Burner.rakePlan`).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import { ToolMixin } from '../Tool';
import { ManualBuildMixin } from '../ManualBuild';
import { HandWorkedMixin, type HandWorkFacts } from '../HandWorked';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ThermalMixin } from '../../thermal/Thermal';
import { BurnerMixin } from '../../fire/Burner';
import { FluedMixin } from '../../fire/Flued';
import type { ActOutcome } from '../ActPlan';
import Garment from '../../../platform/thing/equipment/Garment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import type { WashSpec } from '../../cleanliness/Soilable';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestBuild extends ManualBuildMixin(ToolMixin(Good)) {}
class TestChurn extends HandWorkedMixin(BulkableMixin(Good)) {
  override workByHand(): ActOutcome<HandWorkFacts> | null {
    return { ok: true, facts: { result: 'came' } };
  }
}
class TestGrate extends BurnerMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestGrate';
}
class TestHearth extends FluedMixin(BurnerMixin(ThermalMixin(Good))) {
  static _mixinName = 'TestHearth';
}

const actor = (): Stuff => makeStuff(() => new Good());
const spec = (over: Partial<WashSpec> = {}): WashSpec => ({
  waterK: 293, hardnessDgh: 4, cleansers: [], effort: 1, ...over,
});

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('`stir` asks the build; `churn` the hand-worked vessel (W18)', () => {
  it('a build with nothing banked refuses `empty-build`', () => {
    const b = makeStuff(() => new TestBuild());
    const plan = b.stirPlan();
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.reason).toBe('empty-build');
  });

  it('a build records the working its vessel names, at the vessel’s pace', async () => {
    const b = makeStuff(() => new TestBuild());
    b.addContribution({ tags: ['gin'], measureL: 0.06, gradeBand: 'fair' } as never);
    const plan = b.stirPlan();
    expect(plan.ok).toBe(true);
    if (plan.ok !== true) return;
    expect(plan.facts).toEqual({ method: 'stirred' });
    expect(plan.durationMs).toBe(4000);
    const done = await plan.onComplete();
    expect(done).toEqual({ ok: true, facts: { method: 'stirred' } });
    expect(b.getBuildMethod()).toBe('stirred');
  });

  it('a churn is worked by hand — eight seconds, and what came of it', async () => {
    const c = makeStuff(() => new TestChurn());
    const plan = c.handWorkPlan();
    expect(plan.durationMs).toBe(8000);
    expect(await plan.onComplete()).toEqual({ ok: true, facts: { result: 'came' } });
  });
});

describe('Heated — a build latches the heat it took', () => {
  it('the build host works it in the heat and latches', () => {
    const b = makeStuff(() => new TestBuild());
    expect(MixinApi.isHeated(b)).toBe(true);
    expect(b.heatManner()).toBe('work');
    expect(b.takeHeat(900)).toMatchObject({ heatK: 900, latched: true, annealed: false });
    expect(b.getHeatedToK()).toBe(900);
  });

  it('with no fire in reach the plan is refused', () => {
    const b = makeStuff(() => new TestBuild());
    const plan = b.heatPlanFor(actor());
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.reason).toBe('insufficient-heat');
  });
});

describe('Washable — a soilable thing washes the load', () => {
  it('the lead washes itself and everything alongside, by its own washSite', async () => {
    const a = makeStuff(() => new Garment());
    const b = makeStuff(() => new Garment());
    expect(MixinApi.isWashable(a)).toBe(true);
    const sites = vi.spyOn(b, 'washSite');
    const plan = a.washPlanFor({ actor: actor(), spec: spec(), alongside: [b] });
    if (plan.ok !== true) throw new Error('expected a plan');
    expect(plan.durationMs).toBe(3000);
    expect(plan.facts).toEqual({ kind: 'things', items: [a, b] });
    const done = await plan.onComplete();
    expect(done.ok && done.facts.kind === 'things' && done.facts.results.length).toBe(2);
    expect(sites).toHaveBeenCalledOnce();
  });

  it('a scrub is three washes’ worth and costs more', () => {
    const a = makeStuff(() => new Garment());
    const plan = a.washPlanFor({ actor: actor(), spec: spec({ effort: 3 }) });
    if (plan.ok !== true) throw new Error('expected a plan');
    expect(plan.durationMs).toBe(9000);
    expect(plan.effortW).toBe(350);
  });

  it('a thing that says why it is not washed refuses with its own sentence', () => {
    const a = makeStuff(() => new Garment());
    vi.spyOn(a, 'washRefusal').mockReturnValue('It is strewn, not scrubbed.');
    const plan = a.washPlanFor({ actor: actor(), spec: spec() });
    expect(plan).toEqual({ ok: false, reason: 'not-washed-so', facts: { why: 'It is strewn, not scrubbed.' } });
  });
});

describe('`rake` — a fire plans the raking of its grate (W18)', () => {
  it('a grate is raked of its ash — and a bare fire is not swept', async () => {
    const g = makeStuff(() => new TestGrate());
    expect(MixinApi.isSweepable(g)).toBe(false);
    const rake = vi.spyOn(g, 'rakeGrate').mockResolvedValue({ kg: 0, ash: [] });
    const plan = g.rakePlan(actor());
    expect(plan.durationMs).toBe(8000);
    expect(await plan.onComplete()).toEqual({ ok: true, facts: { ash: [] } });
    expect(rake).toHaveBeenCalledOnce();
  });
});

describe('Sweepable — a floor and a chimney, one result shape (W18)', () => {
  it('a flued fire takes the brush up its chimney — and without one refuses `no-brush`', async () => {
    const h = makeStuff(() => new TestHearth());
    expect(MixinApi.isSweepable(h)).toBe(true);
    const plan = h.sweepPlanFor({ actor: actor(), broom: false, brush: true });
    expect(plan).toMatchObject({ ok: true, facts: { tool: 'brush' }, durationMs: 24000 });
    vi.spyOn(h, 'sweepChimney').mockResolvedValue({ sootKg: 0.4, taken: [] });
    if (!plan || plan.ok !== true) throw new Error('expected a plan');
    expect(await plan.onComplete()).toEqual({ ok: true, facts: { kg: 0.4, kinds: { soot: 0.4 }, taken: [] } });
    expect(h.sweepPlanFor({ actor: actor(), broom: true, brush: false })).toEqual({ ok: false, reason: 'no-brush' });
  });
});
