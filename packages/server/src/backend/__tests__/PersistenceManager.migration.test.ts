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

describe('pack_installs policy', () => {
  it('is refused to circles — installer state is system state', () => {
    expect(COLLECTION_POLICIES[Collections.PackInstalls]?.verb).toBe('refuse');
  });
});
