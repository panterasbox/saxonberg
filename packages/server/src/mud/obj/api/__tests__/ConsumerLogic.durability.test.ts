/**
 * Phase 0 — participation durable identity re-key. The dispatch tap
 * (`CommandDispatchedEvent` → participation bucket) carries the giver's
 * live, ephemeral `stuffId`; the store must bank under the durable
 * `templatePath` so participation survives re-clone (reboot / relog) — the
 * other half of the engagement-cluster re-key (renown is the sibling).
 * Re-keying only one half would silently zero the consumer product
 * (`renownOf × participationOf`), so this half is guarded independently.
 *
 * EventApi is wired with a transient `EventRegistry`; Mongo is faked with an
 * in-memory collection; the recompute scheduler is stubbed so boot() leaves
 * no real timer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../api/consumer';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../EventRegistry';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../../../lib/stuff/Stuff';
import { Idea } from '../../../lib/stuff/Idea';
import { AppSettings } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { ScheduleApi } from '../../../api/schedule';
import type { ScheduleHandle } from '../../../api/schedule';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { CommandDispatchedEvent } from '../../../lib/events/CommandDispatchedEvent';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flush(): Promise<void> {
  // The tap handler is fire-and-forget; settle past the macrotask boundary.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

/** Mint a registered Stuff at `path` with an auto-assigned, distinct stuffId. */
async function mint(path: string): Promise<Stuff> {
  return StuffApi.create(() => {
    const s = new Idea();
    Stuff._stampTemplatePath(s, path);
    return s;
  });
}

function fireDispatch(subjectId: string, commandId: string): void {
  EventApi.fire(
    new CommandDispatchedEvent({
      subjectId,
      commandId,
      at: 4242,
      realAt: 1_000_000,
    })
  );
}

beforeEach(async () => {
  store = new Map();
  idCounter = 0;
  StuffApi.clearAll();
  EventApi._clearAllForTesting();
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
  vi.spyOn(ScheduleApi, 'recurring').mockReturnValue({
    id: 'test-handle',
  } as unknown as ScheduleHandle);
  const s = new AppSettings();
  s.setValue('participation.bucketSeconds', '600');
  await s.save();
  await AppSettings.warm();
  await makeRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AppSettings._resetForTesting();
});

describe('ConsumerLogic durable identity re-key (stuffId → templatePath)', () => {
  it('stores a dispatch bucket under the templatePath, not the live stuffId', async () => {
    ConsumerApi.boot();
    const giver = await mint('/obj/Avatar/p1');
    expect(giver.stuffId).not.toBe('/obj/Avatar/p1'); // genuinely ephemeral

    fireDispatch(giver.stuffId, 'cmd-1');
    await flush();

    expect(await ConsumerApi.eventsFor(giver.stuffId)).toHaveLength(0);
    const rows = await ConsumerApi.eventsFor('/obj/Avatar/p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.subject).toBe('/obj/Avatar/p1');
  });

  it('aggregates across re-clone — a new stuffId at the same templatePath credits one log', async () => {
    ConsumerApi.boot();
    const before = await mint('/obj/Avatar/p1');
    fireDispatch(before.stuffId, 'cmd-a');
    await flush();

    // Reboot/relog: old instance reaped, fresh clone, NEW stuffId, SAME path.
    StuffApi.unregister(before);
    const after = await mint('/obj/Avatar/p1');
    expect(after.stuffId).not.toBe(before.stuffId);
    // A different real-time bucket so the {subject, bucket} dedup doesn't
    // collapse the second credit (this is about the key, not the dedup).
    EventApi.fire(
      new CommandDispatchedEvent({
        subjectId: after.stuffId,
        commandId: 'cmd-b',
        at: 4242,
        realAt: 2_000_000,
      })
    );
    await flush();

    expect(await ConsumerApi.eventsFor('/obj/Avatar/p1')).toHaveLength(2);
  });
});
