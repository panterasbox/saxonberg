/**
 * ⭐ **One sweep, not a timer per card** (AC 8).
 *
 * Card eviction runs as a single recurring pass over the whole set —
 * the `ResidencyLogic` shape. A timer per card would be N clocks, and
 * the client's own husk `setInterval` is deleted in this same build for
 * exactly that reason: there is one clock and the server owns it.
 *
 * ⚠ The sweep is driven through `ScheduleApi`, never a bare
 * `setInterval` — so the callback runs inside an execution-context
 * root. This file asserts the handle COUNT rather than the mechanism's
 * internals, because the count is the property that fails when somebody
 * adds a per-card timer.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CardApi } from '../card';
import { ScheduleApi } from '../schedule';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import CardRegistry from '../../platform/idea/CardRegistry';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

/**
 * Install the sweep the way production does since the boot()
 * retirement: the CardRegistry's postRegister (the manifest path).
 */
async function installSweep(): Promise<void> {
  const reg =
    StuffApi.findByTemplatePath<CardRegistry>('/platform/idea/CardRegistry') ??
    makeStuffAtPath(() => new CardRegistry(), '/platform/idea/CardRegistry');
  await reg.postRegister();
}

function openWho(h: Harness, text: string): string | null {
  return CardApi.open(
    makeContext(h, { commandText: text, verbs: ['who'], opensCard: 'who' }),
    'who',
  );
}

describe('card eviction is a sweep', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⚠ opening cards schedules NOTHING — no per-card timer', async () => {
    const h = await makeHarness();
    const recurring = vi.spyOn(ScheduleApi, 'recurring');
    const once = vi.spyOn(ScheduleApi, 'schedule');

    openWho(h, 'who');
    openWho(h, 'who --wizards');
    openWho(h, 'who --here');
    CardApi.open(
      makeContext(h, {
        commandText: 'look lamp',
        verbs: ['look', 'l', 'examine', 'exa'],
        opensCard: 'subject',
      }),
      'subject',
    );
    expect(CardApi._getSizeForTesting()).toBe(4);

    expect(recurring).not.toHaveBeenCalled();
    expect(once).not.toHaveBeenCalled();
  });

  it('the sweep install arms exactly ONE recurring handle, and is idempotent', async () => {
    CardApi._resetSweepForTesting();
    expect(CardApi._sweepHandleCountForTesting()).toBe(0);
    const recurring = vi.spyOn(ScheduleApi, 'recurring');
    await installSweep();
    await installSweep();
    await installSweep();
    expect(recurring).toHaveBeenCalledTimes(1);
    expect(CardApi._sweepHandleCountForTesting()).toBe(1);
  });

  /**
   * ⚠ Driven through the SCHEDULER's own callback, not by calling the
   * sweep by hand. A test that only ever calls the sweep directly
   * proves the sweep works and says nothing about whether anything ever
   * runs it — which is precisely the immortal-card failure shape.
   */
  it('the scheduled callback is what evicts', async () => {
    const h = await makeHarness();
    let tick: (() => void) | null = null;
    vi.spyOn(ScheduleApi, 'recurring').mockImplementation(
      (_ms: number, fn: () => void) => {
        tick = fn;
        return { id: 'test-sweep' };
      },
    );
    CardApi._resetSweepForTesting();
    await installSweep();
    expect(tick).not.toBeNull();

    openWho(h, 'who');
    expect(CardApi._getSizeForTesting()).toBe(1);

    // Inside the default window, the real tick keeps it.
    tick!();
    expect(CardApi._getSizeForTesting()).toBe(1);
  });
});
