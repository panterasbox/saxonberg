/**
 * `TestHarnessApi.stageStandingHistory` — the db-performance drive's
 * long-lived world (step 2): `count` past players, each with three
 * participation buckets, three renown receptions and one producer credit,
 * appended through the three ledgers' own doors. A second run doubles
 * nothing renown would count twice (participation and producer dedup
 * their own buckets).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestHarnessApi } from '../../../../api/test-harness';
import { ConsumerApi } from '../../../../api/consumer';
import { RenownApi } from '../../../../api/renown';
import { ProducerApi } from '../../../../api/producer';
import type RenownEvent from '../../../../lib/standing/RenownEvent';

describe('testharness standing-history', () => {
  afterEach(() => vi.restoreAllMocks());

  it('appends 3 participation, 3 receptions and 1 producer credit per past player', async () => {
    const part = vi.spyOn(ConsumerApi, 'append').mockResolvedValue();
    const ren = vi.spyOn(RenownApi, 'append').mockResolvedValue();
    const prod = vi.spyOn(ProducerApi, 'append').mockResolvedValue();
    vi.spyOn(RenownApi, 'eventsFor').mockResolvedValue([]);

    const r = await TestHarnessApi.stageStandingHistory(5);

    expect(r).toEqual({ subjects: 5, rows: 35 });
    expect(part).toHaveBeenCalledTimes(15);
    expect(ren).toHaveBeenCalledTimes(15);
    expect(prod).toHaveBeenCalledTimes(5);
    const subjects = new Set(part.mock.calls.map((c) => c[0].subject));
    expect(subjects.size).toBe(5);
    for (const s of subjects) expect(s).toMatch(/^\/platform\/agent\/Avatar\/dbp-past-\d+$/);
    // Three DISTINCT days per subject, all in the past: three buckets.
    const days = part.mock.calls
      .filter((c) => c[0].subject.endsWith('-0'))
      .map((c) => c[0].realAt!);
    expect(new Set(days).size).toBe(3);
    for (const d of days) expect(d).toBeLessThan(Date.now());
    expect(ren.mock.calls.every((c) => c[0].kind === 'reception')).toBe(true);
    // A producer credit is never self-credit.
    expect(prod.mock.calls.every((c) => c[0].author !== c[0].actor)).toBe(true);
  });

  it('a subject that already has its three receptions gets no more', async () => {
    vi.spyOn(ConsumerApi, 'append').mockResolvedValue();
    vi.spyOn(ProducerApi, 'append').mockResolvedValue();
    const ren = vi.spyOn(RenownApi, 'append').mockResolvedValue();
    const three = [1, 2, 3].map(() => ({ kind: 'reception' }) as RenownEvent);
    vi.spyOn(RenownApi, 'eventsFor').mockResolvedValue(three);

    const r = await TestHarnessApi.stageStandingHistory(4);

    expect(ren).not.toHaveBeenCalled();
    expect(r.rows).toBe(16);
  });

  it('a count that is not a whole number from 1 to 5000 is refused in words', async () => {
    await expect(TestHarnessApi.stageStandingHistory(Number.NaN)).rejects.toThrow(/whole number/);
    await expect(TestHarnessApi.stageStandingHistory(0)).rejects.toThrow(/whole number/);
  });
});
