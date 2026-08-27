/**
 * RenownLogic reaction tap — the ingestion seam. Covers: after
 * `RenownApi.boot()` installs the tap, a fired `ReactionFiredEvent`
 * appends exactly one scope-tagged `RenownEvent` carrying the RAW emote +
 * tags (no score); the install is idempotent; scope is stubbed (`null`
 * locality / empty groups) pending Phase 4.
 *
 * EventApi is wired with a transient `EventRegistry` (the StreamState
 * harness); Mongo is faked with an in-memory collection (the renown/
 * chronicle harness). The regard sibling is intentionally absent — see
 * renown-plan §6 decision 1.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenownApi } from '../../../../api/renown';
import { EventApi } from '../../../../api/event';
import EventRegistry from '../../EventRegistry';
import { StuffApi } from '../../../../api/stuff';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Idea } from '../../../../lib/stuff/Idea';
import { GroupApi } from '../../../../api/group';
import { ReactionApi } from '../../../../api/reaction';
import { WorldClockApi } from '../../../../api/worldclock';
import { ScheduleApi } from '../../../../api/schedule';
import type { ScheduleHandle } from '../../../../api/schedule';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { ReactionFiredEvent } from '../../../../lib/events/ReactionFiredEvent';
import { CommReceivedEvent } from '../../../../lib/events/CommReceivedEvent';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flush(): Promise<void> {
  // The tap handler is fire-and-forget and now awaits scope resolution
  // (group + locality lookups), so settle past the macrotask boundary.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function fireReaction(over: Partial<ConstructorParameters<typeof ReactionFiredEvent>[0]> = {}): void {
  EventApi.fire(
    new ReactionFiredEvent({
      reactorId: '/platform/agent/Avatar/reactor',
      subjectId: '/platform/agent/Avatar/author',
      commandId: 'cmd-7',
      emote: 'applaud',
      tags: ['cheer'],
      scope: 'location:/lounge',
      selfReaction: false,
      ...over,
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
  // Stub the scheduler so boot() doesn't leave a real 60s timer running.
  vi.spyOn(ScheduleApi, 'recurring').mockReturnValue({
    id: 'test-handle',
  } as unknown as ScheduleHandle);
  await makeRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('RenownLogic reaction tap', () => {
  it('appends a scope-tagged RenownEvent carrying the raw signal', async () => {
    RenownApi.boot();
    fireReaction();
    await flush();

    const events = await RenownApi.eventsFor('/platform/agent/Avatar/author');
    expect(events).toHaveLength(1);
    const ev = events[0]!;
    expect(ev.source).toBe('/platform/agent/Avatar/reactor');
    expect(ev.kind).toBe('reaction');
    expect(ev.signal).toMatchObject({
      emote: 'applaud',
      tags: ['cheer'],
      commandId: 'cmd-7',
    });
    // Scope stubbed until Phase 4.
    expect(ev.locality).toBeNull();
    expect(ev.groups).toEqual([]);
    expect(ev.at).toBe(WorldClockApi.getNow().rawValue());
  });

  it('install is idempotent — booting twice yields one event per reaction', async () => {
    RenownApi.boot();
    RenownApi.boot();
    fireReaction();
    await flush();
    expect(await RenownApi.eventsFor('/platform/agent/Avatar/author')).toHaveLength(1);
  });

  it('does not log when the tap was never installed', async () => {
    // No RenownApi.boot() — the bus has no renown subscriber.
    fireReaction();
    await flush();
    expect(await RenownApi.eventsFor('/platform/agent/Avatar/author')).toHaveLength(0);
  });

  it('boot self-registers the recompute schedule, once', () => {
    RenownApi.boot();
    RenownApi.boot();
    expect(ScheduleApi.recurring).toHaveBeenCalledTimes(1);
  });
});

describe('RenownLogic reception tap (receive-side)', () => {
  const SPEAKER = '/platform/agent/Avatar/speaker';

  function received(perceiverId: string, commandId: string): void {
    EventApi.fire(new CommReceivedEvent({ perceiverId, commandId }));
  }

  beforeEach(() => {
    // The act registry resolves a reactable comm act → speaker + scope;
    // an unknown commandId (non-comm frame) resolves to null.
    vi.spyOn(ReactionApi, 'actInfo').mockImplementation((commandId) =>
      commandId === 'c1' || commandId === 'c2'
        ? { subjectId: SPEAKER, scope: 'channel:study-group' }
        : null
    );
    vi.spyOn(GroupApi, 'sharedManagedGroups').mockResolvedValue([]);
  });

  it('credits the speaker once per genuine listener, skips self + non-comm', async () => {
    RenownApi.boot();

    received('/platform/agent/Avatar/L1', 'c1');
    received('/platform/agent/Avatar/L2', 'c1');
    received(SPEAKER, 'c1'); // self-receipt — skipped
    received('/platform/agent/Avatar/L3', 'not-an-act'); // non-comm frame — skipped
    await flush();

    const events = await RenownApi.eventsFor(SPEAKER);
    expect(events).toHaveLength(2); // L1, L2 only
    expect(events.every((e) => e.kind === 'reception')).toBe(true);
    expect(events.map((e) => e.source).sort()).toEqual([
      '/platform/agent/Avatar/L1',
      '/platform/agent/Avatar/L2',
    ]);
  });

  it('dedups a listener hearing the same speaker again within the window', async () => {
    RenownApi.boot();
    received('/platform/agent/Avatar/L1', 'c1');
    await flush();
    received('/platform/agent/Avatar/L1', 'c2'); // same speaker→L1, within window
    await flush();
    expect(await RenownApi.eventsFor(SPEAKER)).toHaveLength(1);
  });
});

/**
 * Phase 0 — durable identity re-key. A fired reaction carries the live,
 * ephemeral `stuffId` of subject + reactor; the store must bank under the
 * durable `templatePath` so standing survives re-clone (reboot / relog),
 * which re-mints the `stuffId`. (The earlier tap tests pass templatePath-
 * shaped strings as fake `stuffId`s; here the ids are genuinely distinct
 * from the templatePath, so the conversion is observable.)
 */
describe('RenownLogic durable identity re-key (stuffId → templatePath)', () => {
  /** Mint a registered Stuff at `path` with an auto-assigned, distinct stuffId. */
  async function mint(path: string): Promise<Stuff> {
    return StuffApi.create(() => {
      const s = new Idea();
      Stuff._stampTemplatePath(s, path);
      return s;
    });
  }

  it('stores reaction subject + source under the templatePath, not the stuffId', async () => {
    RenownApi.boot();
    const author = await mint('/platform/agent/Avatar/p-author');
    const reactor = await mint('/platform/agent/Avatar/p-reactor');
    expect(author.stuffId).not.toBe('/platform/agent/Avatar/p-author'); // genuinely ephemeral

    fireReaction({ subjectId: author.stuffId, reactorId: reactor.stuffId });
    await flush();

    // Nothing banks under the ephemeral stuffId…
    expect(await RenownApi.eventsFor(author.stuffId)).toHaveLength(0);
    // …everything banks under the durable templatePath.
    const events = await RenownApi.eventsFor('/platform/agent/Avatar/p-author');
    expect(events).toHaveLength(1);
    expect(events[0]!.subject).toBe('/platform/agent/Avatar/p-author');
    expect(events[0]!.source).toBe('/platform/agent/Avatar/p-reactor');
  });

  it('aggregates across re-clone — a new stuffId at the same templatePath keeps the standing', async () => {
    RenownApi.boot();
    const before = await mint('/platform/agent/Avatar/p1');
    fireReaction({
      subjectId: before.stuffId,
      reactorId: '/platform/agent/Avatar/fan',
      commandId: 'c-a',
    });
    await flush();

    // Simulate a reboot/relog: the old instance is reaped, a fresh clone
    // mints a NEW stuffId at the SAME templatePath.
    StuffApi.unregister(before);
    const after = await mint('/platform/agent/Avatar/p1');
    expect(after.stuffId).not.toBe(before.stuffId);
    fireReaction({
      subjectId: after.stuffId,
      reactorId: '/platform/agent/Avatar/fan',
      commandId: 'c-b',
    });
    await flush();

    // Both signals land under one durable key — standing did not reset.
    expect(await RenownApi.eventsFor('/platform/agent/Avatar/p1')).toHaveLength(2);
  });
});
