/**
 * GroupApi.sharedManagedGroups — the objective-circle intersection renown
 * uses to scope a signal. Covers: returns the `managed:<_id>` refs of the
 * groups containing BOTH players; excludes groups missing either; returns
 * [] with no shared group or when disconnected.
 *
 * Mongo is faked with an in-memory collection whose `find` honors the
 * array-contains semantics of `{ memberIds: id }` (the indexed query the
 * method relies on).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GroupApi } from '../group';
import { Group } from '../../lib/social/Group';
import { PersistenceManager } from '../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

async function saveGroup(name: string, memberIds: string[]): Promise<Group> {
  const g = new Group();
  g.name = name;
  for (const id of memberIds) g.addMember(id);
  await g.save();
  return g;
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => {
          const dv = d[k];
          return Array.isArray(dv) ? dv.includes(v) : dv === v;
        })
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GroupApi.sharedManagedGroups', () => {
  it('returns the managed refs of groups containing both players', async () => {
    const guild = await saveGroup('guild', ['a', 'b']);
    await saveGroup('cohort', ['a', 'c']); // only a
    const lab = await saveGroup('lab', ['b', 'a', 'd']); // both

    const shared = await GroupApi.sharedManagedGroups('a', 'b');
    expect(shared.sort()).toEqual(
      [`managed:${guild._id}`, `managed:${lab._id}`].sort()
    );
  });

  it('returns [] when no managed group is shared', async () => {
    await saveGroup('cohort', ['a', 'c']);
    await saveGroup('other', ['b', 'd']);
    expect(await GroupApi.sharedManagedGroups('a', 'b')).toEqual([]);
  });

  it('no-ops (empty) when disconnected', async () => {
    await saveGroup('guild', ['a', 'b']);
    vi.spyOn(PersistenceManager.get(), 'isConnected').mockReturnValue(false);
    expect(await GroupApi.sharedManagedGroups('a', 'b')).toEqual([]);
  });
});
