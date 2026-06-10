import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import type { Zone } from '../Zone';
import FolderZone from '../FolderZone';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Tests for `Zone.ownerGroup` and `Zone.accessGroups` — the
 * persistent, inheritable ownership fields used by the access
 * substrate's flat-union walk.
 *
 * - `setOwnerGroup` validates the GroupRef shape via `parseGroupRef`;
 *   malformed refs throw.
 * - The fields are inheritable: `lookupAncestorField('ownerGroup')`
 *   walks the template-tree ancestry and returns the nearest
 *   stamped value.
 * - `data.ownerGroup` / `data.accessGroups` round-trip through the
 *   Hydrator (Phase 1 setter dispatch) on clone.
 */

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

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
    if (collection !== Collections.Domain) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

describe('Zone.setOwnerGroup', () => {
  it('throws on a malformed ref (no colon)', () => {
    const zone = makeStuff(() => new FolderZone());
    expect(() => zone.setOwnerGroup('malformed-no-colon')).toThrow();
  });

  it('accepts a well-formed managed ref', () => {
    const zone = makeStuff(() => new FolderZone());
    zone.setOwnerGroup('managed:abc123');
    expect(zone.getOwnerGroup()).toBe('managed:abc123');
  });

  it('accepts undefined to clear the field', () => {
    const zone = makeStuff(() => new FolderZone());
    zone.setOwnerGroup('managed:abc');
    zone.setOwnerGroup(undefined);
    expect(zone.getOwnerGroup()).toBeUndefined();
  });
});

describe('Zone.setAccessGroups', () => {
  it('validates every entry', () => {
    const zone = makeStuff(() => new FolderZone());
    expect(() =>
      zone.setAccessGroups(['managed:ok', 'malformed-no-colon']),
    ).toThrow();
  });

  it('accepts a well-formed list of refs', () => {
    const zone = makeStuff(() => new FolderZone());
    zone.setAccessGroups(['managed:a', 'managed:b']);
    expect(zone.getAccessGroups()).toEqual(['managed:a', 'managed:b']);
  });

  it('copies the array (no shared mutation)', () => {
    const zone = makeStuff(() => new FolderZone());
    const refs = ['managed:a'];
    zone.setAccessGroups(refs);
    refs.push('managed:should-not-leak');
    expect(zone.getAccessGroups()).toEqual(['managed:a']);
  });
});

describe('ownerGroup inheritance walk', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('lookupAncestorField walks to the nearest stamped ancestor', async () => {
    installInMemoryStore([
      {
        path: '/lib/persistence/PersistentHydrator',
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/root',
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { ownerGroup: 'managed:root-owner' },
      },
      {
        path: '/root/mid',
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/root/mid/leaf',
        class: '/lib/spatial/CartesianZone',
        data: {},
      },
    ]);
    const leaf = await StuffApi.singleton<Zone>('/root/mid/leaf');
    expect(await leaf.lookupField<string>('ownerGroup')).toBe(
      'managed:root-owner',
    );
  });

  it('child ownerGroup shadows the ancestor ownerGroup', async () => {
    installInMemoryStore([
      {
        path: '/lib/persistence/PersistentHydrator',
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/outer',
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { ownerGroup: 'managed:outer-owner' },
      },
      {
        path: '/outer/inner',
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { ownerGroup: 'managed:inner-owner' },
      },
    ]);
    const inner = await StuffApi.singleton<Zone>('/outer/inner');
    expect(await inner.lookupField<string>('ownerGroup')).toBe(
      'managed:inner-owner',
    );
  });
});

describe('Hydrator round-trip', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('ownerGroup round-trips through template data', async () => {
    installInMemoryStore([
      {
        path: '/lib/persistence/PersistentHydrator',
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/r',
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { ownerGroup: 'managed:xyz' },
      },
    ]);
    const z = await StuffApi.singleton<Zone>('/r');
    expect(z.getOwnerGroup()).toBe('managed:xyz');
  });

  it('accessGroups round-trips through template data', async () => {
    installInMemoryStore([
      {
        path: '/lib/persistence/PersistentHydrator',
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/r',
        class: '/lib/zone/FolderZone',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { accessGroups: ['managed:a', 'managed:b'] },
      },
    ]);
    const z = await StuffApi.singleton<Zone>('/r');
    expect(z.getAccessGroups()).toEqual(['managed:a', 'managed:b']);
  });
});
