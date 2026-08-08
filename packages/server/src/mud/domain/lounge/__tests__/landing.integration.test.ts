/**
 * Phase D — end-to-end landing: live spawn, the admit seam (synchronous
 * re-seat → single sense), restart rebuild, recall round-trip, and churn
 * leaving the host + Dave's untouched.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../LoungeWarren';
import Lounge from '../Lounge';
import Avatar from '../../../obj/Avatar';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Idea } from '../../../lib/stuff/Idea';
import {
  installStore,
  loungeDocs,
  arrival,
  flush,
  type Doc,
} from './lounge-fixtures';

type WarrenInternals = LoungeWarren & {
  spawnMember(): Promise<Stuff & Container>;
};

async function land(ref = LoungeWarren.WARREN_PATH): Promise<Avatar> {
  const avatar = makeStuff(() => new Avatar());
  await (
    avatar as unknown as { applyStartLocation(r: string): Promise<void> }
  ).applyStartLocation(ref);
  return avatar;
}

describe('lounge landing integration', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore(loungeDocs());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a fresh avatar self-places into the lazily-created host (AC 1 live)', async () => {
    const avatar = await land();
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    expect(
      (avatar as unknown as { getContainer(): unknown }).getContainer(),
    ).toBe(host);
    expect(warren.getMembers()).toEqual([host]);
  });

  it('admit seam: an arrival into a full host is re-seated to a satellite synchronously — single sense (AC 2, 13)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    warren.setThresholds({ budThreshold: 2, mergeWatermark: 1 });
    const host = await warren.getHost();
    const sat = await (warren as WarrenInternals).spawnMember();

    const a = arrival();
    const b = arrival();
    ContainmentApi.move(a as never, host); // host: 1
    ContainmentApi.move(b as never, host); // host: 2 (== N)

    const c = arrival();
    ContainmentApi.move(c as never, host); // 3 > N → onContainableAdded re-seats

    // Re-seat is synchronous (an eligible satellite existed): immediately
    // after the move returns, `c` is already in the satellite, NOT the
    // host — so a sense fired now perceives the satellite once.
    expect((c as unknown as { getContainer(): unknown }).getContainer()).toBe(
      sat,
    );
    expect((host as unknown as Container).getContents()).not.toContain(c);
  });

  it('restart rebuild: teardown wipes the runtime graph; the next landing recreates the Warren host with no persisted instance docs (AC 4)', async () => {
    const store = installStore(loungeDocs()); // fresh store handle
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host1 = await warren.getHost();
    expect(warren.getMembers()).toEqual([host1]);

    // Simulate restart: tear the graph down + drop runtime registry.
    warren.teardown();
    StuffApi.clearAll();
    installStore(loungeDocs()); // reinstall (mongo persisted only templates)

    // No per-instance room docs were ever written — only templates.
    expect(
      store.some((d: Doc) => d.path.startsWith('/domain/lounge/lounge#')),
    ).toBe(false);

    const warren2 = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host2 = await warren2.getHost();
    expect(host2).toBeInstanceOf(Lounge);
    expect((host2 as Stuff).isDestroyed()).toBe(false);
  });

  it('recall round-trip: a captured startLocation=<Warren> resumes into a live host, never a dead instance (AC 5)', async () => {
    // Persistable Containable avatar stand-in, so we can capture recall
    // state through the persistence spine without the full Avatar pipeline.
    class RecallHost extends PersistableMixin(ContainableMixin(Idea)) {}
    const store = installStore(loungeDocs());
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'group',
      name: 'core',
    });
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    const player = makeStuffAtPath(
      () => new RecallHost(),
      '/obj/Avatar/recall',
    );
    ContainmentApi.move(player as never, host as unknown as Stuff & Container);

    // Logout capture persists the Warren ref (place.startLocation), not the
    // transient room.
    await PersistableApi.capture(player as unknown as Stuff);
    const rec = store.find(
      (d) => (d as Record<string, unknown>).scope === '/obj/Avatar/recall',
    ) as Record<string, unknown> | undefined;
    const place = rec?.place as { startLocation?: string } | undefined;
    expect(place?.startLocation).toBe(LoungeWarren.WARREN_PATH);

    // New session: the saved startLocation is the Warren, so recall
    // resolves through getHost() to a LIVE host (the same one, alive).
    const warren2 = await StuffApi.singleton<LoungeWarren>(
      place!.startLocation as string,
    );
    const resumed = await warren2.getHost();
    expect((resumed as Stuff).isDestroyed()).toBe(false);
    expect(resumed).toBe(host);
  });

  it('a lounge instance is a root Location — the Warren is not in its containment chain (AC 9)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    // Location is a Container but never Containable → no getContainer.
    expect('getContainer' in (host as object)).toBe(false);
  });

  it('Dave’s Bar and the host survive bud/reap churn, with the host exit map staying clean (AC 10, 12)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    warren.setThresholds({ budThreshold: 2, mergeWatermark: 1, reapGraceMs: 10 });
    const host = await warren.getHost();
    const bar = await StuffApi.singleton<Stuff & Container>(
      LoungeWarren.BAR_PATH,
    );
    const baselineHostExits = (host as unknown as Lounge).getExits().size;

    // Arrivals past N bud a satellite.
    const occs = [];
    for (let i = 0; i < 4; i++) {
      const occ = arrival();
      ContainmentApi.move(occ as never, host);
      await flush();
      occs.push(occ);
    }
    expect(warren.getMembers().length).toBeGreaterThan(1); // budded

    // Everyone logs out (destruct) → satellites empty → reaped after grace.
    for (const occ of occs) StuffApi.destruct(occ as unknown as Stuff);
    await flush(60);

    expect((host as Stuff).isDestroyed()).toBe(false); // host survives
    expect((bar as Stuff).isDestroyed()).toBe(false); // Dave's survives
    expect(warren.hasMember(bar)).toBe(false); // never a member
    expect(warren.getMembers()).toEqual([host]); // satellites reaped
    // Host exit map is back to the baseline fixtures (no dead hub exits).
    expect((host as unknown as Lounge).getExits().size).toBe(
      baselineHostExits,
    );
  });
});
