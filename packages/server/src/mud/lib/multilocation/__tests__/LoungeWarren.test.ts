/**
 * LoungeWarren tests — the concrete policy over real cloned LoungeRoom
 * instances: quiet landing + host fixtures, least-full routing, budding,
 * drain→reap (host never reaped), and singleton identity. Uses the
 * full clone pipeline against an in-memory domain store.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../LoungeWarren';
import LoungeRoom from '../LoungeRoom';
import { ContainableMixin } from '../../spatial/Containable';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import { makeStuff } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

const PH = PersistentHydrator.templatePath;

function installLoungeStore(): Doc[] {
  const store: Doc[] = [
    { path: PH, class: PH, data: {} },
    { path: LoungeWarren.WARREN_PATH, class: '/lib/multilocation/LoungeWarren', data: {} },
    {
      path: LoungeWarren.LOUNGE_TEMPLATE,
      class: '/lib/multilocation/LoungeRoom',
      hydratorClass: PH,
      data: { warren: LoungeWarren.WARREN_PATH, shortDescription: 'the lounge' },
    },
    {
      path: LoungeWarren.BAR_PATH,
      class: '/lib/multilocation/LoungeShell',
      hydratorClass: PH,
      data: { shortDescription: "Dave's Bar" },
    },
    {
      path: '/domain/eternal/duncan-hall',
      class: '/lib/spatial/CartesianZone',
      hydratorClass: PH,
      data: { name: 'Duncan Hall', cellSize: 3 },
    },
    {
      path: LoungeWarren.CAMPUS_PATH,
      class: '/lib/spatial/CartesianLocation',
      hydratorClass: PH,
      data: { coords: { x: 0, y: 0, z: 0 }, shortDescription: 'lobby' },
    },
  ].map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_c: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Domain) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    },
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);
  return store;
}

// Countable arrival: HasInteractive + Containable.
class TestArrival extends HasInteractiveMixin(ContainableMixin(Idea)) {}
function arrival(): TestArrival {
  return makeStuff(() => new TestArrival());
}
const flush = () => new Promise((r) => setTimeout(r, 40));

type WarrenInternals = LoungeWarren & {
  spawnMember(): Promise<Stuff & Container>;
};

describe('LoungeWarren policy', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installLoungeStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('quiet landing: getHost lazily creates the host, wires Dave + campus fixtures, carries the description (AC 1, 6)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();

    expect(host).toBeInstanceOf(LoungeRoom);
    expect(warren.getMembers()).toEqual([host]);
    expect(warren.isCurrentHost(host)).toBe(true);
    // Clone carries the authored description.
    expect((host as unknown as LoungeRoom).getShortDescription()).toBe(
      'the lounge',
    );
    // The host is a root Location (coordinator, not containment tier):
    // a Location is a Container but NOT Containable, so it can't be held
    // by the Warren or anything else (AC 9).
    expect(MixinApi.isContainable(host as Stuff)).toBe(false);

    // Dave's Bar: north ↔ south, walkable both ways.
    const toBar = (host as unknown as LoungeRoom).getExit('north');
    expect(toBar).toBeDefined();
    const bar = await StuffApi.singleton<LoungeRoom>(LoungeWarren.BAR_PATH);
    expect(toBar!.getDestination()).toBe(bar);
    const backFromBar = (bar as unknown as LoungeRoom).getExit('south');
    expect(backFromBar!.getDestination()).toBe(host);

    // Campus: out ↔ lounge.
    const toCampus = (host as unknown as LoungeRoom).getExit('out');
    expect(toCampus).toBeDefined();
    const campus = await StuffApi.singleton<LoungeRoom>(
      LoungeWarren.CAMPUS_PATH,
    );
    expect(toCampus!.getDestination()).toBe(campus);
    const backFromCampus = (campus as unknown as LoungeRoom).getExit('lounge');
    expect(backFromCampus!.getDestination()).toBe(host);
  });

  it('singleton identity: singleton resolves the same Warren; a second bare clone throws (AC 4)', async () => {
    const a = await StuffApi.singleton<LoungeWarren>(LoungeWarren.WARREN_PATH);
    const b = await StuffApi.singleton<LoungeWarren>(LoungeWarren.WARREN_PATH);
    expect(a).toBe(b);
    await expect(StuffApi.clone(LoungeWarren.WARREN_PATH)).rejects.toThrow(
      /SingletonMixin/,
    );
  });

  it('budding: an arrival past N buds a fresh clone, wires a walkable hub exit, and seats the newcomer there (AC 2)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    warren.setThresholds({ budThreshold: 2, mergeWatermark: 1, reapGraceMs: 5 });
    const host = await warren.getHost();

    const a = arrival();
    const b = arrival();
    const c = arrival();
    ContainmentApi.move(a as never, host);
    ContainmentApi.move(b as never, host);
    ContainmentApi.move(c as never, host); // 3rd → over N → bud + re-seat
    await flush();

    const members = warren.getMembers();
    expect(members).toHaveLength(2);
    const sat = members.find((m) => m !== host)!;
    // Newcomer re-seated to the budded satellite; host back to N.
    expect((sat as unknown as Container).getContents()).toContain(c);
    expect((host as unknown as Container).getContents()).toEqual(
      expect.arrayContaining([a, b]),
    );
    expect((host as unknown as Container).getContents()).not.toContain(c);
    // Walkable hub exit both ways.
    const hostToSat = [...(host as unknown as LoungeRoom).getExits().values()]
      .map((e) => e.getDestination())
      .filter((d) => d === sat);
    expect(hostToSat.length).toBe(1);
    const satToHost = [...(sat as unknown as LoungeRoom).getExits().values()]
      .map((e) => e.getDestination())
      .filter((d) => d === host);
    expect(satToHost.length).toBe(1);
  });

  it('least-full routing: admitArrival seats into the emptier eligible satellite (AC 2)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    warren.setThresholds({ budThreshold: 5 });
    const host = await warren.getHost();
    const sat1 = await (warren as WarrenInternals).spawnMember();
    const sat2 = await (warren as WarrenInternals).spawnMember();

    ContainmentApi.move(arrival() as never, sat1);
    ContainmentApi.move(arrival() as never, sat1); // sat1: 2 occupants
    // sat2: 0 occupants → least-full eligible.

    const newcomer = arrival();
    await warren.admitArrival(host, newcomer as unknown as Stuff);
    expect((sat2 as unknown as Container).getContents()).toContain(newcomer);
    expect((sat1 as unknown as Container).getContents()).not.toContain(
      newcomer,
    );
  });

  it('drain→reap: a satellite below the merge watermark is reaped after the grace; the host is never reaped (AC 3)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    warren.setThresholds({ budThreshold: 2, mergeWatermark: 1, reapGraceMs: 10 });
    const host = await warren.getHost();
    const sat = await (warren as WarrenInternals).spawnMember();
    expect(warren.getMembers()).toHaveLength(2);

    // Satellite is empty (0 < M) → reconcile schedules a reap.
    warren.notifyPopulationChange(sat);
    await flush();

    expect((sat as Stuff).isDestroyed()).toBe(true);
    expect((host as Stuff).isDestroyed()).toBe(false); // host never reaped
    expect(warren.getMembers()).toEqual([host]);
    // Host-side hub exit to the reaped satellite is gone (no dead exit).
    const dangling = [...(host as unknown as LoungeRoom).getExits().values()]
      .map((e) => {
        try {
          return e.getDestination();
        } catch {
          return null;
        }
      })
      .filter((d) => d === sat);
    expect(dangling).toHaveLength(0);
  });

  it('Dave’s Bar is never pulled into the member set (AC 12)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    const bar = await StuffApi.singleton<Stuff & Container>(
      LoungeWarren.BAR_PATH,
    );
    expect(warren.getMembers()).toEqual([host]);
    expect(warren.hasMember(bar)).toBe(false);
  });
});
