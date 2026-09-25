/**
 * Template inheritance — the raw/effective split and the merge algebra.
 *
 * ⭐ The two halves that have to hold together: what a reader sees is the
 * EFFECTIVE row (so all sixty-odd existing readers stay correct), and
 * what a writer stores is the RAW row (so a save never flattens the
 * chain). Every test below is one or the other.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Template } from '../Template';
import { LeafTemplate } from '../LeafTemplate';
import { ZoneApi } from '../../../api/zone';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';

type Doc = Record<string, unknown> & { _id?: string; path: string };

/** The field vocabulary the merge rules are declared over. */
const META = {
  bare: { persistent: true },
  details: { persistent: true, instruction: true, inherit: 'by-key' },
  props: { persistent: true, instruction: true, inherit: 'by-entry' },
  exits: { persistent: true, instruction: true, inherit: 'never' },
} as const;

function install(docs: Doc[]): { store: Doc[]; save: ReturnType<typeof vi.fn> } {
  const store: Doc[] = docs.map((d, i) => ({ ...d, _id: String(i + 1) }));
  const save = vi.fn(async (_c: string, doc: Doc) => {
    const idx = store.findIndex((d) => d._id === doc._id);
    if (idx >= 0) store[idx] = { ...doc };
    else store.push({ ...doc, _id: String(store.length + 1) });
    return doc._id ?? String(store.length);
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    if (c !== Collections.Content) return [];
    if (typeof q.path === 'string') return store.filter((d) => d.path === q.path);
    if (typeof q.class === 'string') return store.filter((d) => d.class === q.class);
    if (q.extends && typeof q.extends === 'object') {
      return store.filter((d) => typeof d.extends === 'string');
    }
    return store.slice();
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(async () => null),
  } as unknown as PersistenceManager);
  vi.spyOn(ZoneApi, 'isFolderClass').mockResolvedValue(false);
  vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(
    class Fake {} as never,
  );
  // ⚠ Only the fake backing class gets the test vocabulary. Blanket-
  // mocking this static also blinds `Document`'s own field reflection —
  // which showed up as every materialized row having an empty `path`.
  const realMeta = MixinApi.getAllFieldMeta.bind(MixinApi);
  vi.spyOn(MixinApi, 'getAllFieldMeta').mockImplementation((ctor) =>
    (ctor as { name?: string }).name === 'Fake'
      ? (META as never)
      : realMeta(ctor),
  );
  return { store, save };
}

afterEach(() => vi.restoreAllMocks());

describe('Template.extends — raw vs effective', () => {
  beforeEach(() => {
    install([
      {
        path: '/p',
        class: '/platform/thing/Thing',
        hydratorClass: '/h',
        data: { bare: 'parent', details: { a: 1, b: 2 } },
      },
      { path: '/c', extends: '/p', class: null, data: { details: { b: 9 } } },
    ]);
  });

  it('a child with no class of its own clones into its parent’s', async () => {
    const child = (await Template.findByPath('/c'))!;
    expect(child.class).toBe('/platform/thing/Thing');
    expect(child.hydratorClass).toBe('/h');
    expect(child.chain).toEqual(['/p']);
    // …and the raw row still says it stated neither.
    expect(child.own.class).toBeUndefined();
    expect(child.own.hydratorClass).toBeUndefined();
  });

  it('a value the child does not state falls through', async () => {
    const child = (await Template.findByPath('/c'))!;
    expect(child.data.bare).toBe('parent');
  });

});

describe('Template.extends — the merge algebra', () => {
  async function merge(
    parentData: Record<string, unknown>,
    childData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    install([
      { path: '/p', class: '/platform/thing/Thing', data: parentData },
      { path: '/c', extends: '/p', class: null, data: childData },
    ]);
    return (await Template.findByPath('/c'))!.data;
  }

  it('replace (the default): the child’s value wins whole', async () => {
    expect(await merge({ bare: 'p' }, { bare: 'c' })).toMatchObject({ bare: 'c' });
  });

  it('by-key: an object merges key by key', async () => {
    const d = await merge(
      { details: { a: 1, b: 2 } },
      { details: { b: 9, c: 3 } },
    );
    expect(d.details).toEqual({ a: 1, b: 9, c: 3 });
  });

  it('never: the parent’s value is not copied at all', async () => {
    expect(await merge({ exits: ['north'] }, {})).not.toHaveProperty('exits');
    expect(await merge({ exits: ['north'] }, { exits: ['south'] })).toMatchObject(
      { exits: ['south'] },
    );
  });

  it('by-entry: a named entry substitutes IN PLACE, keeping order', async () => {
    const d = await merge(
      { props: ['/a', { template: '/b', as: 'x' }, '/c'] },
      { props: [{ template: '/b2', as: 'x' }] },
    );
    expect(d.props).toEqual(['/a', { template: '/b2', as: 'x' }, '/c']);
  });

  it('by-entry: the child’s new keys append in order', async () => {
    const d = await merge({ props: ['/a'] }, { props: ['/b', '/c'] });
    expect(d.props).toEqual(['/a', '/b', '/c']);
  });

  it('⚠ by-entry: parent duplicates the child does not name are PRESERVED', async () => {
    // Six stools stay six. Silently collapsing them would unfurnish a room.
    const d = await merge({ props: ['/stool', '/stool', '/stool'] }, { props: ['/lamp'] });
    expect(d.props).toEqual(['/stool', '/stool', '/stool', '/lamp']);
  });

  it('by-entry: naming a duplicated key substitutes once and drops the rest', async () => {
    const d = await merge(
      { props: ['/stool', '/stool'] },
      { props: [{ template: '/stool', count: 6 }] },
    );
    expect(d.props).toEqual([{ template: '/stool', count: 6 }]);
  });
});

describe('Template.extends — the chain fails loudly', () => {
  it('a missing parent throws, naming child and parent', async () => {
    install([{ path: '/c', extends: '/nope', class: null, data: {} }]);
    await expect(Template.findByPath('/c')).rejects.toThrow(
      /'\/c' extends '\/nope', which does not exist/,
    );
  });

  it('a cycle throws rather than looping', async () => {
    install([
      { path: '/a', extends: '/b', class: null, data: {} },
      { path: '/b', extends: '/a', class: null, data: {} },
    ]);
    await expect(Template.findByPath('/a')).rejects.toThrow(/cyclic/);
  });

  it('a chain deeper than the cap throws', async () => {
    const rows: Doc[] = [];
    for (let i = 0; i < 40; i++) {
      rows.push({ path: `/r${i}`, extends: `/r${i + 1}`, class: null, data: {} });
    }
    rows.push({ path: '/r40', class: '/platform/thing/Thing', data: {} });
    install(rows);
    await expect(Template.findByPath('/r0')).rejects.toThrow(/deeper than 32/);
  });
});

describe('Template.findByClass — the union', () => {
  it('⚠ finds a child that INHERITS the class a raw query cannot see', async () => {
    install([
      { path: '/p', class: '/platform/thing/Thing', data: {} },
      { path: '/c', extends: '/p', class: null, data: {} },
      { path: '/other', class: '/platform/thing/Other', data: {} },
    ]);
    const hits = await Template.findByClass('/platform/thing/Thing');
    expect(hits.map((t) => t.path).sort()).toEqual(['/c', '/p']);
  });
});

describe('Template.toDocument — the round-trip', () => {
  it('⭐⭐ a materialize → save cycle never flattens the chain', async () => {
    const { save } = install([
      {
        path: '/p',
        class: '/platform/thing/Thing',
        hydratorClass: '/h',
        data: { bare: 'parent', details: { a: 1 } },
      },
      { path: '/c', extends: '/p', class: null, data: { details: { b: 2 } } },
    ]);
    const child = (await Template.findByPath('/c'))!;
    await child.save();
    const [, doc] = save.mock.calls.at(-1)!;
    const written = doc as Record<string, unknown>;
    expect(written.class).toBeNull();
    expect(written.hydratorClass).toBeNull();
    expect(written.extends).toBe('/p');
    expect(written.data).toEqual({ details: { b: 2 } });
  });

  it('a parentless row round-trips exactly as before', async () => {
    const { save } = install([
      { path: '/p', class: '/platform/thing/Thing', data: { bare: 1 } },
    ]);
    const tpl = (await Template.findByPath('/p'))!;
    await tpl.save();
    const [, doc] = save.mock.calls.at(-1)!;
    expect(doc as Record<string, unknown>).toMatchObject({
      path: '/p',
      class: '/platform/thing/Thing',
      extends: null,
      data: { bare: 1 },
    });
  });
});

describe('Template.setOwn', () => {
  it('states the raw row and leaves the effective fields consistent', () => {
    const t = new LeafTemplate();
    t.path = '/x';
    t.setOwn({ extends: '/p', data: { a: 1 } });
    expect(t.own.class).toBeUndefined();
    expect(t.extends).toBe('/p');
    expect(t.data).toEqual({ a: 1 });
  });
});
