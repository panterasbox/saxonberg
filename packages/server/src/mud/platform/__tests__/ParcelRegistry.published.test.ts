/**
 * `published` — ⭐⭐ one field, two lives.
 *
 * *Draft* is content that has never been live: nobody is inside it by
 * construction, so the flag is a **wall** and nothing else happens.
 * *Offline* is live content coming down, which is a **camera**: the
 * people inside are moved out first. Both are `published: false`; what
 * differs is whether anybody was there, and that is a fact rather than
 * a second field.
 *
 * The chain of title carries the flip, because taking content down is
 * one of the louder things a holder can do to ground and a register
 * that recorded a transfer but not that would be telling half the
 * story.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ParcelRegistry from '../idea/ParcelRegistry';
import GroupRegistry from '../idea/GroupRegistry';
import { ParcelApi } from '../../api/parcel';
import { AccessApi } from '../../api/access';
import { NavigationApi } from '../../api/navigation';
import { StuffApi } from '../../api/stuff';
import { ParcelRecord, type ParcelOwner } from '../../lib/parcel/ParcelRecord';
import { ParcelEvent } from '../../lib/parcel/ParcelEvent';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async (collection: string, doc: Doc) => {
      const arr = col(collection);
      if (doc._id) {
        const idx = arr.findIndex((d) => d._id === doc._id);
        if (idx >= 0) arr[idx] = { ...doc };
        else arr.push({ ...doc });
        return doc._id;
      }
      const id = String(++idCounter);
      arr.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === query[k]));
    }),
    findById: vi.fn(
      async (collection: string, id: string) =>
        col(collection).find((d) => d._id === id) ?? null,
    ),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

async function boot(): Promise<void> {
  const groups = makeStuffAtPath(
    () => new GroupRegistry(),
    '/platform/idea/GroupRegistry',
  );
  await groups.onCreate();
  const parcels = makeStuffAtPath(
    () => new ParcelRegistry(),
    '/platform/idea/ParcelRegistry',
  );
  await parcels.onCreate();
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

const HOLDER: ParcelOwner = {
  kind: 'organization',
  templatePath: '/compact/executive',
};
const EXTENT = '/test/pub/draftville';

describe('published on the record', () => {
  beforeEach(() => {
    reset();
    installStore();
    // The graph is B1's and has its own suite; here it must simply not
    // be in the way.
    vi.spyOn(NavigationApi, 'reprojectExtent').mockResolvedValue(0);
    vi.spyOn(NavigationApi, 'nodesInExtent').mockResolvedValue([]);
    vi.spyOn(NavigationApi, 'pointingAt').mockResolvedValue([]);
  });
  afterEach(reset);

  it('⭐ a claim that says nothing about publication is LIVE content', async () => {
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });
    const row = await ParcelRecord.findByExtent(EXTENT);
    expect(row?.isPublished()).toBe(true);
  });

  it('⭐ a claim authored `published: false` is the DRAFT wall', async () => {
    await boot();
    await ParcelApi.grant({
      extent: EXTENT,
      holder: HOLDER,
      published: false,
    });
    const row = await ParcelRecord.findByExtent(EXTENT);
    expect(row?.isPublished()).toBe(false);
  });

  it('⭐⭐ the sync path read is what the traversal gate uses', async () => {
    await boot();
    await ParcelApi.grant({
      extent: EXTENT,
      holder: HOLDER,
      published: false,
    });
    // Longest-prefix, synchronous, resolves nothing at the path — which
    // is the whole requirement: `Exit.canTraverse` is sync and must be
    // able to refuse a far side it has not loaded.
    expect(ParcelApi.isPathPublished(`${EXTENT}/location/hall`)).toBe(false);
  });

  it('⚠ an UNTITLED path reads as published — there is no parcel to be a wall', async () => {
    await boot();
    // `lint:untitled` already forbids shipping an untitled path, so the
    // honest default for "nobody has said" is "not a wall" rather than
    // silently sealing ground whose title somebody forgot to declare.
    expect(ParcelApi.isPathPublished('/test/pub/nobody-claimed-this')).toBe(true);
  });

  it('a child of a dark parcel inherits the wall by longest prefix', async () => {
    await boot();
    await ParcelApi.grant({
      extent: EXTENT,
      holder: HOLDER,
      published: false,
    });
    expect(ParcelApi.isPathPublished(`${EXTENT}/deep/inside`)).toBe(false);
  });
});

describe('the flip, and the chain of title', () => {
  beforeEach(() => {
    reset();
    installStore();
    vi.spyOn(NavigationApi, 'reprojectExtent').mockResolvedValue(0);
    vi.spyOn(NavigationApi, 'nodesInExtent').mockResolvedValue([]);
    vi.spyOn(NavigationApi, 'pointingAt').mockResolvedValue([]);
  });
  afterEach(reset);

  it('⭐⭐ offlining appends an `offline` event to the chain', async () => {
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });

    await ParcelApi.setPublished(EXTENT, false);

    const row = await ParcelRecord.findByExtent(EXTENT);
    expect(row?.isPublished()).toBe(false);
    const events = await ParcelEvent.findByExtent(EXTENT);
    expect(events.map((e) => e.event)).toEqual(['grant', 'offline']);
  });

  it('publishing appends a `publish` event', async () => {
    await boot();
    await ParcelApi.grant({
      extent: EXTENT,
      holder: HOLDER,
      published: false,
    });

    await ParcelApi.setPublished(EXTENT, true);

    expect((await ParcelRecord.findByExtent(EXTENT))?.isPublished()).toBe(true);
    const events = await ParcelEvent.findByExtent(EXTENT);
    expect(events.map((e) => e.event)).toEqual(['grant', 'publish']);
  });

  it('⚠ a flip to the value it already has is a NO-OP — no event', async () => {
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });
    await ParcelApi.setPublished(EXTENT, true);
    const events = await ParcelEvent.findByExtent(EXTENT);
    expect(events.map((e) => e.event)).toEqual(['grant']);
  });

  it('an extent nobody holds answers null and writes nothing', async () => {
    await boot();
    await expect(
      ParcelApi.setPublished('/test/pub/unclaimed', false),
    ).resolves.toBeNull();
    expect(await ParcelEvent.findByExtent('/test/pub/unclaimed')).toEqual([]);
  });

  it('⭐ the graph is re-projected on every flip — the record is the source', async () => {
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });
    await ParcelApi.setPublished(EXTENT, false);
    expect(NavigationApi.reprojectExtent).toHaveBeenCalledWith(EXTENT);
  });

  it('⭐⭐ DRAFT does not evict: nothing was live, so nobody was inside', async () => {
    await boot();
    await ParcelApi.grant({
      extent: EXTENT,
      holder: HOLDER,
      published: false,
    });
    // Flipping an already-dark parcel dark again is the no-op above; the
    // point here is that granting it dark never asked the graph who was
    // standing in it, because by construction nobody was.
    expect(NavigationApi.nodesInExtent).not.toHaveBeenCalled();
  });

  it('⭐⭐ offlining the same ground TWICE leaves ONE marker standing', async () => {
    // The guarantee the re-derivable tombstone identity buys: it is
    // computed from the extent rather than minted fresh, so a second
    // offlining finds the marker already there instead of putting a
    // second one next to it. ⚠ This is where that is tested, because
    // the formula lives with the offlining rather than as a static on
    // the class.
    const { StuffApi: SA } = await import('../../api/stuff');
    const { TOMBSTONE_ROW } = await import('../location/Tombstone');
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });
    // One node in the extent, so the eviction path actually engages.
    vi.spyOn(NavigationApi, 'nodesInExtent').mockResolvedValue([
      { identity: `${EXTENT}/hall`, template: `${EXTENT}/hall`, edges: [] },
    ] as never);
    const cloned: string[] = [];
    vi.spyOn(SA, 'clone').mockImplementation((async (
      path: string,
      _c: unknown,
      opts?: { asIdentityPath?: string },
    ) => {
      cloned.push(opts?.asIdentityPath ?? path);
      throw new Error('no world to clone into');
    }) as never);

    await ParcelApi.setPublished(EXTENT, false);
    await ParcelApi.setPublished(EXTENT, true);
    await ParcelApi.setPublished(EXTENT, false);

    // Both offlinings asked for the SAME identity — re-derivable, not a
    // fresh uuid each time.
    const stones = cloned.filter((p) => p.startsWith(TOMBSTONE_ROW));
    expect(stones.length).toBeGreaterThan(1);
    expect(new Set(stones).size).toBe(1);
  });

  it('⭐⭐ taking LIVE content down asks the graph who is inside', async () => {
    await boot();
    await ParcelApi.grant({ extent: EXTENT, holder: HOLDER });
    await ParcelApi.setPublished(EXTENT, false);
    // The camera half: it has to find the people before it can move
    // them, and find the pointing rooms before it can tell anybody.
    expect(NavigationApi.nodesInExtent).toHaveBeenCalledWith(EXTENT);
  });
});
