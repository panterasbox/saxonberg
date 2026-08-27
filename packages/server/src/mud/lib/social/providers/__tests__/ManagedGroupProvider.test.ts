/**
 * Tests for `ManagedGroupProvider.findByName` — the by-name lookup
 * helper used by the AccessRegistry's bootstrap seeding to find
 * well-known groups (`'lounge'`, `'lounge'`, `'wizards'`) without
 * threading their `_id`s.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ManagedGroupProvider } from '../ManagedGroupProvider';
import { Group } from '../../Group';
import { PersistenceManager, Collections } from '../../../../../backend/PersistenceManager';

interface Doc extends Record<string, unknown> {
  _id?: string;
  name?: string;
}

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_collection: string, doc: Doc) => {
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

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Groups) return [];
    if (typeof query.name === 'string') {
      return store.filter((d) => d.name === query.name);
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

describe('ManagedGroupProvider.findByName', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no group matches', async () => {
    installInMemoryStore([]);
    const provider = new ManagedGroupProvider();
    expect(await provider.findByName('nonexistent')).toBeNull();
  });

  it('returns the group when one matches', async () => {
    installInMemoryStore([
      {
        name: 'lounge',
        owner: { kind: 'system' },
        memberIds: [],
        memberRoles: [],
      },
    ]);
    const provider = new ManagedGroupProvider();
    const found = await provider.findByName('lounge');
    expect(found).not.toBeNull();
    expect(found).toBeInstanceOf(Group);
    expect(found!.name).toBe('lounge');
  });
});
