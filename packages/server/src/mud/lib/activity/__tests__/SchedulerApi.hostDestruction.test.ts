/**
 * SchedulerApi host-destruction test — separate file because it
 * needs the EventRegistry singleton bootstrapped so
 * `EventApi.on(Events.StuffDestructed, ...)` can subscribe.
 *
 * Mirrors event.test.ts's `makeRegistry` setup.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { EngagedMixin } from '../Engaged';
import { SchedulerApi } from '../../../api/scheduler';
import type { DurativeActivity } from '../../../api/scheduler';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import { Stuff } from '../../stuff/Stuff';
import { EventApi } from '../../../api/event';
import { EventRegistry } from '../../../obj/EventRegistry';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestActor extends SensorMixin(EngagedMixin(Idea)) {
  constructor() {
    super();
  }
}

class TestHost extends Idea {
  constructor() {
    super();
  }
}

async function makeRegistry(): Promise<EventRegistry> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  return reg;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('SchedulerApi host-destruction hook', () => {
  let actor: TestActor;
  let host: TestHost;

  beforeEach(async () => {
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    await makeRegistry();
    actor = makeStuff(() => new TestActor());
    host = makeStuff(() => new TestHost());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('fires onAbort("host-destroyed") when host destructs mid-flight', async () => {
    const reasons: string[] = [];
    const e: DurativeActivity = {
      engagementId: '',
      type: 'test-host',
      actor: actor as unknown as DurativeActivity['actor'],
      startedAt: Date.now(),
      slots: new Set(['body']),
      interruptibleBy: new Set(),
      cancelable: true,
      duration: 5000,
      replaceableBy: [],
      onStart: () => undefined,
      onComplete: () => undefined,
      onAbort: (r) => reasons.push(r),
      getHost: () => host,
    };
    SchedulerApi.start(e);
    expect(actor.getEngagementBySlot('body')).toBe(e);

    await StuffApi.destruct(host);
    await flushMicrotasks();

    expect(reasons).toEqual(['host-destroyed']);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('does NOT fire when an unrelated Stuff destructs', async () => {
    const reasons: string[] = [];
    const otherStuff = makeStuff(() => new TestHost());
    const e: DurativeActivity = {
      engagementId: '',
      type: 'test-host',
      actor: actor as unknown as DurativeActivity['actor'],
      startedAt: Date.now(),
      slots: new Set(['body']),
      interruptibleBy: new Set(),
      cancelable: true,
      duration: 5000,
      replaceableBy: [],
      onStart: () => undefined,
      onComplete: () => undefined,
      onAbort: (r) => reasons.push(r),
      getHost: () => host,
    };
    SchedulerApi.start(e);

    await StuffApi.destruct(otherStuff);
    await flushMicrotasks();

    expect(reasons).toEqual([]);
    expect(actor.getEngagementBySlot('body')).toBe(e);
  });

  it('does NOT subscribe when getHost is absent (no eager hook)', async () => {
    const reasons: string[] = [];
    const e: DurativeActivity = {
      engagementId: '',
      type: 'test-hostless',
      actor: actor as unknown as DurativeActivity['actor'],
      startedAt: Date.now(),
      slots: new Set(['body']),
      interruptibleBy: new Set(),
      cancelable: true,
      duration: 5000,
      replaceableBy: [],
      onStart: () => undefined,
      onComplete: () => undefined,
      onAbort: (r) => reasons.push(r),
      // no getHost
    };
    SchedulerApi.start(e);

    await StuffApi.destruct(host);
    await flushMicrotasks();

    expect(reasons).toEqual([]);
  });
});
