/**
 * ProducerLogic.recompute — the batch aggregator. Covers:
 *   - recompute materializes a scalar `producerOf` returns;
 *   - the REBUILDABLE invariant: drop the aggregate, replay the log →
 *     identical standings;
 *   - real-time decay reduces an old bucket's contribution;
 *   - `weight` scales the contribution (the team-split seam).
 *
 * Mongo is faked with a COLLECTION-AWARE store (producer_events / producer /
 * app_settings must not bleed). Decay half-life is seeded huge so fresh
 * scores are pure weighted counts; the decay test seeds a short half-life.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducerApi } from '../../../../api/producer';
import { AppSettings } from '../../../../lib/config/AppSettings';
import ProducerStanding from '../../../../lib/standing/ProducerStanding';
import { WorldClockApi } from '../../../../api/worldclock';
import {
  Collections,
  PersistenceManager,
} from '../../../../../backend/PersistenceManager';

let stores: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;

function col(name: string): Map<string, Record<string, unknown>> {
  let m = stores.get(name);
  if (!m) {
    m = new Map();
    stores.set(name, m);
  }
  return m;
}

function matches(
  d: Record<string, unknown>,
  q: Record<string, unknown>
): boolean {
  return Object.entries(q).every(([k, v]) => d[k] === v);
}

async function seedAppSettings(values: Record<string, string>): Promise<void> {
  const s = new AppSettings();
  for (const [k, v] of Object.entries(values)) s.setValue(k, v);
  await s.save();
  await AppSettings.warm();
}

const HUGE_HALF_LIFE = '1000000000000';
const A = '/platform/agent/Avatar/author';

beforeEach(async () => {
  stores = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      [...col(c).values()].filter((d) => matches(d, q)) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
  ProducerStanding._resetForTesting();
  await seedAppSettings({
    'producer.bucketSeconds': '600',
    'producer.decayHalfLife': HUGE_HALF_LIFE,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  ProducerStanding._resetForTesting();
  AppSettings._resetForTesting();
});

/** Append `n` rows in distinct buckets from one actor, anchored near "now". */
async function appendRecentBuckets(
  author: string,
  actor: string,
  n: number
): Promise<void> {
  const base = Date.now();
  for (let i = 0; i < n; i++) {
    await ProducerApi.append({ author, actor, realAt: base + i * 700_000 });
  }
}

describe('ProducerLogic.recompute', () => {
  it('materializes a scalar producerOf returns', async () => {
    await appendRecentBuckets(A, '/platform/agent/Avatar/p', 3);
    expect(ProducerApi.producerOf(A)).toBe(0); // not yet recomputed
    await ProducerApi.recompute();
    expect(ProducerApi.producerOf(A)).toBeCloseTo(3, 5);
  });

  it('is rebuildable: drop the aggregate + replay → identical standing', async () => {
    await appendRecentBuckets(A, '/platform/agent/Avatar/p', 4);
    await ProducerApi.recompute();
    const before = ProducerApi.producerOf(A);

    col(Collections.Producer).clear();
    ProducerStanding._resetForTesting();
    expect(ProducerApi.producerOf(A)).toBe(0);

    await ProducerApi.recompute(); // replay the log
    expect(ProducerApi.producerOf(A)).toBeCloseTo(before, 9);
  });

  it('scales a contribution by weight (the team-split seam)', async () => {
    await ProducerApi.append({
      author: A,
      actor: '/platform/agent/Avatar/p',
      weight: 3,
      realAt: Date.now(),
    });
    await ProducerApi.recompute();
    expect(ProducerApi.producerOf(A)).toBeCloseTo(3, 5);
  });

  it('decays an old bucket toward zero (real-time half-life)', async () => {
    const sevenDaysS = 604_800;
    col('app_settings').clear();
    AppSettings._resetForTesting();
    await seedAppSettings({
      'producer.bucketSeconds': '600',
      'producer.decayHalfLife': String(sevenDaysS),
    });
    const old = Date.now() - 14 * 86_400_000; // 14 days ago, half-life 7 days
    await ProducerApi.append({ author: A, actor: '/platform/agent/Avatar/p', realAt: old });
    await ProducerApi.recompute();
    const v = ProducerApi.producerOf(A);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.5);
  });
});
