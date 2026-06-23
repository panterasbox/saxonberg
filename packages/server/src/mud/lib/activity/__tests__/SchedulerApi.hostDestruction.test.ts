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
} from 'vitest';
import type { AbortReason } from '@saxonberg/types';
import type { Engaged, EngagementSlot } from '../Engaged';
import { EngagedMixin } from '../Engaged';
import { SchedulerApi } from '../../../api/scheduler';
import { WorldClockApi } from '../../../api/worldclock';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import { Stuff } from '../../stuff/Stuff';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../obj/EventRegistry';
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

/**
 * Host-aware fixture activity. Two prototypes — one that returns
 * the captured `_host`, one that returns null — let tests model
 * the "with host" and "without host" cases without separate class
 * definitions.
 */
class TestHostedActivity {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(['body']);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly duration = 5000;
  readonly replaceableBy: readonly string[] = [];

  private readonly _host: Stuff | null;
  private readonly _onAbort: (reason: AbortReason) => void;

  constructor(
    actor: TestActor,
    host: Stuff | null,
    onAbort: (reason: AbortReason) => void,
    type = 'test-hosted',
  ) {
    this.type = type;
    this.actor = actor as unknown as Stuff & Engaged;
    this.startedAt = WorldClockApi.getNow().rawValue() * 1000;
    this._host = host;
    this._onAbort = onAbort;
  }

  onStart(): void {}
  onComplete(): void {}
  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }
  getHost(): Stuff | null {
    return this._host;
  }
}

class TestHostlessActivity {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(['body']);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly duration = 5000;
  readonly replaceableBy: readonly string[] = [];

  private readonly _onAbort: (reason: AbortReason) => void;

  constructor(
    actor: TestActor,
    onAbort: (reason: AbortReason) => void,
    type = 'test-hostless',
  ) {
    this.type = type;
    this.actor = actor as unknown as Stuff & Engaged;
    this.startedAt = WorldClockApi.getNow().rawValue() * 1000;
    this._onAbort = onAbort;
  }

  onStart(): void {}
  onComplete(): void {}
  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }
  // No getHost — registry dispatch sees `proto.getHost` as
  // undefined and returns null without setting up a subscription.
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
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
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
    WorldClockApi._resetForTesting();
  });

  it('fires onAbort("host-destroyed") when host destructs mid-flight', async () => {
    const reasons: AbortReason[] = [];
    SchedulerApi.registerActivity(
      'test-host',
      TestHostedActivity as never,
    );
    const e = new TestHostedActivity(
      actor,
      host,
      (r) => reasons.push(r),
      'test-host',
    );
    SchedulerApi.start(e as never);
    expect(actor.getEngagementBySlot('body')).toBe(e);

    await StuffApi.destruct(host);
    await flushMicrotasks();

    expect(reasons).toEqual(['host-destroyed']);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('does NOT fire when an unrelated Stuff destructs', async () => {
    const reasons: AbortReason[] = [];
    const otherStuff = makeStuff(() => new TestHost());
    SchedulerApi.registerActivity(
      'test-host',
      TestHostedActivity as never,
    );
    const e = new TestHostedActivity(
      actor,
      host,
      (r) => reasons.push(r),
      'test-host',
    );
    SchedulerApi.start(e as never);

    await StuffApi.destruct(otherStuff);
    await flushMicrotasks();

    expect(reasons).toEqual([]);
    expect(actor.getEngagementBySlot('body')).toBe(e);
  });

  it('does NOT subscribe when getHost is absent (no eager hook)', async () => {
    const reasons: AbortReason[] = [];
    SchedulerApi.registerActivity(
      'test-hostless',
      TestHostlessActivity as never,
    );
    const e = new TestHostlessActivity(
      actor,
      (r) => reasons.push(r),
      'test-hostless',
    );
    SchedulerApi.start(e as never);

    await StuffApi.destruct(host);
    await flushMicrotasks();

    expect(reasons).toEqual([]);
  });
});
