import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateApi, TemplateError } from './template';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(): { store: Doc[]; save: ReturnType<typeof vi.fn> } {
  const store: Doc[] = [];
  let nextId = 1;

  const save = vi.fn(async (collection: string, doc: Doc) => {
    if (collection !== Collections.Domain) {
      throw new Error(`unexpected collection in test: ${collection}`);
    }
    const copy = { ...doc };
    delete (copy as Record<string, unknown>).__bypassTemplateCheck;
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(nextId++);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Domain) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    const pathSpec = query.path as { $regex?: string } | undefined;
    if (pathSpec?.$regex) {
      const re = new RegExp(pathSpec.$regex);
      return store.filter((d) => re.test(d.path));
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return { store, save };
}

describe('TemplateApi.saveTemplate', () => {
  let store: Doc[];
  let save: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const harness = installInMemoryStore();
    store = harness.store;
    save = harness.save;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects paths that do not start with /', async () => {
    await expect(
      TemplateApi.saveTemplate('narnia/castle', '/lib/spatial/CartesianZone', {})
    ).rejects.toThrow(TemplateError);
  });

  it('accepts a Zone template saved under another Zone template', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/library',
      '/lib/spatial/CartesianZone',
      {}
    );
    expect(store).toHaveLength(2);
  });

  it('accepts a leaf template saved beneath a Zone folder', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );
    expect(store).toHaveLength(2);
  });

  it('rejects a leaf save when descendants already exist', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle/library',
      '/lib/spatial/CartesianLocation',
      {}
    );

    // Attempt to overwrite /narnia/castle with a non-Zone class while
    // descendants exist. The ancestor ladder is clean (castle has no ancestor
    // template), so the leaf-with-children check fires.
    await expect(
      TemplateApi.saveTemplate(
        '/narnia/castle',
        '/lib/spatial/CartesianLocation',
        {}
      )
    ).rejects.toThrow(/child template/i);
  });

  it('rejects saves under a non-Zone ancestor', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );

    await expect(
      TemplateApi.saveTemplate(
        '/narnia/castle/foyer/tapestry',
        '/lib/spatial/CartesianLocation',
        {}
      )
    ).rejects.toThrow(/leaf template/i);
  });

  it('allows upgrading implicit folder to a Zone template when children exist', async () => {
    await TemplateApi.saveTemplate(
      '/orphanage/playroom',
      '/lib/spatial/CartesianLocation',
      {}
    );

    // Now save a Zone template ABOVE the existing leaf — the new zone is a
    // parent folder and has no ancestor constraints to worry about. The leaf
    // stays a leaf. This should succeed.
    await TemplateApi.saveTemplate(
      '/orphanage',
      '/lib/spatial/CartesianZone',
      {}
    );
    expect(store).toHaveLength(2);
  });

  it('persists saves via PersistenceManager with bypass flag', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/lib/spatial/CartesianZone',
      {}
    );
    expect(save).toHaveBeenCalledTimes(1);
    const [, doc] = save.mock.calls[0]!;
    expect((doc as Record<string, unknown>).__bypassTemplateCheck).toBe(true);
    expect((doc as Doc).path).toBe('/narnia/castle');
    expect((doc as Doc).class).toBe('/lib/spatial/CartesianZone');
  });
});
