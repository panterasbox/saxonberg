/**
 * Persistable tests — CRUD surface on Stuff.
 *
 * The interesting logic lives in `toDocument` / `fromDocument` /
 * `save` / `delete` / `findById` / `find`. PersistenceManager calls are
 * stubbed with hand-built fakes (matches the existing
 * `PersistenceManager.hooks.test.ts` pattern); no MongoDB / no
 * mongodb-memory-server.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Persistable } from '../Persistable';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';

class Widget extends Persistable {
  static collectionName = 'widgets';
  static persistentFields = ['name', 'count'];
  name: string = '';
  count: number = 0;
}

class NamelessWidget extends Persistable {
  // Deliberately no collectionName set.
  static persistentFields: string[] = [];
}

interface PMStubs {
  saves: Array<{ collection: string; doc: unknown }>;
  findByIds: Array<{ collection: string; id: string }>;
  finds: Array<{ collection: string; query: unknown }>;
  deletes: Array<{ collection: string; id: string }>;
  setFindByIdResult(doc: Record<string, unknown> | null): void;
  setFindResult(docs: Record<string, unknown>[]): void;
}

function stubPM(): PMStubs {
  const saves: PMStubs['saves'] = [];
  const findByIds: PMStubs['findByIds'] = [];
  const finds: PMStubs['finds'] = [];
  const deletes: PMStubs['deletes'] = [];
  let nextFindByIdResult: Record<string, unknown> | null = null;
  let nextFindResult: Record<string, unknown>[] = [];

  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
    saves.push({ collection, doc });
    return 'inserted-id';
  });
  vi.spyOn(pm, 'findById').mockImplementation(async (collection, id) => {
    findByIds.push({ collection, id });
    return nextFindByIdResult;
  });
  vi.spyOn(pm, 'find').mockImplementation(async (collection, query) => {
    finds.push({ collection, query });
    return nextFindResult;
  });
  vi.spyOn(pm, 'delete').mockImplementation(async (collection, id) => {
    deletes.push({ collection, id });
  });

  return {
    saves,
    findByIds,
    finds,
    deletes,
    setFindByIdResult: (doc) => {
      nextFindByIdResult = doc;
    },
    setFindResult: (docs) => {
      nextFindResult = docs;
    },
  };
}

describe('Persistable', () => {
  let pm: PMStubs;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  describe('construction', () => {
    it('initializes createdAt and updatedAt', async () => {
      const w = await StuffApi.create(() => new Widget());
      expect(w.createdAt).toBeInstanceOf(Date);
      expect(w.updatedAt).toBeInstanceOf(Date);
    });

    it('_id is undefined until saved', async () => {
      const w = await StuffApi.create(() => new Widget());
      expect(w._id).toBeUndefined();
    });

    it('is a registered Stuff with a stuffId', async () => {
      const w = await StuffApi.create(() => new Widget());
      expect(typeof w.stuffId).toBe('string');
      expect(w.stuffId.length).toBeGreaterThan(0);
    });
  });

  describe('save()', () => {
    it('writes the doc through PersistenceManager.save and stamps _id', async () => {
      const w = await StuffApi.create(() => new Widget());
      w.name = 'Alice';
      w.count = 3;

      await w.save();

      expect(pm.saves).toHaveLength(1);
      expect(pm.saves[0]!.collection).toBe('widgets');
      const doc = pm.saves[0]!.doc as Record<string, unknown>;
      expect(doc.name).toBe('Alice');
      expect(doc.count).toBe(3);
      expect(w._id).toBe('inserted-id');
    });

    it('updates updatedAt on each save', async () => {
      const w = await StuffApi.create(() => new Widget());
      const t0 = w.updatedAt.getTime();
      // Tick the clock by waiting one event loop turn so the date is distinct.
      await new Promise((r) => setTimeout(r, 5));
      await w.save();
      expect(w.updatedAt.getTime()).toBeGreaterThan(t0);
    });

    it('only stamps _id once — subsequent saves reuse the original id', async () => {
      const w = await StuffApi.create(() => new Widget());
      await w.save();
      const firstId = w._id;
      await w.save();
      expect(w._id).toBe(firstId);
    });

    it('omits unset persistent fields when they are not own properties', async () => {
      const w = await StuffApi.create(() => new Widget());
      // The class declares `name = '' / count = 0` so they always exist
      // as own properties. Pin this default-shape behavior so any future
      // change to the field defaults is intentional.
      await w.save();
      const doc = pm.saves[0]!.doc as Record<string, unknown>;
      expect(doc).toHaveProperty('name', '');
      expect(doc).toHaveProperty('count', 0);
      expect(doc).toHaveProperty('createdAt');
      expect(doc).toHaveProperty('updatedAt');
    });

    it('preserves _id on save when already set', async () => {
      const w = await StuffApi.create(() => new Widget());
      w._id = 'existing-id';
      await w.save();
      // PM.save's stub returns 'inserted-id', but Persistable.save() only
      // applies that on first save when _id was unset — the existing
      // value should win.
      expect(w._id).toBe('existing-id');
    });

    it('throws when collectionName is undefined', async () => {
      const w = await StuffApi.create(() => new NamelessWidget());
      await expect(w.save()).rejects.toThrow(/collectionName not defined/);
    });
  });

  describe('delete()', () => {
    it('throws if called on an unsaved object', async () => {
      const w = await StuffApi.create(() => new Widget());
      await expect(w.delete()).rejects.toThrow(/Cannot delete unsaved/);
    });

    it('routes through PersistenceManager.delete and destructs the Stuff', async () => {
      const w = await StuffApi.create(() => new Widget());
      w._id = 'abc';
      await w.delete();
      expect(pm.deletes).toEqual([{ collection: 'widgets', id: 'abc' }]);
      expect(w.isDestroyed()).toBe(true);
    });
  });

  describe('static findById()', () => {
    it('returns null when PersistenceManager finds nothing', async () => {
      pm.setFindByIdResult(null);
      const found = await Widget.findById('missing');
      expect(found).toBeNull();
      expect(pm.findByIds).toEqual([{ collection: 'widgets', id: 'missing' }]);
    });

    it('constructs a registered Stuff and hydrates from the doc', async () => {
      pm.setFindByIdResult({
        _id: 'abc',
        name: 'Loaded',
        count: 9,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      const found = await Widget.findById('abc');
      expect(found).not.toBeNull();
      expect(found!._id).toBe('abc');
      expect(found!.name).toBe('Loaded');
      expect(found!.count).toBe(9);
      expect(found!.createdAt).toEqual(new Date('2024-01-01'));
      expect(found!.updatedAt).toEqual(new Date('2024-01-02'));
      expect(typeof found!.stuffId).toBe('string');
    });

    it('skips doc fields that are not in persistentFields', async () => {
      pm.setFindByIdResult({
        _id: 'abc',
        name: 'X',
        count: 1,
        injected: 'should-not-be-set',
      });
      const found = await Widget.findById('abc');
      expect(found).not.toBeNull();
      expect((found as unknown as Record<string, unknown>).injected).toBeUndefined();
    });

    it('throws when collectionName is undefined', async () => {
      await expect(NamelessWidget.findById('id')).rejects.toThrow(
        /collectionName not defined/,
      );
    });
  });

  describe('static find()', () => {
    it('returns [] when PersistenceManager returns no docs', async () => {
      pm.setFindResult([]);
      const found = await Widget.find({ name: 'nope' });
      expect(found).toEqual([]);
      expect(pm.finds).toEqual([
        { collection: 'widgets', query: { name: 'nope' } },
      ]);
    });

    it('constructs one Stuff per doc and hydrates each', async () => {
      pm.setFindResult([
        { _id: 'a', name: 'A', count: 1 },
        { _id: 'b', name: 'B', count: 2 },
      ]);
      const found = await Widget.find({});
      expect(found).toHaveLength(2);
      const byName = new Map(found.map((w) => [w.name, w]));
      expect(byName.get('A')!.count).toBe(1);
      expect(byName.get('A')!._id).toBe('a');
      expect(byName.get('B')!.count).toBe(2);
    });

    it('throws when collectionName is undefined', async () => {
      await expect(NamelessWidget.find({})).rejects.toThrow(
        /collectionName not defined/,
      );
    });
  });

  describe('toString()', () => {
    it('renders an unsaved instance with "(unsaved)"', async () => {
      const w = await StuffApi.create(() => new Widget());
      expect(w.toString()).toBe('[Widget (unsaved)]');
    });

    it('renders a saved instance with its _id', async () => {
      const w = await StuffApi.create(() => new Widget());
      w._id = 'xyz';
      expect(w.toString()).toBe('[Widget xyz]');
    });
  });
});
