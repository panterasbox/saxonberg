/**
 * The legacy collection → `documents` collapse (content-packs wave 2):
 * `planCollapses` over name sets; the I/O shell against a faked driver —
 * rows copied with `_id` PRESERVED, stripped fields dropped, the
 * provisional path `/<legacy>/<naturalKey>`, `sourcePack` carried when
 * present, `drop` called once; and two-boot idempotence at the
 * migration layer (the collection is gone, so the second run makes no
 * call and prints no line).
 */

import '../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PersistenceManager } from '../PersistenceManager';

afterEach(() => vi.restoreAllMocks());

describe('PersistenceManager.planCollapses', () => {
  it('lists only the legacy collections present, in table order', () => {
    expect(PersistenceManager.planCollapses(['users', 'documents'])).toEqual([]);
    expect(PersistenceManager.planCollapses(['emotes', 'users'])).toEqual(['emotes']);
  });
});

interface FakeDb {
  names: string[];
  documents: Array<Record<string, unknown>>;
  drops: string[];
  inserts: number;
  listCollections(): { toArray(): Promise<Array<{ name: string }>> };
  collection(name: string): {
    find(q: Record<string, unknown>): { toArray(): Promise<Array<Record<string, unknown>>> };
    insertOne(doc: Record<string, unknown>): Promise<unknown>;
    drop(): Promise<unknown>;
  };
}

function fakeDb(legacy: Record<string, Array<Record<string, unknown>>>, documents: Array<Record<string, unknown>> = []): FakeDb {
  const names = ['users', 'documents', ...Object.keys(legacy)];
  const db: FakeDb = {
    names,
    documents,
    drops: [],
    inserts: 0,
    listCollections: () => ({ toArray: async () => db.names.map((name) => ({ name })) }),
    collection: (name: string) => ({
      find: () => ({ toArray: async () => (name === 'documents' ? db.documents : legacy[name] ?? []) }),
      insertOne: async (doc: Record<string, unknown>) => {
        if (name !== 'documents') throw new Error(`unexpected insert into ${name}`);
        if (doc._id !== undefined && db.documents.some((d) => d._id === doc._id)) {
          throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
        }
        db.inserts++;
        db.documents.push({ ...doc, _id: doc._id ?? `fresh-${db.inserts}` });
      },
      drop: async () => {
        db.drops.push(name);
        db.names = db.names.filter((n) => n !== name);
        delete legacy[name];
      },
    }),
  };
  return db;
}

describe('the emotes → documents collapse (I/O)', () => {
  it('moves every row with _id preserved, aliases stripped, sourcePack carried; drops once; second boot is silent', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const db = fakeDb({
      emotes: [
        { _id: 'e1', verb: 'grin', aliases: ['smirk'], grammar: { slots: {}, template: 'grins' }, tags: [], valence: 0 },
        { _id: 'e2', verb: 'wave', aliases: [], grammar: { slots: {}, template: 'waves' }, tags: ['greeting'], valence: 1, sourcePack: 'expression' },
      ],
    });
    const pm = PersistenceManager.get();
    expect(await pm.runCollapseMigrationForTest(db)).toBe(2);
    expect(db.documents).toEqual([
      {
        _id: 'e1',
        path: '/emotes/grin',
        owner: '',
        kind: 'emote',
        data: { verb: 'grin', grammar: { slots: {}, template: 'grins' }, tags: [], valence: 0 },
      },
      {
        _id: 'e2',
        path: '/emotes/wave',
        owner: '',
        kind: 'emote',
        data: { verb: 'wave', grammar: { slots: {}, template: 'waves' }, tags: ['greeting'], valence: 1 },
        sourcePack: 'expression',
      },
    ]);
    expect(db.drops).toEqual(['emotes']);
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toMatch(/collapsed 'emotes' → documents \{kind: 'emote'\} \(2 row\(s\)\)/);

    // Second boot: the collection is gone — zero calls, no line.
    expect(await pm.runCollapseMigrationForTest(db)).toBe(0);
    expect(db.drops).toEqual(['emotes']);
    expect(db.inserts).toBe(2);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('an _id already present in documents is re-inserted under a fresh id (logged, never fatal)', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = fakeDb(
      { emotes: [{ _id: 'clash', verb: 'grin', grammar: { slots: {}, template: 'x' } }] },
      [{ _id: 'clash', path: '/other', kind: 'msh', data: {} }],
    );
    expect(await PersistenceManager.get().runCollapseMigrationForTest(db)).toBe(1);
    expect(db.documents).toHaveLength(2);
    expect(db.documents[1]).toMatchObject({ path: '/emotes/grin', kind: 'emote' });
    expect(db.documents[1]!._id).not.toBe('clash');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
