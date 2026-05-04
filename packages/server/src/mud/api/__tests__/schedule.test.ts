/**
 * ScheduleApi tests — verify attribution propagation across async
 * boundaries, cancel idempotence, and recurring fire policies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScheduleApi } from '../schedule';
import {
  ExecutionContextApi,
  FrameKind,
} from '../execution-context';

describe('ScheduleApi.schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the callback after the requested delay', () => {
    const fn = vi.fn();
    ScheduleApi.schedule(100, fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('captures causingCommandId at schedule time and restores it in the callback', () => {
    let observed: string | null = '<not-set>';
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        {},
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: { causingCommandId: 'cmd-A' },
        },
        () => {
          ScheduleApi.schedule(50, () => {
            observed = ExecutionContextApi.getCurrentCausingCommandId();
          });
        }
      );
    });
    vi.advanceTimersByTime(50);
    expect(observed).toBe('cmd-A');
  });

  it('with propagateAttribution: false the callback runs without command attribution', () => {
    let observed: string | null = '<not-set>';
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        {},
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: { causingCommandId: 'cmd-B' },
        },
        () => {
          ScheduleApi.schedule(
            10,
            () => {
              observed = ExecutionContextApi.getCurrentCausingCommandId();
            },
            { propagateAttribution: false }
          );
        }
      );
    });
    vi.advanceTimersByTime(10);
    expect(observed).toBeNull();
  });

  it('chained schedules extend the attribution chain', () => {
    let observed: string | null = '<not-set>';
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        {},
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: { causingCommandId: 'cmd-C' },
        },
        () => {
          ScheduleApi.schedule(10, () => {
            // Inside this callback, schedule another one.
            ScheduleApi.schedule(10, () => {
              observed = ExecutionContextApi.getCurrentCausingCommandId();
            });
          });
        }
      );
    });
    vi.advanceTimersByTime(10);
    vi.advanceTimersByTime(10);
    expect(observed).toBe('cmd-C');
  });

  it('cancel before fire prevents the callback', () => {
    const fn = vi.fn();
    const handle = ScheduleApi.schedule(50, fn);
    ScheduleApi.cancel(handle);
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel is idempotent', () => {
    const handle = ScheduleApi.schedule(50, () => {});
    expect(() => {
      ScheduleApi.cancel(handle);
      ScheduleApi.cancel(handle);
    }).not.toThrow();
  });

  it('fires with no causingCommandId when scheduled outside any command', () => {
    let observed: string | null = '<not-set>';
    ScheduleApi.schedule(10, () => {
      observed = ExecutionContextApi.getCurrentCausingCommandId();
    });
    vi.advanceTimersByTime(10);
    expect(observed).toBeNull();
  });
});

describe('ScheduleApi.recurring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fixed-delay defaults: first fire after one full interval, then keeps firing', () => {
    const fn = vi.fn();
    ScheduleApi.recurring(100, fn);
    vi.advanceTimersByTime(99);
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('initialDelayMs: 0 fires immediately then recurs', () => {
    const fn = vi.fn();
    ScheduleApi.recurring(100, fn, { initialDelayMs: 0 });
    // The first fire is in the timer queue at delay 0; advance 0
    // doesn't drain it on its own, so step 1ms.
    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel stops future fires', () => {
    const fn = vi.fn();
    const handle = ScheduleApi.recurring(50, fn);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    ScheduleApi.cancel(handle);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('propagates causingCommandId to every fire', () => {
    const observations: Array<string | null> = [];
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        {},
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: { causingCommandId: 'cmd-recur' },
        },
        () => {
          ScheduleApi.recurring(50, () => {
            observations.push(
              ExecutionContextApi.getCurrentCausingCommandId()
            );
          });
        }
      );
    });
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    expect(observations).toEqual(['cmd-recur', 'cmd-recur', 'cmd-recur']);
  });

  it('propagateAttribution: false yields callbacks with no attribution', () => {
    const observations: Array<string | null> = [];
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        {},
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: { causingCommandId: 'cmd-X' },
        },
        () => {
          ScheduleApi.recurring(
            50,
            () => {
              observations.push(
                ExecutionContextApi.getCurrentCausingCommandId()
              );
            },
            { propagateAttribution: false }
          );
        }
      );
    });
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    expect(observations).toEqual([null, null]);
  });
});
