/**
 * ProducerLogic (faucet) — the append path. Covers the `{author, actor,
 * bucket}` dedup that is the anti-inflation heart of the producer stock:
 * one player engaging one author's content credits the author ONCE per
 * bucket, while a different actor (or a different bucket) credits a separate
 * row. A disconnected store is a no-op.
 *
 * Mongo is faked with the single-collection harness; the game-clock is
 * pinned. Bucket width is seeded to 600 real-seconds, so
 * `bucket = floor(realAt / 600000)`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducerApi } from '../../../api/producer';
import { AppSettings } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

async function seedAppSettings(values: Record<string, string>): Promise<void> {
  const s = new AppSettings();
  for (const [k, v] of Object.entries(values)) s.setValue(k, v);
  await s.save();
  await AppSettings.warm();
}

beforeEach(async () => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
  await seedAppSettings({ 'producer.bucketSeconds': '600' });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AppSettings._resetForTesting();
  StuffApi.clearAll();
});

const A = '/obj/Avatar/author';
const P1 = '/obj/Avatar/player1';
const P2 = '/obj/Avatar/player2';

describe('ProducerApi.append ({author, actor, bucket} dedup)', () => {
  it('credits one row per (author, actor) however many actions fall in a bucket', async () => {
    await ProducerApi.append({ author: A, actor: P1, realAt: 1_000_000 });
    await ProducerApi.append({ author: A, actor: P1, realAt: 1_100_000 }); // same bucket
    await ProducerApi.append({ author: A, actor: P1, realAt: 1_500_000 }); // same bucket
    const rows = await ProducerApi.eventsFor(A);
    // 1_000_000 & 1_100_000 → bucket 1; 1_500_000 → bucket 2.
    expect(rows.length).toBe(2);
  });

  it('credits a separate row for a different actor in the same bucket', async () => {
    await ProducerApi.append({ author: A, actor: P1, realAt: 1_000_000 });
    await ProducerApi.append({ author: A, actor: P2, realAt: 1_000_000 }); // same bucket, diff actor
    const rows = await ProducerApi.eventsFor(A);
    expect(rows.length).toBe(2);
    expect(new Set(rows.map((r) => r.actor)).size).toBe(2);
  });

  it('defaults weight to 1 and records the engaged zone path', async () => {
    await ProducerApi.append({
      author: A,
      actor: P1,
      zonePath: '/domain/lounge',
      realAt: 600_000,
    });
    const [row] = await ProducerApi.eventsFor(A);
    expect(row).toBeDefined();
    expect(row!.weight).toBe(1);
    expect(row!.zonePath).toBe('/domain/lounge');
    expect(row!.kind).toBe('engagement');
  });

  it('is a no-op when the store is disconnected', async () => {
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(false);
    await ProducerApi.append({ author: A, actor: P1, realAt: 600_000 });
    expect((await ProducerApi.eventsFor(A)).length).toBe(0);
  });
});
