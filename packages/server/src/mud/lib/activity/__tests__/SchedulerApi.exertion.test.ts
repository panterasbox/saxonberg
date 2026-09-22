/**
 * The scheduler's exertion emit — ⭐ the one place a durative activity's
 * work reaches the body. A step that declares `effortW` exerts once at
 * completion; one that declares none never does; a cancelled step
 * exerts pro-rata; a sub-100 ms step exerts in place.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerApi } from '../../../api/scheduler';
import { WorldClockApi } from '../../../api/worldclock';
import { AppApi } from '../../../api/app';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { Reserve, ReservedMixin } from '../../reserve';
import { ExertingMixin } from '../../exertion/Exerting';
import { EngagedMixin } from '../Engaged';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import { ManualBuildStep } from '../../craft/ManualBuildStep';
import { makeStuff } from '../../security/__tests__/test-setup';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Worker extends ExertingMixin(ReservedMixin(SensorMixin(EngagedMixin(Idea)))) {
  protected override handleEnvelope(): void {}
}

/** A `ManualBuildStep` names a host, and the registry subscribes to its
 * destruction — which needs the EventRegistry singleton stood up. */
async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

describe('SchedulerRegistry — the exertion emit', () => {
  let actor: Worker;
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    await makeRegistry();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    actor = makeStuff(() => new Worker());
    actor.setReserve(
      new Reserve('endurance', Quantity.of(100, '%'), Quantity.of(100, '%'), 'biological', 'collapse'),
    );
  });
  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const endurance = () => actor.getReserve('endurance')!.current.rawValue();
  const step = (effortW: number | undefined, durationMs = 9000) =>
    new ManualBuildStep({
      actor,
      slots: ['hands'],
      durationMs,
      effortW,
      onComplete: () => undefined,
    });

  it('⭐ a step with effortW exerts once, at completion, the whole figure', () => {
    SchedulerApi.start(step(967));
    WorldClockApi._advanceForTesting(8999);
    expect(endurance()).toBe(100);
    WorldClockApi._advanceForTesting(1);
    expect(endurance()).toBeCloseTo(96, 1);
  });

  it('a step that declares none is not work', () => {
    SchedulerApi.start(step(undefined));
    WorldClockApi._advanceForTesting(9000);
    expect(endurance()).toBe(100);
  });

  it('⭐ a cancelled step costs pro-rata — what you did, not what you meant to', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const s = step(967);
    SchedulerApi.start(s);
    vi.spyOn(Date, 'now').mockReturnValue(now + 4500);
    SchedulerApi.cancel(s, 'cancelled');
    expect(endurance()).toBeCloseTo(98, 1);
  });

  it('a sub-100 ms step exerts in place', () => {
    SchedulerApi.start(step(1800, 50));
    // (1800 − 300) × 0.05 / 1500 = 0.05 %
    expect(endurance()).toBeCloseTo(99.95, 6);
  });
});
