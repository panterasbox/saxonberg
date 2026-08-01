/**
 * Document tests — CRUD surface on a plain (non-Stuff) record.
 *
 * The interesting logic lives in `toDocument` / `fromDocument` / `save` /
 * `delete` / `findById` / `find`. PersistenceManager calls are stubbed with
 * hand-built fakes (matches the existing `PersistenceManager.hooks.test.ts`
 * pattern); no MongoDB / no mongodb-memory-server. Documents are plain
 * objects — constructed with `new`, never registered with StuffApi.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Document } from '../Document';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

class Widget extends Document {
  static collectionName = 'widgets';
  static persistentFields = ['name', 'count'];
  name: string = '';
  count: number = 0;
}

class NamelessWidget extends Document {
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

describe('Document', () => {
  let pm: PMStubs;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('construction', () => {
    it('initializes createdAt and updatedAt', () => {
      const w = new Widget();
      expect(w.createdAt).toBeInstanceOf(Date);
      expect(w.updatedAt).toBeInstanceOf(Date);
    });

    it('_id is undefined until saved', () => {
      const w = new Widget();
      expect(w._id).toBeUndefined();
    });

    it('is a plain object, not a registered Stuff (no stuffId)', () => {
      const w = new Widget();
      expect((w as unknown as { stuffId?: unknown }).stuffId).toBeUndefined();
      expect(w).toBeInstanceOf(Document);
    });
  });

  describe('save()', () => {
    it('writes the doc through PersistenceManager.save and stamps _id', async () => {
      const w = new Widget();
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
      const w = new Widget();
      const t0 = w.updatedAt.getTime();
      await new Promise((r) => setTimeout(r, 5));
      await w.save();
      expect(w.updatedAt.getTime()).toBeGreaterThan(t0);
    });

    it('only stamps _id once — subsequent saves reuse the original id', async () => {
      const w = new Widget();
      await w.save();
      const firstId = w._id;
      await w.save();
      expect(w._id).toBe(firstId);
    });

    it('writes the declared persistent fields plus timestamps', async () => {
      const w = new Widget();
      await w.save();
      const doc = pm.saves[0]!.doc as Record<string, unknown>;
      expect(doc).toHaveProperty('name', '');
      expect(doc).toHaveProperty('count', 0);
      expect(doc).toHaveProperty('createdAt');
      expect(doc).toHaveProperty('updatedAt');
    });

    it('preserves _id on save when already set', async () => {
      const w = new Widget();
      w._id = 'existing-id';
      await w.save();
      expect(w._id).toBe('existing-id');
    });

    it('throws when collectionName is undefined', async () => {
      const w = new NamelessWidget();
      await expect(w.save()).rejects.toThrow(/collectionName not defined/);
    });
  });

  describe('delete()', () => {
    it('throws if called on an unsaved object', async () => {
      const w = new Widget();
      await expect(w.delete()).rejects.toThrow(/Cannot delete unsaved/);
    });

    it('routes through PersistenceManager.delete (no destruct cascade)', async () => {
      const w = new Widget();
      w._id = 'abc';
      await w.delete();
      expect(pm.deletes).toEqual([{ collection: 'widgets', id: 'abc' }]);
    });
  });

  describe('static findById()', () => {
    it('returns null when PersistenceManager finds nothing', async () => {
      pm.setFindByIdResult(null);
      const found = await Widget.findById('missing');
      expect(found).toBeNull();
      expect(pm.findByIds).toEqual([{ collection: 'widgets', id: 'missing' }]);
    });

    it('constructs a plain instance and hydrates from the doc', async () => {
      pm.setFindByIdResult({
        _id: 'abc',
        name: 'Loaded',
        count: 9,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      const found = await Widget.findById('abc');
      expect(found).not.toBeNull();
      expect(found).toBeInstanceOf(Widget);
      expect(found!._id).toBe('abc');
      expect(found!.name).toBe('Loaded');
      expect(found!.count).toBe(9);
      expect(found!.createdAt).toEqual(new Date('2024-01-01'));
      expect(found!.updatedAt).toEqual(new Date('2024-01-02'));
      expect((found as unknown as { stuffId?: unknown }).stuffId).toBeUndefined();
    });

    it('is value-like: two lookups of the same id return distinct instances', async () => {
      pm.setFindByIdResult({ _id: 'abc', name: 'X', count: 1 });
      const a = await Widget.findById('abc');
      const b = await Widget.findById('abc');
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a).not.toBe(b);
      expect(a!._id).toBe(b!._id);
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
      expect(
        (found as unknown as Record<string, unknown>).injected
      ).toBeUndefined();
    });

    it('throws when collectionName is undefined', async () => {
      await expect(NamelessWidget.findById('id')).rejects.toThrow(
        /collectionName not defined/
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

    it('constructs one instance per doc and hydrates each', async () => {
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
        /collectionName not defined/
      );
    });
  });

  describe('round-trip (stored-shape parity)', () => {
    it('fromDocument(toDocument(x)) preserves the declared fields', () => {
      const w = new Widget();
      w._id = 'rt';
      w.name = 'RoundTrip';
      w.count = 42;
      const stored = (
        w as unknown as { toDocument(): Record<string, unknown> }
      ).toDocument();
      // Stored shape carries declared fields + timestamps + _id, nothing else
      // (notably no stuffId).
      expect(Object.keys(stored).sort()).toEqual(
        ['_id', 'count', 'createdAt', 'name', 'updatedAt'].sort()
      );

      const reloaded = new Widget();
      (
        reloaded as unknown as { fromDocument(d: Record<string, unknown>): void }
      ).fromDocument(stored);
      expect(reloaded._id).toBe('rt');
      expect(reloaded.name).toBe('RoundTrip');
      expect(reloaded.count).toBe(42);
    });
  });

  describe('optional marshalled fields', () => {
    // A marshaller speaks a value-object contract — `toStored` takes an
    // instance, `fromStored` returns one — so a null in a marshalled field
    // used to throw on BOTH paths, which made an optional marshalled field
    // inexpressible. `ParcelRecord.area` is the first one. Null now skips
    // the marshaller in both directions.
    class Boxed {
      constructor(public readonly n: number) {}
    }
    const marshaller = {
      toStored: (v: Boxed) => ({ n: v.n }),
      fromStored: (raw: { n: number }) => new Boxed(raw.n),
    };
    const MARSHALLER_PATH = '/test/BoxMarshaller';

    class BoxWidget extends Document {
      static collectionName = 'boxes';
      static persistentFields = ['label', 'box'];
      static fieldMarshallers = { box: MARSHALLER_PATH };
      label: string = '';
      box: Boxed | null = null;
    }

    const marshalled = (d: BoxWidget): Record<string, unknown> =>
      (d as unknown as { toDocument(): Record<string, unknown> }).toDocument();
    const unmarshalled = (
      d: BoxWidget,
      doc: Record<string, unknown>
    ): void =>
      (
        d as unknown as { fromDocument(x: Record<string, unknown>): void }
      ).fromDocument(doc);

    beforeEach(() => {
      const resolve = (path: string) =>
        path === MARSHALLER_PATH
          ? (marshaller as unknown as never)
          : undefined;
      Document.setMarshallerResolver(resolve, async (path) => resolve(path));
    });

    it('marshals a present value through the marshaller', () => {
      const w = new BoxWidget();
      w.label = 'full';
      w.box = new Boxed(7);
      expect(marshalled(w).box).toEqual({ n: 7 });
    });

    it('stores a null field as null instead of throwing', () => {
      const w = new BoxWidget();
      w.label = 'empty';
      expect(() => marshalled(w)).not.toThrow();
      expect(marshalled(w).box).toBeNull();
    });

    it('rehydrates a stored null as null instead of throwing', () => {
      const w = new BoxWidget();
      expect(() =>
        unmarshalled(w, { label: 'empty', box: null })
      ).not.toThrow();
      expect(w.box).toBeNull();
      expect(w.label).toBe('empty');
    });

    it('⭐ round-trips both the present and the absent case', () => {
      const full = new BoxWidget();
      full.box = new Boxed(3);
      const reloadedFull = new BoxWidget();
      unmarshalled(reloadedFull, marshalled(full));
      expect(reloadedFull.box).toBeInstanceOf(Boxed);
      expect(reloadedFull.box!.n).toBe(3);

      const empty = new BoxWidget();
      const reloadedEmpty = new BoxWidget();
      reloadedEmpty.box = new Boxed(99); // prove it is actively cleared
      unmarshalled(reloadedEmpty, marshalled(empty));
      expect(reloadedEmpty.box).toBeNull();
    });

    it('still throws when a PRESENT value names an unregistered marshaller', () => {
      Document.setMarshallerResolver(
        () => undefined,
        async () => undefined
      );
      const w = new BoxWidget();
      w.box = new Boxed(1);
      expect(() => marshalled(w)).toThrow(/not registered/);
    });
  });

  describe('toString()', () => {
    it('renders an unsaved instance with "(unsaved)"', () => {
      const w = new Widget();
      expect(w.toString()).toBe('[Widget (unsaved)]');
    });

    it('renders a saved instance with its _id', () => {
      const w = new Widget();
      w._id = 'xyz';
      expect(w.toString()).toBe('[Widget xyz]');
    });
  });
});
