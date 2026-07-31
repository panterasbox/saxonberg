/**
 * Escape battery — DEFERRED EXECUTION: a circle context schedules a
 * timer that would mutate a field object after exit. The callback runs
 * under its BIRTH scope (so the dispatch backstop denies the mutation),
 * AND the handle is cancelled wholesale at reap. Fails without the
 * ScheduleApi birth-scope propagation + the per-scope handle index.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ScheduleApi } from '../../../../api/schedule';
import {
  ExecutionContextApi,
} from '../../../../api/execution-context';
import { Idea } from '../../../stuff/Idea';

const SCOPE = '/home/escape-tester';

class Pokeable extends Idea {
  private poked = false;
  public poke(): void {
    this.poked = true;
  }
  public wasPoked(): boolean {
    return this.poked;
  }
}

describe('sandbox-escape: deferred', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    ExecutionContextApi._clearForTesting();
  });

  it('a circle-scheduled callback runs under birth scope — the field mutation is denied at dispatch', async () => {
    const fieldThing = await StuffApi.create(() => new Pokeable());
    vi.useFakeTimers();
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        ScheduleApi.schedule(10, () => {
          // The smuggled mutation: without birth-scope propagation this
          // would run on a fresh unscoped root and succeed.
          fieldThing.poke();
        });
      },
      { circleScope: SCOPE }
    );
    vi.advanceTimersByTime(20);
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));
    // The callback fired under circle scope; the dispatch check denied
    // the poke (runRootGuarded 'swallow' absorbed the SecurityError).
    expect(fieldThing.wasPoked()).toBe(false);
  });

  it('reap cancels the circle\'s pending handles before they ever fire', async () => {
    const fieldThing = await StuffApi.create(() => new Pokeable());
    vi.useFakeTimers();
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        ScheduleApi.schedule(10, () => fieldThing.poke());
        ScheduleApi.recurring(10, () => fieldThing.poke());
      },
      { circleScope: SCOPE }
    );
    expect(ScheduleApi.cancelAllForScope(SCOPE)).toBe(2);
    vi.advanceTimersByTime(50);
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));
    expect(fieldThing.wasPoked()).toBe(false);
  });
});
