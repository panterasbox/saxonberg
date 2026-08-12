/**
 * ScheduleApi scope propagation (Wave 1): a callback scheduled from
 * circle context re-plants its BIRTH scope on the fresh root; scoped
 * handles ride the per-scope index and die at `cancelAllForScope`;
 * field/omni registrations are never indexed.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ScheduleApi } from '../schedule';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../execution-context';

const SCOPE = '/home/test-player';

afterEach(() => {
  vi.useRealTimers();
  ExecutionContextApi._clearForTesting();
});

function flushTimersAndMicrotasks(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  // planRun runs the callback inside runRootGuarded (a promise); yield.
  return new Promise<void>((resolve) => {
    vi.useRealTimers();
    setTimeout(resolve, 0);
  });
}

describe('ScheduleApi circle-scope propagation', () => {
  it('a callback scheduled from circle context runs under its birth scope', async () => {
    vi.useFakeTimers();
    let observed: string | null = 'unset';
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        ScheduleApi.schedule(10, () => {
          observed = ExecutionContextApi.getCircleScope();
        });
      },
      { circleScope: SCOPE }
    );
    await flushTimersAndMicrotasks(20);
    expect(observed).toBe(SCOPE);
  });

  it('a field-scheduled callback runs unscoped', async () => {
    vi.useFakeTimers();
    let observed: string | null = 'unset';
    ExecutionContextApi.runRoot(null, 'test', () => {
      ScheduleApi.schedule(10, () => {
        observed = ExecutionContextApi.getCircleScope();
      });
    });
    await flushTimersAndMicrotasks(20);
    expect(observed).toBeNull();
  });

  it('cancelAllForScope cancels scoped handles and only those', async () => {
    vi.useFakeTimers();
    let scopedFired = false;
    let fieldFired = false;
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        ScheduleApi.schedule(10, () => {
          scopedFired = true;
        });
      },
      { circleScope: SCOPE }
    );
    ExecutionContextApi.runRoot(null, 'test', () => {
      ScheduleApi.schedule(10, () => {
        fieldFired = true;
      });
    });

    const cancelled = ScheduleApi.cancelAllForScope(SCOPE);
    expect(cancelled).toBe(1);

    await flushTimersAndMicrotasks(20);
    expect(scopedFired).toBe(false);
    expect(fieldFired).toBe(true);
  });

  it('omni registrations are never indexed', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        const h = ScheduleApi.schedule(10_000, () => {});
        expect(ScheduleApi.cancelAllForScope(OMNI_SCOPE)).toBe(0);
        ScheduleApi.cancel(h);
      },
      { circleScope: OMNI_SCOPE }
    );
  });

  it('a recurring scoped handle unindexes on cancel', () => {
    ExecutionContextApi.runRoot(
      null,
      'test',
      () => {
        const h = ScheduleApi.recurring(10_000, () => {});
        ScheduleApi.cancel(h);
      },
      { circleScope: SCOPE }
    );
    expect(ScheduleApi.cancelAllForScope(SCOPE)).toBe(0);
  });
});
