/**
 * SchedulerApi tests — exercises the engagement-lifecycle surface
 * exhaustively against class-shaped fixture activities. Wave 1 ships
 * no real activities; the suite uses `TestDurativeActivity` and
 * `TestSustainedEngagement` registered on the activity-class
 * registry, with per-instance closures for the customizable hooks.
 *
 * Covers: start (five outcomes), cancel family, completion-on-timer,
 * watchdog (throw inside onComplete / onAbort / emission), emissions
 * cadence, activity-class registry HMR (registry-routed lifecycle
 * dispatch picks up reloaded code), sub-100ms completed-sync being
 * wire-silent.
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
import type { AbortReason, EnvelopeTemplate } from '@saxonberg/types';
import type { Engaged, EngagementSlot } from '../Engaged';
import { EngagedMixin } from '../Engaged';
import { SchedulerApi } from '../../../api/scheduler';
import type {
  Engagement,
  ScheduledEmission,
} from '../../../api/scheduler';
import { WorldClockApi } from '../../../api/worldclock';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
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

const noop = (): void => undefined;

interface DurativeOpts {
  type?: string;
  duration?: number;
  slots?: Iterable<EngagementSlot>;
  cancelable?: boolean;
  replaceableBy?: readonly string[];
  emissions?: readonly ScheduledEmission[];
  onStart?: () => void;
  onComplete?: () => void;
  onAbort?: (reason: AbortReason) => void;
  getHost?: () => Stuff | null;
}

/**
 * Class-shaped fixture activity — `onStart` / `onComplete` /
 * `onAbort` / `getHost` live on the prototype; per-instance
 * closures stored on the instance are dispatched through them.
 *
 * The prototype methods are what `SchedulerApi`'s
 * `#dispatchOnComplete` / `#dispatchOnAbort` / `#dispatchGetHost`
 * call via `cls.prototype.method.call(e)`; tests customise
 * per-engagement behaviour by passing closures into the
 * constructor's `opts`.
 *
 * Tests register this class under whatever `type` string they want
 * (`'test-durative'`, `'walking'`, `'forging'`, ...) via
 * `registerTestActivity`.
 */
class TestDurativeActivity {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable: boolean;
  readonly duration: number;
  readonly replaceableBy: readonly string[];
  readonly emissions?: readonly ScheduledEmission[];

  // Stored closures the prototype methods delegate to.
  private readonly _onStart: () => void;
  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _getHost: (() => Stuff | null) | null;

  constructor(actor: TestActor, opts: DurativeOpts = {}) {
    this.type = opts.type ?? 'test-durative';
    this.actor = actor as unknown as Stuff & Engaged;
    this.startedAt = WorldClockApi.getNow().rawValue() * 1000;
    this.slots = new Set(opts.slots ?? ['body']);
    this.cancelable = opts.cancelable ?? true;
    this.duration = opts.duration ?? 1000;
    this.replaceableBy = opts.replaceableBy ?? [];
    if (opts.emissions) this.emissions = opts.emissions;
    this._onStart = opts.onStart ?? noop;
    this._onComplete = opts.onComplete ?? noop;
    this._onAbort = opts.onAbort ?? noop;
    this._getHost = opts.getHost ?? null;
  }

  onStart(): void {
    this._onStart();
  }
  onComplete(): void {
    this._onComplete();
  }
  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }
  getHost(): Stuff | null {
    return this._getHost ? this._getHost() : null;
  }
}

interface SustainedOpts {
  type?: string;
  slots?: Iterable<EngagementSlot>;
  cancelable?: boolean;
  onStart?: () => void;
  onAbort?: (reason: AbortReason) => void;
  getHost?: () => Stuff | null;
}

class TestSustainedEngagement {
  engagementId = '';
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable: boolean;

  private readonly _onStart: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;
  private readonly _getHost: (() => Stuff | null) | null;

  constructor(actor: TestActor, opts: SustainedOpts = {}) {
    this.type = opts.type ?? 'test-sustained';
    this.actor = actor as unknown as Stuff & Engaged;
    this.startedAt = WorldClockApi.getNow().rawValue() * 1000;
    this.slots = new Set(opts.slots ?? ['voice']);
    this.cancelable = opts.cancelable ?? true;
    this._onStart = opts.onStart ?? noop;
    this._onAbort = opts.onAbort ?? noop;
    this._getHost = opts.getHost ?? null;
  }

  onStart(): void {
    this._onStart();
  }
  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }
  getHost(): Stuff | null {
    return this._getHost ? this._getHost() : null;
  }
}

/**
 * Self-registering factory — builds an engagement instance from
 * `TestDurativeActivity` and ensures the registry has the class
 * under the requested `type`. The plan calls for every engagement
 * to be associated with a registered class so registry-routed
 * lifecycle dispatch resolves the latest code.
 */
function makeDurative(
  actor: TestActor,
  opts: DurativeOpts = {},
): TestDurativeActivity {
  const e = new TestDurativeActivity(actor, opts);
  SchedulerApi.registerActivity(
    e.type,
    TestDurativeActivity as unknown as Parameters<
      typeof SchedulerApi.registerActivity
    >[1],
  );
  return e;
}

function makeSustained(
  actor: TestActor,
  opts: SustainedOpts = {},
): TestSustainedEngagement {
  const e = new TestSustainedEngagement(actor, opts);
  SchedulerApi.registerActivity(
    e.type,
    TestSustainedEngagement as unknown as Parameters<
      typeof SchedulerApi.registerActivity
    >[1],
  );
  return e;
}

/* ─────────────────────────── Suite ─────────────────────────── */

describe('SchedulerApi.start', () => {
  let actor: TestActor;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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
    WorldClockApi._advanceForTesting(999);
    expect(completed).toBe(false);
    WorldClockApi._advanceForTesting(1);
    expect(completed).toBe(true);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
  });

  it('completion ships an activity-update envelope carrying EngagementCompletedNote', () => {
    const e = makeDurative(actor, { duration: 1000 });
    SchedulerApi.start(e);
    WorldClockApi._advanceForTesting(1000);
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
    WorldClockApi._advanceForTesting(1000);
    expect(actor.getEngagementBySlot('body')).toBeUndefined();
    expect(SchedulerApi.getEngagementById(e.engagementId)).toBeUndefined();
  });
});

describe('SchedulerApi watchdog', () => {
  let actor: TestActor;
  let consoleErr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
    consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErr.mockRestore();
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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
    WorldClockApi._advanceForTesting(1000);
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
    WorldClockApi._advanceForTesting(1000);
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
    WorldClockApi._advanceForTesting(100);
    expect(ticks).toBe(1);
    expect(abortReasons).toEqual(['thrown']);
    // Subsequent ticks must NOT fire — emission timers cancelled.
    WorldClockApi._advanceForTesting(500);
    expect(ticks).toBe(1);
  });
});

describe('SchedulerApi emissions', () => {
  let actor: TestActor;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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
    WorldClockApi._advanceForTesting(100);
    expect(elapsed).toHaveLength(1);
    WorldClockApi._advanceForTesting(200);
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
    WorldClockApi._advanceForTesting(250);
    const before = ticks;
    expect(before).toBeGreaterThan(0);
    SchedulerApi.cancel(e, 'cancelled');
    WorldClockApi._advanceForTesting(500);
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
    WorldClockApi._advanceForTesting(500);
    const at500 = ticks;
    WorldClockApi._advanceForTesting(500);
    expect(ticks).toBe(at500);
  });
});

describe('SchedulerApi activity-class registry (HMR seam)', () => {
  let actor: TestActor;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    actor = makeStuff(() => new TestActor());
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
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

  it(
    'lifecycle dispatch routes through the registry: re-registering ' +
      'a class between start and completion fires the NEW prototype ' +
      'onComplete',
    () => {
      // Two classes share the same shape; what matters is which one
      // is registered at completion-fire time. Each class records a
      // tag string when its onComplete runs, so the test can assert
      // identity. The engagement is constructed from `V1` (the
      // class that was registered at construction time), but the
      // completion timer fires AFTER `V2` overwrites the registry —
      // and `cls.prototype.onComplete.call(e)` should hit `V2`'s
      // method.
      const ran: string[] = [];
      class V1 {
        engagementId = '';
        readonly type = 'hmr-test';
        readonly actor: TestActor;
        readonly startedAt = WorldClockApi.getNow().rawValue() * 1000;
        readonly slots: ReadonlySet<EngagementSlot> = new Set(['body']);
        readonly interruptibleBy = new Set<AbortReason>();
        readonly cancelable = true;
        readonly duration = 1000;
        readonly replaceableBy: readonly string[] = [];
        constructor(actor: TestActor) {
          this.actor = actor;
        }
        onStart(): void {}
        onComplete(): void {
          ran.push('v1');
        }
        onAbort(): void {}
      }
      class V2 {
        onStart(): void {}
        onComplete(): void {
          ran.push('v2');
        }
        onAbort(): void {}
      }
      SchedulerApi.registerActivity('hmr-test', V1 as never);
      const e = new V1(actor);
      SchedulerApi.start(e as never);

      // Simulate HMR: overwrite the registry entry before the
      // completion timer fires.
      SchedulerApi.registerActivity('hmr-test', V2 as never);

      WorldClockApi._advanceForTesting(1000);
      expect(ran).toEqual(['v2']);
    },
  );

  it(
    'lifecycle dispatch when class is unregistered between start ' +
      "and completion: aborts with 'thrown'",
    () => {
      const reasons: string[] = [];
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      try {
        const e = makeDurative(actor, {
          duration: 1000,
          type: 'transient',
          onAbort: (r) => reasons.push(r),
        });
        SchedulerApi.start(e);

        // Drop the registry entry; the engagement is still in
        // flight but its class is gone. Completion timer should
        // fall into the 'thrown' branch.
        SchedulerApi._unregisterActivityForTesting('transient');

        WorldClockApi._advanceForTesting(1000);

        // Without a registered class, dispatchOnAbort also can't
        // call onAbort (the engagement-instance closure is reached
        // through cls.prototype). The reasons array stays empty —
        // the engagement is force-cleared from the registry and
        // its timers cancelled regardless.
        expect(reasons).toEqual([]);
        expect(
          SchedulerApi.getEngagementById(e.engagementId),
        ).toBeUndefined();
        expect(actor.getEngagementBySlot('body')).toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    },
  );

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
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
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
    WorldClockApi._resetForTesting();
  });

  it('completes cleanly with no envelope ship attempt', () => {
    const e = makeDurative(actor as unknown as TestActor, {
      duration: 1000,
    });
    expect(() => SchedulerApi.start(e)).not.toThrow();
    expect(() => WorldClockApi._advanceForTesting(1000)).not.toThrow();
  });
});
