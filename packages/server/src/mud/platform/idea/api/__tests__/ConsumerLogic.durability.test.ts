/**
 * Participation keys on the PERSON (db-performance W1, D1/D3). The dispatch
 * tap (`CommandDispatchedEvent` → participation bucket) carries the giver's
 * live, ephemeral `stuffId`; the store banks under the giver's durable
 * IDENTITY path — never its lineage. ⚠ Every player body is cloned from one
 * row (`/platform/agent/PrimaryAvatar`), so a lineage key files every
 * player under one subject, and a shade (`/platform/agent/ShadeAvatar`)
 * under another; every reader asks by identity and read nothing. A giver
 * with no identity at all (a login screen) is a person nobody can ask
 * about, and is skipped.
 *
 * EventApi is wired with a transient `EventRegistry`; Mongo is faked with an
 * in-memory collection; the recompute scheduler is stubbed so boot() leaves
 * no real timer.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../../api/consumer';
import { EventApi } from '../../../../api/event';
import EventRegistry from '../../EventRegistry';
import { StuffApi } from '../../../../api/stuff';
import ParticipationStandings from '../../ParticipationStandings';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Idea } from '../../../../lib/stuff/Idea';
import { AppSettings } from '../../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../../api/worldclock';
import { ScheduleApi } from '../../../../api/schedule';
import type { ScheduleHandle } from '../../../../api/schedule';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { CommandDispatchedEvent } from '../../../../lib/events/CommandDispatchedEvent';

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
  // The tap handler is fire-and-forget; settle past the macrotask boundary.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

const PRIMARY = '/platform/agent/PrimaryAvatar';
const SHADE = '/platform/agent/ShadeAvatar';

/**
 * Mint a registered Stuff of `lineage` (its template row) carrying the
 * minted `identity` — the shape the clone pipeline stamps on a player's
 * body (D17: lineage and identity apart). An auto-assigned, distinct stuffId.
 */
async function mint(lineage: string | null, identity?: string): Promise<Stuff> {
  return StuffApi.create(() => {
    const s = new Idea();
    Stuff._stampTemplatePath(s, lineage);
    if (identity) Stuff._stampIdentityPath(s, identity);
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
  vi.spyOn(pm, 'saveMany').mockImplementation(async (_col: string, writes) => {
    for (const w of writes) store.set(`id-${idCounter++}`, { ...w.doc });
    return writes.length;
  });
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

/**
 * Arm the dispatch tap + recompute schedule the way production does
 * since the boot() retirement: the ParticipationStandings singleton's
 * warm (its template stamp is what the widened Logic gate admits).
 */
async function bootConsumer(): Promise<void> {
  const s =
    StuffApi.findByTemplatePath<ParticipationStandings>(
      '/platform/idea/ParticipationStandings',
    ) ??
    makeStuffAtPath(
      () => new ParticipationStandings(),
      '/platform/idea/ParticipationStandings',
    );
  await s.warm();
}

describe('ConsumerLogic keys participation on the person', () => {
  it('stores a dispatch bucket under the identity path, not the live stuffId or the lineage', async () => {
    await bootConsumer();
    const giver = await mint(PRIMARY, '/platform/agent/Avatar/p1');

    fireDispatch(giver.stuffId, 'cmd-1');
    await flush();

    expect(await ConsumerApi.eventsFor(giver.stuffId)).toHaveLength(0);
    expect(await ConsumerApi.eventsFor(PRIMARY)).toHaveLength(0);
    const rows = await ConsumerApi.eventsFor('/platform/agent/Avatar/p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.subject).toBe('/platform/agent/Avatar/p1');
  });

  it('⭐ two players cloned from ONE row are two subjects', async () => {
    await bootConsumer();
    const a = await mint(PRIMARY, '/platform/agent/Avatar/p1');
    const b = await mint(PRIMARY, '/platform/agent/Avatar/p2');
    fireDispatch(a.stuffId, 'cmd-a');
    fireDispatch(b.stuffId, 'cmd-b');
    await flush();

    expect(await ConsumerApi.eventsFor('/platform/agent/Avatar/p1')).toHaveLength(1);
    expect(await ConsumerApi.eventsFor('/platform/agent/Avatar/p2')).toHaveLength(1);
    expect(await ConsumerApi.eventsFor(PRIMARY)).toHaveLength(0);
  });

  it('⭐ a shade continues its person — one log across bodies', async () => {
    await bootConsumer();
    const living = await mint(PRIMARY, '/platform/agent/Avatar/p1');
    fireDispatch(living.stuffId, 'cmd-a');
    await flush();

    // Death: the living body goes, a shade of the same person stands.
    StuffApi.unregister(living);
    const shade = await mint(SHADE, '/platform/agent/Avatar/p1');
    // Another real-time bucket, so the {subject, bucket} dedup does not
    // collapse the second credit (this is about the key, not the dedup).
    EventApi.fire(
      new CommandDispatchedEvent({
        subjectId: shade.stuffId,
        commandId: 'cmd-b',
        at: 4242,
        realAt: 2_000_000,
      })
    );
    await flush();

    expect(await ConsumerApi.eventsFor('/platform/agent/Avatar/p1')).toHaveLength(2);
    expect(await ConsumerApi.eventsFor(SHADE)).toHaveLength(0);
  });

  it('an NPC (no minted identity) keys on its own row — identity falls back to it', async () => {
    await bootConsumer();
    const npc = await mint('/test/agent/bartender');
    fireDispatch(npc.stuffId, 'cmd-n');
    await flush();
    expect(await ConsumerApi.eventsFor('/test/agent/bartender')).toHaveLength(1);
  });

  it('⭐ a giver with no identity at all — a login screen — earns nothing (D3)', async () => {
    await bootConsumer();
    const login = await mint(null);
    fireDispatch(login.stuffId, 'cmd-l');
    await flush();
    expect(await ConsumerApi.eventsFor(login.stuffId)).toHaveLength(0);
    // Nothing in the ledger (the store also holds the seeded settings row).
    expect([...store.values()].filter((d) => 'bucket' in d)).toHaveLength(0);
  });
});

describe('a burst of commands in one bucket reads the ledger once (db-performance H1)', () => {
  it('three commands, one bucket → one dedup read; a new bucket reads again', async () => {
    await bootConsumer();
    const giver = await mint(PRIMARY, '/platform/agent/Avatar/p7');
    const pm = PersistenceManager.get();
    const dedup = () =>
      vi.mocked(pm.find).mock.calls.filter(([c, q]) => c === 'participation_events' && 'bucket' in (q as object)).length;
    const before = dedup();
    fireDispatch(giver.stuffId, 'cmd-1');
    await flush();
    fireDispatch(giver.stuffId, 'cmd-2');
    fireDispatch(giver.stuffId, 'cmd-3');
    await flush();
    expect(dedup() - before).toBe(1);
    expect(await ConsumerApi.eventsFor('/platform/agent/Avatar/p7')).toHaveLength(1);
    EventApi.fire(new CommandDispatchedEvent({ subjectId: giver.stuffId, commandId: 'cmd-4', at: 4242, realAt: 9_000_000 }));
    await flush();
    expect(dedup() - before).toBe(2);
    expect(await ConsumerApi.eventsFor('/platform/agent/Avatar/p7')).toHaveLength(2);
  });
});

describe('the scheduled recompute runs one pass at a time (ceramics drive, run 32)', () => {
  it('⚠ a fire while a pass is still running is skipped — passes never stack on the pool', async () => {
    let fire: (() => void) | null = null;
    vi.spyOn(ScheduleApi, 'recurring').mockImplementation(((_ms: number, fn: () => void) => {
      fire = fn;
      return { id: 'test-handle' } as unknown as ScheduleHandle;
    }) as never);
    await bootConsumer();
    expect(fire).not.toBeNull();

    // Hold the pass at its first read: the event log.
    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => (release = r));
    const pm = PersistenceManager.get();
    const logReads: string[] = [];
    const realFind = pm.find.bind(pm);
    vi.spyOn(pm, 'find').mockImplementation((async (c: string, q: Record<string, unknown>) => {
      // A pass's read (the whole log, or the changed subjects) — not an
      // append's {subject, bucket} dedup.
      if (c === 'participation_events' && !('bucket' in q)) {
        logReads.push(c);
        await held;
      }
      return realFind(c, q);
    }) as never);

    fire!();
    fire!();
    fire!();
    await flush();
    expect(logReads).toHaveLength(1);

    release();
    await flush();
    // Nothing changed since: a fire reads nothing (db-performance W3).
    fire!();
    await flush();
    expect(logReads).toHaveLength(1);
    // A person acts: the next fire reads the log again.
    const giver = await mint(PRIMARY, '/platform/agent/Avatar/p9');
    fireDispatch(giver.stuffId, 'cmd-9');
    await flush();
    fire!();
    await flush();
    expect(logReads).toHaveLength(2);
  });
});
