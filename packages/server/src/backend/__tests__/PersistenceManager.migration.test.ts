/**
 * The `domain` → `content` collection migration (pack-installer wave 0).
 * Unit-level against a faked driver — no live Mongo.
 */

import '../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PersistenceManager,
  Collections,
  COLLECTION_POLICIES,
} from '../PersistenceManager';

function fakeDb(initial: string[]) {
  const names = [...initial];
  const rename = vi.fn(async (newName: string) => {
    const i = names.indexOf('domain');
    if (i < 0) throw new Error('ns not found');
    if (names.includes(newName)) throw new Error('target namespace exists');
    names[i] = newName;
  });
  return {
    names,
    rename,
    listCollections: () => ({
      toArray: async () => names.map((name) => ({ name })),
    }),
    collection: (_name: string) => ({ rename }),
  };
}

describe('PersistenceManager.planDomainRename', () => {
  it('renames when only domain exists', () => {
    expect(PersistenceManager.planDomainRename(['users', 'domain'])).toBe('rename');
  });
  it('is a no-op when content exists', () => {
    expect(PersistenceManager.planDomainRename(['users', 'content'])).toBe('noop');
  });
  it('is a no-op on a fresh DB', () => {
    expect(PersistenceManager.planDomainRename([])).toBe('noop');
  });
  it('warns and never renames when both exist', () => {
    expect(PersistenceManager.planDomainRename(['domain', 'content'])).toBe('warn-both');
  });
});

describe('PersistenceManager domain→content migration (I/O)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renames exactly once on a pre-rename DB, then is a no-op on the second boot', async () => {
    const pm = PersistenceManager.get();
    const db = fakeDb(['users', 'domain']);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await pm.runDomainMigrationForTest(db)).toBe('rename');
    expect(db.rename).toHaveBeenCalledTimes(1);
    expect(db.rename).toHaveBeenCalledWith(Collections.Content);
    expect(db.names).toEqual(['users', 'content']);
    // second boot
    expect(await pm.runDomainMigrationForTest(db)).toBe('noop');
    expect(db.rename).toHaveBeenCalledTimes(1);
  });

  it('never renames when content already exists', async () => {
    const pm = PersistenceManager.get();
    const db = fakeDb(['content']);
    expect(await pm.runDomainMigrationForTest(db)).toBe('noop');
    expect(db.rename).not.toHaveBeenCalled();
  });

  it('never renames over a live content collection; warns instead', async () => {
    const pm = PersistenceManager.get();
    const db = fakeDb(['domain', 'content']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await pm.runDomainMigrationForTest(db)).toBe('warn-both');
    expect(db.rename).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/'domain' and 'content'/);
  });
});

describe('PersistenceManager groups.owner migration (I/O)', () => {
  function fakeGroups(rows: Array<Record<string, unknown>>) {
    const updateOne = vi.fn(async (q: Record<string, unknown>, u: Record<string, unknown>) => {
      const row = rows.find((r) => r._id === q._id)!;
      Object.assign(row, (u as { $set: Record<string, unknown> }).$set);
    });
    return {
      rows,
      updateOne,
      collection: (_name: string) => ({
        find: (q: Record<string, unknown>) => ({
          toArray: async () =>
            (q.owner as { $type?: string })?.$type === 'string'
              ? rows.filter((r) => typeof r.owner === 'string')
              : rows.slice(),
        }),
        updateOne,
      }),
    };
  }

  it('upgrades every string owner shape once; typed rows are untouched; second run is a no-op', async () => {
    const pm = PersistenceManager.get();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const db = fakeGroups([
      { _id: '1', name: 'core', owner: 'system' },
      { _id: '2', name: 'mine', owner: '/obj/Avatar/alice' },
      { _id: '3', name: 'pack-installers', owner: 'office:prime-minister' },
      { _id: '4', name: 'typed', owner: { kind: 'office', office: 'mayor' } },
    ]);
    expect(await pm.runGroupOwnerMigrationForTest(db)).toBe(3);
    expect(db.rows.map((r) => r.owner)).toEqual([
      { kind: 'system' },
      { kind: 'player', templatePath: '/obj/Avatar/alice' },
      { kind: 'office', office: 'prime-minister' },
      { kind: 'office', office: 'mayor' },
    ]);
    expect(db.updateOne).toHaveBeenCalledTimes(3);
    expect(await pm.runGroupOwnerMigrationForTest(db)).toBe(0);
    expect(db.updateOne).toHaveBeenCalledTimes(3);
  });
});

describe('pack_installs policy', () => {
  it('is refused to circles — installer state is system state', () => {
    expect(COLLECTION_POLICIES[Collections.PackInstalls]?.verb).toBe('refuse');
  });
});
