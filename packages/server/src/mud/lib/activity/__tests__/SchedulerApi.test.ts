/**
 * SchedulerApi tests — exercises the engagement-lifecycle surface
 * exhaustively against a fixture activity class. Wave 1 ships no
 * real activities, so the suite uses an internal `TestActivity` and
 * `TestSustained` plus a `TestActor` that composes EngagedMixin +
 * SensorMixin (so the envelope path lights up).
 *
 * Covers: start (five outcomes), cancel family, completion-on-timer,
 * watchdog (throw inside onComplete / onAbort / emission), emissions
 * cadence, activity-class registry HMR, sub-100ms completed-sync
 * being wire-silent.
 *
 * Host-destruction is exercised in `SchedulerApi.hostDestruction.test.ts`
 * because it requires the EventRegistry singleton to be bootstrapped.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import type { EnvelopeTemplate } from '@saxonberg/types';
import { EngagedMixin } from '../Engaged';
import { SchedulerApi } from '../../../api/scheduler';
import type {
  DurativeActivity,
  Engagement,
  ScheduledEmission,
  StartResult,
  SustainedEngagement,
} from '../../../api/scheduler';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

/* ─────────────────────────── Fixtures ─────────────────────────── */

class TestActor extends SensorMixin(EngagedMixin(Idea)) {
  public envelopes: EnvelopeTemplate[] = [];
  constructor() {
    super();
  }
  protected override handleEnvelope(env: EnvelopeTemplate): void {
    this.envelopes.push(env);
  }
}

/**
 * Hand-rolled `DurativeActivity`. Tests build one directly instead of
 * registering a class on the activity registry; the registry HMR
 * tests cover the dispatch-through-registry path.
 */
function makeDurative(
  actor: TestActor,
  opts: {
    duration?: number;
    slots?: Iterable<'body' | 'hands' | 'attention' | 'voice'>;
    onComplete?: () => void;
    onAbort?: (reason: string) => void;
    onStart?: () => void;
    emissions?: readonly ScheduledEmission[];
    replaceableBy?: readonly string[];
    type?: string;
  } = {},
): DurativeActivity {
  const calls = {
    onStart: opts.onStart ?? (() => undefined),
    onAbort: opts.onAbort ?? (() => undefined),
    onComplete: opts.onComplete ?? (() => undefined),
  };
  return {
    engagementId: '',
    type: opts.type ?? 'test-durative',
    actor: actor as unknown as DurativeActivity['actor'],
    startedAt: Date.now(),
    slots: new Set(opts.slots ?? ['body']),
    interruptibleBy: new Set(),
    cancelable: true,
    duration: opts.duration ?? 1000,
    replaceableBy: opts.replaceableBy ?? [],
    emissions: opts.emissions,
    onStart: () => calls.onStart(),
    onAbort: (reason) => calls.onAbort(reason),
    onComplete: () => calls.onComplete(),
  };
}

function makeSustained(
  actor: TestActor,
  opts: {
    slots?: Iterable<'body' | 'hands' | 'attention' | 'voice'>;
    type?: string;
    onAbort?: (reason: string) => void;
  } = {},
): SustainedEngagement {
  return {
    engagementId: '',
    type: opts.type ?? 'test-sustained',
    actor: actor as unknown as Engagement['actor'],
    startedAt: Date.now(),
    slots: new Set(opts.slots ?? ['voice']),
    interruptibleBy: new Set(),
    cancelable: true,
    onStart: () => undefined,
    onAbort: (reason) => opts.onAbort?.(reason),
  };
}

/* ─────────────────────────── Suite ─────────────────────────── */

describe('SchedulerApi.start', () => {
  let actor: TestActor;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  describe('happy path', () => {
    it('returns status: started with an EngagementStartedNote', () => {
      const e = makeDurative(actor, { duration: 1000 });
      const result = SchedulerApi.start(e);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe('started');
      if (result.status !== 'started') return;
      expect(result.note.kind).toBe('engagement-started');
      expect(result.note.engagementType).toBe('test-durative');
      expect(result.note.duration).toBe(1000);
      expect(result.note.cancelable).toBe(true);
      expect(result.note.engagementId).toBe(e.engagementId);
      expect(typeof e.engagementId).toBe('string');
      expect(e.engagementId.length).toBeGreaterThan(0);
    });

    it('writes engagement onto every declared slot', () => {
      const e = makeDurative(actor, {
        duration: 1000,
        slots: ['body', 'attention'],
      });
      const result = SchedulerApi.start(e);
      expect(result.ok).toBe(true);
      expect(actor.getEngagementBySlot('body')).toBe(e);
      expect(actor.getEngagementBySlot('attention')).toBe(e);
      expect(actor.getEngagementBySlot('hands')).toBeUndefined();
    });

    it('exposes the engagement via getEngagementById', () => {
      const e = makeDurative(actor, { duration: 1000 });
      SchedulerApi.start(e);
      expect(SchedulerApi.getEngagementById(e.engagementId)).toBe(e);
    });

    it('returns a SustainedEngagement on start without a note.duration', () => {
      const e = makeSustained(actor);
      const result = SchedulerApi.start(e);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (result.status !== 'started') return;
      expect(result.note.duration).toBeUndefined();
    });
  });

  describe('engagement-conflict', () => {
    it('rejects when a slot is occupied and no replaceableBy match', () => {
      const first = makeDurative(actor, { duration: 5000 });
      SchedulerApi.start(first);

      const second = makeDurative(actor, { duration: 5000 });
      const result = SchedulerApi.start(second);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('engagement-conflict');
      if (result.reason !== 'engagement-conflict') return;
      expect(result.conflicts).toContain(first);
    });
  });

  describe('replaced', () => {
    it('preempts a replaceable engagement and fires its onAbort with reason "replaced"', () => {
      const abortReasons: string[] = [];
      const first = makeDurative(actor, {
        duration: 5000,
        replaceableBy: ['test-durative'],
        onAbort: (r) => abortReasons.push(r),
      });
      SchedulerApi.start(first);

      const second = makeDurative(actor, { duration: 5000 });
      const result = SchedulerApi.start(second);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe('replaced');
      if (result.status !== 'replaced') return;
      expect(result.replaced).toContain(first);
      expect(abortReasons).toEqual(['replaced']);
      expect(actor.getEngagementBySlot('body')).toBe(second);
    });
  });

  describe('completed-sync (sub-100ms floor)', () => {
    it('runs onComplete in-place for durations below 100ms', () => {
      let completed = false;
      const e = makeDurative(actor, {
        duration: 50,
        onComplete: () => {
          completed = true;
        },
      });
      const result = SchedulerApi.start(e);
      expect(completed).toBe(true);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe('completed-sync');
    });

    it('does NOT write to the actor slot map or wire envelope', () => {
      const e = makeDurative(actor, { duration: 50 });
      SchedulerApi.start(e);
      expect(actor.getEngagementBySlot('body')).toBeUndefined();
      expect(actor.envelopes).toEqual([]);
    });
  });

  describe('start-rejected', () => {
    it('returns ok:false with the error when onStart throws', () => {
      const e = makeDurative(actor, {
        duration: 1000,
        onStart: () => {
          throw new Error('preflight fail');
        },
      });
      const result = SchedulerApi.start(e);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('start-rejected');
      if (result.reason !== 'start-rejected') return;
      expect(result.error.message).toBe('preflight fail');
      // No actor slot registration.
      expect(actor.getEngagementBySlot('body')).toBeUndefined();
      // No wire envelope (no in-flight engagement to talk about).
      expect(actor.envelopes).toEqual([]);
    });
  });

  describe('input-shape errors throw (programmer error)', () => {
    it('throws on null engagement', () => {
      expect(() =>
        SchedulerApi.start(null as unknown as Engagement),
      ).toThrow();
    });

    it('throws on empty slots set', () => {
      const e = makeDurative(actor, { duration: 1000, slots: [] });
      expect(() => SchedulerApi.start(e)).toThrow(
        /empty slots set/,
      );
    });
  });
});

describe('SchedulerApi.cancel (family)', () => {
  let actor: TestActor;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('cancel(): fires onAbort("cancelled") and clears the slot', () => {
    const reasons: string[] = [];
    const e = makeDurative(actor, {
      duration: 5000,
      onAbort: (r) => reasons.push(r),
    });
    SchedulerApi.start(e);
    SchedulerApi.cancel(e, 'cancelled');
    expect(reasons).toEqual(['cancelled']);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('cancel() is idempotent against already-aborted engagements', () => {
    const reasons: string[] = [];
    const e = makeDurative(actor, {
      duration: 5000,
      onAbort: (r) => reasons.push(r),
    });
    SchedulerApi.start(e);
    SchedulerApi.cancel(e, 'cancelled');
    SchedulerApi.cancel(e, 'cancelled');
    expect(reasons).toEqual(['cancelled']);
  });

  it('cancel() is a no-op against unknown engagementIds', () => {
    const e = makeDurative(actor, { duration: 5000 });
    // never starts — engagementId never gets stamped
    expect(() => SchedulerApi.cancel(e, 'cancelled')).not.toThrow();
  });

  it('cancelAll(): aborts every engagement on the actor', () => {
    const reasons: string[] = [];
    const a = makeDurative(actor, {
      duration: 5000,
      slots: ['body'],
      onAbort: (r) => reasons.push(`a:${r}`),
    });
    const b = makeSustained(actor, {
      slots: ['attention'],
      onAbort: (r) => reasons.push(`b:${r}`),
    });
    SchedulerApi.start(a);
    SchedulerApi.start(b);
    SchedulerApi.cancelAll(actor);
    expect(reasons.sort()).toEqual(['a:cancelled', 'b:cancelled']);
  });

  it('cancelByType(): aborts matching engagements only', () => {
    const reasons: string[] = [];
    const a = makeDurative(actor, {
      duration: 5000,
      type: 'walk',
      slots: ['body'],
      onAbort: (r) => reasons.push(`walk:${r}`),
    });
    const b = makeSustained(actor, {
      type: 'sing',
      slots: ['voice'],
      onAbort: (r) => reasons.push(`sing:${r}`),
    });
    SchedulerApi.start(a);
    SchedulerApi.start(b);
    SchedulerApi.cancelByType(actor, 'walk');
    expect(reasons).toEqual(['walk:cancelled']);
    expect(actor.getEngagementBySlot('voice')).toBe(b);
  });

  it('cancelByPredicate(): aborts engagements where the predicate returns true', () => {
    const reasons: string[] = [];
    const a = makeDurative(actor, {
      duration: 5000,
      type: 'walk',
      slots: ['body'],
      onAbort: () => reasons.push('a'),
    });
    const b = makeSustained(actor, {
      type: 'listen-for',
      slots: ['attention'],
      onAbort: () => reasons.push('b'),
    });
    SchedulerApi.start(a);
    SchedulerApi.start(b);
    SchedulerApi.cancelByPredicate(actor, (e) => e.type === 'listen-for');
    expect(reasons).toEqual(['b']);
    expect(actor.getEngagementBySlot('body')).toBe(a);
  });
});

describe('SchedulerApi lifecycle (completion)', () => {
  let actor: TestActor;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('completion timer fires onComplete after duration ms', () => {
    let completed = false;
    const e = makeDurative(actor, {
      duration: 1000,
      onComplete: () => {
        completed = true;
      },
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(999);
    expect(completed).toBe(false);
    vi.advanceTimersByTime(1);
    expect(completed).toBe(true);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('completion ships an activity-update envelope carrying EngagementCompletedNote', () => {
    const e = makeDurative(actor, { duration: 1000 });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(1000);
    expect(actor.envelopes).toHaveLength(1);
    const env = actor.envelopes[0]!;
    expect(env.type).toBe('activity-update');
    if (env.type !== 'activity-update') return;
    expect(env.engagementId).toBe(e.engagementId);
    expect(env.outcome.notes).toEqual([
      { kind: 'engagement-completed', engagementId: e.engagementId },
    ]);
  });

  it('cancel mid-flight ships an EngagementCancelledNote envelope', () => {
    const e = makeDurative(actor, { duration: 5000 });
    SchedulerApi.start(e);
    SchedulerApi.cancel(e, 'cancelled');
    expect(actor.envelopes).toHaveLength(1);
    const env = actor.envelopes[0]!;
    if (env.type !== 'activity-update') return;
    expect(env.outcome.notes).toEqual([
      {
        kind: 'engagement-cancelled',
        engagementId: e.engagementId,
        reason: 'cancelled',
      },
    ]);
  });

  it('completion clears the actor slot map', () => {
    const e = makeDurative(actor, { duration: 1000 });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(1000);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
    expect(SchedulerApi.getEngagementById(e.engagementId)).toBeUndefined();
  });
});

describe('SchedulerApi watchdog', () => {
  let actor: TestActor;
  let consoleErr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
    consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErr.mockRestore();
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('throw inside onComplete fires onAbort("thrown") and clears the slot', () => {
    const abortReasons: string[] = [];
    const e = makeDurative(actor, {
      duration: 1000,
      onComplete: () => {
        throw new Error('boom');
      },
      onAbort: (r) => abortReasons.push(r),
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(1000);
    expect(abortReasons).toEqual(['thrown']);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
    expect(consoleErr).toHaveBeenCalled();
    // Cancelled envelope, NOT completed.
    expect(actor.envelopes).toHaveLength(1);
    const env = actor.envelopes[0]!;
    if (env.type !== 'activity-update') return;
    expect(env.outcome.notes[0]?.kind).toBe('engagement-cancelled');
  });

  it('recursive throw inside onAbort("thrown") is logged and not retried', () => {
    let onAbortCalls = 0;
    const e = makeDurative(actor, {
      duration: 1000,
      onComplete: () => {
        throw new Error('complete-boom');
      },
      onAbort: () => {
        onAbortCalls += 1;
        throw new Error('abort-boom');
      },
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(1000);
    expect(onAbortCalls).toBe(1);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('throw inside emission event fires onAbort("thrown") and cancels emission timers', () => {
    const abortReasons: string[] = [];
    let ticks = 0;
    const emissions: ScheduledEmission[] = [
      {
        intervalMs: 100,
        event: () => {
          ticks += 1;
          throw new Error('emit-boom');
        },
      },
    ];
    const e = makeDurative(actor, {
      duration: 5000,
      emissions,
      onAbort: (r) => abortReasons.push(r),
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(100);
    expect(ticks).toBe(1);
    expect(abortReasons).toEqual(['thrown']);
    // Subsequent ticks must NOT fire — emission timers cancelled.
    vi.advanceTimersByTime(500);
    expect(ticks).toBe(1);
  });
});

describe('SchedulerApi emissions', () => {
  let actor: TestActor;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('fires emission.event on cadence and provides elapsed timing', () => {
    const elapsed: number[] = [];
    const emissions: ScheduledEmission[] = [
      {
        intervalMs: 100,
        event: (ctx) => {
          elapsed.push(ctx.elapsed);
        },
      },
    ];
    const e = makeDurative(actor, {
      duration: 1000,
      emissions,
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(100);
    expect(elapsed).toHaveLength(1);
    vi.advanceTimersByTime(200);
    expect(elapsed).toHaveLength(3);
  });

  it('cancels emission timers when engagement ends (cancel path)', () => {
    let ticks = 0;
    const emissions: ScheduledEmission[] = [
      {
        intervalMs: 100,
        event: () => {
          ticks += 1;
        },
      },
    ];
    const e = makeDurative(actor, {
      duration: 5000,
      emissions,
    });
    SchedulerApi.start(e);
    vi.advanceTimersByTime(250);
    const before = ticks;
    expect(before).toBeGreaterThan(0);
    SchedulerApi.cancel(e, 'cancelled');
    vi.advanceTimersByTime(500);
    expect(ticks).toBe(before);
  });

  it('cancels emission timers on completion (timer path)', () => {
    let ticks = 0;
    const emissions: ScheduledEmission[] = [
      {
        intervalMs: 200,
        event: () => {
          ticks += 1;
        },
      },
    ];
    const e = makeDurative(actor, {
      duration: 500,
      emissions,
    });
    SchedulerApi.start(e);
    // 500ms duration → completion timer fires at 500. Emissions
    // fire at 200, 400. After 500 the engagement is gone; no more.
    vi.advanceTimersByTime(500);
    const at500 = ticks;
    vi.advanceTimersByTime(500);
    expect(ticks).toBe(at500);
  });
});

describe('SchedulerApi activity-class registry (HMR seam)', () => {
  let actor: TestActor;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('getActivityClass returns undefined for an unregistered type', () => {
    expect(SchedulerApi.getActivityClass('walk')).toBeUndefined();
  });

  it('registerActivity + getActivityClass round-trip', () => {
    class FakeActivity {}
    SchedulerApi.registerActivity(
      'test',
      FakeActivity as never,
    );
    expect(SchedulerApi.getActivityClass('test')).toBe(FakeActivity);
  });

  it('re-registering the same type overwrites the entry', () => {
    class V1 {}
    class V2 {}
    SchedulerApi.registerActivity('test', V1 as never);
    SchedulerApi.registerActivity('test', V2 as never);
    expect(SchedulerApi.getActivityClass('test')).toBe(V2);
  });

  it('reloadActivity throws for unknown type', async () => {
    await expect(SchedulerApi.reloadActivity('unknown')).rejects.toThrow(
      /not registered/,
    );
  });

  it('reloadActivity throws when the class has no ModuleApi stamp', async () => {
    class Untracked {}
    SchedulerApi.registerActivity(
      'untracked',
      Untracked as never,
    );
    await expect(
      SchedulerApi.reloadActivity('untracked'),
    ).rejects.toThrow(/has no module record/);
  });

  // Non-trivial: full reloadActivity happy path needs a real on-disk
  // fixture wired through HotReloadApi + ModuleApi. The plan calls
  // for this as a Wave-1 test but acknowledges the fixture cost.
  // Deferred to a follow-up — the error paths above prove the
  // composition (ModuleApi.lookup + HotReloadApi.reload + split('#')).
  it.todo(
    'reloadActivity happy path with on-disk fixture + ModuleApi stamp',
  );
});

describe('SchedulerApi NPC without Sensor (envelope path no-op)', () => {
  let actor: InstanceType<ReturnType<typeof EngagedMixin<typeof Idea>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    SchedulerApi._clearAllForTesting();
    // NPC-shape actor: Engaged but not Sensor.
    class TestNpc extends EngagedMixin(Idea) {
      constructor() {
        super();
      }
    }
    actor = makeStuff(
      () => new TestNpc(),
    ) as unknown as InstanceType<ReturnType<typeof EngagedMixin<typeof Idea>>>;
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    vi.useRealTimers();
  });

  it('completes cleanly with no envelope ship attempt', () => {
    const e = makeDurative(actor as unknown as TestActor, {
      duration: 1000,
    });
    expect(() => SchedulerApi.start(e)).not.toThrow();
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
  });
});
