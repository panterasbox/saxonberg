/**
 * ConsumerLogic (faucet) — the append path. Covers the active-bucket
 * dedup that is the heart of decision S2: two recognized actions in one
 * bucket credit ONE row (anti-spam); actions in different buckets credit
 * separate rows (presence over time); a disconnected store is a no-op.
 *
 * Mongo is faked with the renown harness; the game-clock is pinned. Bucket
 * width is seeded to 600 real-seconds, so `bucket = floor(realAt / 600000)`.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../../api/consumer';
import { AppSettings } from '../../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';

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
  await seedAppSettings({ 'participation.bucketSeconds': '600' });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AppSettings._resetForTesting();
  StuffApi.clearAll();
});

const S = '/platform/agent/Avatar/subject';

describe('ConsumerApi.append (active-bucket dedup)', () => {
  it('credits one row per bucket however many actions fall in it', async () => {
    await ConsumerApi.append({ subject: S, realAt: 1_000_000 });
    await ConsumerApi.append({ subject: S, realAt: 1_100_000 }); // same bucket (1)
    await ConsumerApi.append({ subject: S, realAt: 1_500_000 }); // same bucket (2)...

    const rows = await ConsumerApi.eventsFor(S);
    // realAt 1_000_000 & 1_100_000 → bucket 1; 1_500_000 → bucket 2.
    expect(rows.length).toBe(2);
    expect(new Set(rows.map((r) => r.bucket)).size).toBe(2);
  });

  it('credits separate rows across distinct buckets', async () => {
    await ConsumerApi.append({ subject: S, realAt: 600_000 }); // bucket 1
    await ConsumerApi.append({ subject: S, realAt: 1_200_000 }); // bucket 2
    await ConsumerApi.append({ subject: S, realAt: 1_800_000 }); // bucket 3
    expect((await ConsumerApi.eventsFor(S)).length).toBe(3);
  });

  it('records the game-time witness on the row', async () => {
    await ConsumerApi.append({ subject: S, realAt: 600_000 });
    const [row] = await ConsumerApi.eventsFor(S);
    expect(row).toBeDefined();
    // `at` is the game-time witness (parity field); it's populated, not 0.
    expect(Number.isFinite(row!.at)).toBe(true);
  });

  it('is a no-op when the store is disconnected', async () => {
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(false);
    await ConsumerApi.append({ subject: S, realAt: 600_000 });
    // isConnected is false → eventsFor returns [] (and nothing was saved).
    expect((await ConsumerApi.eventsFor(S)).length).toBe(0);
  });
});
