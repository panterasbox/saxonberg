/**
 * ProducerLogic engagement tap — the shared-signal end-to-end (commit 6).
 * Both the consumer and producer taps ride ONE `CommandDispatchedEvent`.
 * Covers:
 *   - a fired dispatch credits the covering zone's author (producer) AND the
 *     giver's participation (consumer) — both taps coexist on the shared,
 *     receive-gated signal;
 *   - A≠P: when the engaging player IS the author, no producer credit (you
 *     don't earn by engaging your own released content);
 *   - the released gate: engagement in `/home/…` content earns no producer;
 *   - the consumer participation row is byte-identical whether the optional
 *     location/actor fields are present or absent.
 *
 * EventApi is wired with a transient registry; Mongo is faked
 * collection-aware; the recompute schedulers are stubbed; the credit router's
 * zone + authorship reads are stubbed.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../../api/consumer';
import { ProducerApi } from '../../../../api/producer';
import { EventApi } from '../../../../api/event';
import EventRegistry from '../../EventRegistry';
import { StuffApi } from '../../../../api/stuff';
import ParticipationStandings from '../../ParticipationStandings';
import ProducerStandings from '../../ProducerStandings';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Idea } from '../../../../lib/stuff/Idea';
import { ZoneApi } from '../../../../api/zone';
import { ProvenanceApi } from '../../../../api/provenance';
import { AppSettings } from '../../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../../api/worldclock';
import { ScheduleApi } from '../../../../api/schedule';
import type { ScheduleHandle } from '../../../../api/schedule';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { CommandDispatchedEvent } from '../../../../lib/events/CommandDispatchedEvent';
import type { SpatialZone } from '../../../../lib/zone/SpatialZone';

let stores: Map<string, Record<string, unknown>[]>;
let nextId = 1;

function col(name: string): Record<string, unknown>[] {
  let a = stores.get(name);
  if (!a) {
    a = [];
    stores.set(name, a);
  }
  return a;
}

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
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function zoneAt(path: string): SpatialZone {
  return { getTemplatePath: () => path } as unknown as SpatialZone;
}

const AUTHOR = '/platform/agent/Avatar/maker';
const PLAYER = '/platform/agent/Avatar/visitor';
const OTHER = '/platform/agent/Avatar/other';
const LOC = '/world/gallery/room';

/**
 * Live bodies by identity: every player's body is cloned from ONE row, so
 * each carries the shared lineage and its own minted identity — the shape
 * that made every player one actor before db-performance W1 (D2).
 */
const bodies = new Map<string, string>();
async function body(identity: string): Promise<string> {
  const s = await StuffApi.create(() => {
    const b = new Idea();
    Stuff._stampTemplatePath(b, '/platform/agent/PrimaryAvatar');
    Stuff._stampIdentityPath(b, identity);
    return b;
  });
  bodies.set(identity, s.stuffId);
  return s.stuffId;
}

function fireDispatch(over: Record<string, unknown> = {}): void {
  EventApi.fire(
    new CommandDispatchedEvent({
      subjectId: bodies.get(PLAYER)!,
      commandId: 'cmd-1',
      at: 4242,
      realAt: 1_000_000,
      locationTemplatePath: LOC,
      actorIdentityPath: PLAYER,
      ...over,
    })
  );
}

beforeEach(async () => {
  stores = new Map();
  nextId = 1;
  StuffApi.clearAll();
  EventApi._clearAllForTesting();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      col(c).filter((d) =>
        Object.entries(q).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? String(nextId++);
      col(c).push({ ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
  vi.spyOn(ScheduleApi, 'recurring').mockReturnValue({
    id: 'test-handle',
  } as unknown as ScheduleHandle);
  const s = new AppSettings();
  s.setValue('participation.bucketSeconds', '600');
  s.setValue('producer.bucketSeconds', '600');
  await s.save();
  await AppSettings.warm();
  await makeRegistry();
  bodies.clear();
  for (const id of [AUTHOR, PLAYER, OTHER]) await body(id);
  // Default credit routing: released zone, authored by AUTHOR.
  vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
    zoneAt('/world/gallery')
  );
  vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue(AUTHOR);
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

/** The producer twin — arms the engagement tap + schedule. */
async function bootProducer(): Promise<void> {
  const s =
    StuffApi.findByTemplatePath<ProducerStandings>(
      '/platform/idea/ProducerStandings',
    ) ??
    makeStuffAtPath(
      () => new ProducerStandings(),
      '/platform/idea/ProducerStandings',
    );
  await s.warm();
}

describe('ProducerLogic engagement tap (shared signal)', () => {
  it('credits the zone author (producer) AND the giver (consumer) from one dispatch', async () => {
    await bootConsumer();
    await bootProducer();
    fireDispatch(); // PLAYER ≠ AUTHOR
    await flush();

    // Producer: the author earned an attributed-engagement bucket.
    const prod = await ProducerApi.eventsFor(AUTHOR);
    expect(prod).toHaveLength(1);
    expect(prod[0]!.actor).toBe(PLAYER);
    expect(prod[0]!.zonePath).toBe(LOC);

    // Consumer: the giver earned a participation bucket on the SAME signal.
    expect(await ConsumerApi.eventsFor(PLAYER)).toHaveLength(1);
  });

  it('A≠P: engaging your OWN content earns the author no producer credit', async () => {
    await bootConsumer();
    await bootProducer();
    // The engaging player IS the author.
    fireDispatch({ actorIdentityPath: AUTHOR, subjectId: bodies.get(AUTHOR) });
    await flush();

    expect(await ProducerApi.eventsFor(AUTHOR)).toHaveLength(0);
    // …but the author still earns consumer participation for showing up.
    expect(await ConsumerApi.eventsFor(AUTHOR)).toHaveLength(1);
  });

  it('⭐ two players engaging in one bucket are two credits — the actor is a person (D2)', async () => {
    await bootConsumer();
    await bootProducer();
    fireDispatch();
    fireDispatch({ subjectId: bodies.get(OTHER), actorIdentityPath: OTHER, commandId: 'cmd-2' });
    await flush();
    const prod = await ProducerApi.eventsFor(AUTHOR);
    expect(prod.map((e) => e.actor).sort()).toEqual([OTHER, PLAYER]);
  });

  it('released gate: engagement in /home content earns no producer credit', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
      zoneAt('/home/maker/studio')
    );
    await bootConsumer();
    await bootProducer();
    fireDispatch({ locationTemplatePath: '/home/maker/studio/room' });
    await flush();

    expect(await ProducerApi.eventsFor(AUTHOR)).toHaveLength(0);
    expect(await ConsumerApi.eventsFor(PLAYER)).toHaveLength(1); // consumer unaffected
  });

  it('credits nothing to producer when the signal carries no location', async () => {
    await bootConsumer();
    await bootProducer();
    fireDispatch({ locationTemplatePath: undefined });
    await flush();
    expect(await ProducerApi.eventsFor(AUTHOR)).toHaveLength(0);
  });

  it('consumer participation row is byte-identical with/without the optional fields', async () => {
    await bootConsumer();
    await bootProducer();

    fireDispatch(); // with location + actor
    await flush();
    const withFields = await ConsumerApi.eventsFor(PLAYER);

    // A second player, same bucket, WITHOUT the producer fields.
    EventApi.fire(
      new CommandDispatchedEvent({
        subjectId: bodies.get(OTHER)!,
        commandId: 'cmd-2',
        at: 4242,
        realAt: 1_000_000,
      })
    );
    await flush();
    const without = await ConsumerApi.eventsFor(OTHER);

    expect(withFields).toHaveLength(1);
    expect(without).toHaveLength(1);
    // Same shape: the participation row never carries location/actor.
    const shape = (r: Record<string, unknown>) =>
      Object.keys(r).filter((k) => k !== '_id' && k !== 'subject').sort();
    expect(shape(withFields[0] as never)).toEqual(shape(without[0] as never));
    expect((withFields[0] as never as Record<string, unknown>).bucket).toBe(
      (without[0] as never as Record<string, unknown>).bucket
    );
  });
});
